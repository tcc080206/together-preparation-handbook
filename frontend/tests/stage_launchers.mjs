// Run with port 8780 available. The SQLite database and every mutable stage file are temporary.
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const baseURL='http://localhost:8780';
const api='/api/handbook';
const temp=await mkdtemp(join(tmpdir(),'stage-launchers-'));
const database=join(temp,'snapshot.sqlite3');
const chapters=['costs','health','daily'];
const key='together-preparation-v1';
const files=['before_p','after_p','childbirth','postpartum','childcare'].map(dir=>dir+'/stage.json');
const ids=['preconception','pregnancy','childbirth','postpartum','childcare'];
const stableQuestion='stage_postpartum_home-budget';
const old={records:[
  {id:'stage_childbirth_hospital-bag',kind:'stage',title:'舊提問',date:'2026-12-01',owner:'小林',
    notes:'保留的備註',status:'準備中',createdAt:'2026-01-02T00:00:00Z',priority:'yes'},
  {id:'items_095c7855adf6a94c',kind:'item',title:'舊文章',date:'',owner:'',notes:'第二筆',
    status:'待確認',createdAt:'2026-01-01T00:00:00Z'}
],preferences:{region:'TW-TPE'},noticeSeen:true};
let browser, server, diagnostics='';

async function stop(){
  if(!server || server.exitCode!==null || server.signalCode!==null)return;
  const done=once(server,'exit');
  process.kill(-server.pid,'SIGTERM');
  await done;
}

async function launch(project){
  diagnostics='';
  server=spawn('uv',['run','--project',project,'python',project+'/server.py','--port','8780',
    '--database',database,'--stage-root',temp],{detached:true,stdio:['ignore','pipe','pipe']});
  for(const output of [server.stdout,server.stderr]) output.on('data',s=>diagnostics+=s);
  for(let i=0;i<100;i++){
    if(server.exitCode!==null)throw Error(diagnostics);
    if(diagnostics.includes('http://localhost:8780/'))return;
    await delay(100);
  }
  throw Error('Launcher startup timed out: '+diagnostics);
}

async function mutate(file, edit) {
  const path=join(temp,file);
  const original=await readFile(path,'utf8');
  const changed=JSON.parse(original);
  edit(changed);
  await writeFile(path,JSON.stringify(changed));
  return ()=>writeFile(path,original);
}

try {
  for (const file of files){
    await mkdir(dirname(join(temp,file)),{recursive:true});
    await copyFile(file,join(temp,file));
  }
  execFileSync('python3',['-c',`
from contextlib import closing
from pathlib import Path
import sqlite3, sys
uri = Path('data_validation/data/platform.sqlite3').resolve().as_uri()
with closing(sqlite3.connect(uri+'?mode=ro', uri=True)) as source, closing(sqlite3.connect(sys.argv[1])) as dest:
    source.backup(dest)
`,database]);
  const original=JSON.parse(execFileSync('python3',['-c',`
from pathlib import Path
import json, sys
sys.path.insert(0, 'data_validation')
from handbook import snapshot
print(json.dumps(snapshot(Path(sys.argv[1]))))
`,database],{encoding:'utf8',maxBuffer:4*1024*1024}));
  browser=await chromium.launch({channel:'chrome'});
  const context=await browser.newContext({baseURL});
  const page=await context.newPage();
  const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  let reference;
  for(const project of ['frontend','before_p']){
    await launch(project);
    const response=await context.request.get(api);
    assert.equal(response.status(),200);
    const {stages,...snapshot}=await response.json();
    assert.deepEqual(snapshot,original);
    assert.deepEqual(stages.map(s=>s.id),ids);
    if(reference)assert.deepEqual(stages,reference);
    reference=stages;
    for(const id of ids){
      for(const chapter of chapters){
        await page.goto('/stages/'+id+'?chapter='+chapter);
        await page.locator('#stage-chapter-title').waitFor();
        assert.match(await page.locator('.chapter-tabs [aria-current]').getAttribute('href'),new RegExp('chapter='+chapter+'$'));
      }
    }
    await page.goto('/');
    await page.locator('.life-grid').waitFor();
    if(project==='frontend')await page.evaluate(({key,old})=>localStorage.setItem(key,JSON.stringify(old)),{key,old});
    assert.deepEqual(await state(),old);
    await page.goto('/plan/stage_childbirth_hospital-bag');
    assert.equal(await page.locator('[name=notes]').inputValue(),old.records[0].notes);
    await page.getByRole('link',{name:'查看手冊提問'}).click();
    await page.locator('.stage-question[open][data-question=hospital-bag]').waitFor();
    await page.goto('/stages/childbirth?chapter=health&question=admission');
    await page.locator('.stage-question[open][data-question=admission]').waitFor();
    await page.goto('/items/items_095c7855adf6a94c#panel-1');
    await page.locator('#panel-1:visible').waitFor();
    for(const path of ['/stage.json','/server.py','/frontend/stage_sources.py','/postpartum/stage.json','/data_validation/handbook.json']){
      assert.equal((await context.request.get(path)).status(),404,path);
    }
    assert.deepEqual(await state(),old);
    await stop();
    console.log(project+': 5 stage IDs, 15 chapters, legacy links and plan, snapshot parity and public static root passed.');
  }

  await launch('frontend');
  const restorePregnancy=await mutate(files[1],s=>s.chapters.costs.subtitle='隔離測試標題');
  await page.goto('/?stage=pregnancy#chapters');
  await page.getByText('隔離測試標題',{exact:true}).waitFor();
  const changed=await (await context.request.get(api)).json();
  const expected=structuredClone(reference);
  expected[1].chapters.costs.subtitle='隔離測試標題';
  assert.deepEqual(changed.stages,expected);
  await restorePregnancy();

  const care='/stages/postpartum?chapter=costs&topic=postpartum-care-options';
  const newborn='/stages/childcare?chapter=costs';
  const newbornLink=()=>page.getByRole('link',{name:'新生兒返家前後的照護選擇'});
  const restoreOwner=await mutate(files[3],s=>s.topics.find(t=>t.id==='postpartum-care-options').questions[0].title='隔離測試：到宅報價想問什麼？');
  for(const route of [newborn,care]){
    await page.goto(route);
    if(route===newborn)await newbornLink().click();
    await page.reload();
    await page.getByText('隔離測試：到宅報價想問什麼？',{exact:true}).waitFor();
    const save=page.locator('.stage-question[open] button');
    assert.equal(await save.getAttribute('data-id'),stableQuestion);
    if(route===newborn){
      await save.press('Enter');
      await page.getByRole('button',{name:'查看我的安排'}).waitFor();
      await page.locator('a.back').click();
      await newbornLink().and(page.locator(':focus')).waitFor();
    }else{
      await save.press('Enter');
      await page.waitForURL(url=>url.pathname==='/plan/'+stableQuestion);
      await page.locator('a.back').click();
      await page.locator('.stage-question[open]').waitFor();
    }
    assert.equal((await state()).records.filter(r=>r.id===stableQuestion).length,1);
    assert.deepEqual((await state()).records.slice(0,2),old.records);
  }
  await restoreOwner();

  for(const [file,edit,expectedError] of [
    [files[3],s=>s.topics[0].questions.push(s.topics[0].questions[0]),'duplicate question key home-budget'],
    [files[4],s=>{s.chapters.costs.entries.find(e=>e.topicId==='postpartum-care-options').topicId='missing-topic';},'unknown editorial topic'],
    [files[4],s=>{s.guidePrompts.items_90513227d0b87997=['talk','重複準備單','問題|說明'];},'already owned'],
  ]){
    const restore=await mutate(file,edit);
    await page.goto(newborn);
    const retry=page.getByRole('button',{name:'重試'});
    await retry.waitFor();
    assert.ok(diagnostics.includes(file) && diagnostics.includes(expectedError),diagnostics);
    await restore();
    await retry.press('Enter');
    await newbornLink().waitFor();
  }
  const file=join(temp,files[3]);
  const originalOwner=await readFile(file,'utf8');
  await writeFile(file,'{invalid json');
  await page.goto(care);
  const retry=page.getByRole('button',{name:'重試'});
  await retry.waitFor();
  assert.ok(diagnostics.includes(files[3]) && diagnostics.includes('line 1 column 2'),diagnostics);
  await writeFile(file,originalOwner);
  await retry.press('Enter');
  await page.locator('[data-care]').first().waitFor();
  console.log('Temporary subtitle, shared owner wording/reload, stable save ID and configuration 503/retry passed.');
} finally {
  await stop();
  await browser?.close();
  await rm(temp,{recursive:true,force:true});
}
