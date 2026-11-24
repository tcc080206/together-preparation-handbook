import {topicRecords,bindTopicRecords} from './stage-records.mjs';
import {facetRank} from './economics.mjs';
import {visibleRecords,reviewedDetail} from './handbook.mjs';
import {statuses,regionLabels,addRecord,sortedPlan} from './model.mjs';
import {adjacentStages, chapterFooter, handoffTable} from './stage-reading.mjs';
import {stageChapters,stageQuestion,stageURL,questionId} from './stages.mjs';
import {preparation,bindPreparation} from './preparation.mjs';
import {cycleKnowledge} from './knowledge.mjs';
import {packingEditor,bindPacking} from './packing.mjs';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let params=new URLSearchParams(location.search), path=location.pathname;
const main=$('#main'), modal=$('#modal');
const KEY='together-preparation-v1';
let data, state={records:[],preferences:{stage:'',region:''},noticeSeen:false}, storageBroken=false,dirty=false,undoAction=null,toastTimer;
let compare=[],comparisonReadError=false;
try{const s=localStorage.getItem(KEY);if(s){const parsed=JSON.parse(s);if(!Array.isArray(parsed.records)||!parsed.preferences)throw Error('invalid');state=parsed;if(['TW','other'].includes(state.preferences.region)){localStorage.setItem(KEY+'-migration-backup',s);state.preferences.region='';localStorage.setItem(KEY,JSON.stringify(state));}}}catch{storageBroken=true;}
try{compare=JSON.parse(sessionStorage.getItem('preparation-compare')||'[]');if(!Array.isArray(compare))throw Error('invalid');}catch{compare=[];comparisonReadError=true;}
const item=id=>data.items.find(i=>i.id===id);
const link=(url,text,cls='')=>`<a class="${cls}" ${cls==='back'?`aria-label="${esc(text)}"`:''} href="${esc(url)}">${esc(text)}</a>`;
function currentURL(){return location.pathname+location.search+location.hash;}
function stageReturn(){
 const from=params.get('from');
 if(!from?.startsWith('/') || /^[/][\\/]/.test(from) || /[\\\x00-\x1f]/.test(from))return null;
 const url=new URL(from,location.origin);
 if(url.origin!==location.origin)return null;
 const route=url.pathname;
 const chapterParam=url.searchParams.get('chapter');
 const legacy=homePaths.includes(route) && /^[012]$/.test(chapterParam) &&
   !stageById(url.searchParams.get('stage')) && url.hash!=='#chapters';
 const stage=legacy ? stageById('preconception') : route.startsWith('/stages/') && stageById(route.slice(8));
 const chapter=legacy ? stageChapters[Number(chapterParam)][0] : chapterParam||'costs';
 const catalog=route.match(/^\/preconception\/topics\/([^/]+)$/);
 const category=catalog && catalogTopic(catalog[1]);
 const item=route.startsWith('/items/') && guide(route.slice(7));
 if(stage||category||item||homePaths.includes(route)||['/plan','/benefits','/costs'].includes(route)) {
   let categoryTitle=category?.title;
   if(category && Number(url.searchParams.get('p'))>1){
     const {rows,legacy}=topicListing(category.id,url.searchParams);
     const {current}=pagination(rows.length,4,url.searchParams);
     if(legacy&&current>1)categoryTitle='「'+category.title+'」第 '+current+' 頁';
   }
   return {url:url.pathname+url.search+url.hash,title:stage?.title||categoryTitle||item?.title||
     (route==='/plan'?'我的安排':'手冊首頁'),stage,chapter,category,item};
 }
 return null;
}
function safeBack(fallback){return stageReturn()?.url||fallback;}
function detailURL(base,id){return `${base}/${encodeURIComponent(id)}?from=${encodeURIComponent(currentURL())}`;}
function page(title,body,subtitle='',action=''){document.title=`${title}｜一起準備`;main.innerHTML=`<div class="page-head"><div><h1 tabindex="-1">${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>${action}</div>${body}`;}
function toast(message,undo){clearTimeout(toastTimer);undoAction=undo||null;$('#feedback').innerHTML=`<span>${esc(message)}</span>${undo?'<button data-action="undo">復原</button>':''}`;if(!undo)toastTimer=setTimeout(()=>{$('#feedback').textContent='';},7000);}
function save(next){try{localStorage.setItem(KEY,JSON.stringify(next));state=next;storageBroken=false;return true;}catch{toast('尚未儲存，請重試。請確認瀏覽器允許網站儲存資料。');return false;}}
function openDialog(html,cls=''){modal.className=cls;modal.innerHTML=`<button class="close quiet" aria-label="關閉" data-action="close-dialog">×</button>${html}`;const heading=modal.querySelector('h2');if(heading){heading.id='dialog-title';modal.setAttribute('aria-labelledby',heading.id);}modal.showModal();const first=modal.querySelector('input,select,button:not(.close),a');first?.focus();}
function confirmation(title,text,action){openDialog(`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="dialog-actions"><button class="primary" id="confirm-action">確認</button><button data-action="close-dialog">取消</button></div>`);$('#confirm-action').onclick=()=>{modal.close();action();};}
const activePreparation = () => main.querySelector(':is([role=tabpanel]:not([hidden]),.knowledge-preparation) .prompt-sheet');
function updateAddButtons(){ $$('[data-action="add"]').forEach(b=>{const exists=state.records.some(r=>r.id===b.dataset.id);b.textContent=exists?'查看我的安排':(b.dataset.kind==='benefit'?'加入待確認':(b.dataset.kind==='stage'||activePreparation())?'把提問加入安排':'加入我的安排');b.classList.toggle('saved',exists);});}
function addToPlan(id,kind='item'){
 const exists=state.records.find(r=>r.id===id);if(exists){sessionStorageSafe('scroll:'+currentURL(),String(scrollY));window.dispatchEvent(new Event('pagehide'));location.href=`/plan/${id}?from=${encodeURIComponent(currentURL())}`;return;}
 if(storageBroken){toast('現有個人紀錄無法讀取。請先至使用設定處理，避免覆蓋原紀錄。');return;}
 const source=kind==='stage'?stageQuestion(data.stages,id):item(id);if(!source)return;
 const record={region:state.preferences.region,id,title:guide(id)?.title||source.title||source.name,kind,notes:kind==='benefit'?'請確認我的情況是否適用，以及需準備哪些文件。':''};
 const first=!state.noticeSeen;
 const prompt = activePreparation()?.querySelector('[data-prompt-text]:not([hidden])');
 if (kind==='stage') record.notes=source.notes;
 if (prompt) record.notes = prompt.textContent;
 if(save({...state,records:addRecord(state.records,record),noticeSeen:true})){
  updateAddButtons();toast(first?'已加入我的安排。安排保存在這個瀏覽器，清除瀏覽資料可能移除紀錄。':(prompt||kind==='stage')?'提問已加入安排的備註':'已加入我的安排',()=>{if(save({...state,records:state.records.filter(r=>r.id!==id)})){updateAddButtons();toast('已復原加入');}});
 }
}
function savePacking(id,packing){
 let current;
 try {
   const raw = localStorage.getItem(KEY);
   current = raw===null ? {...state,records:[]} : JSON.parse(raw);
   if(!Array.isArray(current?.records)||!current.preferences)return false;
 } catch {return false;}
 const exists = current.records.some(record=>record.id===id);
 const question = stageQuestion(data.stages,id);
 const records = exists ? current.records.map(record=>record.id===id?{...record,packing}:record) :
   addRecord(current.records,{id,kind:'stage',title:question.title,notes:question.notes,region:current.preferences.region,packing});
 return save({...current,records,noticeSeen:true});
}
function addButton(id,kind='item'){return `<button class="primary" data-action="add" data-id="${esc(id)}" data-kind="${kind}">${kind==='benefit'?'加入待確認':'加入我的安排'}</button>`;}
function options(list,value,empty='全部'){return `${empty ? '<option value="">'+esc(empty)+'</option>' : ''}${list.map(([id,l])=>`<option value="${esc(id)}" ${value===id?'selected':''}>${esc(l)}</option>`).join('')}`;}
function planPage() {
 const status = statuses.includes(params.get('status')) ? params.get('status') : '待確認';
 const sort = params.get('sort') === 'added' ? 'added' : 'date';
 const rows = sortedPlan(state.records.filter(r=>r.status===status),sort);
 const {start,controls} = pagination(rows.length,4);
 const short = (v,n) => {const chars=Array.from(v || '');return esc(chars.length>n?chars.slice(0,n).join('')+'…':v);};
 const table = `<table class="agenda"><caption>${esc(status)}・${rows.length} 件安排</caption><colgroup><col><col class="agenda-date"><col class="agenda-owner"></colgroup><thead><tr><th scope="col">事項</th><th scope="col">個人日期</th><th scope="col">負責人</th></tr></thead><tbody>${rows.slice(start,start+4).map(r=>`<tr><th scope="row"><a aria-label="${esc(r.title)}，編輯安排" href="${esc(detailURL('/plan',r.id))}">${short(r.title,26)}</a></th><td>${r.date ? `<time datetime="${esc(r.date)}">${esc(r.date)}</time>` : '未設定'}</td><td>${short(r.owner || '未指定',10)}</td></tr>`).join('')}</tbody></table>${controls}`;
 page('我的安排',`<div class="plan-tools"><div class="status-options">${statuses.map(s=>`<a href="/plan?${new URLSearchParams({status:s,sort})}" ${s===status?'aria-current="page"':''}>${s}<b>${state.records.filter(r=>r.status===s).length}</b></a>`).join('')}</div><label>排序<select id="plan-sort">${options([['date','個人日期'],['added','加入順序']],sort,null)}</select></label></div>${rows.length?table:`<section class="empty"><h2>${state.records.length?'這個狀態還沒有事項':'還沒有安排'}</h2><p>從手冊加入想了解的事，也可以新增自己的事項。</p>${link('/preconception','翻閱備孕手冊','button primary')}</section>`}<p class="hint">日期與進度由你設定，記錄保存在這個瀏覽器。</p>`,'一起決定要做的事、由誰負責，以及什麼時候開始。',link('/plan/new','新增自訂事項','button'));
 $('#plan-sort').onchange=e=>{location.href='/plan?'+new URLSearchParams({status,sort:e.target.value});};
}
function planEditor(id){const isNew=id==='new',record=state.records.find(r=>r.id===id);if(!isNew&&!record){missing('/plan');return;}const r=record||{title:'',status:'待確認',date:'',owner:'',notes:'',kind:'custom'};const question=r.kind==='stage'?stageQuestion(data.stages,id):null;const expired=r.kind==='item'&&!guide(id)||r.kind==='benefit'&&!data.item_program_links.some(l=>l.program_version_id===id&&guide(l.item_id));
 page(isNew?'新增自訂事項':'編輯安排',`<div class="detail"><form id="plan-editor" class="paper editor">${r.region&&r.region!==state.preferences.region?`<p class="note">此安排來自${esc(regionLabels[r.region]||r.region)}方案。</p>`:''}${expired?'<p class="note">此階段內容尚未開放；個人紀錄仍保留並可編輯。</p>':''}<label>事項名稱${r.kind==='custom'?'<small> · 個人內容</small>':''}<input name="title" required maxlength="160" value="${esc(r.title)}" ${r.kind==='custom'?'':'readonly'}></label><div class="pair"><label>狀態<select name="status">${statuses.map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join('')}</select></label><label>你設定的日期 <small>（選填）</small><input name="date" type="date" value="${esc(r.date)}"><small>作為個人安排，不會產生通知或醫療日期。</small></label></div><div class="pair"><label>負責人 <small>（選填）</small><input name="owner" maxlength="100" value="${esc(r.owner)}"><small>只在這個瀏覽器保存，不會傳送通知。</small></label><label>優先安排<select name="priority"><option value="">一般</option><option value="yes" ${r.priority==='yes'?'selected':''}>優先</option></select></label></div><label>備註 <small>（選填）</small><textarea name="notes" maxlength="5000" placeholder="留下想詢問或準備的事情">${esc(r.notes)}</textarea></label>${question?link(question.url,'查看手冊提問'):['item','benefit'].includes(r.kind)?link(r.kind==='benefit'?'/benefits/'+r.id:'/items/'+r.id,'查看公共原始資料'):''}<div id="save-error" role="alert"></div><div class="editor-actions"><button type="submit" class="primary">儲存安排</button>${link(safeBack('/plan'),'取消','button quiet')}${!isNew?'<button type="button" class="danger" id="remove-record">移除安排</button>':''}</div></form></div>`);
 main.insertAdjacentHTML('afterbegin',link(safeBack('/plan'),stageReturn()?'返回'+stageReturn().title:'返回我的安排','back'));
 const form=$('#plan-editor');const initialForm=JSON.stringify([...new FormData(form)]);const markDirty=()=>dirty=JSON.stringify([...new FormData(form)])!==initialForm;form.oninput=markDirty;form.onchange=markDirty;
 form.onsubmit=e=>{e.preventDefault();const values=Object.fromEntries(new FormData(form));values.title=values.title.trim();if(!values.title){$('#save-error').textContent='請填寫事項名稱。';form.elements.title.focus();return;}if(storageBroken){$('#save-error').textContent='現有個人紀錄無法讀取，請先至使用設定處理。';return;}const first=!state.noticeSeen;const next={...r,...values,id:isNew?'custom_'+crypto.randomUUID():id,createdAt:r.createdAt||new Date().toISOString()};if(save({...state,noticeSeen:true,records:isNew?[...state.records,next]:state.records.map(x=>x.id===id?next:x)})){dirty=false;sessionStorageSafe('plan-message',first?'已儲存安排。安排保存在這個瀏覽器，清除瀏覽資料可能移除紀錄。':'已儲存安排');location.href='/plan?status='+encodeURIComponent(next.status);}else{$('#save-error').textContent='尚未儲存，請重試。編輯內容仍保留在此頁。';}};
 const remove=$('#remove-record');if(remove)remove.onclick=()=>{const index=state.records.findIndex(x=>x.id===id);if(save({...state,records:state.records.filter(x=>x.id!==id)})){dirty=false;path='/plan';params=new URLSearchParams({status:r.status});history.replaceState(null,'',path+'?'+params);route();toast('已移除安排',()=>{const records=[...state.records];if(!records.some(x=>x.id===id))records.splice(index,0,r);if(save({...state,records})){planPage();toast('已復原安排');}});}};
}
function safeSettingsReturn(){return safeBack('/preconception');}
function settingsPage(){page('使用設定',`<div class="reading"><form id="settings-form" class="paper setting-section"><h2>閱讀偏好</h2><p class="muted">縣市設定會套用至整份手冊；中央方案固定保留。</p><div class="filter-fields"><label>顯示的縣市<select name="region">${options(Object.entries(regionLabels),state.preferences.region,'尚未選擇')}</select></label><button class="primary" type="submit">儲存設定</button></div><div id="settings-error" role="alert"></div></form><section class="paper setting-section"><h2>這個瀏覽器的個人紀錄</h2><p>包含 ${state.records.length} 個安排、你設定的日期、負責人、備註與閱讀偏好。清除瀏覽資料可能移除紀錄，尚未提供跨裝置同步與分享。</p>${storageBroken?'<p class="error">現有個人紀錄無法讀取，原始資料未被覆蓋。可匯出備份後重試，或確認清除以重新開始。</p>':''}<div class="dialog-actions"><button id="export-records">匯出個人紀錄</button><button id="clear-records" class="danger">清除全部個人紀錄</button></div></section><section class="paper setting-section"><h2>關於公共資料</h2><p>本次載入 ${data.records.length} 筆通過人工核對的記錄，來源與適用期間可在事項詳情查看。</p><p class="muted">部分金額已核對，完整資格及未收錄項目仍待確認。不自動判定資格、計算補助或推算醫療日期。公共資料與你的個人安排分開保存。</p></section></div>`,'讓這份手冊更貼近你的閱讀方式。');
 $('#settings-form').onchange=()=>dirty=true;$('#settings-form').onsubmit=e=>{e.preventDefault();if(storageBroken){$('#settings-error').textContent='現有紀錄無法讀取，請先匯出備份或清除後重試。';return;}if(save({...state,preferences:{...state.preferences,...Object.fromEntries(new FormData(e.target))}})){dirty=false;location.href=safeSettingsReturn();}else $('#settings-error').textContent='尚未儲存，請重試。';};
 $('#clear-records').onclick=()=>confirmation('清除全部個人紀錄？','將移除此瀏覽器的所有安排、日期、負責人、備註、閱讀偏好及比較選擇，無法復原。公共資料不受影響。',()=>{try{localStorage.removeItem(KEY);sessionStorage.removeItem('preparation-compare');state={records:[],preferences:{stage:'',region:''},noticeSeen:false};storageBroken=false;compare=[];dirty=false;settingsPage();toast('已清除全部個人紀錄');}catch{toast('無法清除全部紀錄，請重試。');}});
 $('#export-records').onclick=()=>{try{const raw=localStorage.getItem(KEY)||JSON.stringify(state);const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='一起準備-個人紀錄.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{toast('無法匯出紀錄，請確認瀏覽器儲存權限後重試。');}};
}
function missing(back){page('找不到這筆記錄',`<div class="empty"><p>資料可能已更新，請回列表重新選擇。</p>${link(back,'返回列表','button primary')}</div>`);}
function sessionStorageSafe(k,v){try{sessionStorage.setItem(k,v);}catch{}}
let guideIndex, guidePrompts, guideKnowledge, discussionGroups;
function guide(id){const g=guideIndex.get(id);return g?.publication_status==='published'?g:null;}
function topicURL(id){return '/preconception/topics/'+id;}
function scope() {
 return `<div class="scope"><label for="scope-region">資料範圍</label><select id="scope-region">${options(Object.entries(regionLabels).map(([id,name])=>[id,'中央＋'+name]),state.preferences.region,'中央／全國')}</select></div>`;
}
const homePaths=['/','/start','/explore','/preconception'];
const stageById=id=>data.stages.find(stage=>stage.id===id);
const catalogTopic=id=>data.topics.find(topic=>topic.id===id);
const homeURL=(id,legacy=null)=> {
 const query=new URLSearchParams({stage:id});
 if(legacy!==null)query.set('chapter',legacy);
 return '/?'+query+'#chapters';
};
const legacyChapter=()=>/^[012]$/.test(params.get('chapter')) ? Number(params.get('chapter')) : null;
// Limit shareable return links to one hop. The browser retains earlier entries.
function withoutOrigin(path) {
 const url=new URL(path,location.origin);
 url.searchParams.delete('from');
 return url.pathname+url.search+url.hash;
}
function withOrigin(url, origin=currentURL()){
 const destination=new URL(url,location.origin);
 destination.searchParams.set('from',withoutOrigin(origin));
 return destination.pathname+destination.search+destination.hash;
}
function relatedLinks(refs, source) {
 const seen=new Set([source]);
 return (refs||[]).map(ref=>{
   const owner=stageById(ref.stageId);
   const topic=owner?.topics.find(t=>t.id===ref.topicId);
   const target=ref.guideId ? (guide(ref.guideId) && '/items/'+ref.guideId) :
     topic && stageURL(owner.id,topic.chapter,ref.question,topic.id);
   const identity=topic && !ref.guideId ?
     stageURL(owner.id,topic.chapter,ref.question||topic.questions[0]?.key,topic.id) : target;
   if(!target||seen.has(identity))return '';
   seen.add(identity);
   return `<a data-focus-key="related-${esc(target)}" data-origin="${esc(target)}" href="${esc(withOrigin(target))}">${esc(ref.label)}</a>`;
 }).join('');
}
function catalogChapters(stage, categories) {
 return stageChapters.filter(([chapter])=>stage.chapters[chapter].entries.some(entry=>
   data.reading_sections[entry.readingSectionIndex]?.topic_ids.some(id=>categories.includes(id))));
}
function locationTrail(label, crumbs) {
 return `<nav class="article-location" aria-label="${label}">
   <span class="location-home">${link('/','手冊首頁')}</span>
   ${crumbs.map(markup=>`<span>${markup}</span>`).join('')}
 </nav>`;
}
function chapterLink(url,title,subtitle='',attributes=''){
 return `<a class="chapter-link" href="${esc(url)}" ${attributes}><span><strong>${esc(title)}</strong>${subtitle?'<small>'+esc(subtitle)+'</small>':''}</span><span class="count" aria-hidden="true">›</span></a>`;
}
function home() {
 const selected=stageById(params.get('stage'))||data.stages[0];
 const legacy=legacyChapter();
 const resources=[
   [guide('items_095c7855adf6a94c') && '/items/items_095c7855adf6a94c','育兒津貼與托育補助'],
   [stageURL('pregnancy','health'),'產前檢查'],
   [guide('items_5223e253480bb40a') && '/items/items_5223e253480bb40a','孕前疫苗紀錄'],
   ['/plan','準備清單']
 ].filter(([url])=>url);
 const origin=location.hash ? currentURL() : homeURL(selected.id,legacy);
 page('從備孕到育兒',`<div class="handbook-home">
   <nav class="life-grid" aria-label="人生階段">
     ${data.stages.map(({id,title,summary})=>`<a class="life-card" data-stage-preview="${esc(id)}"
       href="${esc(homeURL(id,legacy))}" aria-controls="chapters" ${id===selected.id?'aria-current="true"':''}>
       <strong>${esc(title)}</strong><span>${esc(summary)}</span><span class="card-arrow" aria-hidden="true">↓</span>
     </a>`).join('')}
   </nav>
   <div class="home-library">
     <section class="chapter" id="chapters" tabindex="-1" aria-labelledby="chapters-title">
       <h2 id="chapters-title">${esc(selected.title)}章節</h2>
       ${stageChapters.map(([key,label],i)=>chapterLink(legacy===null?stageURL(selected.id,key):withOrigin(stageURL(selected.id,key),origin),label,selected.chapters[key].subtitle,
         'data-focus-origin="'+esc(origin)+'" data-focus-key="chapter-'+key+'"'+(selected.id==='preconception'&&i===legacy?' aria-current="true"':''))).join('')}
     </section>
     <section class="resource-area" aria-labelledby="resource-title">
       <h2 id="resource-title">常用資源</h2>
       <div class="resource-grid">${resources.map(([url,title],i)=>`<a class="resource-link" data-focus-key="resource-${i}" href="${esc(withOrigin(url,origin))}"><strong>${esc(title)}</strong><span class="card-arrow" aria-hidden="true">↗</span></a>`).join('')}</div>
     </section>
   </div></div>`, '在臺灣準備迎接孩子，從適合你現在的階段開始。');
}
function guideURL(id,topic) {
 const query = new URLSearchParams({topic});
 for (const key of ['facet','section','p']) if (params.has(key)) query.set(key,params.get(key));
 return withOrigin('/items/'+id+'?'+query);
}
function pagination(count, perPage, query=params) {
 const pages = Math.max(1, Math.ceil(count/perPage));
 const current = Math.min(pages, Math.max(1, Number.parseInt(query.get('p'),10)||1));
 const href = n => {const q = new URLSearchParams(query);q.set('p',n);return '?'+q;};
 const controls = pages < 2 ? '' : `<nav class="pager" aria-label="頁次">${current>1 ? link(href(current-1),'上一頁') : '<span></span>'}<span>第 ${current}／${pages} 頁</span>${current<pages ? link(href(current+1),'下一頁') : '<span></span>'}</nav>`;
 return {start:(current-1)*perPage,controls,current};
}
const topicGroup = (guide, topic) => guide.topic_groups?.[topic] || guide.reading_group;
function topicListing(id, query) {
 const all = data.item_guides
   .filter(g=>g.publication_status==='published'&&(g.primary_topic_id===id||g.related_topic_ids.includes(id)))
   .sort((a,b)=>facetRank(a)-facetRank(b)||a.sort_order-b.sort_order);
 if(discussionGroups.has(id))return {rows:all,legacy:false};

 // Honor saved category URLs. The ordinary index always shows the complete list.
 const facet = query.get('facet');
 const section = query.get('section');
 const facetRows = facet ? all.filter(g=>g.content_facets.includes(facet)) : [];
 const subset = facetRows.length ? facetRows : all;
 const sectionRows = section ? subset.filter(g=>topicGroup(g,id)===section) : [];
 const number = Number(query.get('p'));
 const legacy = Boolean(facetRows.length || sectionRows.length || (Number.isSafeInteger(number) && number>0));
 return {rows:sectionRows.length ? sectionRows : subset,legacy};
}
function topicPage(id) {
 const topic = catalogTopic(id);
 if (!topic) {missing('/preconception');return;}
 const {rows,legacy} = topicListing(id,params);
 const {start,controls} = legacy ? pagination(rows.length,4) : {start:0,controls:''};
 const visible = legacy ? rows.slice(start,start+4) : rows;
 const byId = new Map(visible.map(g=>[g.item_id,g]));
 const groups = discussionGroups.get(id) || (id==='childcare-preparation'&&!legacy
   ? ['費用與支持','先看照顧選擇','提前安排與分工'].map(title=>({
     title,guides:visible.filter(g=>topicGroup(g,id)===title).map(g=>g.item_id)
   })) : []);
 const parts = groups.map(({title,guides})=>{
   const links = guides.map(id=>byId.get(id)).filter(Boolean);
   for(const g of links)byId.delete(g.item_id);
   return links.length ? `<section><h2>${esc(title)}</h2><ul>${links.map(g=>`<li>${guideLink(g)}</li>`).join('')}</ul></section>` : '';
 }).join('');
 function guideLink(g,card=false) {
   return `<a ${card?'class="guide-card" ':''}data-focus-key="guide-${esc(g.item_id)}" href="${esc(guideURL(g.item_id,id))}">${card?'<strong>'+esc(g.title)+'</strong>':esc(g.title)}</a>`;
 }
 const cards = [...byId.values()].map(g=>guideLink(g,true)).join('');
 const origin = stageReturn();
 const preconception = stageById('preconception');
 const chapters = catalogChapters(preconception,[id]);
 const [chapter,chapterName] = chapters.find(([key])=>origin?.stage===preconception&&key===origin.chapter)
   || chapters[0] || stageChapters[0];
 const parent = stageURL(preconception.id,chapter);
 const backName = origin && origin.stage!==preconception ? origin.title : chapterName;
 const full = origin ? withOrigin(topicURL(id),origin.url) : topicURL(id);
 page(topic.title,`${legacy ? '<p class="topic-all">'+link(full,'查看全部事項')+'</p>' : ''}
 ${parts ? '<div class="topic-groups">'+parts+'</div>' : ''}
 ${cards ? '<div class="guide-grid">'+cards+'</div>' : ''}
 ${rows.length ? '' : '<p class="hint">目前沒有可閱讀的事項。</p>'}${controls}
 <details class="stage-index"><summary>切換分類</summary><div>${data.topics.filter(t=>t.id!==id).map(t=>link(topicURL(t.id),t.title)).join('')}</div></details>`,topic.description);
 main.insertAdjacentHTML('afterbegin',link(origin?.url||parent,'返回'+backName,'back')+
   locationTrail('分類位置',[link(homeURL(preconception.id),preconception.title),link(parent,chapterName)]));
}
function stagePage(id, legacy) {
 const stage=stageById(id);
 if(!stage){missing('/');return;}
 const requested=params.get('chapter');
 const selected=stageChapters[legacy]?.[0] || stageChapters.find(([key])=>key===requested)?.[0] || 'costs';
 const {subtitle,entries,shortcuts,situations}=stage.chapters[selected];
 const owned=entries.filter(entry=>entry.stageId===id)
   .map(entry=>stage.topics.find(t=>t.id===entry.topicId)).filter(topic=>topic.chapter===selected);
 const requestedQuestion=params.get('question');
 const topic=owned.find(t=>t.id===params.get('topic')) ||
   owned.find(t=>t.questions.some(q=>q.key===requestedQuestion)) || owned[0];
 const active=requestedQuestion==='none'?'none':
   topic?.questions.find(q=>q.key===requestedQuestion)?.key || topic?.questions[0]?.key;
 const origin=stageReturn();
 const chapterNav=stageChapters.map(([key,label])=>`<a href="${stageURL(id,key)}" ${key===selected?'aria-current="page"':''}>${label}</a>`).join('');
 const promptGuide=topic && guide(topic.guideId);
 const questionMarkup=({key,title,notes,packing,related})=>{
   const questionURL=stageURL(id,selected,key,topic.id);
   const links=relatedLinks(related,questionURL);
   const body = packing ? packingEditor(packing,links) : `<p>${esc(notes)}</p>
     ${links ? `<div class="stage-related">${links}</div>` : ''}${addButton(questionId(id,key),'stage')}`;
   return `<details class="stage-question" data-question="${esc(key)}" name="stage-questions" ${key===active?'open':''}>
    <summary>${esc(title)}</summary>${body}</details>`;
 };
 const prompts=topic?.layout==='handoff' ?
   handoffTable(topic.questions,questionMarkup,key=>state.records.find(r=>r.id===questionId(id,key))) :
   topic?.questions.map(questionMarkup).join('') || '';
 const entryMarkup=(entry,i)=>{
   const attributes=`data-focus-key="entry-${i}"`;
   if(Object.hasOwn(entry,'readingSectionIndex')){
     return data.reading_sections[entry.readingSectionIndex].topic_ids.map(topicId=>{
       const {title,description}=catalogTopic(topicId);
       const featured=(shortcuts?.[topicId]||[]).map(guide).filter(Boolean);
       const category=chapterLink(withOrigin(topicURL(topicId)),featured.length?'看'+title+'全部事項':title,featured.length?'':description,`data-focus-key="catalog-${esc(topicId)}"`);
       if(!featured.length)return category;
       return `<div class="catalog-shortcuts">${featured.map(g=>chapterLink(withOrigin('/items/'+g.item_id),g.title,'',
         `data-focus-key="guide-${esc(g.item_id)}"`)).join('')}${category}</div>`;
     }).join('');
   }
   if(entry.guideId){
     const g=guide(entry.guideId);
     return g ? chapterLink(withOrigin('/items/'+entry.guideId),g.title,entry.label||'',`${attributes} data-origin="${esc('/items/'+entry.guideId)}" data-stage-item="${esc(entry.guideId)}"`) :
       `<p class="hint">${esc(entry.label||guideIndex.get(entry.guideId)?.title||entry.guideId)} · 公開資料待補</p>`;
   }
   const owner=stageById(entry.stageId);
   const target=owner.topics.find(t=>t.id===entry.topicId);
   if(target===topic) {
     const facts=topicRecords(data,topic,promptGuide,state.preferences.region);
     return `<section class="stage-topic${facts&&prompts?' stage-topic-with-facts':''}" aria-labelledby="stage-topic-title">
       <h3 id="stage-topic-title">${esc(topic.title)}</h3>
       ${facts ? scope()+'<div class="stage-facts">'+facts+'</div>' : ''}
       ${prompts ? '<div class="stage-prompts"><h4>準備提問</h4><div class="stage-questions">'+prompts+'</div></div>' : ''}
     </section>`;
   }
   const targetURL=stageURL(owner.id,target.chapter,null,target.id);
   const same=owner.id===id&&target.chapter===selected;
   const pending=same && Object.hasOwn(target,'guideId') &&
     (!guide(target.guideId)||!visibleRecords(data,guide(target.guideId),state.preferences.region).length);
   return chapterLink(same ? (origin ? withOrigin(targetURL,origin.url) : targetURL) : withOrigin(targetURL),entry.label||target.title,pending?'公開資料待補':'',
     same ? attributes : `${attributes} data-origin="${esc(targetURL)}"`);
 };
 const grouped=new Set(situations?.flatMap(group=>group.entries));
 const groups=situations?.map(({title,entries:refs})=>{
   const destinations=refs.map(ref=>entries.findIndex(entry=>(entry.guideId||entry.topicId)===ref))
     .filter(i=>i>=0 && (!entries[i].guideId||guide(entries[i].guideId)));
   if(!destinations.length)return '';
   const [first,...more]=destinations;
   return `<section class="situation"><h3>${esc(title)}</h3>${entryMarkup(entries[first],first)}
     ${more.length ? `<details data-situation="${first}"><summary>更多${esc(title)}事項</summary>${more.map(i=>entryMarkup(entries[i],i)).join('')}</details>` : ''}</section>`;
 }).join('') || '';
 const body=(groups ? '<div class="situation-list">'+groups+'</div>' : '')+entries.map((entry,i)=>grouped.has(entry.guideId||entry.topicId)?'':entryMarkup(entry,i)).join('');
 const back=origin?.url||homeURL(id,legacy);
 page(stage.title,`<div class="stage-reading">
   <nav class="chapter-tabs" aria-label="${esc(stage.title)}章節">${chapterNav}</nav>
   <article class="chapter" aria-labelledby="stage-chapter-title">
     <h2 id="stage-chapter-title" tabindex="-1">${stageChapters.find(([key])=>key===selected)[1]}${subtitle===topic?.title?'':'<small>'+esc(subtitle)+'</small>'}</h2>
     ${body}
     ${chapterFooter(id,selected,homeURL(id),data.stages.at(-1).id===id)}
   </article>
 </div>`,stage.intro);
 main.insertAdjacentHTML('afterbegin',`<div class="stage-topbar">
   ${link(back,origin?'返回'+origin.title:'返回'+stage.title+'章節索引','back')}
   ${adjacentStages(data.stages,stage)}
 </div>`);
 if(topic)bindTopicRecords(main,data,topic,promptGuide,state.preferences.region);
 const packing = main.querySelector('[data-packing-editor]');
 if(packing){
   const recordId=questionId(id,packing.closest('[data-question]').dataset.question);
   bindPacking(packing,state.records.find(record=>record.id===recordId),items=>savePacking(recordId,items),
     ()=>addToPlan(recordId,'stage'),changed=>{dirty=changed;});
 }
 let visibleQuestion=active;
 const syncQuestion=()=>{
   const next=main.querySelector('.stage-question[open]')?.dataset.question||'none';
   if(next===visibleQuestion)return;
   visibleQuestion=next;
   const url=new URL(location.href);
   const updated=new URL(stageURL(id,selected,next,topic.id,origin?.url),location.origin);
   url.pathname=updated.pathname;
   for(const name of ['chapter','topic','question','from']) {
     if(updated.searchParams.has(name))url.searchParams.set(name,updated.searchParams.get(name));
     else url.searchParams.delete(name);
   }
   history.replaceState(history.state,'',url);
   params=new URLSearchParams(location.search);
   main.querySelectorAll('[data-origin]').forEach(anchor=>anchor.href=withOrigin(anchor.dataset.origin));
 };
 main.querySelectorAll('.stage-question').forEach(detail=>detail.addEventListener('toggle',syncQuestion));
}
function articlePlacements(g) {
 const pre=stageById('preconception');
 const catalog=catalogChapters(pre,[g.primary_topic_id,...g.related_topic_ids]);
 return data.stages.flatMap(stage=>stageChapters.filter(([chapter])=>
   stage.chapters[chapter].entries.some(entry=>entry.guideId===g.item_id) ||
   (stage===pre&&catalog.some(([key])=>key===chapter))
 ).map(([chapter])=>({stage,chapter})));
}
function articlePlacement(g,origin) {
 const placements=articlePlacements(g);
 const viaStage=origin?.stage && placements.find(place=>place.stage===origin.stage&&place.chapter===origin.chapter);
 if(viaStage)return viaStage;
 const category=origin?.category;
 if(category&&[g.primary_topic_id,...g.related_topic_ids].includes(category.id)){
   const pre=stageById('preconception');
   const viaCategory=catalogChapters(pre,[category.id]);
   if(viaCategory.length===1)return {stage:pre,chapter:viaCategory[0][0]};
 }
 if(origin?.item){
   const previous=articlePlacements(origin.item);
   if(previous.length===1){
     const viaArticle=placements.find(place=>place.stage===previous[0].stage&&place.chapter===previous[0].chapter);
     if(viaArticle)return viaArticle;
   }
 }
 return placements.length===1 ? placements[0] : null;
}
function readingItem(id) {
 const g=guide(id);if(!g){missing(safeBack('/preconception'));return;}
 const requested=params.get('topic');
 const topic=data.topics.find(t=>t.id===(g.related_topic_ids.includes(requested)?requested:g.primary_topic_id));
 const backQuery = new URLSearchParams(params);
 for (const k of [...backQuery.keys()]) if (!['facet','section','p'].includes(k)) backQuery.delete(k);
 const origin=stageReturn();
 const backURL=origin?.url||topicURL(topic.id)+(backQuery.size?'?'+backQuery:'');
 const breadcrumb=link(backURL,origin?'返回'+origin.title:'返回'+topic.title,'back');
 const placement=articlePlacement(g,origin);
 const crumbs=placement ? [
   link(homeURL(placement.stage.id),placement.stage.title),
   link(stageURL(placement.stage.id,placement.chapter),stageChapters.find(([chapter])=>chapter===placement.chapter)[1])
 ] : [link(topicURL(g.primary_topic_id),catalogTopic(g.primary_topic_id).title)];
 page(g.title,`<article id="guide-reader" aria-labelledby="article-title"></article>`);
 $('h1').id='article-title';
 $('.page-head').insertAdjacentHTML('beforebegin',locationTrail('文章位置',crumbs));
 main.insertAdjacentHTML('afterbegin',breadcrumb);
 const related=relatedLinks(data.stages.flatMap(stage=>stage.guideRelated?.[id]||[]),'/items/'+id);
 const knowledge = guideKnowledge.get(id);
 if(knowledge?.type==='menstrual-cycle'){
   const reader=$('#guide-reader');
   reader.classList.add('knowledge-reader');
   reader.innerHTML=cycleKnowledge(knowledge)+`<section id="panel-0" class="knowledge-preparation" tabindex="-1">
     ${preparation(guidePrompts.get(id))}${addButton(id)}
     ${related ? `<nav class="article-related" aria-label="相關閱讀">${related}</nav>` : ''}</section>`;
   const heading=reader.querySelector('.knowledge-preparation h2');
   if(heading){heading.id='task-0';heading.tabIndex=-1;}
   bindPreparation(reader);
   const anchor = ['#panel-0','#task-0'].includes(location.hash) ? $(location.hash) :
     location.hash==='#funding' || params.get('task')==='0' ? heading : null;
   if(anchor)requestAnimationFrame(()=>anchor.focus());
   return;
 }
 reviewedDetail($('#guide-reader'),g,visibleRecords(data,g,state.preferences.region),addButton(id),state.preferences.region,updateAddButtons,
   data.records.some(r=>g.category_ids.includes(r.type)),guidePrompts.get(id),related);
 if(origin?.stage){
   const definition=origin.stage.chapters[origin.chapter];
   const source=definition?.entries.find(entry=>entry.guideId===id);
   if(source?.label) $('.article-meta').insertAdjacentHTML('afterbegin',`<span>原文範圍：${esc(source.label)}</span> `);
 }
}
function route(){
 const legacy=legacyChapter();
 if(homePaths.includes(path)){
   if(legacy!==null && !stageById(params.get('stage')) && location.hash!=='#chapters')stagePage('preconception',legacy);
   else home();
 }else if(path.startsWith('/preconception/topics/'))topicPage(path.split('/')[3]);else if(path.startsWith('/stages/'))stagePage(path.slice('/stages/'.length));else if(path.startsWith('/items/'))readingItem(path.split('/')[2]);else if(path.startsWith('/benefits/')){const id=path.split('/')[2],gs=data.item_program_links.filter(l=>l.program_version_id===id&&guide(l.item_id));if(gs.length===1){location.replace('/items/'+gs[0].item_id+'#'+id);return;}page('相關事項',gs.length?gs.map(l=>`<p>${link('/items/'+l.item_id,item(l.item_id).title)}</p>`).join(''):'<p>此階段內容尚未開放</p>'+link('/preconception','回備孕手冊'));}else if(path.startsWith('/benefits')||path.startsWith('/costs')){sessionStorageSafe('handbook-message','福利與費用已整理到各事項');location.replace('/preconception');return;}else if(path==='/plan'){planPage();if(stageReturn())main.insertAdjacentHTML('afterbegin',link(stageReturn().url,'返回'+stageReturn().title,'back'));}else if(path.startsWith('/plan/'))planEditor(path.split('/')[2]);else if(path==='/settings')settingsPage();else missing('/preconception');markNavigation();
 updateAddButtons();
 const back = main.querySelector(':scope > .back');
 if (back && main.querySelector('#guide-reader:not(.knowledge-reader)')) {
   const toolbar = document.createElement('div');
   toolbar.className = 'context-bar';
   back.before(toolbar);
   toolbar.append(back);
   toolbar.insertAdjacentHTML('beforeend',scope());
 }
 const selector=$('#scope-region');
 if(!selector)return;
 selector.onchange=()=>{const previous=state.preferences.region;
   if(storageBroken){selector.value=previous;toast('現有紀錄無法讀取，請先至設定處理。');return;}
   if(save({...state,preferences:{...state.preferences,region:selector.value}})){route();$('#scope-region')?.focus();toast('已更新顯示縣市');}else selector.value=previous;
 };
}
function markNavigation(){
 const active=path.startsWith('/plan')?'/plan':path==='/settings'?'/settings':'/';
 document.querySelectorAll('header nav a').forEach(a=>{if(a.pathname===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
}
document.addEventListener('click',e=>{const anchor=e.target.closest('.page-toc a');if(anchor){const target=document.getElementById(anchor.hash.slice(1));requestAnimationFrame(()=>target?.focus({preventScroll:true}));}const b=e.target.closest('[data-action]');if(b){const {action,id,kind}=b.dataset;if(action==='add')addToPlan(id,kind);else if(action==='close-dialog')modal.close();else if(action==='undo'&&undoAction){const fn=undoAction;undoAction=null;fn();}}
 const a=e.target.closest('a[href]');if(a&&a.origin===location.origin&&!a.download&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){
  if(a.dataset.origin)a.href=withOrigin(a.dataset.origin);
  if(a.classList.contains('back')) {
    const destination=a.pathname+a.search+a.hash;
    if(history.state?.hanPrevious && withoutOrigin(history.state.hanPrevious)===withoutOrigin(destination)){
      e.preventDefault();
      history.back();
      return;
    }
    sessionStorageSafe('handbook-return',destination);
  } else if(a.hasAttribute('data-origin') || new URL(a.href).searchParams.has('from') || a.dataset.focusKey) {
    const from=a.dataset.focusOrigin || currentURL();
    if(a.dataset.focusKey) {
      history.replaceState({...history.state,hanFocus:a.dataset.focusKey},'');
      sessionStorageSafe('focus:'+withoutOrigin(from),a.dataset.focusKey);
    }
    sessionStorageSafe('handbook-follow',JSON.stringify({destination:a.pathname+a.search+a.hash,previous:currentURL()}));
  }
  if(a.hash==='#chapters'&&a.pathname===path&&a.search===location.search){
    requestAnimationFrame(()=>$('#chapters')?.focus());
  }
  sessionStorageSafe('scroll:'+currentURL(),String(scrollY));if(dirty){e.preventDefault();const href=a.href;openDialog('<h2>編輯尚未儲存</h2><p>要留在頁面繼續編輯，或放棄這次變更？</p><div class="dialog-actions"><button class="primary" data-action="close-dialog">留在頁面</button><button id="discard">放棄編輯</button></div>');$('#discard').onclick=()=>{dirty=false;location.href=href;};}}
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
function restoreNavigation(persisted=false) {
 const navigation=performance.getEntriesByType('navigation')[0]?.type;
 const follow=JSON.parse(sessionStorage.getItem('handbook-follow')||'null');
 sessionStorage.removeItem('handbook-follow');
 if(!persisted && navigation==='navigate' && follow?.destination===currentURL() &&
    document.referrer && document.referrer.split('#')[0]===new URL(follow.previous,location.origin).href.split('#')[0]){
   history.replaceState({...history.state,hanPrevious:follow.previous},'');
 }
 const explicit=sessionStorage.getItem('handbook-return')===currentURL();
 if(explicit)sessionStorage.removeItem('handbook-return');
 const returned=persisted || navigation==='back_forward' || explicit;
 const focusKey=returned && (history.state?.hanFocus || sessionStorage.getItem('focus:'+withoutOrigin(currentURL())));
 const source=focusKey && $$('[data-focus-key]').find(a=>a.dataset.focusKey===focusKey);
 if(source){
   const disclosure=source.closest('details[data-situation]');
   if(disclosure)disclosure.open=true;
   source.focus();
 }else if(location.hash&&!path.startsWith('/items/')){
   const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));
   target?.focus({preventScroll:true});
   requestAnimationFrame(()=>target?.scrollIntoView());
 }else if($('#stage-chapter-title'))$('#stage-chapter-title').focus();
 else if(!persisted && returned){
   const y=sessionStorage.getItem('scroll:'+currentURL());
   if(y!==null)requestAnimationFrame(()=>scrollTo(0,Number(y)));
 }
}
window.addEventListener('pageshow',event=>{
 if(event.persisted)try{restoreNavigation(true);}catch{}
});
async function load(){try{const response=await fetch('/api/handbook',{cache:'no-store'});
 if(!response.ok)throw Error('handbook');
 data=await response.json();
 data.items=data.item_guides.map(g=>({id:g.item_id,title:g.title}));
 guideIndex=new Map(data.item_guides.map(g=>[g.item_id,g]));
 guidePrompts=new Map(data.stages.flatMap(stage=>Object.entries(stage.guidePrompts||{})));
 guideKnowledge=new Map(data.stages.flatMap(stage=>Object.entries(stage.guideKnowledge||{})));
 discussionGroups=new Map(data.stages.flatMap(stage=>Object.entries(stage.discussionGroups||{})));
 route();if(path==='/preconception'){try{const msg=sessionStorage.getItem('handbook-message');if(msg){toast(msg);sessionStorage.removeItem('handbook-message');}}catch{}}try{
 restoreNavigation();
 if(path==='/plan'){const message=sessionStorage.getItem('plan-message');if(message){toast(message);sessionStorage.removeItem('plan-message');}}}catch{}if(storageBroken)toast('現有個人紀錄無法讀取，請至使用設定處理；原紀錄仍保留。');else if(comparisonReadError)toast('無法讀取比較選擇，請重新選取。');}catch{page('暫時無法載入資料','<div class="empty"><p>連線、資料參照或版本驗證失敗，請重試。原有篩選與個人紀錄會保留。</p><button id="retry" class="primary">重試</button></div>');$('#retry').onclick=load;}}
load();

window.addEventListener('storage',e=>{if(e.key===KEY&&!dirty){try{const next=JSON.parse(e.newValue);state=next||{records:[],preferences:{region:''}};route();}catch{toast('設定同步失敗，請重新整理。');}}});
