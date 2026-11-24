import {escapeText as e, renderSection} from './reading.mjs';
import {factsFor, freshness, amountText, taiwanDate} from './economics.mjs';
import {policiesFor, valueHTML} from './policies.mjs';
import {decisionFor, project, resolveRef, relationHTML, relationState} from './decisions.mjs';
import {regionLabels} from './model.mjs';
const tasks = ['支持比較', '資格與限制', '如何申請'];
const labels = {support_method:'支持內容', eligibility:'資格與對象', exclusions:'限制與異動', combination_rules:'併領關係', application_deadlines:'期限', application_channels:'管道與窗口', required_documents:'文件', application_steps:'步驟', payment_method:'給付方式'};
const statusLabels = {current:'金額已核對', stale:'資料待重查', undated:'適用期間未明，不能當作現行可申領資訊', future:'未來生效版本', expired:'歷史版本', disputed:'官方資料不一致，待確認', unverified:'尚未核對'};
const current = f => ['current','stale'].includes(freshness(f));
const period = f => `${f.effective_from || '起日未明示'} 至 ${f.effective_to || '迄日未明示'}`;
function evidenceFor(data,id,field,all=false) {
 return (data.field_evidence || []).filter(v=>v.entity_id===id && (!field || v.field_path===`/fields/${field}/value`) && (all || v.verification_status==='verified'));
}
function sources(data,id,field,all=false) {
 return [...new Set(evidenceFor(data,id,field,all).map(v=>v.source_id))].map(id=>(data.source_registry||[]).find(s=>s.id===id)).filter(s=>s && /^https?:\/\//.test(s.url)).map(s=>`<a href="${e(s.url)}" target="_blank" rel="noopener">${e(s.agency || s.publisher || s.title || s.id)}</a>`).join('、');
}
// Keep every clause, including exceptions and AND/OR. Splitting changes presentation only.
function clauses(text) { return String(text || '').split(/(?<=[。；])/u).filter(s=>s.trim()); }
function structured(value, ordered=false) {
 if (typeof value !== 'string') return valueHTML(value);
 const parts=clauses(value), tag=ordered?'ol':'ul';
 return `<${tag}>${parts.map(s=>`<li>${e(s)}</li>`).join('')}</${tag}>`;
}
function policyFields(data,p,fields) {
 const active=p && p.period_status==='known' && p.effective_from<=taiwanDate() && (!p.effective_to || p.effective_to>=taiwanDate()) && !p.superseded_by;
 if(p&&!active)return `<p class="unknown">${p.effective_from>taiwanDate()?'未來生效版本':p.period_status!=='known'?'適用期間未明':'歷史版本'}，不列為目前可申辦資訊。<a href="#record-${e(p.id)}">查看版本與來源</a></p>`;
 return fields.map(field=>{
  const f=p?.fields[field], verified=f?.verification_status==='verified' && f.value!==null;
  const gap=f?.verification_status==='disputed'?'官方資料不一致，待確認':!active&&p?'此版本非目前可申辦資訊':f?.gap_reason==='needs_clarification'?'條件仍待釐清':f?.gap_reason==='not_stated'?'已查來源未載明，仍待確認':'尚未核對此欄';
  return `<section class="policy-field" id="${e((p?.id||'childcare-gap')+'-'+field)}"><h3>${labels[field]}</h3>${active&&verified?structured(f.value):`<p class="unknown">${gap}。${e(f?.gap_note||'')}</p>${f?.value!==null&&f?.value!==undefined?`<a href="#record-${e(p.id)}">查看原文候選與各欄核對狀態</a>`:''}`}${active&&f?`<p class="claim-source">${sources(data,p.id,field,!verified)}</p>`:''}</section>`;
 }).join('');
}
function table(heads,rows,cls='',describedBy='') {
 return `<table class="task-comparison ${cls}"${describedBy?` aria-describedby="${e(describedBy)}"`:""}><caption class="visually-hidden">${e(heads.join('與'))}：逐面向比較</caption><thead><tr><th scope="col">比較面向</th>${heads.map(h=>`<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,values])=>`<tr><th scope="row">${e(label)}</th>${values.map((v,i)=>`<td><span class="mobile-column" aria-hidden="true">${e(heads[i])}</span>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function factRows(data,f) {
 return `<dl class="condition-rows"><div><dt>提供者與範圍</dt><dd>${e(f.provider)}；${e(f.scope_label)}（${e(f.region_code)}）</dd></div><div><dt>金額與單位</dt><dd><strong>${e(amountText(f.amount))}</strong></dd></div><div><dt>適用情境</dt><dd>${structured(f.conditions)}</dd></div><div><dt>期間</dt><dd>${e(period(f))}；${e(statusLabels[freshness(f)])}；最後核對 ${e(f.checked_at)}</dd></div><div><dt>直接限制</dt><dd>${structured(f.exclusions)}</dd></div>${f.price_period?`<div><dt>具名價格樣本</dt><dd>${e(f.provider)}；${e(f.service_address||'地址待確認')}；${e(f.price_period)}；包含：${e((f.included_components||[]).join('、'))}。只代表此單位公告。</dd></div>`:''}<div><dt>官方依據</dt><dd>${sources(data,f.id)} <a href="#record-${e(f.id)}">核對狀態</a></dd></div></dl>`;
}
function factGroup(data,fs,key,heading,{collapsed=false,relationGroup=null}={}) {
 if (!fs.length) return '';
 const body=`<h3>${e(heading)}</h3><label for="select-${key}">方案／情境</label><select id="select-${key}" data-fact-select="${key}">${fs.map(f=>`<option value="${e(f.id)}">${e(f.title)}</option>`).join('')}</select>${fs.map((f,i)=>`<section class="fact-scenario" data-fact-group="${key}" data-fact="${e(f.id)}" id="${e(f.id)}" ${i?'hidden':''}><h4>${e(f.title)}</h4>${key==='local'?(relationGroup?localRelation(data,relationGroup,f):'<p class="unknown">對應中央支持：托育情境與搭配條件尚待獨立核對。</p>'):''}${factRows(data,f)}</section>`).join('')}`;
 return collapsed?`<details id="local-support"><summary>${e(heading)}（${fs.length} 個情境）</summary>${body}</details>`:body;
}
function projectionText(data,ref){const r=resolveRef(data,ref),field=ref.path?.split('/')[2];if(r.period_status!=='known'||r.effective_from>taiwanDate()||r.effective_to&&r.effective_to<taiwanDate()||r.superseded_by||r.fields&&r.fields[field]?.verification_status!=='verified'||r.verification_status&&r.verification_status!=='verified')return '此欄目前資料待核對，請查閱來源版本。';return project(data,ref);}
function projectionRows(data, rows) {
 return `<dl class="comparison-clauses">${rows.map(row=>`<div><dt>${e(row.label)}</dt><dd>${e(row.ref?projectionText(data,row.ref):row.text)}</dd></div>`).join('')}</dl>`;
}
function optionPolicy(data,o){return o.policy_ref?resolveRef(data,o.policy_ref):null;}
function decisionHeader(data,group,task){return relationHTML(data,group,taiwanDate(),'-'+task);}
function localRelations(data,group,f){
 const central=new Set(group.options.flatMap(o=>(o.fact_refs||[]).map(ref=>ref.record_id)));
 return (data.policy_relations||[]).filter(r=>[...r.from,...r.to].some(ref=>ref.record_id===f.id)&&[...r.from,...r.to].some(ref=>central.has(ref.record_id)));
}
function localRelation(data,group,f){
 const relations=localRelations(data,group,f);
 if(!relations.length)return '<p class="unknown">對應中央支持：托育情境與搭配條件尚待獨立核對。</p>';
 return relationHTML(data,{...group,id:'local-'+f.id,question:'此地方支持和中央支持的關係',scope:f.scope_label+'；'+f.title,relation_refs:relations.map(r=>r.id)},taiwanDate());
}
function localSupport(data,g,fs,region) {
 if(!region)return '<p id="local-support" class="unknown">尚未選縣市，地方支持未篩選。</p>';
 const local=fs.filter(f=>f.region_code!== 'TW' && current(f));
 const label=regionLabels[region]||region,group=decisionFor(data,g);
 const relationLabels={conditional:'有條件搭配',exclusive:'有領取限制',prerequisite:'有前提'};
 const summary=group?[...new Set(local.flatMap(f=>{const rs=localRelations(data,group,f);return rs.length?rs.map(r=>['current','stale'].includes(relationState(data,r,taiwanDate()))?relationLabels[r.relation_type]:'搭配關係待確認'):['搭配關係待確認'];}))].join('／'):'搭配關係待確認';
 if(!local.length)return `<p id="local-support" class="unknown">${e(label)}：本項地方支持尚未核對；${e((data.coverage||[]).filter(c=>c.region_code===region&&(g.coverage_topic_ids||[]).includes(c.topic_id)).map(c=>c.search_status).filter((v,i,a)=>a.indexOf(v)===i).join('／'))}。不表示沒有補助。</p>`;
 return `<details id="local-support"><summary>${e(label)}地方支持：${e(summary)}</summary><p>對應中央托育情境、戶籍、序位與時數仍須核對；地方「胎次」與中央「子女序位」分開閱讀。</p>${factGroup(data,local,'local',label+'地方支持',{relationGroup:group})}<p class="unknown">中央與地方分列，不合計或推算自付。</p></details>`;
}
function supportComparison(data,g,fs,region) {
 const group=decisionFor(data,g);
 if(!group)return '<p class="unknown">此版本的比較關係尚未核對。</p>'+factGroup(data,fs.filter(f=>f.region_code==='TW'&&current(f)),'central','中央支持')+localSupport(data,g,fs,region);
 const columns=group.options.map(o=>(o.fact_refs||[]).map(ref=>fs.find(f=>f.id===ref.record_id)).filter(f=>f&&current(f)));
 const base=columns.map((col,i)=>col.filter(f=>group.options[i].base_refs.includes(f.id)));
 const refs=group.options.map(o=>o.fact_refs.map(ref=>fs.find(f=>f.id===ref.record_id)||resolveRef(data,ref)));
 const source=f=>`<a href="#record-${e(f.id)}" aria-label="${e(f.title)}：來源、期間與核對狀態">依據</a>`;
 const rows=[
  ['支持金額',refs.map((all,i)=>{const col=all.filter(f=>group.options[i].base_refs.includes(f.id));return col.length?col.map(f=>current(f)?`<div class="amount-scenario" id="${e(f.id)}"><span>${e(f.title.replace('未滿2歲育兒津貼：',''))}</span><strong>${e(amountText(f.amount))}</strong>${source(f)}</div>`:`<div class="amount-scenario"><span>${e(f.title)}</span><p class="unknown">此情境金額尚未核對；${e(statusLabels[freshness(f)])}，沒有可列入目前比較的數值。</p><a href="#record-${e(f.id)}">查看版本與依據</a></div>`).join('')+(i===1?'<p>兩種送托情境，不相加。</p>':''):'<p class="unknown">此情境金額尚未核對；沒有可列入目前比較的數值。</p>'})],
  ['照顧情境',group.options.map(o=>projectionRows(data,o.context))],
  ['完整資格待確認',group.options.map(o=>projectionRows(data,o.checks))],
  ['適用期間與狀態',refs.map((all,i)=>{const col=all.filter(f=>group.options[i].base_refs.includes(f.id));return [...new Set(col.map(f=>`${period(f)}；${statusLabels[freshness(f)]||'尚未核對'}；最後核對 ${f.checked_at||'待確認'}`))].map(v=>`<p>${e(v)}</p>`).join('')})]
 ];
 const extras=columns.map((col,i)=>col.filter(f=>!base[i].includes(f)));
 const extraHTML=(f,column)=>{const basic=base[column][0];const shared=basic&&f.conditions===basic.conditions&&f.exclusions===basic.exclusions&&period(f)===period(basic);return `<section class="extra-tier" id="${e(f.id)}"><h3>${e(f.title)}</h3>${shared?`<strong>${e(amountText(f.amount))}</strong><p>情境、期間與限制見<a href="#funding">上方${e(group.options[column].label)}欄</a>；${e(statusLabels[freshness(f)])}。</p>${source(f)}`:factRows(data,f)}</section>`;};
 const tierRows=Array.from({length:Math.max(...extras.map(c=>c.length),1)},(_,i)=>[`補充級距 ${i+1}`,extras.map((col,column)=>col[i]?extraHTML(col[i],column):'<p class="unknown">本級距加發資料尚未完整核對，不以基本額代替。</p>')]);
 return `${decisionHeader(data,group,0)}<div class="decision-comparison" aria-describedby="decision-${e(group.id)}-0">${table(group.options.map(o=>o.label),rows,'','decision-'+group.id+'-0')}</div><details id="all-tiers"><summary>查看其他子女序位與加發資料（中央 ${columns.flat().length} 筆）</summary><p>第 1 名及基本額見<a href="#funding">上方比較</a>；以下補充其他級距。</p>${table(group.options.map(o=>o.label),tierRows)}</details>${localSupport(data,g,fs,region)}`;
}
function eligibilityComparison(data,group) {
 const ps=group.options.map(o=>optionPolicy(data,o));
 // Each policy owns its full AND/OR tree; never copy another column's rules.
 const rows=[['資格條件',ps.map(p=>policyFields(data,p,['eligibility']))],
  ['已知排除',ps.map(p=>policyFields(data,p,['exclusions']))],
  ['併領規則與缺口',ps.map(p=>policyFields(data,p,['combination_rules']))]];
 return `${decisionHeader(data,group,1)}<div class="policy-column-anchors">${ps.map((p,i)=>`<span id="${e(p?.id||'childcare-gap')}" tabindex="-1">${e(group.options[i].label)}：${p?'逐欄核對狀態如下':'完整資格尚待補'}</span>`).join('')}</div>${table(group.options.map(o=>o.label),rows)}`;
}
function applicationFields(data,p,group){
 if(p&&(p.period_status!=='known'||p.effective_from>taiwanDate()||p.effective_to&&p.effective_to<taiwanDate()||p.superseded_by))return policyFields(data,p,['application_deadlines']);
 const layout=(group.policy_layouts||[]).find(l=>l.record_id===p?.id&&l.version_id===p?.version_id);
 return ['application_deadlines','application_channels','required_documents','application_steps','payment_method'].map(field=>{
  if(field==='required_documents'&&layout&&p.fields[field].verification_status==='verified')return `<section class="policy-field" id="${e(p.id)}-${field}"><h3>文件依管道準備</h3>${projectionRows(data,layout.documents)}${sources(data,p.id,field)}</section>`;
  if(field==='application_deadlines'&&Array.isArray(p?.fields[field].value)&&p.fields[field].verification_status==='verified')return `<section class="policy-field" id="${e(p.id)}-${field}"><h3>申請期限</h3>${p.fields[field].value.map(v=>`<dl class="condition-rows"><div><dt>起算事件</dt><dd>${e(v.trigger_event||'待確認')}</dd></div><div><dt>期限</dt><dd>${e(v.period||'待確認')}</dd></div><div><dt>逾期影響及條件原文</dt><dd>${e(v.original_text||'待確認')}</dd></div></dl>`).join('')}${sources(data,p.id,field)}</section>`;
  return policyFields(data,p,[field]);
 }).join('');
}
function applicationComparison(data,group,ps){
 const central=group.options.map(o=>optionPolicy(data,o)), key=p=>p?.id||'childcare-gap', missing=central.some(p=>!p);
 const overview=(p,field)=>{if(p&&(p.period_status!=='known'||p.effective_from>taiwanDate()||p.effective_to&&p.effective_to<taiwanDate()||p.superseded_by))return '<p class="unknown">此版本不列為目前可申辦資訊，請查來源版本。</p>';const f=p?.fields[field];const overviewRows=field==='application_deadlines'?(group.policy_layouts||[]).find(l=>l.record_id===p?.id&&l.version_id===p?.version_id)?.application_overview:null;if(overviewRows&&f?.verification_status==='verified')return projectionRows(data,overviewRows)+`<a href="#apply-${e(p.id)}">補正、申復與異動期限見完整申請內容</a>`;return f?.verification_status==='verified'&&f.value!==null?`${structured(f.value)}${sources(data,p.id,field)}`:`<p class="unknown">${f?.gap_reason==='not_stated'?'已查來源未載明，仍待確認':'本欄尚未核對'}</p>`;};
 return `${decisionHeader(data,group,2)}${table(group.options.map(o=>o.label),[['期限',central.map(p=>overview(p,'application_deadlines'))],['管道與窗口',central.map(p=>overview(p,'application_channels'))],['完整申請內容',central.map((p,i)=>`<button type="button" data-apply="${e(key(p))}" aria-controls="apply-${e(key(p))}" aria-expanded="false">${p?'查看'+e(group.options[i].label)+'申請內容':'查看托育補助待確認事項'}</button>`)]])}<label for="policy-2">閱讀申請內容（不代表選擇領取方案）</label><select id="policy-2" data-policy-select><option value="">尚未展開方案</option>${ps.map(p=>`<option value="${e(p.id)}">${e(p.name)}</option>`).join('')}${missing?'<option value="childcare-gap">中央托育補助（完整資料待補）</option>':''}</select><div data-policy=""><p>從上方比較入口展開一個方案。</p></div>${[...ps,...(missing?[null]:[])].map(p=>`<section class="application-content" data-policy="${e(key(p))}" id="apply-${e(key(p))}" hidden><h3 tabindex="-1">${e(p?.name||'托育補助待確認事項')}</h3>${applicationFields(data,p,group)}</section>`).join('')}`;
}
function editorialComparison(s,adapters,data,g,region) {
 const control=s.options.length>3?`<fieldset class="option-controls" data-option-control="${e(s.id)}"><legend>選擇要比較的選項；桌面最多三項、手機最多兩項</legend>${s.options.map((o,i)=>`<label><input type="checkbox" value="${i}" ${i<2?'checked':''}>${e(o)}</label>`).join('')}<p class="option-count" role="status"></p></fieldset>`:'';
 return `<section class="editorial-comparison" id="${e(s.id)}"><h3>${e(s.heading)}</h3>${control}${table(s.options,s.dimensions.map(d=>[d.label,s.options.map((_,i)=>d.economic_refs?.[i]?.some(id=>factsFor(data,g.item_id,region).some(f=>f.id===id)) ? d.economic_refs[i].filter(id=>factsFor(data,g.item_id,region).some(f=>f.id===id)).map(id=>`<a href="#${e(id)}">查看此情境的費用、期間與限制</a>`).join('<br>') : structured(d.values[i]))]))}</section>`;
}
function representative(data,g,group,adapters,region) {
 const section=id=>g.sections.find(s=>s.id===id), render=s=>s.content_type==='comparison'?editorialComparison(s,adapters,data,g,region):renderSection(s,adapters);
 let content='';
 if(['comparison','age'].includes(group.kind))content=g.sections.filter(s=>['comparison','age_map'].includes(s.content_type)).map(render).join('');
 if(group.kind==='preparation')content=['prepare','requirements'].map(id=>render({...section(id),heading:id==='prepare'?'現在能做':'後續需確認'})).join('');
 if(group.kind==='parallel'){
  const rows=group.discussion_rows.map(row=>[row.label,[e(row.decision),e(row.backup)]]);
  content=table(['要討論的決定','備案'],rows)+g.sections.filter(s=>['prepare','requirements'].includes(s.id)).map(s=>`<details id="${e(s.id)}"><summary>${e(s.heading)}：完整討論提示</summary>${s.rows.map(r=>`<p><strong>${e(r.label)}</strong>：${e(r.text)}</p>`).join('')}</details>`).join('');
 }
 if(group.kind==='unknown')content=table(['要確認的內容','仍待核對'],group.arrangement_rows.map(row=>[row.label,[e(row.question),e(row.gap)]]));
 return `${decisionHeader(data,group,'reading')}${content}`;
}
function editorialSections(g,adapters,which,data,region) {
 const group=decisionFor(data,g);
 return g.sections.filter(s=>s.content_type!=='funding').filter(s=>{
  if(group&&group.kind!=='policy_comparison'&&(['comparison','age'].includes(group.kind)&&['comparison','age_map'].includes(s.content_type)||['preparation','parallel'].includes(group.kind)&&['prepare','requirements'].includes(s.id)))return false;
  const primary=['comparison','age_map'].includes(s.content_type);
  return which==='support'?primary:which==='conditions'?!primary&&s.content_type!=='time'&&s.content_type!=='actions':s.content_type==='time'||s.content_type==='actions';
 }).map(s=>s.content_type==='comparison'?editorialComparison(s,adapters,data,g,region):renderSection(s,adapters)).join('');
}
function scopeStatus(data,g,region,fs,ps) {
 const forRegion=r=>{
  const facts=fs.filter(f=>f.region_code===r), policies=ps.filter(p=>p.region_code===r);
  const count=facts.filter(current).length;
  const rows=(data.coverage||[]).filter(c=>c.region_code===r&&(g.coverage_topic_ids||[]).includes(c.topic_id));
  if (!facts.length&&!policies.length&&!rows.length) return '本項尚未收錄公共資料';
  if (!count&&!policies.length) return rows.length?`${[...new Set(rows.map(c=>c.search_status))].join('／')}；尚無可列入現行比較的金額`:'僅有非現行版本';
  return `${count} 筆金額${facts.some(f=>freshness(f)==='stale')?'（待重查）':''}、${policies.length} 份政策`;
 };
 return `中央：${forRegion('TW')}；${region?`${e(regionLabels[region]||region)}：${forRegion(region)}`:'地方：尚未選縣市'}。`;
}
function sourceDetails(data,fs,ps) {
 const activeIDs=new Set(ps.map(p=>p.id));ps=[...ps];for(let i=0;i<ps.length;i++){const old=(data.policy_details||[]).find(p=>p.id===ps[i].supersedes);if(old&&!ps.some(p=>p.id===old.id))ps.push(old);}
 return `<details id="source-details"><summary>查看來源與核對詳情（${fs.length} 筆金額、${ps.length} 份政策）</summary>${fs.map(f=>`<section id="record-${e(f.id)}" class="source-record"><h3>${e(f.title)}</h3><p>${e(statusLabels[freshness(f)])}；最後核對 ${e(f.checked_at)}；下次重查 ${e(f.next_review_at)}。</p>${current(f)?`<p><a href="#${e(f.id)}">查看金額情境與限制</a></p>`:`<div id="${e(f.id)}"><p>本版本不列入現行比較；以下只保留版本記錄。</p>${factRows(data,f)}</div>`}<details><summary>原始條件與排除說明</summary>${structured(f.conditions)}${structured(f.exclusions)}<p>原始金額記錄的排除文字，不代替獨立的關係核對。</p></details><p>${sources(data,f.id)}</p></section>`).join('')}${(data.policy_relations||[]).filter(r=>[...r.from,...r.to].every(ref=>[...fs,...ps].some(f=>f.id===ref.record_id))).map(r=>`<section id="relation-${e(r.id)}"><h3>關係依據與範圍</h3><p>${e(r.superseded_by||(data.policy_relations||[]).some(next=>next.supersedes===r.id)?'歷史關係版本（保留當時核對狀態）':r.verification_status==='verified'?'已核對關係':'關係尚待核對')}；${e(r.gap_reason||'')}；${e(r.verify_with||'')}</p>${r.verification_status==='verified'?`<p>${e(r.subject)}、${e(r.overlap)}；${e(r.age_scope)}；${e(r.scenario_scope)}；${e(r.region_code)}。${e(r.conditions)}${e(r.exceptions)}</p>`:''}<p>適用 ${e(period(r))}；最後核對 ${e(r.checked_at||'尚未核對')}；重查 ${e(r.next_review_at||'待確認')}</p>${sources(data,r.id)}<ul>${(data.field_evidence||[]).filter(ev=>ev.entity_id===r.id).map(ev=>`<li>${e(ev.field_path)}：${e(ev.locator)}；${e(ev.excerpt)}；核對 ${e(ev.checked_at)}；快照 ${e(ev.snapshot_id)} ${(data.source_registry||[]).filter(source=>source.id===ev.source_id&&/^https?:\/\//.test(source.url)).map(source=>`<a href="${e(source.url)}" target="_blank" rel="noopener">${e(source.agency||source.id)}：此欄依據</a>`).join('')}</li>`).join('')}</ul></section>`).join('')}${ps.map(p=>`<section id="record-${e(p.id)}">${activeIDs.has(p.id)?'':`<p id="${e(p.id)}" data-historical-policy>歷史政策版本；現行版本已另列。</p>`}<h3>${e(p.name)}</h3><p>${e(p.agency)}；適用 ${e(period(p))}；最後核對 ${e(p.checked_at)}；下次重查 ${e(p.next_review_at)}${p.next_review_at<taiwanDate()?'；資料待重查':''}。</p>${sources(data,p.id)}<details><summary>此政策版本的原始欄位</summary><p>保留版本內容與各欄核對狀態；不代表目前可申辦或整份資格完整。</p>${Object.entries(p.fields).map(([field,state])=>`<section><h4>${e(labels[field])}</h4><p>${e(state.verification_status)}${state.gap_reason?'；'+e(state.gap_reason):''}</p>${state.value===null?'<p class="unknown">未知，仍待確認。</p>':structured(state.value)}</section>`).join('')}</details></section>`).join('')}<details id="field-evidence"><summary>快照、逐欄證據與歷史修訂</summary>${[...fs,...ps].map(f=>`<section><h4>${e(f.id)}</h4><ul>${(data.field_evidence||[]).filter(v=>v.entity_id===f.id).map(v=>`<li>${e(v.field_path)}：${e(v.locator)}；快照 ${e(v.snapshot_id)}；${e(v.verification_status)}</li>`).join('')}</ul><ul>${(f.review_history||[]).map(h=>`<li>${e(h.at)} ${e(h.reviewer)}：${e(h.note||h.result)}</li>`).join('')}</ul></section>`).join('')}</details></details>`;
}
export function detailBody(data,g,region,adapters) {
 const ps=policiesFor(data,g,region), fs=factsFor(data,g.item_id,region), active=fs.filter(current), group=decisionFor(data,g);
 const hasPolicy=ps.length||g.support_comparison;
 const select=task=>`<label for="policy-${task}">選擇方案</label><select id="policy-${task}" data-policy-select><option value="">${ps.length?'選擇方案':'尚未收錄政策詳情'}</option>${ps.map(p=>`<option value="${e(p.id)}">${e(p.name)}</option>`).join('')}${g.support_comparison?'<option value="childcare-gap">中央托育補助（完整資料待補）</option>':''}</select>`;
 const policies=task=>`${select(task)}<div data-policy=""><p class="unknown">請選擇方案。</p></div>${[...ps,...(g.support_comparison?[null]:[])].map(p=>`<div data-policy="${e(p?.id||'childcare-gap')}" id="${task===1?e(p?.id||'childcare-gap'):'apply-'+e(p?.id||'childcare-gap')}" hidden>${policyFields(data,p,task===1?['eligibility','exclusions','combination_rules']:['application_deadlines','application_channels','required_documents','application_steps','support_method','payment_method'])}</div>`).join('')}`;
 const econ=(g.content_facets||[]).some(f=>['cost','support','income'].includes(f));
 let support=g.support_comparison?supportComparison(data,g,fs,region):factGroup(data,active.filter(f=>f.region_code==='TW'&&f.direction!=='cost'),'central','中央支持')+factGroup(data,active.filter(f=>f.region_code!=='TW'&&f.direction!=='cost'),'local','地方支持',{collapsed:active.some(f=>f.region_code==='TW')})+factGroup(data,active.filter(f=>f.direction==='cost'),'price','費用／具名價格樣本');
 if(group&&group.kind!=='policy_comparison'){const facts=support;support=representative(data,g,group,adapters,region)+(facts?`<details id="reading-prices"><summary>查看支持與個別機構報價</summary>${facts}</details>`:'');}
 if (!support&&econ) support='<p class="unknown">本項尚無可列入現行比較的已核對金額；未知不代表免費或沒有支持。其他版本見來源詳情。</p>';
 // Editorial comparisons are retained even when monetary facts exist. Each section has one home.
 const editorial=editorialSections(g,adapters,'support',data,region);
 if (editorial) support+=`<details id="reading-comparison"><summary>照顧情境與服務比較</summary>${editorial}</details>`;
 if(!support) support=`<p>${e(g.summary)}</p><p><a href="#${e(g.sections.find(s=>s.content_type!=='funding')?.id||'next-steps')}">查看準備內容與時間</a></p>`;
 const backgrounds=editorialSections(g,adapters,'conditions',data,region)+((data.item_program_links||[]).some(f=>f.item_id===g.item_id)?`<details id="legacy-funding"><summary>原始方案候選（尚未核對）</summary>${adapters.funding?.()||''}</details>`:'');
 const application=editorialSections(g,adapters,'application',data,region);
 const panels=[support,`${group?.kind==='policy_comparison'?eligibilityComparison(data,group)+(ps.filter(p=>p.region_code!=='TW').map(p=>`<details><summary>${e(p.name)}：地方資格與限制</summary><div id="${e(p.id)}">${policyFields(data,p,['eligibility','exclusions','combination_rules'])}</div></details>`).join('')):hasPolicy?policies(1):''}${backgrounds?`<details id="preparation-background"><summary>閱讀背景與準備提醒</summary>${backgrounds}</details>`:!hasPolicy?'<p>此項以個人準備為主，未收錄可據以判定資格的政策。</p>':''}`,`${group?.kind==='policy_comparison'?applicationComparison(data,group,ps):hasPolicy?policies(2):'<p class="unknown">本項未收錄已核對的申請管道；如需辦理，請向提供單位確認。</p>'}${application?`<details id="application-background"><summary>準備方式與時間</summary>${application}</details>`:''}<details id="next-steps"><summary>接下來可以怎麼準備</summary><ul>${g.next_actions.map(s=>`<li>${e(s)}</li>`).join('')}</ul>${adapters.related?.()||''}</details>`];
 return `<article class="task-detail" data-item="${e(g.item_id)}" data-decision="${e(group?.kind||'')}"><div role="tablist" aria-label="詳情任務">${tasks.map((t,i)=>`<button type="button" role="tab" id="task-${i}" aria-controls="panel-${i}" aria-selected="${i===0}" tabindex="${i===0?0:-1}" data-task="${i}">${t}</button>`).join('')}</div>${panels.map((body,i)=>`<section role="tabpanel" tabindex="0" id="panel-${i}" aria-labelledby="task-${i}" ${i?'hidden':''}><h2 class="visually-hidden" id="${['funding','policy-details','application-details'][i]}">${tasks[i]}</h2>${body}</section>`).join('')}<p class="detail-coverage">${scopeStatus(data,g,region,fs,ps)}</p>${sourceDetails(data,fs,ps).replace('<details id="field-evidence">',`<details id="coverage-gaps"><summary>本項待補內容</summary>${g.economic_gap?`<p>${e(g.economic_gap)}</p>`:''}<ul>${(data.coverage||[]).filter(c=>(c.region_code==='TW'||c.region_code===region)&&(g.coverage_topic_ids||[]).includes(c.topic_id)).map(c=>`<li>${e(c.region_code==='TW'?'中央':regionLabels[c.region_code])}：${e(c.gaps)}</li>`).join('')}</ul></details><details id="field-evidence">`)}<div class="detail-action">${adapters.addButton()}</div></article>`;
}
export function bindDetail(root) {
 const article=root.querySelector('.task-detail');if(!article)return;
 const tabs=[...article.querySelectorAll('[data-task]')];
 const paired=article.dataset.decision==='policy_comparison';
 let selectedPolicy=new URL(location.href).searchParams.get('policy')||'';
 const storageKey=`detail-view:${location.pathname}`;
 let restoring=false;
 const readSaved=()=>{try{return JSON.parse(sessionStorage.getItem(storageKey)||'null');}catch{return null;}};
 const saveView=()=>{if(restoring)return;try{sessionStorage.setItem(storageKey,JSON.stringify({url:location.pathname+location.search,open:[...article.querySelectorAll('details[open]')].map(d=>d.id).filter(Boolean),scroll:scrollY}));}catch{}};
 const updateURL=change=>{const u=new URL(location.href);change(u.searchParams);history.replaceState(history.state,'',u);saveView();};
 const apply=(task,policy,write=false)=>{
  const n=['0','1','2'].includes(String(task))?Number(task):0;
  tabs.forEach((t,i)=>{t.setAttribute('aria-selected',String(i===n));t.tabIndex=i===n?0:-1;article.querySelector(`#panel-${i}`).hidden=i!==n;});
  const selectors=[...article.querySelectorAll('[data-policy-select]')];
  const selected=selectors[0] ? [...selectors[0].options].find(o=>o.value===policy)?.value ?? (paired?'':selectors[0].options[1]?.value) ?? '' : '';
  selectedPolicy=selected;
  selectors.forEach(s=>{s.value=selected;s.closest('[role=tabpanel]').querySelectorAll('[data-policy]').forEach(el=>el.hidden=el.dataset.policy!==selected);});
  article.querySelectorAll('[data-apply]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.apply===selected)));
  if(write)updateURL(q=>{q.set('task',String(n));if(selected)q.set('policy',selected);else q.delete('policy');});
 };
 const selectFact=(key,id,write=false)=>{
  const s=article.querySelector(`[data-fact-select="${key}"]`);if(!s)return;
  const value=[...s.options].some(o=>o.value===id)?id:s.options[0].value;s.value=value;
  article.querySelectorAll(`[data-fact-group="${key}"]`).forEach(el=>el.hidden=el.dataset.fact!==value);
  if(write)updateURL(q=>q.set(`fact_${key}`,value));
 };
 const restore=()=>{const q=new URL(location.href).searchParams;apply(q.get('task'),q.get('policy'));article.querySelectorAll('[data-fact-select]').forEach(s=>selectFact(s.dataset.factSelect,q.get(`fact_${s.dataset.factSelect}`)));};
 tabs.forEach((t,i)=>{t.onclick=()=>apply(i,selectedPolicy,true);t.onkeydown=ev=>{const n={ArrowRight:(i+1)%3,ArrowLeft:(i+2)%3,Home:0,End:2}[ev.key];if(n!==undefined){ev.preventDefault();tabs[n].click();tabs[n].focus();}};});
 const focusApplication=()=>{article.querySelector('[data-policy]:not([hidden]) h3')?.focus();};
 article.querySelectorAll('[data-policy-select]').forEach(s=>s.onchange=()=>{apply(tabs.findIndex(t=>t.getAttribute('aria-selected')==='true'),s.value,true);if(paired)focusApplication();});
 article.querySelectorAll('[data-apply]').forEach(b=>b.onclick=()=>{apply(2,b.dataset.apply,true);focusApplication();});
 article.querySelectorAll('[data-fact-select]').forEach(s=>s.onchange=()=>selectFact(s.dataset.factSelect,s.value,true));
 const reveal=(hash=decodeURIComponent(location.hash.slice(1)))=>{
  if(!hash)return false;
  const aliases={'guide-reminders':'preparation-background',conditions:'preparation-background',coverage:'local-support',application:'application-background','funding-conditions':'preparation-background','key-points':'preparation-background'};
  let target=document.getElementById(hash)||document.getElementById(aliases[hash]);
  if(!target){const legacy=article.querySelector(`[data-legacy-anchor="${CSS.escape(hash)}"]`);target=legacy;}
  if(!target)return false;
  const panel=target.closest('[role=tabpanel]');
  const policy=target.closest('[data-policy]');
  if(panel)apply(panel.id.slice(-1),policy?.dataset.policy||new URL(location.href).searchParams.get('policy'),true);
  const fact=target.closest('[data-fact]');if(fact)selectFact(fact.dataset.factGroup,fact.dataset.fact,true);
  for(let node=target;node&&node!==article;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;
  target.tabIndex=-1;
  requestAnimationFrame(()=>{target.scrollIntoView({block:'start'});target.focus({preventScroll:true});saveView();});return true;
 };
 const requestedPolicy=selectedPolicy;
 restore();
 article.querySelectorAll('[data-option-control]').forEach(control=>{
  const key='decision-options:'+location.pathname+':'+control.dataset.optionControl,inputs=[...control.querySelectorAll('input')],media=matchMedia('(max-width:767px)');
  let selected;try{selected=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
  selected=Array.isArray(selected)&&selected.length?selected.filter(i=>inputs[i]):[0,1];if(!selected.length)selected=[0,1];
  const paint=()=>{const max=media.matches?2:3,visible=selected.slice(0,max),table=control.parentElement.querySelector('table');inputs.forEach((v,i)=>{v.checked=visible.includes(i);});table.querySelectorAll('tr').forEach(row=>[...row.children].slice(1).forEach((cell,i)=>cell.hidden=!visible.includes(i)));control.querySelector('.option-count').textContent=`尚有 ${inputs.length-visible.length} 項；閱讀選擇不代表互斥，相關限制仍請閱讀上方。`;};
  inputs.forEach((input,i)=>input.onchange=()=>{const max=media.matches?2:3,current=selected.slice(0,max);if(input.checked){if(current.length>=max){input.checked=false;control.querySelector('.option-count').textContent='請先取消一個已選選項，再加入另一個。';return;}selected=[...current,i];}else{if(current.length===1){input.checked=true;return;}selected=current.filter(v=>v!==i);}try{sessionStorage.setItem(key,JSON.stringify(selected));}catch{}paint();});media.addEventListener('change',paint);paint();
 });
 if(requestedPolicy&&!selectedPolicy&&document.getElementById(requestedPolicy)?.hasAttribute('data-historical-policy')){reveal(requestedPolicy);}
 else if(requestedPolicy&&!selectedPolicy){article.querySelector('[role=tablist]').insertAdjacentHTML('afterend','<p class="unknown" role="status" data-scope-removed="policy">原先閱讀的地方方案已不在所選縣市範圍，請從地方選項入口重新選擇；中央比較保留。</p>');updateURL(q=>q.delete('policy'));}
 const requestedFact=new URL(location.href).searchParams.get('fact_local');
 if(requestedFact&&(!article.querySelector('[data-fact-select=local]')||![...article.querySelector('[data-fact-select=local]').options].some(o=>o.value===requestedFact))){const local=article.querySelector('#local-support');if(local){local.insertAdjacentHTML('afterend','<p class="unknown" role="status" data-scope-removed="fact">原先的地方金額情境已不在範圍；請重新選擇地方情境。</p>');if(local.tagName==='DETAILS')local.open=false;const selector=article.querySelector('[data-fact-select=local]');if(selector){selector.insertAdjacentHTML('afterbegin','<option value="">請重新選擇地方情境</option>');selector.value='';article.querySelectorAll('[data-fact-group=local]').forEach(el=>el.hidden=true);}}updateURL(q=>q.delete('fact_local'));}
 const saved=readSaved();
 if(saved?.url===location.pathname+location.search){restoring=true;saved.open.forEach(id=>{const d=document.getElementById(id);if(d?.tagName==='DETAILS')d.open=true;});restoring=false;}
 // Navigation history restores the opened sections before the app restores scroll.
 if(location.hash)reveal();else if(paired&&new URL(location.href).searchParams.get('task')==='1'&&selectedPolicy)reveal(selectedPolicy);
 article.addEventListener('click',ev=>{const a=ev.target.closest('a[href^="#"]');if(a){const hash=decodeURIComponent(a.hash.slice(1));if(reveal(hash)){ev.preventDefault();history.replaceState(history.state,'',a.hash);saveView();}}});
 article.querySelectorAll('details').forEach(d=>d.addEventListener('toggle',saveView));
 window.onhashchange=()=>reveal();window.onpopstate=restore;
 window.onpagehide=saveView;
}
