import {escapeText as e,conditionRows} from './reading.mjs';
export const facetRank=g=>Math.min(...(g.content_facets||['life']).map(f=>({cost:0,support:0,income:0,health:1,life:2})[f]??2));
export const taiwanDate=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function freshness(f,today=taiwanDate()){
 if(f.verification_status==='disputed')return 'disputed';
 if(f.verification_status==='superseded'||f.effective_to&&f.effective_to<today)return 'expired';
 if(f.effective_from&&f.effective_from>today)return 'future';
 if(f.verification_status!=='verified')return 'unverified';
 if(f.period_status==='undated'||!f.effective_from)return 'undated';
 if(f.source_update_pending||f.next_review_at<today)return 'stale';
 return 'current';
}
function projectFact(data,f){
 const sourceIds=new Set(f.evidence_refs.map(id=>(data.field_evidence||[]).find(ev=>ev.id===id)?.source_id));
 return {...f,source_update_pending:(data.source_registry||[]).some(s=>sourceIds.has(s.id)&&s.policy_review_status==='待重新核對')};
}
export function factsFor(data,id,region){return (data.economic_facts||[]).filter(f=>f.item_ids.includes(id)&&(f.region_code==='TW'||f.region_code===region)).map(f=>projectFact(data,f));}
export function amountText(a){
 const n=v=>v===null||v===undefined?'待確認':new Intl.NumberFormat('zh-TW').format(v);
 const u=a.unit||'';
 if(a.kind==='unknown')return '實際金額待確認';
 if(a.kind==='service')return a.description;
 if(a.kind==='formula')return `${a.rate}% × ${a.basis}；${a.duration}；${a.cap===null?'金額上限待確認':'上限 '+n(a.cap)+' 元'}`;
 if(a.kind==='range')return `${n(a.min)}～${n(a.max)} 元／${u}`;
 if(a.kind==='reimbursement')return `核實報支，最高 ${n(a.value)} 元／${u}`;
 if(a.kind==='days')return `${n(a.value)} 天（${a.description}）`;
 if(a.kind==='deduction')return `所得扣除額 ${n(a.value)} 元／${u}`;
 if(a.qualifier==='from')return `每${u} ${n(a.value)} 元起`;
 return `${a.kind==='cap'?'最高 ':''}${n(a.value)} 元／${u}`;
}
const labels={current:'金額已核對',stale:'資料待更新',undated:'已公布資訊；適用期間未明示',future:'未來生效版本',expired:'舊版本',disputed:'官方資料不一致，待確認',unverified:'待查證'};
export function economicStatus(data,id,region){
 const fs=factsFor(data,id,region), states=fs.map(f=>freshness(f));
 if(states.includes('disputed'))return labels.disputed;
 if(states.includes('stale'))return '資料待更新';
 if(states.includes('current'))return fs.some(f=>f.eligibility_status!=='verified')?'部分待確認；金額已核對，完整資格待確認':'已核對金額';
 if(states.includes('undated'))return '部分待確認；已公布金額的適用期間待確認';
 return '待查證；尚未完成此範圍金額核對';
}
export function coverageText(data,region){
 if(!region)return '選擇縣市後可看地方資料進度。';
 const rows=(data.coverage||[]).filter(c=>c.region_code===region), done=rows.filter(c=>c.search_status==='範圍內完成').length,partial=rows.filter(c=>c.search_status==='部分核對').length;
 if(!done&&!partial)return '地方七主題待查找，不表示沒有補助。';
 return `地方七主題：${done} 項範圍內完成、${partial} 項部分核對；其餘仍在整理。`;
}
export function factBlock(f,data){
 const status=freshness(f), historical=['expired','future','disputed','unverified'].includes(status);
 const sources=[...new Set(f.evidence_refs.map(id=>data.field_evidence.find(ev=>ev.id===id)?.source_id))].map(id=>data.source_registry.find(s=>s.id===id)).filter(Boolean);
 const rows=[{label:'情境與提供者',text:`${f.title}；${f.provider}${f.service_address?'；'+f.service_address:''}`},{label:historical?'版本狀態':f.direction==='cost'?'需要支付':'可能的支持',text:historical?labels[status]:amountText(f.amount)},
 {label:'適用範圍',text:`${f.scope_label}；${f.pricing_basis||'依方案條件'}`},
 {label:'條件與限制',text:f.conditions},
 {label:'仍需自付',text:f.exclusions},
 ...(f.price_period?[{label:'價格樣本',text:`${f.price_period}；包含：${(f.included_components||[]).join('、')}；僅此提供單位的公告，不代表全市行情。`}]:[]),
 {label:'有效期間',text:`${f.effective_from||'起日未明示'} 至 ${f.effective_to||'迄日未明示'}${f.period_status==='undated'?'；僅供帶日期的已公布資訊參考':''}`},
 {label:'最後核對',text:`${f.checked_at}；${labels[status]}${f.eligibility_status!=='verified'?'；完整資格待確認':''}`}];
 return `<section class="economic-fact" id="${e(f.id)}"><h3>${e(f.title)}</h3>${conditionRows(rows)}${sources.map(s=>`<p><a href="${e(s.url)}" target="_blank" rel="noopener">官方說明：${e(s.title)}</a></p>`).join('')}</section>`;
}
export function economicSummary(data,g,region){

 if(!(g.content_facets||[]).some(f=>['cost','support','income'].includes(f)))return '';
 const fs=factsFor(data,g.item_id,region), current=fs.filter(f=>['current','stale'].includes(freshness(f))),others=fs.filter(f=>!current.includes(f));
 return `<section class="economic-summary" aria-labelledby="funding"><h2 id="funding" tabindex="-1">費用與支持</h2><p>中央與所選地方分列；瀏覽縣市不代表符合資格。</p>${current.map(f=>factBlock(f,data)).join('')}${!current.length?'<p class="unknown">目前費用與補助尚未完成此範圍核對；未知不代表免費或沒有福利。</p>':''}${others.length?`<details><summary>已公布資訊與其他版本（${others.length}）</summary>${others.map(f=>factBlock(f,data)).join('')}</details>`:''}<p class="unknown">${e(g.economic_gap||'實際收費、完整資格、排除項目與自付差額請再向提供單位確認。')}</p></section>`;
}
export function comparisonValue(data,section,dimension,index,region){
 const refs=dimension.economic_refs?.[index];if(!refs)return undefined;
 const fs=(data.economic_facts||[]).map(f=>projectFact(data,f)).filter(f=>refs.includes(f.id)&&(f.region_code==='TW'||f.region_code===region)&&!['expired','future','disputed','unverified'].includes(freshness(f)));
 if(!fs.length)return dimension.values[index];
 return fs.map(f=>`${f.scope_label}：${f.title}，${amountText(f.amount)}。${f.exclusions}最後核對 ${f.checked_at}；${labels[freshness(f)]}；完整資格待確認。`).join(' ');
}
