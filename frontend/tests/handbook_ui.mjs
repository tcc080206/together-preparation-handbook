// Run against the local handbook server with Playwright and Chrome installed.
import assert from 'node:assert/strict';
import {verifyNavigation} from './navigation.mjs';
import {verifyStageData} from './stage_data.mjs';
import {verifyKnowledgePilot} from './knowledge_pilot.mjs';
import {inspectFormat} from './format_checks.mjs';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const playwright = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.HANDBOOK_BROWSER || 'chromium';
const baseURL = process.env.HANDBOOK_URL || 'http://127.0.0.1:8780';
const browser = await playwright[engine].launch(engine==='chromium' ? {channel:'chrome'} : {});
const shots = process.env.HANDBOOK_SCREENSHOTS;
async function capture(page, label) {
  const size = page.viewportSize();
  const dir = join(shots,engine,size.width+'x'+size.height);
  await mkdir(dir,{recursive:true});
  const route = new URL(page.url()).pathname.slice(1).replaceAll('/','_');
  await page.screenshot({path:join(dir,route+'-'+label+'.png'),fullPage:true,animations:'disabled'});
}
const key = 'together-preparation-v1';

async function verifyLayout(context, catalog) {
  const routes = [
    '/preconception', '/plan', '/plan/new', '/plan/custom_0', '/settings',
    ...catalog.topics.map(t => '/preconception/topics/'+t.id),
    ...catalog.item_guides.map(g => '/items/'+g.item_id),
    ...catalog.stages.map(s=>s.id).flatMap(s =>
      ['', '?chapter=health', '?chapter=daily'].map(q => '/stages/'+s+q))
  ];
  const extra = new Set(['/plan?p=2','/plan?p=4','/plan?status=已完成','/items/missing','/benefits/missing','/plan/missing']);
  for (const stage of ['pregnancy','childbirth','postpartum','childcare']) {
    extra.add('/preconception?stage='+stage+'#chapters');
  }
  catalog.reading_sections.forEach((_,i)=>extra.add('/preconception?chapter='+i));
  for (const topic of catalog.topics) {
    const guides = catalog.item_guides.filter(g=>g.primary_topic_id===topic.id || g.related_topic_ids.includes(topic.id));
    const facets = new Set(guides.flatMap(g=>g.content_facets));
    for (const facet of ['',...facets]) {
      const subset = guides.filter(g=>!facet || g.content_facets.includes(facet));
      const group = g=>g.topic_groups?.[topic.id] || g.reading_group;
      for (const section of ['',...new Set(subset.map(group))]) {
        const count = subset.filter(g=>!section || group(g)===section).length;
        for (let p=1;p<=Math.ceil(count/4);p++) {
          const q=new URLSearchParams();
          if (facet) q.set('facet',facet);
          if (section) q.set('section',section);
          if (p>1) q.set('p',p);
          if (q.size) extra.add('/preconception/topics/'+topic.id+'?'+q);
        }
      }
    }
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('/start');
  await page.locator('.life-grid').waitFor();
  // Isolated browser storage, including a full agenda and long custom fields.
  await page.evaluate(key => {
    const records = Array.from({length:15}, (_,i) => ({
      id:'custom_'+i, kind:'custom', title:'一起安排家中的照顧事項'.repeat(12),
      owner:'家人'.repeat(50), notes:'備註'.repeat(2500), status:'待確認',
      date:'2026-12-01', createdAt:'2026-01-01'
    }));
    localStorage.setItem(key,JSON.stringify({records,preferences:{region:'TW-TPE'},noticeSeen:true}));
  },key);

  for (const [width,height] of [[568,320],[320,480],[320,568],[390,844],[667,375],[768,1024],[1440,900],[720,450]]) {
    await page.setViewportSize({width,height});
    let max = 0, checks = 0;
    async function measure(label) {
      await page.evaluate(()=>document.fonts.ready);
      const {screens, overflow, faults} = await page.evaluate(inspectFormat);
      const where = page.url()+' '+label+' @ '+width+'×'+height;
      if (shots && (faults.length || overflow || screens>3)) await capture(page,'failure');
      assert.deepEqual(faults,[],where);
      assert.equal(overflow,0,where+' overflows horizontally');
      assert.ok(screens <= 3,where+' is '+screens.toFixed(2)+' screens tall');
      max = Math.max(max,screens);
      checks++;
    }
    for (const path of routes) {
      await page.goto(path);
      await page.locator('h1').waitFor();
      assert.equal(await page.locator('#retry').count(),0,path);
      await measure('initial');
      const stage = path.startsWith('/stages/');
      for(const selector of ['.packing-add > summary','.care-mobile > summary']){
        const disclosure=page.locator(selector);
        if(await disclosure.isVisible()){
          await disclosure.click();
          await measure('expanded '+selector);
          await disclosure.click();
        }
      }
      const keyShot = [390,1440].includes(width) && !path.includes('?') && (stage || path==='/preconception');
      if (shots && keyShot) await capture(page,'initial');
      if (path.startsWith('/preconception/topics/') && !path.includes('?')) {
        await page.locator('.stage-index > summary').press('Enter');
        await measure('expanded categories');
      }
      const alternate = page.locator('.stage-question:not([open]) > summary').first();
      if (await alternate.count()) {
        await alternate.click();
        await measure('expanded question');
        if (shots && keyShot) await capture(page,'expanded');
      } else if (stage && await page.locator('.stage-question > summary').count()) {
        await page.locator('.stage-question > summary').click();
        await measure('collapsed question');
        if (shots && keyShot) await capture(page,'collapsed');
      }
      if (shots && stage && [390,1440].includes(width) && path.includes('?chapter=')) {
        if (!await page.locator('.stage-question[open]').count() && await page.locator('.stage-question').count()) await page.locator('.stage-question > summary').first().click();
        await capture(page,path.split('?chapter=')[1]+'-question');
      }
      const summary = page.locator('.stage-index > summary');
      if (await summary.count()) {
        await summary.click();
        await measure('expanded index');
      }
      for (const prompt of await page.locator('[data-prompt]').all()) {
        await prompt.click();
        await measure('prompt');
      }
      const groups = await page.locator('#matrix-group option').evaluateAll(opts=>opts.map(o=>o.value));
      for (const group of groups) {
        await page.locator('#matrix-group').selectOption(group);
        await measure('comparison '+group);
        for (const mode of await page.locator('[data-conditions]').all()) {
          await mode.click();
          await measure('compare '+await mode.textContent());
        }
      }
      const tabs = await page.getByRole('tab').all();
      for (const tab of tabs.slice(1)) {
        await tab.click();
        await measure('task');
        const panel = page.locator('[role=tabpanel]:visible');
        const choice = panel.locator('[data-record-choice]');
        const ids = await choice.locator('option').evaluateAll(opts=>opts.map(o=>o.value));
        for (const id of ids) {
          await choice.selectOption(id);
          for (const section of await panel.locator('details').all()) {
            await section.evaluate(el=>el.open=true);
            await measure(id+' '+await section.locator('summary').textContent());
          }
        }
      }
    }
    for (const path of extra) {
      await page.goto(path);
      await page.locator('h1').waitFor();
      assert.equal(await page.locator('#retry').count(),0,path);
      const details = page.locator('.stage-index');
      if (await details.count()) await details.evaluate(el=>el.open=true);
      await measure('filter or page');
    }
    console.log(width+'×'+height+' | '+routes.length+' routes | '+checks+' views | max '+max.toFixed(2)+' screens');
  }
  assert.deepEqual(errors,[]);
  await page.close();
}

async function verifyActions(context, catalog) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  const subsidy = catalog.item_guides.find(g=>g.category_ids.includes('allowance'));
  const url = '/items/'+subsidy.item_id;
  await page.goto('/start');
  await page.locator('.life-grid').waitFor();
  await page.keyboard.press('Tab');
  await page.locator('.skip:focus').waitFor();
  await page.keyboard.press('Enter');
  await page.locator('#main:focus').waitFor();
  assert.equal(await page.locator('.life-grid a').count(),5);
  await page.locator('[data-stage-preview=preconception]').click();
  await page.locator('#chapters:focus').waitFor();
  await page.getByRole('link',{name:/產前檢查/}).click();
  await page.getByRole('heading',{name:'準備下一次產檢',exact:true}).waitFor();
  await page.goto('/preconception');
  await page.getByRole('link',{name:'孕前疫苗紀錄'}).click();
  await page.getByRole('heading',{name:/檢查疫苗接種紀錄/}).waitFor();
  await page.goto('/preconception');
  await page.getByRole('link',{name:/準備清單/}).click();
  await page.waitForURL(url=>url.pathname==='/plan');
  await page.goto('/preconception');
  await page.getByRole('link',{name:'育兒津貼與托育補助'}).click();
  await page.getByRole('heading',{name:subsidy.title}).waitFor();
  assert.equal(await page.locator('.article-related').count(),0);
  assert.equal(new URL(page.url()).pathname,url);
  await page.goto('/preconception');
  await page.locator('#chapters .chapter-link').nth(1).click();
  await page.locator('#stage-chapter-title').getByText(catalog.reading_sections[1].title).waitFor();
  const topicPath = '/preconception/topics/'+subsidy.primary_topic_id;
  await page.goto(topicPath+'?facet=support');
  await page.locator('.guide-card').filter({hasText:subsidy.title}).click();
  assert.equal(await page.locator('h1').textContent(),subsidy.title);
  assert.ok((await page.locator('a.back').getAttribute('href')).includes('facet=support'));

  await page.goto(url+'#panel-1');
  await page.locator('#panel-1:visible').waitFor();
  await page.goto(url+'?task=0');
  const groups = await page.locator('#matrix-group option').evaluateAll(opts=>opts.map(o=>o.value));
  const reachable = new Set();
  for (const g of groups) {
    await page.locator('#matrix-group').selectOption(g);
    for (const button of await page.locator('.amount').all()) {
      const id = await button.getAttribute('data-record');
      reachable.add(id);
      const r = catalog.records.find(r=>r.id===id);
      assert.equal(await button.textContent(),Number(r.fields.金額).toLocaleString('en-US'));
    }
  }
  // Known published scenarios must remain reachable when switches or tabs change.
  const published = catalog.records.filter(r=>subsidy.category_ids.includes(r.type) &&
    ['TW','中央／全國','全臺灣（中央上限，不含地方加碼）'].includes(r.fields.地區));
  if (published.length) {
    await page.getByRole('tab',{name:'完整記錄'}).click();
    const ids = await page.locator('[role=tabpanel]:visible option').evaluateAll(opts=>opts.map(o=>o.value));
    for (const r of published) assert.ok(ids.includes(r.id),r.title);
    if (groups.length) {
      assert.ok(reachable.size>0);
      await page.getByRole('tab',{name:'方案比較'}).click();
    }
  }
  if (groups.length) {
    await page.locator('#matrix-group').selectOption(groups[0]);
    const amount = page.locator('.amount').first();
    const id = await amount.getAttribute('data-record');
    await amount.click();
    assert.equal(await page.locator('[role=tabpanel]:visible select').inputValue(),id);
    await page.getByRole('tab',{selected:true}).press('ArrowRight');
    assert.equal(await page.getByRole('tab',{selected:true}).textContent(),'申辦資訊');
    await page.locator('[role=tabpanel]:visible summary').last().click();
    assert.ok(await page.locator('[role=tabpanel]:visible details[open] a').count());
    const source = page.locator('[role=tabpanel]:visible details[open]');
    assert.match(await source.textContent(),/適用地區.*核對日期/s);
    assert.equal(await page.locator('.article-meta time').count(),1);
  }
  await page.locator('#scope-region').selectOption('TW-TPE');
  assert.match(await page.locator('.detail-foot').textContent(),/臺北市/);
  await page.reload();
  assert.equal(await page.locator('#scope-region').inputValue(),'TW-TPE');
  const legacy = catalog.item_program_links[0];
  await page.goto('/benefits/'+legacy.program_version_id);
  await page.waitForURL('**/items/'+legacy.item_id+'#'+legacy.program_version_id);

  // A preparation question is saved only on explicit add. Existing notes survive.
  const promptGuide = catalog.item_guides.find(g=>!catalog.records.some(r=>g.category_ids.includes(r.type)));
  if (promptGuide) {
    await page.goto('/items/'+promptGuide.item_id);
    await page.locator('[data-prompt]').last().click();
    const question = await page.locator('.prompt-sheet [data-prompt-text]:visible').textContent();
    await page.getByRole('button',{name:'把提問加入安排'}).click();
    await page.getByRole('button',{name:'查看我的安排'}).click();
    assert.equal(await page.locator('[name=notes]').inputValue(),question);
    await page.locator('[name=owner]').fill('家人');
    await page.locator('[name=date]').fill('2026-12-05');
    await page.locator('[name=status]').selectOption('準備中');
    await page.getByRole('button',{name:'儲存安排'}).click();
    await page.locator('.agenda a').click();
    assert.equal(await page.locator('[name=notes]').inputValue(),question);
    assert.equal(await page.locator('[name=owner]').inputValue(),'家人');
    assert.equal(await page.locator('[name=date]').inputValue(),'2026-12-05');
  }
  await page.goto('/plan/new');
  await page.locator('[name=title]').fill('一起參觀托育中心');
  await page.getByRole('button',{name:'儲存安排'}).click();
  await page.getByRole('link',{name:'一起參觀托育中心，編輯安排'}).waitFor();
  await page.getByRole('link',{name:'一起參觀托育中心，編輯安排'}).click();
  await page.getByRole('button',{name:'移除安排'}).click();
  assert.equal(new URL(page.url()).pathname,'/plan');
  await page.getByRole('button',{name:'復原'}).click();
  await page.getByRole('link',{name:'一起參觀托育中心，編輯安排'}).waitFor();
  await page.goto('/settings');
  await page.locator('[name=region]').selectOption('TW-NWT');
  await page.getByRole('button',{name:'儲存設定'}).click();
  await page.waitForURL('**/preconception');
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).preferences.region,key),'TW-NWT');

  await page.route('**/api/handbook',route=>route.fulfill({status:503,body:''}),{times:1});
  await page.goto(url);
  await page.getByRole('button',{name:'重試'}).click();
  await page.locator('#guide-reader').waitFor();
  assert.deepEqual(errors,[]);
  await page.close();
}

async function verifyStages(context) {
  const page = await context.newPage();
  const old = {id:'custom_old',kind:'custom',title:'原有安排',date:'2026-12-01',
    owner:'小林',notes:'原有備註',status:'待確認',createdAt:'2026-01-01T00:00:00.000Z',priority:'yes'};
  await page.goto('/preconception');
  await page.locator('.life-grid').waitFor();
  await page.evaluate(({key,old})=>localStorage.setItem(key,JSON.stringify({
    records:[old],preferences:{region:'TW-NWT'},noticeSeen:true
  })),{key,old});
  await page.goto('/plan/custom_old');
  assert.equal(await page.locator('[name=notes]').inputValue(),old.notes);

  async function keyboard(locator) {
    await locator.focus();
    // Use an actual keyboard event so focus-visible modality is active.
    await page.keyboard.press('Shift');
    assert.equal(await locator.evaluate(el=>getComputedStyle(el).outlineWidth),'3px');
    await page.keyboard.press('Enter');
  }
  async function saveStage() {
    await keyboard(page.getByRole('button',{name:'把提問加入安排'}));
    await page.getByRole('button',{name:'查看我的安排'}).waitFor();
  }

  await page.goto('/preconception');
  await page.getByRole('link',{name:/產前檢查/}).click();
  await page.waitForURL(url=>url.pathname==='/stages/pregnancy'&&url.searchParams.get('chapter')==='health');
  await page.reload();
  await page.getByRole('heading',{name:'準備下一次產檢',exact:true}).waitFor();
  assert.equal(await page.locator('.stage-question[open] summary').textContent(),'產檢當天要帶什麼？');
  const question = page.getByText('有哪些問題想當面問醫師或助產人員？',{exact:true});
  await keyboard(question);
  assert.equal(await page.locator('.stage-question[open] summary').textContent(),await question.textContent());
  if (engine==='chromium') {
    const cdp=await context.newCDPSession(page);
    const {nodes}=await cdp.send('Accessibility.getFullAXTree');
    const disclosure=nodes.find(n=>n.name?.value==='有哪些問題想當面問醫師或助產人員？' &&
      n.properties?.some(p=>p.name==='expanded'));
    assert.equal(disclosure?.properties.find(p=>p.name==='expanded').value.value,true);
    await cdp.detach();
  }
  await page.waitForURL(url=>url.searchParams.get('question')==='visit-questions');
  await page.reload();
  assert.equal(await page.locator('.stage-question[open] summary').textContent(),await question.textContent());
  await saveStage();
  await page.goBack();
  await page.locator('.life-grid').waitFor();

  await page.locator('[data-stage-preview=childbirth]').click();
  await keyboard(page.locator('#chapters').getByRole('link',{name:/住院準備清單/}));
  await page.getByRole('heading',{name:/住院準備清單/}).waitFor();
  await saveStage();
  await page.getByRole('button',{name:'查看我的安排'}).click();
  await page.getByLabel(/負責人/).fill('伴侶');
  await page.getByRole('button',{name:'儲存安排'}).click();
  await page.getByRole('link',{name:/住院期間有哪些用品/}).waitFor();

  await page.goto('/preconception');
  await page.locator('[data-stage-preview=postpartum]').click();
  await keyboard(page.locator('#chapters').getByRole('link',{name:/家人分工/}));
  await page.getByRole('heading',{name:/家人分工/}).waitFor();
  await saveStage();
  await page.getByRole('button',{name:'查看我的安排'}).click();
  await page.getByLabel(/備註/).fill('週末請姊姊協助採買。');
  await page.getByRole('button',{name:'儲存安排'}).click();
  await page.waitForURL('**/plan?status=*');
  await page.reload();
  await page.locator('#plan-sort').selectOption('added');
  await page.waitForURL('**/plan?*sort=added');
  assert.deepEqual(await page.locator('.agenda tbody th a').allTextContents(),[
    old.title,'有哪些問題想當面問醫師或助產人員？','住院期間有哪些用品需要自備？','誰能到家裡幫忙，願意接手哪一件事？'
  ]);
  const arrangements = await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).records,key);
  assert.deepEqual(arrangements[0],old);
  assert.equal(arrangements[2].owner,'伴侶');
  assert.equal(arrangements[3].notes,'週末請姊姊協助採買。');
  await page.getByRole('link',{name:/誰能到家裡幫忙/}).click();
  assert.equal(await page.getByLabel(/備註/).inputValue(),arrangements[3].notes);
  await page.getByRole('link',{name:'查看手冊提問'}).click();
  await page.getByRole('heading',{name:/家人分工/}).waitFor();

  await page.goto('/preconception');
  await page.locator('[data-stage-preview=childcare]').click();
  await keyboard(page.locator('#chapters').getByRole('link',{name:/費用與支持/}));
  const costs = page.getByRole('link',{name:'費用與支持',exact:true});
  await page.waitForURL('**/stages/childcare?chapter=costs');
  const careQuestion = page.locator('.stage-question > summary');
  await keyboard(careQuestion);
  await page.waitForURL(url=>url.searchParams.get('question')==='none');
  const stage = page.url();
  const guide = page.getByRole('link',{name:/育兒津貼與托育補助/});
  await keyboard(guide);
  await page.getByRole('table').waitFor();
  await page.getByText(/原文範圍/).waitFor();
  await page.locator('.local-coverage').getByText(/新北市/).waitFor();
  const amount = page.locator('.amount').first();
  if (await amount.count()) {
    await keyboard(amount);
    await keyboard(page.getByText('核對日期與來源',{exact:true}));
    const source = page.locator('[role=tabpanel]:visible details[open] a').first();
    await source.focus();
    assert.equal(await source.evaluate(el=>el===document.activeElement),true);
    const sourceURL = await source.getAttribute('href');
    await page.route(sourceURL,route=>route.fulfill({body:'來源測試'}),{times:1});
    await page.keyboard.press('Enter');
    await page.waitForURL(sourceURL);
    await page.goBack();
    await page.locator('#guide-reader').waitFor();
  }
  await page.getByRole('link',{name:'返回育兒（0–6 歲）'}).click();
  await page.waitForURL(stage);
  await guide.click();
  await page.locator('#guide-reader').waitFor();
  await page.goBack();
  await page.waitForURL(stage);
  await page.reload();
  assert.equal(await costs.getAttribute('aria-current'),'page');
  assert.equal(await page.locator('.stage-question[open]').count(),0);
  await keyboard(careQuestion);

  await page.emulateMedia({reducedMotion:'reduce'});
  assert.ok(await page.locator('.stage-question button:visible').evaluate(el=>
    getComputedStyle(el).transitionDuration.split(',').every(duration=>duration.trim()==='0s')));
  await page.route('**/api/handbook',route=>route.fulfill({status:503,body:''}),{times:1});
  await page.goto('/stages/childbirth?chapter=health');
  await keyboard(page.getByRole('button',{name:'重試'}));
  await page.getByRole('heading',{name:/住院準備清單/}).waitFor();
  await page.close();
}

async function verifyHomePreviews(context,catalog) {
  const page = await context.newPage();
  await page.goto('/preconception');
  const labels=['費用與支持','健康準備','生活安排'];
  const keys=['costs','health','daily'];
  for (const {id,title} of catalog.stages) {
    const card=page.locator('[data-stage-preview='+id+']');
    await (page.viewportSize().width===390 ? card.press('Enter') : card.click());
    const panel=page.getByRole('region',{name:title+'章節',exact:true});
    await page.locator('#chapters:focus').waitFor();
    await panel.waitFor();
    assert.equal(new URL(page.url()).pathname,'/');
    assert.equal(new URL(page.url()).hash,'#chapters');
    assert.equal(await card.getAttribute('aria-current'),'true');
    assert.equal(await page.locator('.life-card[aria-current]').count(),1);
    const styleSet = locator=>locator.evaluateAll(nodes=>nodes.map(el=>{
      const s=getComputedStyle(el);
      return [s.backgroundColor,s.fontFamily,s.fontSize,s.fontWeight,s.gridColumn,el.offsetWidth];
    }));
    for(const selector of ['.life-card:not([aria-current])','.resource-link']){
      const weights=await styleSet(page.locator(selector));
      assert.ok(weights.every(w=>JSON.stringify(w)===JSON.stringify(weights[0])),JSON.stringify(weights));
    }
    const contrast=await page.locator('.life-card strong,.life-card span:not(.card-arrow),.resource-link strong')
      .evaluateAll(nodes=>{
        const luminance=rgb=>rgb.match(/\d+/g).slice(0,3).map(Number).map(x=>x/255)
          .map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4)
          .reduce((sum,x,i)=>sum+x*[0.2126,0.7152,0.0722][i],0);
        return Math.min(...nodes.map(node=>{
          const fg=luminance(getComputedStyle(node).color);
          const bg=luminance(getComputedStyle(node.closest('a')).backgroundColor);
          return (Math.max(fg,bg)+0.05)/(Math.min(fg,bg)+0.05);
        }));
      });
    assert.ok(contrast>=4.5,contrast);
    assert.equal(await card.locator('strong').evaluate(node=>getComputedStyle(node).textDecorationLine),'underline');
    if(shots)await capture(page,id+'-home');
    const resource=page.getByRole('link',{name:'育兒津貼與托育補助',exact:true});
    await resource.click();
    assert.equal(new URL(page.url()).pathname,'/items/items_095c7855adf6a94c');
    await page.locator('a.back').click();
    await resource.waitFor({state:'visible'});
    await page.locator('.resource-link:focus').waitFor();
    assert.equal(await card.getAttribute('aria-current'),'true');
    assert.deepEqual(await panel.locator('.chapter-link strong').allTextContents(),labels);
    for(const [i,key] of keys.entries()){
      const entry=panel.locator('.chapter-link').nth(i);
      await (page.viewportSize().width===390?entry.press('Enter'):entry.click());
      await page.waitForURL('**/stages/'+id+'?chapter='+key);
      await page.locator('#stage-chapter-title:focus').waitFor();
      assert.equal(await page.locator('.chapter-tabs [aria-current]').textContent(),labels[i]);
      if(id==='preconception'){
        assert.equal(await page.locator('[data-focus-key^=catalog-]').count(),[3,4,1][i]);
        if(key==='health'){
          await page.locator('[data-focus-key=catalog-health]').click();
          await page.locator('.guide-card').first().waitFor();
          const category=page.url();
          await page.locator('.guide-card').first().click();
          await page.locator('a.back').click();
          await page.locator('.guide-card:focus').waitFor();
          assert.equal(page.url(),category);
          await page.locator('a.back').click();
          await page.locator('[data-focus-key=catalog-health]:focus').waitFor();
        }
      }
      await page.locator('a.back').click();
      await panel.waitFor();
    }
    await page.reload();
    await page.locator('#chapters:focus').waitFor();
  }
  for (const [query,expected] of [
    ['?chapter=1','#stage-chapter-title'],
    ['?chapter=2&stage=pregnancy','#chapters'],
    ['?chapter=1#chapters','#chapters'],
  ]) {
    await page.goto('/preconception'+query);
    await page.locator(expected).waitFor();
    if(query.includes('stage=')){
      await page.locator('[data-stage-preview=preconception]').click();
      assert.match(await page.locator('#chapters [aria-current]').textContent(),/生活安排/);
    }
  }
  await page.goto('/stages/unknown');
  await page.getByRole('heading',{name:'找不到這筆記錄'}).waitFor();
  await page.goto('/stages/pregnancy?chapter=unknown');
  await page.locator('#stage-topic-title').getByText('產檢公費與補助').waitFor();
  console.log(page.viewportSize().width+'px: home, five equal stage selections, 15 chapter links, all catalog topics and legacy routes passed.');
  await page.close();
}

async function verifyMissingData(context, catalog) {
  const page = await context.newPage();
  const subsidy = catalog.item_guides.find(g=>g.category_ids.includes('allowance'));
  const empty = catalog.item_guides.find(g=>g.title==='雙方一般健康檢查');
  const url = '/items/'+subsidy.item_id;
  const central = {
    id:'test-central', type:'allowance', title:'未滿2歲育兒津貼：第1名',
    fields:{地區:'TW', 單位:'新臺幣／人／月', 金額:'5000', 條件:'測試條件'},
    sources:[{title:'測試來源',url:'https://example.org/fixture',locator:'表1第1列'}],
    checked_at:'2026-11-21'
  };
  const reserved = {
    ...central, checked_at:null, id:'test-second', type:'tw-childcare-general', title:'公共化托育一般家庭：第2名',
    fields:{...central.fields, 單位:'新臺幣元／人／月', 金額性質:'補助上限', 金額:null}
  };
  const local = {
    ...central, id:'test-local', type:'tpe-childcare-amounts', title:'測試地方托育補助',
    fields:{...central.fields, 地區:'TW-TPE'}
  };
  let records = [central, reserved];
  await page.route('**/api/handbook', route=>route.fulfill({json:{...catalog,records}}));
  await page.goto('/items/'+empty.item_id);
  await page.getByRole('heading',{name:empty.title,exact:true}).waitFor();
  await page.getByRole('heading',{name:'健檢前想確認什麼？'}).waitFor();
  await page.getByRole('button',{name:'把提問加入安排'}).waitFor();
  await page.getByRole('tab',{name:'資料狀態'}).click();
  assert.match(await page.locator('#panel-1').textContent(),/雙方一般健康檢查的公開記錄待補/);
  await page.locator('#scope-region').selectOption('TW-TPE');
  await page.goto(url);
  const coverage = page.locator('.local-coverage');
  await coverage.getByText('臺北市：本縣市資料待補。').waitFor();
  assert.equal(await page.locator('.amount').first().textContent(),'5,000');
  const cell = page.locator('.matrix tr').filter({has:page.getByRole('rowheader',{name:/公共化托育/})}).locator('td').nth(1);
  assert.equal(await cell.textContent(),'待補');
  await cell.getByRole('button').click();
  assert.equal(await page.locator('[data-record-choice]').inputValue(),reserved.id);
  const amountSection = page.locator('details').filter({hasText:'金額與內容'});
  await amountSection.locator('summary').click();
  await amountSection.getByText('待補',{exact:true}).waitFor();
  await page.getByText('核對日期與來源',{exact:true}).press('Enter');
  await page.getByText('適用地區 中央／全國・核對日期 待確認',{exact:true}).waitFor();
  await page.getByRole('tab',{name:'方案比較'}).click();
  await page.locator('#matrix-group').selectOption('2');
  assert.equal(await page.locator('.matrix td.gap').count(),3);
  await page.locator('#matrix-group').selectOption('0');

  records = [central, {...reserved,fields:{...reserved.fields,金額:'8000'}}, local];
  await page.reload();
  await cell.getByRole('button',{name:/8,000/}).waitFor();
  await coverage.getByRole('button',{name:'1 筆地方資料'}).click();
  assert.equal(await page.locator('[data-record-choice]').inputValue(),local.id);
  await page.locator('#panel-1 summary').last().click();
  await page.getByRole('link',{name:'測試來源'}).waitFor();

  records = [central];
  await page.reload();
  await coverage.getByText('臺北市：本縣市資料待補。').waitFor();
  await page.getByRole('tab',{name:'方案比較'}).click();
  assert.equal(await cell.textContent(),'待補');
  assert.equal(await cell.getByRole('button').count(),0);

  records = [];
  await page.goto('/stages/childcare');
  await page.getByRole('link',{name:/育兒津貼與托育補助/}).click();
  await page.getByRole('heading',{name:subsidy.title,exact:true}).waitFor();
  await page.locator('.matrix td.gap').first().waitFor();
  assert.equal(await page.locator('.matrix td.gap').count(),9);
  await page.getByRole('tab',{name:'準備提問'}).click();
  await page.getByRole('heading',{name:'先釐清照顧情境'}).waitFor();
  await page.getByRole('button',{name:'把提問加入安排'}).waitFor();
  await page.getByRole('link',{name:'返回育兒（0–6 歲）'}).click();
  await page.getByRole('button',{name:'把提問加入安排'}).click();
  await page.getByRole('button',{name:'查看我的安排'}).waitFor();
  await page.close();
}

try {
  const context = await browser.newContext({baseURL});
  const catalog = await (await context.request.get('/api/handbook')).json();
  await verifyLayout(context,catalog);
  await context.close();
  const actions = await browser.newContext({baseURL,viewport:{width:390,height:844}});
  await verifyActions(actions,catalog);
  await verifyHomePreviews(actions,catalog);
  await actions.close();
  const desktop=await browser.newContext({baseURL,viewport:{width:1440,height:900}});
  await verifyHomePreviews(desktop,catalog);
  await desktop.close();
  const stages = await browser.newContext({baseURL,viewport:{width:390,height:844}});
  await verifyStages(stages);
  await stages.close();
  console.log('Four stage journeys, keyboard operation, saved arrangement integrity and stage retry passed.');
  for (const [width,height] of [[390,844],[1440,900]]) {
    const navigation=await browser.newContext({baseURL,viewport:{width,height}});
    await verifyNavigation(navigation,catalog,shots?capture:null);
    await navigation.close();
    const stageData=await browser.newContext({baseURL,viewport:{width,height}});
    await verifyStageData(stageData,catalog,shots?capture:null);
    await stageData.close();
    const knowledge=await browser.newContext({baseURL,viewport:{width,height}});
    await verifyKnowledgePilot(knowledge,catalog,shots?capture:null);
    await knowledge.close();
  }
  const gaps = await browser.newContext({baseURL,viewport:{width:390,height:844}});
  await verifyMissingData(gaps,catalog);
  console.log('Navigation, comparison, sources, personal records, preferences and retry passed.');
  console.log('Empty item, unknown amount, missing group and locality, publication and withdrawal passed.');
} finally {
  await browser.close();
}
