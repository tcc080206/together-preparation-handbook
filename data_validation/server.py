"""Local review service, SQLite transactions and append-only audit events."""
import argparse,json,sqlite3,uuid,re
from urllib.parse import urlsplit
from contextlib import contextmanager
from importing import ImportMixin,valid_value
from pathlib import Path
from datetime import datetime,timezone
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
ROOT=Path(__file__).resolve().parent
def dump(x):return json.dumps(x,ensure_ascii=False)
def now():return datetime.now(timezone.utc).isoformat()
class Conflict(Exception):pass
class Store(ImportMixin):
 def __init__(self,data):
  self.path=Path(data)/'platform.sqlite3'
  with self.connect() as c:
   c.executescript('CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, body TEXT); CREATE TABLE IF NOT EXISTS reviews(key TEXT PRIMARY KEY, body TEXT); CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, batch TEXT, at TEXT, actor TEXT, kind TEXT, body TEXT); CREATE TABLE IF NOT EXISTS meta(id INTEGER PRIMARY KEY, revision INTEGER);')
   if not c.execute('SELECT 1 FROM meta').fetchone():
    c.execute('BEGIN IMMEDIATE')
    for r in json.loads((Path(data)/'records.json').read_text())['records']:c.execute('INSERT INTO records VALUES(?,?)',(r['id'],dump(r)))
    old=Path(data)/'reviews.json';legacy=json.loads(old.read_text()) if old.exists() else {'reviews':{},'history':[]}
    records=self.records(c)
    for key,v in legacy['reviews'].items():
     rid,field=key.rsplit('::',1);v={**v,'base_value':records.get(rid,{}).get('fields',{}).get(field),'applied_at':None};c.execute('INSERT INTO reviews VALUES(?,?)',(key,dump(v)))
    self.event(c,str(uuid.uuid4()),'migration',legacy)
    c.execute('INSERT INTO meta VALUES(1,0)')
  with self.connect() as c:
   c.execute('BEGIN IMMEDIATE');records=self.records(c);batch=str(uuid.uuid4());changed=False
   for key,body in c.execute('SELECT key,body FROM reviews').fetchall():
    prior=json.loads(body);rid,field=key.rsplit('::',1)
    if prior.get('status')=='incorrect' and prior.get('applied_at') and records.get(rid,{}).get('fields',{}).get(field)==prior.get('value'):
     after={**prior,'status':'correct','base_value':prior['value'],'value':None,'updated_at':now()}
     c.execute('UPDATE reviews SET body=? WHERE key=?',(dump(after),key));self.event(c,batch,'review',{'key':key,'before':prior,'after':after,'reason':'normalize_applied_review'});changed=True
   if changed:c.execute('UPDATE meta SET revision=revision+1')
  self.setup_categories()
 @contextmanager
 def connect(self):
  connection=sqlite3.connect(self.path,timeout=10)
  try:
   with connection:yield connection
  finally:connection.close()
 def records(self,c):return {k:json.loads(v) for k,v in c.execute('SELECT id,body FROM records')}
 def event(self,c,batch,kind,body):c.execute('INSERT INTO events(batch,at,actor,kind,body) VALUES(?,?,?,?,?)',(batch,now(),'local-user',kind,dump(body)))
 def read(self):
  imports=self.scan_imports()
  with self.connect() as c:
   c.execute('BEGIN')
   return {'revision':c.execute('SELECT revision FROM meta').fetchone()[0],'records':list(self.records(c).values()),'reviews':{k:json.loads(v) for k,v in c.execute('SELECT key,body FROM reviews')},'categories':self.categories(c),'import_results':imports,'history':[dict(id=i,batch=b,at=t,actor=a,kind=k,detail=json.loads(d)) for i,b,t,a,k,d in c.execute('SELECT * FROM events ORDER BY id DESC')]}
 def write(self,action,p):
  self.scan_imports()
  with self.connect() as c:
   c.execute('BEGIN IMMEDIATE');revision=c.execute('SELECT revision FROM meta').fetchone()[0]
   if p.get('revision')!=revision:raise Conflict('資料已更新，請重新載入再核對；目前修改尚未儲存。')
   page=p.get('type')
   categories={x['id']:x for x in self.categories(c)}
   if page not in categories:raise ValueError('分類無效')
   important=categories[page]['review_fields'];types=categories[page]['field_types']
   records=self.records(c);reviews={k:json.loads(v) for k,v in c.execute('SELECT key,body FROM reviews')};batch=str(uuid.uuid4());count=0
   if action=='save':
    entries=p.get('entries')
    if not isinstance(entries,list) or len(entries)>sum(len(important) for r in records.values() if r['type']==page):raise ValueError('核對內容無效')
    seen=set()
    for entry in entries:
     rid=entry['id'];field=entry['field'];status=entry['status'];value=entry.get('value','');key=rid+'::'+field
     if key in seen or rid not in records or records[rid]['type']!=page or field not in important or field not in records[rid]['fields'] or status not in ('pending','correct','incorrect'):raise ValueError('核對欄位無效')
     seen.add(key)
     if not isinstance(value,str) or len(value)>10000:raise ValueError('修正值格式錯誤')
     value=value.strip() if status=='incorrect' else None
     if status=='incorrect':valid_value(value,types[field])
     prior=reviews.get(key);after={'status':status,'value':value,'base_value':records[rid]['fields'][field],'updated_at':now(),'applied_at':None,'batch':batch}
     if prior and prior['status']==status and prior.get('value')==value:continue
     c.execute('INSERT OR REPLACE INTO reviews VALUES(?,?)',(key,dump(after)));self.event(c,batch,'review',{'key':key,'before':prior,'after':after});count+=1
   else:
    for key,r in reviews.items():
     rid,field=key.rsplit('::',1)
     if rid not in records or records[rid]['type']!=page or field not in important or r['status']!='incorrect' or r.get('applied_at'):continue
     record=records[rid];before=record['fields'][field]
     if before!=r.get('base_value'):raise Conflict('原值已改變，請重新核對後再套用。')
     valid_value(r.get('value'),types[field])
     record['fields'][field]=r['value'];record['user_modified_at']=now();prior=r;r={**r,'status':'correct','base_value':r['value'],'value':None,'applied_at':now(),'apply_batch':batch,'updated_at':now()}
     c.execute('UPDATE records SET body=? WHERE id=?',(dump(record),rid));c.execute('UPDATE reviews SET body=? WHERE key=?',(dump(r),key));self.event(c,batch,'apply',{'key':key,'before':before,'after':record['fields'][field],'review_batch':r.get('batch'),'review_before':prior,'review_after':r});count+=1
   if count:c.execute('UPDATE meta SET revision=revision+1')
  return {'changed':count,**self.read()}
def create_server(port=8790,data_dir=None):
 store=Store(data_dir or ROOT/'data')
 class Handler(BaseHTTPRequestHandler):
  def reply(self,status,payload,kind='application/json; charset=utf-8'):
   body=dump(payload).encode() if kind.startswith('application/json') else payload
   self.send_response(status);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
  def do_GET(self):
   try:
    path=urlsplit(self.path).path
    if path=='/api/data':return self.reply(200,store.read())
    files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'}
    status=200
    if path not in files:
     if not re.fullmatch(r'/[a-z][a-z0-9-]{0,63}',path):return self.reply(404,{'error':'找不到頁面'})
     state=store.read();status=200 if path[1:] in {x['id'] for x in state['categories']} else 404
    name=files.get(path,'index.html');kind='text/html' if name.endswith('html') else 'text/javascript' if name.endswith('js') else 'text/css';self.reply(status,(ROOT/'web'/name).read_bytes(),kind+'; charset=utf-8')
   except Exception:self.reply(500,{'error':'資料讀取失敗，請檢查資料檔後重試。'})
  def do_POST(self):
   if self.path not in ('/api/save','/api/apply'):return self.reply(404,{'error':'找不到端點'})
   if self.headers.get('Origin') and self.headers['Origin']!='http://'+self.headers.get('Host',''):return self.reply(403,{'error':'來源不符'})
   try:
    size=int(self.headers.get('Content-Length',0))
    if not 0<size<10000000:raise ValueError('請求大小不符')
    self.reply(200,store.write(self.path.split('/')[-1],json.loads(self.rfile.read(size))))
   except Conflict as e:self.reply(409,{'error':str(e)})
   except (ValueError,KeyError,TypeError,AttributeError) as e:self.reply(400,{'error':str(e)})
   except Exception:self.reply(500,{'error':'儲存失敗，請檢查資料目錄後重試。'})
 return ThreadingHTTPServer(('127.0.0.1',port),Handler)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8790);p.add_argument('--data-dir');a=p.parse_args();s=create_server(a.port,a.data_dir);print(f'http://localhost:{s.server_port}',flush=True);s.serve_forever()
