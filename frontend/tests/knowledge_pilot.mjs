import assert from 'node:assert/strict';
import {inspectFormat} from './format_checks.mjs';

const cycle = '/items/items_efaf52d747c28054';
const health = '/stages/preconception?chapter=health';
const partner = '/preconception/topics/partnership';
const packing = '/stages/childbirth?chapter=health';
const care = '/stages/postpartum?chapter=costs&topic=postpartum-care-options';
const parenting = '/stages/childcare?chapter=daily';
const storageKey = 'together-preparation-v1';
const packingId = 'stage_childbirth_hospital-bag';

export async function verifyKnowledgePilot(context, catalog, capture) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error=>errors.push(error.message));
  const width = page.viewportSize().width;
  const link = name=>page.getByRole('link',{name,exact:true});
  const button = name=>page.getByRole('button',{name,exact:true});
  const focused = locator=>locator.and(page.locator(':focus')).waitFor();
  const go = async path=>{
    await page.goto(path);
    await page.locator('h1').waitFor();
    assert.equal(await page.locator('#retry').count(),0);
  };
  const shot = name=>capture?.(page,'knowledge-'+name);
  const fit = async label=>{
    await page.evaluate(()=>document.fonts.ready);
    const {faults,overflow,screens} = await page.evaluate(inspectFormat);
    const where = `${label} at ${width}px`;
    assert.deepEqual(faults,[],where);
    assert.equal(overflow,0,where);
    assert.ok(screens<=3,`${where}: ${screens} screens`);
  };

  await go('/');
  await page.locator('#chapters').getByRole('link',{name:/健康準備/}).press('Enter');
  await page.waitForURL('**'+health);
  const cycleLink = link('女性月經週期及排卵期');
  await cycleLink.press('Enter');
  assert.equal(new URL(page.url()).pathname,cycle);
  assert.equal(new URL(page.url()).searchParams.get('from'),health);
  const heading = page.locator('#cycle-heading');
  await heading.waitFor();
  await shot('cycle-default');
  assert.equal(await page.locator('#scope-region,.detail-foot,[role=tab]').count(),0);
  assert.deepEqual(await page.locator('.cycle-phases h3').allTextContents(),['月經期','濾泡期','排卵','黃體期']);
  assert.deepEqual(await page.locator('.cycle-phase-mark span').allTextContents(),['01','02','03','04']);
  assert.deepEqual(await page.locator('.cycle-phases p').allTextContents(),[
    '子宮內膜剝落，出現月經出血',
    '濾泡發育，子宮內膜逐漸增厚',
    '成熟卵子由卵巢釋放',
    '黃體分泌黃體素，維持子宮內膜'
  ]);
  const readingRows = await page.locator('.cycle-phases li:visible').evaluateAll(cards=>
    cards.map(card=>card.getBoundingClientRect().top));
  assert.equal(new Set(readingRows).size,width>=520?2:4);
  assert.match(await page.locator('.cycle-figure figcaption').textContent(),/月經出血與濾泡期同時開始/);
  assert.equal(await page.locator('.cycle-diagram rect.cycle-menstruation').getAttribute('x'),
    await page.locator('.cycle-diagram rect.cycle-follicular').getAttribute('x'));
  assert.equal(await page.locator('.cycle-diagram circle.cycle-event').count(),1);
  assert.equal(await page.locator('.cycle-diagram rect.cycle-ovulation').count(),0);
  assert.ok(await heading.evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('#panel-0')) & Node.DOCUMENT_POSITION_FOLLOWING)));
  await page.getByRole('button',{name:/諮詢時/}).press('Enter');
  await button('把提問加入安排').press('Enter');
  await button('查看我的安排').waitFor();
  assert.match(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).records[0].notes,storageKey),/想請醫師釐清/);
  assert.equal(new URL(await link('驗孕時間與方式').getAttribute('href'),page.url()).pathname,'/items/items_b8e9494ab24f080e');
  await fit('cycle preparation');
  await shot('cycle-preparation');
  await page.locator('a.back').press('Enter');
  await focused(cycleLink);
  await cycleLink.press('Enter');
  await page.goBack();
  await focused(cycleLink);
  await link('看認識受孕全部事項').press('Enter');
  const categorized = page.locator('.guide-card').filter({hasText:'女性月經週期及排卵期'});
  await categorized.press('Enter');
  await page.locator('a.back').press('Enter');
  await focused(categorized);
  for(const suffix of ['', '?task=0', '#panel-0', '#task-0', '#funding']) {
    await go(cycle+suffix);
    await page.reload();
    await heading.waitFor();
    const location = page.locator('.article-location');
    await location.getByRole('link',{name:'備孕'}).waitFor();
    await location.getByRole('link',{name:'健康準備'}).waitFor();
    if(suffix)await focused(page.locator(suffix==='#panel-0'?'#panel-0':'#task-0'));
  }

  await go(partner+'?p=2&from='+encodeURIComponent('/stages/preconception?chapter=daily'));
  assert.deepEqual(await page.locator('.topic-groups h2').allTextContents(),['生育意願與家庭規劃','支出與空間','照顧與備援']);
  assert.equal(await page.locator('.topic-groups li a:visible').count(),5);
  assert.equal(await page.locator('#scope-region,.filter-bar,.pager,.facets').count(),0);
  const fifth = link('家人照顧、接送與臨時備援');
  await fifth.press('Enter');
  await page.locator('a.back').press('Enter');
  await focused(fifth);
  await fit('partner discussions');
  await shot('partner');

  const old = {id:packingId,kind:'stage',title:'住院期間有哪些用品需要自備？',owner:'伴侶',notes:'原始備註',status:'準備中',date:'2026-11-15',priority:'yes',createdAt:'2026-01-02'};
  const other = {id:'custom_pilot',kind:'custom',title:'另一筆安排',owner:'家人',notes:'原資料',status:'準備中',date:'2026-11-15',createdAt:'2026-01-01'};
  await page.evaluate(({key,old,other})=>localStorage.setItem(key,JSON.stringify({records:[other,old],preferences:{region:'TW-TPE'},noticeSeen:true})),{key:storageKey,old,other});
  await go(packing);
  const packingRoot = page.locator('[data-packing-editor]');
  const progress = packingRoot.locator('[data-packing-progress]');
  await progress.filter({hasText:'尚未確認需要自備的用品'}).waitFor();
  await shot('packing-default');
  await page.locator('.packing-add > summary').press('Enter');
  const input = page.getByLabel('物品名稱');
  await input.fill('床邊用品');
  await input.press('Enter');
  const group = page.getByRole('combobox',{name:'床邊用品的分類'});
  assert.equal(await group.inputValue(),'pending');
  await group.selectOption('provided');
  await focused(group);
  await group.selectOption('buy');
  await group.selectOption('self');
  const check = page.getByRole('checkbox',{name:'床邊用品已備妥'});
  await check.press('Space');
  assert.equal(await progress.textContent(),'自備用品已備妥 1／1');
  await check.press('Space');
  assert.equal(await progress.textContent(),'自備用品已備妥 0／1');
  await check.check();
  await group.selectOption('pending');
  assert.equal(await progress.textContent(),'尚未確認需要自備的用品');
  await group.selectOption('self');
  await check.check();
  await fit('packing expanded');
  await shot('packing-expanded');
  await page.evaluate(key=>{
    window.originalPackingStorageWrite = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name,value){
      if(name===key)throw new DOMException('fixture write failure','QuotaExceededError');
      return window.originalPackingStorageWrite.call(this,name,value);
    };
  },storageKey);
  await button('儲存清單至我的安排').press('Enter');
  await page.getByText('此次變更尚未儲存，請重試。',{exact:true}).waitFor();
  assert.ok(await check.isChecked());
  assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).records,storageKey),[other,old]);
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalPackingStorageWrite;});
  await button('重試儲存').press('Enter');
  await button('查看我的安排').waitFor();
  const [preserved,updated] = await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).records,storageKey);
  assert.deepEqual(preserved,other);
  const {packing:items,...previous}=updated;
  assert.deepEqual(previous,old);
  assert.equal(items.length,1);
  assert.equal(items[0].ready,true);
  await page.reload();
  assert.ok(await check.isChecked());
  await button('查看我的安排').press('Enter');
  await page.waitForURL(url=>url.pathname==='/plan/'+packingId);
  assert.equal(await page.getByLabel(/備註/).inputValue(),old.notes);
  await link('查看手冊提問').press('Enter');
  assert.ok(await check.isChecked());
  assert.equal(await page.locator('[data-packing-item]').getAttribute('data-packing-item'),items[0].id);

  await go(parenting);
  const postpartumLink = link('新生兒返家前後的照護選擇');
  await postpartumLink.press('Enter');
  await page.getByText('具名服務報價資料待補',{exact:true}).waitFor();
  await page.locator('a.back').press('Enter');
  await focused(postpartumLink);
  await go(care);
  await shot('care-default');
  const fields = ['服務時段','服務範圍','計費單位'];
  if(width===390){
    await page.getByText('比較兩種照護方式',{exact:true}).press('Enter');
    const second=page.getByLabel('選項 2');
    await second.selectOption('family');
    const table=page.locator('.care-side-by-side');
    assert.deepEqual(await table.locator('tbody th').allTextContents(),fields);
    assert.equal(await table.locator('tbody td').count(),6);
    assert.equal(await second.locator('option[value=center]').evaluate(option=>option.disabled),true);
    await fit('care pair');
    await shot('care-pair');
    await button('查看家人協助資料').press('Enter');
    await focused(button('家人協助'));
  }else{
    const table=page.locator('.care-desktop');
    assert.deepEqual(await table.locator('tbody th').allTextContents(),fields);
    assert.equal(await table.locator('tbody td').count(),9);
    await button('家人協助').press('Enter');
  }
  await page.reload();
  await page.locator('[data-care=family][aria-pressed=true]').waitFor();
  assert.equal(new URL(page.url()).searchParams.get('care'),'family');

  const fixture = structuredClone(catalog);
  const topic=fixture.stages.find(s=>s.id==='postpartum').topics.find(t=>t.display==='care');
  topic.guideId='fixture-pilot-care';
  fixture.item_guides.push({item_id:topic.guideId,publication_status:'published',category_ids:[topic.guideId]});
  const source={title:'測試來源',url:'https://example.org/official',locator:'第 2 頁'};
  const row=(id,title,fields)=>({id,type:topic.guideId,title,fields,sources:[source],checked_at:null});
  fixture.records.push(row('pilot-national','測試中央照護資料',{地區:'TW',內容:'中央資料'}),
    row('pilot-quote','測試院所報價',{地區:'TW',照護方式:'center',報價:null,單位:'元／晚',適用期間:'測試期間',取消:'測試條款'}));
  await page.route('**/api/handbook',route=>route.fulfill({json:fixture}));
  await go(care);
  await page.getByText('臺北市：本縣市資料待補。',{exact:true}).waitFor();
  await page.getByText('中央／全國資料',{exact:true}).press('Enter');
  await page.getByText('中央資料',{exact:true}).waitFor();
  await page.getByText('中央／全國資料',{exact:true}).press('Enter');
  await page.getByText('具名服務記錄',{exact:true}).press('Enter');
  const quote=page.locator('[data-care-records]');
  await quote.getByText('待補',{exact:true}).waitFor();
  await quote.getByText('提供者與適用期間',{exact:true}).press('Enter');
  await quote.getByText('測試期間',{exact:true}).waitFor();
  await quote.getByText('核對日期與來源',{exact:true}).press('Enter');
  assert.equal(await quote.getByRole('link',{name:'測試來源'}).getAttribute('href'),source.url);
  await fit('care source');
  await shot('care-source');
  await page.route('**/api/handbook',route=>route.fulfill({status:503}),{times:1});
  const retryURL=page.url();
  await page.reload();
  await button('重試').press('Enter');
  await page.getByText('臺北市：本縣市資料待補。',{exact:true}).waitFor();
  assert.equal(page.url(),retryURL);
  await page.emulateMedia({reducedMotion:'reduce'});
  await button('家人協助').focus();
  await page.keyboard.press('Shift');
  assert.equal(await button('家人協助').evaluate(el=>getComputedStyle(el).outlineWidth),'3px');
  assert.ok(await button('家人協助').evaluate(el=>getComputedStyle(el).transitionDuration.split(',').every(time=>parseFloat(time)===0)));
  assert.deepEqual(errors,[]);
  console.log(`K1–K5 browser checks ${width}px: route and focus, knowledge, checklist persistence and retry, care data, layout and keyboard passed.`);
  await page.close();
}
