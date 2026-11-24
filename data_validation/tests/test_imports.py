import copy,json,shutil,tempfile,unittest,sys,threading,urllib.request,urllib.error
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import Store,ROOT,Conflict,create_server
from importing import DEFAULT_CATEGORIES,validate_batch

class ImportTest(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.path=Path(self.temp.name)
  shutil.copy(ROOT/'data/records.json',self.path);(self.path/'imports').mkdir();self.s=Store(self.path)
  self.batch=json.loads((ROOT/'examples/new-category.json').read_text())
 def put(self,payload=None,name='batch.json'):
  (self.path/'imports'/name).write_text(json.dumps(payload or self.batch))
 def test_new_and_existing_category(self):
  before=self.s.read();self.put();d=self.s.read();self.assertEqual(len(d['categories']),3);self.assertEqual(len(d['records']),12);self.assertEqual(d['revision'],1);self.assertEqual(d['reviews'],before['reviews'])
  self.assertEqual(self.s.read()['revision'],1)
  with self.assertRaises(Conflict):self.s.write('save',{'revision':0,'type':'allowance','entries':[]})
  batch=copy.deepcopy(self.batch);batch['batch_id']='next';batch['records'][0]['id']='next-record';self.put(batch,'next.json');d=self.s.read();self.assertEqual(len(d['categories']),3);self.assertEqual(len(d['records']),13)
  baseline=json.loads((ROOT/'data/records.json').read_text())['records'][0];baseline['id']='new-allowance'
  payload={'schema_version':1,'batch_id':'existing-category','category':DEFAULT_CATEGORIES[0],'records':[baseline]};self.put(payload,'same-category.json');d=self.s.read();self.assertEqual(len(d['categories']),3);self.assertEqual(len(d['records']),14)
  self.assertEqual(Store(self.path).read()['revision'],d['revision'])
  with self.s.connect() as c:self.assertEqual(json.loads(c.execute('SELECT payload FROM imports WHERE batch=?',(self.batch['batch_id'],)).fetchone()[0]),self.batch)
 def test_import_does_not_overwrite_corrections(self):
  self.put();d=self.s.read();record=self.batch['records'][0];entry={'id':record['id'],'field':'服務內容','status':'incorrect','value':'修正後'}
  saved=self.s.write('save',{'revision':d['revision'],'type':record['type'],'entries':[entry]});applied=self.s.write('apply',{'revision':saved['revision'],'type':record['type']})
  self.assertEqual(applied['reviews'][record['id']+'::服務內容']['status'],'correct');self.assertEqual(applied['records'][-1]['fields']['服務內容'],'修正後')
  again=self.s.read();self.assertEqual(again['revision'],applied['revision']);self.assertEqual(again['records'],applied['records'])
  changed=copy.deepcopy(self.batch);changed['batch_id']='conflict-record';changed['records'].append({**copy.deepcopy(record),'id':'must-not-add'});self.put(changed,'conflict.json');d=self.s.read();self.assertTrue(any(r['status']=='error' for r in d['import_results']));self.assertNotIn('must-not-add',[r['id'] for r in d['records']]);self.assertEqual(d['revision'],again['revision'])
  self.batch['category']['title']='changed';self.put();self.assertTrue(any('batch_id' in x.get('error','') for x in self.s.read()['import_results']))
 def test_invalid_batch_is_atomic_and_other_files_continue(self):
  invalid=copy.deepcopy(self.batch);invalid['batch_id']='bad';invalid['records'].append(copy.deepcopy(invalid['records'][0]));invalid['records'][-1]['id']='bad-source';invalid['records'][-1]['sources'][0]['url']='javascript:alert(1)';self.put(invalid,'a-bad.json')
  self.put(name='b-good.json');d=self.s.read();self.assertEqual(len(d['records']),12);self.assertEqual(d['import_results'][0]['status'],'error');self.assertEqual(d['revision'],1)
  for mutate in [lambda p:p['category'].update(id='api'),lambda p:p['records'][0].update(type='other'),lambda p:p['records'][0]['fields'].pop('服務內容'),lambda p:p['category'].update(review_fields=['a']*6),lambda p:p['category'].update(field_types={'服務內容':'number'}),lambda p:p['records'][0]['fields'].update(申請日期='2026-02-30')]:
   p=copy.deepcopy(self.batch);mutate(p)
   with self.assertRaises(ValueError):validate_batch(p)
 def test_empty_category_and_invalid_correction(self):
  self.put();d=self.s.read();r=self.batch['records'][0]
  with self.assertRaises(ValueError):self.s.write('save',{'revision':d['revision'],'type':r['type'],'entries':[{'id':r['id'],'field':'申請日期','status':'incorrect','value':'2026-02-30'}]})
  empty=copy.deepcopy(self.batch);empty.update(batch_id='empty',records=[]);empty['category']['id']='empty';self.put(empty,'empty.json');d=self.s.read();self.assertIn('empty',[c['id'] for c in d['categories']])
 def test_legacy_migration_preserves_content(self):
  before=self.s.read();r=before['records'][0];entry={'id':r['id'],'field':'金額','status':'incorrect','value':'7777'}
  self.s.write('save',{'revision':0,'type':'allowance','entries':[entry]});self.s.write('apply',{'revision':1,'type':'allowance'});before=self.s.read()
  with self.s.connect() as c:c.execute('DROP TABLE categories');c.execute('DROP TABLE imports')
  d=Store(self.path).read();self.assertEqual(d['records'],before['records']);self.assertEqual(d['reviews'],before['reviews']);self.assertEqual(d['history'],before['history']);self.assertEqual(d['revision'],before['revision'])
 def test_http_new_route_and_stale_save(self):
  server=create_server(0,self.path);threading.Thread(target=server.serve_forever,daemon=True).start();self.addCleanup(server.server_close);self.addCleanup(server.shutdown)
  root=f'http://127.0.0.1:{server.server_port}'
  self.put()
  with urllib.request.urlopen(root+'/example-service') as res:self.assertEqual(res.status,200)
  with self.assertRaises(urllib.error.HTTPError) as error:urllib.request.urlopen(root+'/missing')
  self.assertEqual(error.exception.code,404);error.exception.close()
  req=urllib.request.Request(root+'/api/save',data=json.dumps({'revision':0,'type':'allowance','entries':[]}).encode(),headers={'Content-Type':'application/json'})
  with self.assertRaises(urllib.error.HTTPError) as error:urllib.request.urlopen(req)
  self.assertEqual(error.exception.code,409);error.exception.close()
if __name__=='__main__':unittest.main()
