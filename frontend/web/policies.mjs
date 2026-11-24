import {escapeText as e} from './reading.mjs';
import {taiwanDate} from './economics.mjs';
const labels={eligibility:'資格與對象',support_method:'支持方式',payment_method:'給付方式',application_channels:'申請管道與窗口',application_steps:'辦理流程',required_documents:'應備文件',application_deadlines:'申請期限',exclusions:'限制與異動',combination_rules:'併領與排除'};
export function policiesFor(data,g,region){return (data.policy_details||[]).filter(p=>(g.policy_detail_refs||[]).includes(p.id)&&(p.region_code==='TW'||p.region_code===region));}
export function valueHTML(value){
 if(typeof value==='string')return `<p>${e(value)}</p>`;
 if(Array.isArray(value))return `<ul>${value.map(v=>`<li>${e(v.original_text)}</li>`).join('')}</ul>`;
 if(value.all_of||value.any_of)return `<p>${value.all_of?'以下全部須符合（AND）：':'下列任一情形（OR）：'}</p><ul>${(value.all_of||value.any_of).map(v=>`<li>${valueHTML(v)}</li>`).join('')}</ul>`;
 return `<p>${e(value.original_text)}</p>`;
}
export function policySummary(data,g,region,today=taiwanDate()){
 const ps=policiesFor(data,g,region);if(!ps.length)return '';
 return `<section class="policy-details" aria-labelledby="policy-details"><h2 id="policy-details" tabindex="-1">資格與辦理方式</h2><p>只展開你要辦理的方案。各方案仍有待確認欄位；請依自身情況向受理單位核對。</p>${ps.map(p=>{
 const inactive=p.period_status!=='known'||p.effective_from>today||p.effective_to&&p.effective_to<today||p.superseded_by;
 const stale=p.next_review_at<today;
 return `<details class="policy-detail"><summary>${e(p.name)}：資格、文件與期限</summary><p class="muted">${e(p.agency)}；${p.region_code==='TW'?'中央':p.region_code==='TW-TPE'?'臺北市':'新北市'}<br>適用起日 ${e(p.effective_from||'待確認')}；最後核對 ${e(p.checked_at)}${stale?'；資料待重查':''}</p>${inactive?'<p class="unknown">此版本非目前可申辦資訊，請查官方最新說明。</p>':Object.entries(labels).map(([field,label])=>{
 const state=p.fields[field];const verified=state?.verification_status==='verified'&&state.value!==null;
 const evs=(data.field_evidence||[]).filter(ev=>ev.entity_id===p.id&&ev.field_path===`/fields/${field}/value`&&ev.verification_status==='verified');
 const sources=[...new Set(evs.map(ev=>ev.source_id))].map(id=>data.source_registry.find(s=>s.id===id)).filter(s=>s&&/^https:\/\//.test(s.url));
 return `<div class="policy-field"><h4>${e(label)}</h4>${verified?valueHTML(state.value):`<p class="unknown">${state?.gap_reason==='needs_clarification'?'條件仍待釐清，請向受理單位確認。':'本批尚未核對此欄，請查官方說明或洽受理單位。'}</p>`}${verified?sources.map(s=>`<a class="policy-source" href="${e(s.url)}" target="_blank" rel="noopener">官方依據：${e(evs.filter(ev=>ev.source_id===s.id).map(ev=>ev.locator).join('、'))}</a>`).join(''):''}</div>`;
 }).join('')}</details>`;
 }).join('')}</section>`;
}
