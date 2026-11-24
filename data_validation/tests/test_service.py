import unittest,tempfile,shutil,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import Store,ROOT,Conflict
class ServiceTest(unittest.TestCase):
 def test_workflow(self):
  with tempfile.TemporaryDirectory() as tmp:
   shutil.copy(ROOT/'data/records.json',tmp);original=(Path(tmp)/'records.json').read_bytes();rid=json.loads(original)['records'][0]['id'];key=rid+'::金額'
   legacy={'reviews':{key:{'status':'incorrect','value':'5100'}},'history':[{'legacy':'retained'}]};(Path(tmp)/'reviews.json').write_text(json.dumps(legacy));s=Store(tmp);d=s.read();self.assertEqual(d['history'][0]['detail'],legacy)
   result=s.write('apply',{'type':'allowance','revision':0});self.assertEqual(result['changed'],1);self.assertEqual(result['records'][0]['fields']['金額'],'5100');self.assertEqual(s.write('apply',{'type':'allowance','revision':1})['changed'],0)
   entry={'id':rid,'field':'金額','status':'incorrect','value':'5200'}
   with self.assertRaises(ValueError):s.write('save',{'type':'allowance','revision':1,'entries':[entry,{'id':rid,'field':'條件','status':'incorrect','value':''}]})
   self.assertEqual(s.read()['revision'],1)
   result=s.write('save',{'type':'allowance','revision':1,'entries':[entry]});self.assertEqual(result['records'][0]['fields']['金額'],'5100')
   with self.assertRaises(Conflict):s.write('apply',{'type':'allowance','revision':1})
   self.assertEqual(s.write('apply',{'type':'childcare','revision':2})['changed'],0)
   self.assertEqual(s.write('apply',{'type':'allowance','revision':2})['records'][0]['fields']['金額'],'5200')
   fresh=Store(tmp).read();self.assertEqual(fresh['revision'],3);self.assertIsNone(fresh['reviews'][key]['value']);self.assertEqual(fresh['reviews'][key]['status'],'correct');self.assertEqual(fresh['reviews'][key]['base_value'],'5200');self.assertEqual(original,(Path(tmp)/'records.json').read_bytes());self.assertEqual(json.loads((Path(tmp)/'reviews.json').read_text()),legacy)
   applied=[e for e in fresh['history'] if e['kind']=='apply'];self.assertEqual(applied[0]['detail']['before'],'5100');self.assertEqual(applied[0]['detail']['after'],'5200');self.assertEqual(applied[0]['detail']['review_before']['status'],'incorrect');self.assertEqual(applied[0]['detail']['review_after']['status'],'correct')
 def test_apply_conflict(self):
  with tempfile.TemporaryDirectory() as tmp:
   shutil.copy(ROOT/'data/records.json',tmp);s=Store(tmp);r=s.read()['records'][0]
   s.write('save',{'type':'allowance','revision':0,'entries':[{'id':r['id'],'field':'金額','status':'incorrect','value':'9999'}]})
   with s.connect() as c:
    r['fields']['金額']='6001';c.execute('UPDATE records SET body=? WHERE id=?',(json.dumps(r),r['id']))
   with self.assertRaises(Conflict):s.write('apply',{'type':'allowance','revision':1})
   self.assertEqual(s.read()['revision'],1)
   self.assertFalse(s.read()['reviews'][r['id']+'::金額']['applied_at'])
 def test_old_applied_review_migration(self):
  with tempfile.TemporaryDirectory() as tmp:
   shutil.copy(ROOT/'data/records.json',tmp);s=Store(tmp);r=s.read()['records'][0];key=r['id']+'::金額'
   with s.connect() as c:c.execute('INSERT INTO reviews VALUES(?,?)',(key,json.dumps({'status':'incorrect','value':r['fields']['金額'],'applied_at':'2026-11-14'})))
   d=Store(tmp).read();self.assertEqual(d['reviews'][key]['status'],'correct');self.assertEqual(d['history'][0]['detail']['before']['status'],'incorrect');self.assertEqual(Store(tmp).read()['revision'],d['revision'])
if __name__=='__main__':unittest.main()
