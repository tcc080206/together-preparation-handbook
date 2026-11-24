import assert from 'node:assert/strict';
import {inspectFormat} from './format_checks.mjs';

export async function verifyStageData(context, catalog, capture) {
  const page = await context.newPage();
  const fixture = structuredClone(catalog);
  const prenatalURL = '/stages/pregnancy?chapter=costs&topic=prenatal-coverage';
  const postpartumURL = '/stages/postpartum?chapter=costs&topic=postpartum-care-options';
  const owner = id => fixture.stages.find(s=>s.id===id);
  const prenatal = owner('pregnancy').topics.find(t=>t.id==='prenatal-coverage');
  const care = owner('postpartum').topics.find(t=>t.id==='postpartum-care-options');
  const row = (id,type,title,fields) => ({id,type,title,fields,
    sources:[{title:'隔離測試來源',url:'https://example.org/fixture',locator:'第 2 頁／服務條款'}],checked_at:null});
  const national = row('prenatal-national','fixture-prenatal','中央檢查情境',
    {地區:'TW',服務:'產檢服務測試',金額:null,單位:'元／次',提供者:'測試健康機關',限制:'選做項目另計',適用起日:null});
  const city = row('prenatal-local','fixture-prenatal','臺北地方情境',
    {地區:'TW-TPE',金額:'500',單位:'元／次',適用期間:'測試期間',限制:'測試限制'});
  const extra = row('prenatal-extra','fixture-prenatal','甲院自費情境',
    {地區:'TW-TPE',提供者類型:'院所',金額:'200',單位:'元／次'});
  const quote = row('center-taipei','fixture-care','甲產後護理之家單人房',
    {地區:'TW-TPE',照護方式:'月子中心／產後護理之家',提供者:'甲產後護理之家',設立類型:'產後護理之家',
      房型:'單人房',服務範圍:'房間與照護',報價:null,單位:'元／晚',最短入住:'測試入住條款',
      訂金:'測試訂金條款',取消:'測試取消條款',加收費用:'測試加收條款',適用期間:'測試期間'});
  await page.route('**/api/handbook',route=>route.fulfill({json:fixture}));
  await page.goto(prenatalURL);
  await page.locator('.stage-topic').waitFor();
  assert.equal(await page.locator('#stage-topic-title').textContent(),'產檢公費與補助');
  await page.getByText('中央產檢公費資料待補',{exact:true}).waitFor();
  assert.equal(await page.getByText('哪些項目需要另外付費？',{exact:true}).count(),1);
  await page.locator('#scope-region').selectOption('TW-TPE');
  await page.getByText('臺北市產檢補助資料待補',{exact:true}).waitFor();
  if(capture){
    await page.reload();
    await page.getByText('臺北市產檢補助資料待補',{exact:true}).waitFor();
    await capture(page,'prenatal-gap');
  }
  await page.goto('/stages/pregnancy?chapter=health');
  await page.getByRole('link',{name:'查看產檢公費與補助'}).click();
  assert.equal(new URL(page.url()).searchParams.get('topic'),'prenatal-coverage');
  await page.locator('a.back').click();
  await page.getByRole('link',{name:'查看產檢公費與補助'}).evaluate(assertFocus);
  function assertFocus(el){if(el!==document.activeElement)throw Error('Expected return link focus');}

  prenatal.guideId='fixture-prenatal';
  care.guideId='fixture-care';
  fixture.item_guides.push(
    {item_id:prenatal.guideId,stage:'preconception',publication_status:'published',category_ids:['fixture-prenatal']},
    {item_id:care.guideId,stage:'preconception',publication_status:'published',category_ids:['fixture-care']});
  fixture.records.push(national);
  await page.goto(prenatalURL);
  await page.getByText(/中央／全國 · 中央檢查情境/).waitFor();
  await page.getByText('臺北市產檢補助資料待補',{exact:true}).waitFor();
  fixture.records.push(city,extra,quote);
  await page.reload();
  const central = page.locator('.stage-data-group').filter({hasText:'中央檢查情境'});
  await central.locator(':scope > summary').press('Enter');
  await central.locator('[data-record-choice]').focus();
  assert.equal(await central.locator('[data-record-choice]').inputValue(),national.id);
  await central.getByText('金額與內容',{exact:true}).press('Enter');
  await central.getByText('待補',{exact:true}).waitFor();
  await central.getByText('元／次',{exact:true}).waitFor();
  await central.getByText('提供者與適用期間',{exact:true}).press('Enter');
  await central.getByText('待確認',{exact:true}).waitFor();
  await central.getByText('核對日期與來源',{exact:true}).press('Enter');
  assert.equal(await central.getByRole('link',{name:'隔離測試來源'}).getAttribute('href'),'https://example.org/fixture');
  await central.getByText('第 2 頁／服務條款').waitFor();
  await page.getByText(/臺北市 · 臺北地方情境/).waitFor();
  await page.getByText(/具名院所費用與自選項目 · 甲院自費情境/).waitFor();
  if(capture)await capture(page,'prenatal-reviewed');

  async function inspectQuote(){
    await page.locator('[data-care]').first().waitFor();
    assert.deepEqual(await page.locator('[data-care]').allTextContents(),['月子中心／產後護理之家','到宅照護','家人協助']);
    await page.getByText('具名服務記錄',{exact:true}).press('Enter');
    assert.equal(await page.locator('.stage-topic [data-record-choice]').inputValue(),quote.id);
    const amount=page.locator('.record-section:not([open]) > summary').filter({hasText:'金額與內容'});
    if(await amount.count())await amount.press('Enter');
    await page.getByText('待補',{exact:true}).waitFor();
    await page.getByText('元／晚',{exact:true}).waitFor();
    await page.getByText('測試取消條款',{exact:true}).waitFor();
    await page.getByText('測試加收條款',{exact:true}).waitFor();
  }
  await page.goto(postpartumURL);
  await inspectQuote();
  if(capture)await capture(page,'postpartum-quote');
  const quoteDetails=page.locator('[data-care-records]');
  await quoteDetails.getByText('提供者與適用期間',{exact:true}).press('Enter');
  await quoteDetails.getByText('測試期間',{exact:true}).waitFor();
  await quoteDetails.getByText('核對日期與來源',{exact:true}).press('Enter');
  assert.equal(await quoteDetails.getByRole('link',{name:'隔離測試來源'}).getAttribute('href'),'https://example.org/fixture');
  if(capture)await capture(page,'postpartum-source');
  const noPrice=structuredClone(quote);
  noPrice.id='center-no-price';
  noPrice.title='乙產後護理之家雙人房';
  delete noPrice.fields.報價;
  fixture.records.push(noPrice);
  await page.reload();
  await page.getByText('具名服務記錄',{exact:true}).press('Enter');
  await page.locator('[data-care-records] [data-record-choice]').selectOption(noPrice.id);
  await page.getByText('待補',{exact:true}).waitFor();
  fixture.records.pop();

  await page.getByRole('button',{name:'到宅照護'}).press('Enter');
  await page.getByText('詢問重點',{exact:true}).press('Enter');
  await page.getByText(/交通費、加時收費/).waitFor();
  await page.getByRole('button',{name:'家人協助'}).press('Enter');
  await page.getByText('詢問重點',{exact:true}).press('Enter');
  await page.getByText(/臨時需要替手/).waitFor();
  if(page.viewportSize().width===390){
    let max=0;
    for(const [width,height] of [[568,320],[320,480],[320,568],[390,844],[667,375],[768,1024],[1440,900],[720,450]]){
      await page.setViewportSize({width,height});
      for(const [url,selector] of [[prenatalURL,'.stage-data-group > summary'],[postpartumURL,'[data-topic-records] > details:not(.care-guidance) > summary']]){
        await page.goto(url);
        await page.locator(selector).first().press('Enter');
        const {faults,overflow,screens}=await page.evaluate(inspectFormat);
        const where=url+' '+width+'×'+height;
        if(capture && (faults.length || overflow || screens>3))await capture(page,'stage-fixture-failure');
        assert.deepEqual(faults,[],where);
        assert.equal(overflow,0,where);
        assert.ok(screens<=3,where+' '+screens.toFixed(2)+' screens');
        max=Math.max(max,screens);
      }
    }
    console.log('16 expanded stage fixture layouts, max '+max.toFixed(2)+' screens, zero horizontal overflow.');
    await page.setViewportSize({width:390,height:844});
  }
  await page.goto('/stages/childcare?chapter=costs');
  await page.locator('.stage-question summary').press('Enter');
  await page.waitForURL(url=>url.searchParams.get('question')==='none');
  const origin = page.url();
  const newborn = page.getByRole('link',{name:'新生兒返家前後的照護選擇'});
  await newborn.press('Enter');
  await inspectQuote();
  await page.locator('a.back').click();
  await newborn.and(page.locator(':focus')).waitFor();
  assert.equal(page.url(),origin);
  await newborn.click();
  await page.goBack();
  assert.equal(page.url(),origin);
  await newborn.click();
  await page.locator('#scope-region').selectOption('TW-NWT');
  await page.getByText('具名服務報價資料待補',{exact:true}).waitFor();
  assert.equal(await page.getByText(quote.title,{exact:true}).count(),0);

  fixture.records=fixture.records.filter(r=>r.id!==national.id&&r.id!==quote.id);
  await page.locator('#scope-region').selectOption('TW-TPE');
  await page.reload();
  await page.getByText('具名服務報價資料待補',{exact:true}).waitFor();
  await page.goto(prenatalURL);
  await page.getByText('中央產檢公費資料待補',{exact:true}).waitFor();
  await page.getByText(/臺北市 · 臺北地方情境/).waitFor();
  fixture.item_guides.find(g=>g.item_id===prenatal.guideId).publication_status='withdrawn';
  await page.reload();
  await page.getByText('臺北市產檢補助資料待補',{exact:true}).waitFor();
  assert.equal(await page.getByText(/臺北地方情境/).count(),0);
  await page.close();
  console.log('Prenatal and postpartum fixtures, shared navigation, sources, nulls, county separation and withdrawal passed.');
}
