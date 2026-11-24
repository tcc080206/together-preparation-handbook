import assert from 'node:assert/strict';

const health = 'items_d06b904d4d523a1e';
const spending = 'items_6a6ae4b5954ad582';
const care = 'items_95b572be1793ad97';
const chapterRoute = (stage,chapter)=>'/stages/'+stage+'?chapter='+chapter;
const article = id=>'/items/'+id;
const topicPath = id=>'/preconception/topics/'+id;

export async function verifyNavigation(context,catalog,capture) {
  const page=await context.newPage();
  const width=page.viewportSize().width;
  const key='together-preparation-v1';
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const go = async url=>{await page.goto(url);await page.locator('h1').waitFor();};
  const activate = async control=>{
    await control.focus();
    await page.keyboard.press('Enter');
    await page.locator('h1').waitFor();
  };
  const namedLink = name=>page.getByRole('link',{name,exact:true});
  const back = ()=>activate(page.locator('a.back'));
  const pathname = ()=>new URL(page.url()).pathname;
  const params = ()=>new URL(page.url()).searchParams;
  const route = ()=>{const {pathname,search}=new URL(page.url());return pathname+search;};
  const focus = locator=>locator.and(page.locator(':focus')).waitFor();
  const shot = name=>capture?.(page,name);
  async function location(expected){
    assert.deepEqual(await page.locator('.article-location a:visible').allTextContents(),
      width===390?expected:['手冊首頁',...expected]);
  }

  for(const [chapter,label,id,title] of [
    ['health','健康準備',health,'雙方一般健康檢查'],
    ['costs','費用與支持',spending,'每月育兒與托育支出']
  ]){
    await go('/');
    assert.equal(await page.locator('.life-card[aria-current]').getAttribute('data-stage-preview'),'preconception');
    await activate(page.locator('#chapters').getByRole('link',{name:new RegExp(label)}));
    assert.equal(params().get('chapter'),chapter);
    await activate(namedLink(title));
    assert.equal(pathname(),article(id));
    assert.equal(await page.locator('h1').textContent(),title);
    await location(['備孕',label]);
    await shot('pilot-'+chapter);
    const copied=await context.browser().newContext({viewport:page.viewportSize()});
    try{
      const shared=await copied.newPage();
      await shared.goto(page.url());
      await shared.locator('.article-location').getByRole('link',{name:label}).waitFor();
      await shared.reload();
      assert.equal(await shared.locator('h1').textContent(),title);
    }finally{await copied.close();}
    await back();
    await focus(namedLink(title));
  }

  await go(article(health));
  await location(['備孕','健康準備']);
  await go(article(spending));
  await location(['育兒與托育先了解']);
  await page.reload();
  await location(['育兒與托育先了解']);

  const healthChapter=chapterRoute('preconception','health');
  const wellbeing=topicPath('wellbeing')+'?from='+encodeURIComponent(healthChapter);
  await go('/');
  await activate(page.locator('#chapters').getByRole('link',{name:/健康準備/}));
  const categoryLink=page.locator('[data-focus-key=catalog-wellbeing]');
  await activate(categoryLink);
  assert.equal(route(),wellbeing);
  await location(['備孕','健康準備']);
  await shot('wellbeing-category');
  const sleep=namedLink('改善睡眠品質');
  await activate(sleep);
  assert.equal(pathname(),article('items_708766184916e476'));
  await back();
  await focus(sleep);
  await activate(sleep);
  await page.goBack();
  await focus(sleep);
  await page.reload();
  await location(['備孕','健康準備']);
  await back();
  await focus(categoryLink);
  await go(wellbeing);
  await location(['備孕','健康準備']);
  await back();
  await page.waitForURL('**'+healthChapter);

  for(const topic of catalog.topics) {
    await go(topicPath(topic.id));
    const ids=catalog.item_guides.filter(g=>g.publication_status==='published' &&
      (g.primary_topic_id===topic.id || g.related_topic_ids.includes(topic.id))).map(g=>'guide-'+g.item_id);
    const guideLinks=page.locator('[data-focus-key^=guide-]:visible');
    assert.deepEqual((await guideLinks.evaluateAll(links=>links.map(a=>a.dataset.focusKey))).sort(),ids.sort(),topic.id);
    assert.equal(await page.locator('main select,.facets,.pager').count(),0,topic.id);
    assert.equal(await page.locator('.stage-index[open]').count(),0,topic.id);
  }
  await go(topicPath('childcare-preparation'));
  assert.deepEqual(await page.locator('.topic-groups h2').allTextContents(),['費用與支持','先看照顧選擇','提前安排與分工']);
  await page.getByText('切換分類',{exact:true}).press('Enter');
  assert.equal(await page.locator('.stage-index a:visible').count(),7);
  await shot('category-expanded');
  await page.getByText('切換分類',{exact:true}).press('Enter');

  await go(topicPath('wellbeing')+'?'+new URLSearchParams({facet:'cost',section:'先了解',from:healthChapter}));
  const filtered=page.url();
  assert.deepEqual(await page.locator('.guide-card strong').allTextContents(),['孕前營養評估']);
  const first=namedLink('孕前營養評估');
  await activate(first);
  await back();
  assert.equal(page.url(),filtered);
  await focus(first);
  await activate(namedLink('查看全部事項'));
  assert.equal(await page.locator('.guide-card').count(),4);
  assert.equal(route(),wellbeing);

  await go(topicPath('childcare-preparation')+'?p=2&from='+encodeURIComponent(chapterRoute('preconception','costs')));
  const pageTwo=page.url();
  const spendingCard=page.locator('[data-focus-key="guide-'+spending+'"]');
  await activate(spendingCard);
  await location(['備孕','費用與支持']);
  await page.getByRole('link',{name:'返回「育兒與托育先了解」第 2 頁'}).waitFor();
  await page.reload();
  await back();
  assert.equal(page.url(),pageTwo);
  await focus(spendingCard);
  await go(article(health)+'?from='+encodeURIComponent('//example.org/'));
  assert.equal(new URL(await page.locator('a.back').getAttribute('href'),page.url()).origin,new URL(page.url()).origin);

  const api = '**/api/handbook';
  const withWithdrawn = ids => ({
    ...catalog, item_guides:catalog.item_guides.map(g=>
      ids.includes(g.item_id) ? {...g,publication_status:'withdrawn'} : g)
  });
  await page.route(api,r=>r.fulfill({json:withWithdrawn(['items_708766184916e476'])}),{times:1});
  await go(wellbeing);
  assert.equal(await page.locator('.guide-card').count(),3);
  assert.equal(await sleep.count(),0);
  const wellbeingIds=catalog.item_guides.filter(g=>g.primary_topic_id==='wellbeing').map(g=>g.item_id);
  await page.route(api,r=>r.fulfill({json:withWithdrawn(wellbeingIds)}),{times:1});
  await go(wellbeing);
  await page.getByText('目前沒有可閱讀的事項。',{exact:true}).waitFor();
  await namedLink('返回健康準備').waitFor();
  await page.route(api,r=>r.fulfill({status:503}),{times:1});
  await go(wellbeing);
  await page.getByRole('button',{name:'重試',exact:true}).press('Enter');
  await sleep.waitFor();
  assert.equal(route(),wellbeing);
  console.log('N1 '+width+': both two-activation routes, all eight categories, saved URLs, keyboard return, reload and location passed.');

  await go(chapterRoute('pregnancy','health'));
  const prenatal=namedLink('查看產檢公費與補助');
  await activate(prenatal);
  assert.equal(pathname(),'/stages/pregnancy');
  assert.equal(params().get('topic'),'prenatal-coverage');
  await page.goBack();
  await focus(prenatal);

  await go(chapterRoute('childbirth','daily'));
  await activate(page.locator('[data-question=discharge-ride] > summary'));
  await page.waitForURL(url=>url.searchParams.get('question')==='discharge-ride');
  const discharge=page.url();
  const postpartum=namedLink('比較月子中心、到宅與家人照護');
  await activate(postpartum);
  assert.equal(pathname(),'/stages/postpartum');
  assert.equal(params().get('topic'),'postpartum-care-options');
  await activate(page.getByRole('button',{name:'把提問加入安排',exact:true}));
  await page.getByRole('button',{name:'查看我的安排',exact:true}).waitFor();
  await back();
  await focus(postpartum);
  assert.equal(page.url(),discharge);
  await activate(postpartum);
  await page.goBack();
  await focus(postpartum);
  assert.equal(page.url(),discharge);

  await go(chapterRoute('childcare','daily'));
  await activate(namedLink('新生兒返家前後的照護選擇'));
  await page.getByRole('button',{name:'查看我的安排',exact:true}).waitFor();
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).records
    .filter(r=>r.id==='stage_postpartum_home-budget').length,key),1);
  await back();
  await focus(namedLink('新生兒返家前後的照護選擇'));
  const more=page.locator('.situation summary');
  await activate(more);
  const secondary=more.locator('..').getByRole('link');
  await activate(secondary);
  await back();
  await focus(secondary);
  await shot('situations-expanded');

  const category='/preconception/topics/childcare-preparation';
  for(let round=0;round<3;round++){
    await go(category);
    const compare=page.locator('[data-focus-key="guide-'+care+'"]');
    await activate(compare);
    await activate(page.getByRole('button',{name:'費用',exact:true}));
    const compareURL=page.url();
    const related=namedLink('查看每月育兒與托育支出');
    await activate(related);
    assert.equal(pathname(),article(spending));
    assert.equal(params().get('from'),article(care)+'?topic=childcare-preparation&comparison=1');
    assert.equal(await page.locator('.article-related').count(),0);
    await page.goBack();
    assert.equal(page.url(),compareURL);
    await focus(related);
    assert.equal(await page.getByRole('button',{name:'費用',exact:true}).getAttribute('aria-pressed'),'true');
    await page.goBack();
    await focus(compare);
  }
  const editorial=structuredClone(catalog);
  const relationships=editorial.stages.find(stage=>stage.id==='childcare').guideRelated[care];
  relationships.push(relationships[0],{guideId:care,label:'自身連結'});
  await page.route('**/api/handbook',route=>route.fulfill({json:editorial}),{times:1});
  await go(article(care));
  assert.equal(await page.locator('.article-related a').count(),1);
  const withdrawn=structuredClone(catalog);
  withdrawn.item_guides.find(guide=>guide.item_id===spending).publication_status='withdrawn';
  await page.route('**/api/handbook',route=>route.fulfill({json:withdrawn}),{times:1});
  await go(article(care));
  assert.equal(await page.locator('.article-related').count(),0);
  console.log('N2 '+width+': named editorial targets, owned question, chained Back, bounded return and withdrawal passed.');

  const neighbors=page.getByRole('navigation',{name:'階段前後導覽'});
  for(const [i,stage] of catalog.stages.entries()){
    await go(chapterRoute(stage.id,'health'));
    const previous=catalog.stages[i-1];
    const next=catalog.stages[i+1];
    assert.deepEqual(await neighbors.getByRole('link').evaluateAll(links=>links.map(link=>link.getAttribute('aria-label'))),[
      ...(previous?['上一階段・'+previous.title]:[]),
      ...(next?['下一階段・'+next.title]:[])
    ]);
    for(const [direction,neighbor] of [['上一',previous],['下一',next]]){
      if(!neighbor)continue;
      const jump=neighbors.getByRole('link',{name:direction+'階段・'+neighbor.title});
      await activate(jump);
      await page.waitForURL(url=>url.pathname==='/stages/'+neighbor.id && url.searchParams.get('chapter')==='costs');
      await page.getByRole('heading',{name:neighbor.title,exact:true}).waitFor();
      await focus(page.locator('#stage-chapter-title'));
      await page.goBack();
      await focus(jump);
      assert.equal(page.url().endsWith(chapterRoute(stage.id,'health')),true);
    }
    if(stage.id==='pregnancy')await shot('stage-neighbors');
  }
  console.log('Stage neighbors '+width+': all five stages, keyboard links, boundaries and Back focus passed.');

  const chapterKeys=['costs','health','daily'];
  const chapterLabels=['費用與支持','健康準備','生活安排'];
  const footer=page.locator('.chapter-footer');
  for(const {id} of catalog.stages){
    await go(chapterRoute(id,'costs'));
    for(let i=0;i<chapterKeys.length;i++){
      assert.equal(pathname(),'/stages/'+id);
      assert.equal(params().get('chapter'),chapterKeys[i]);
      await focus(page.locator('#stage-chapter-title'));
      assert.match(await page.locator('#stage-chapter-title').textContent(),new RegExp('^'+chapterLabels[i]));
      assert.deepEqual(await page.locator('.chapter-tabs [aria-current=page]').allTextContents(),[chapterLabels[i]]);
      assert.deepEqual(await footer.getByRole('link').allTextContents(),[
        ...(i>0?['上一章・'+chapterLabels[i-1]]:[]),
        ...(i<2?['下一章・'+chapterLabels[i+1]]:['回本階段目錄',...(id==='childcare'?['手冊首頁']:[])])
      ]);
      if(i<2)await activate(footer.getByRole('link',{name:/下一章/}));
    }
    await activate(footer.getByRole('link',{name:'上一章・健康準備'}));
    await focus(page.locator('#stage-chapter-title'));
    assert.equal(params().get('chapter'),'health');
    await activate(footer.getByRole('link',{name:'上一章・費用與支持'}));
    assert.equal(params().get('chapter'),'costs');
  }
  await go(chapterRoute('childcare','daily'));
  await activate(footer.getByRole('link',{name:'手冊首頁'}));
  assert.equal(pathname(),'/');
  console.log('N3 '+width+': all 15 chapters, forward/backward keyboard links, selected headings and final home passed.');

  await go(chapterRoute('childbirth','health')+'&question=none');
  await shot('packing-collapsed');
  await activate(page.locator('[data-question=hospital-bag] > summary'));
  assert.deepEqual(await page.locator('.packing-questions dt:visible').allTextContents(),['院所提供','需要自備','可現場購買']);
  await page.getByText('待向院所確認',{exact:true}).waitFor();
  await shot('packing-expanded');
  await activate(namedLink('報到與聯絡'));
  assert.equal(params().get('question'),'admission');
  await page.locator('[data-question=admission][open]').waitFor();
  await back();
  await focus(namedLink('報到與聯絡'));
  await go(chapterRoute('postpartum','costs'));
  const fields=['服務時段','服務範圍','計費單位'];
  if(width===1440){
    assert.deepEqual(await page.locator('.care-desktop tbody th:visible').allTextContents(),fields);
    for(const row of await page.locator('.care-desktop tbody tr').all())assert.equal(await row.locator('td').count(),3);
  }else{
    for(const option of await page.locator('[data-care]').all()){
      await activate(option);
      assert.deepEqual(await page.locator('.care-fields dt:visible').allTextContents(),fields);
    }
  }
  await activate(page.getByRole('button',{name:'家人協助'}));
  await page.getByText('家人協助支出：待補',{exact:true}).waitFor();
  await page.reload();
  await page.locator('[data-care=family][aria-pressed=true]').waitFor();
  await shot('care-comparison');
  await go(chapterRoute('postpartum','daily'));
  assert.deepEqual(await page.locator('.handoff-table thead th').allTextContents(),['時段','要接手的事','向誰確認']);
  await page.locator('.handoff-table').getByText('未指定',{exact:true}).first().waitFor();
  await shot('handoff-default');
  await activate(page.locator('[data-question=handoff-at-home] > summary'));
  await page.locator('[data-question=handoff-at-home][open]').getByRole('button',{name:'把提問加入安排'}).waitFor();
  await shot('handoff-expanded');
  await go(chapterRoute('childbirth','daily')+'&question=discharge-ride');
  await activate(postpartum);
  const retryURL=page.url();
  await page.route('**/api/handbook',route=>route.fulfill({status:503,body:''}),{times:1});
  await page.reload();
  await activate(page.getByRole('button',{name:'重試'}));
  await page.locator('#stage-topic-title').waitFor();
  assert.equal(page.url(),retryURL);
  await back();
  await focus(postpartum);
  assert.deepEqual(errors,[]);
  console.log('N4 '+width+': packing and admission, care field alignment, family gap, handoff and retry passed.');
  await page.close();
}
