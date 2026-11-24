import {escapeText as e} from './reading.mjs';

export const relationFields = ['relation_type','direction','subject','age_scope','scenario_scope','overlap','region_code','conditions','exceptions','effective_from','effective_to'];
const records = data => [...(data.economic_facts || []), ...(data.policy_details || [])];
export const decisionFor = (data, guide) => (data.decision_groups || []).find(g => g.id === guide.decision_group_ref);
export function resolveRef(data, ref) {
 const record=records(data).find(r=>r.id===ref.record_id && r.version_id===ref.version_id);
 if(!record)throw Error('資料參照錯誤：版本不存在');
 return record;
}
export function project(data, ref) {
 let value=resolveRef(data,ref);
 for(const key of (ref.path||'').split('/').slice(1))value=value?.[key];
 if(value===undefined)throw Error('資料參照錯誤：欄位不存在');
 if(ref.slice){if(typeof value!=='string'||ref.slice[0]<0||ref.slice[1]>value.length||ref.slice[0]>=ref.slice[1])throw Error('資料參照錯誤：文字範圍');value=value.slice(...ref.slice);}
 return value;
}
export function validateDecisions(data) {
 const groups=data.decision_groups||[], relations=data.policy_relations||[];
 if(new Set(groups.map(g=>g.id)).size!==groups.length||new Set(relations.map(r=>r.id)).size!==relations.length)throw Error('資料參照錯誤：重複 ID');
 for(const g of data.item_guides||[])if(g.decision_group_ref&&!groups.some(d=>d.id===g.decision_group_ref))throw Error('資料參照錯誤：比較組不存在');
 for(const g of groups){
  if(!g.question||!g.scope||!g.options?.length)throw Error('資料參照錯誤：比較組不完整');
  if(new Set(g.options.map(o=>o.id)).size!==g.options.length)throw Error('資料參照錯誤：重複選項');
  for(const o of g.options){for(const ref of o.fact_refs||[])resolveRef(data,ref);if(o.policy_ref)resolveRef(data,o.policy_ref);for(const row of [...(o.context||[]),...(o.checks||[])])if(row.ref)project(data,row.ref);}
  for(const id of g.relation_refs||[]){const relation=relations.find(r=>r.id===id);if(!relation)throw Error('資料參照錯誤：關係不存在');const optionRefs=g.options.flatMap(o=>(o.fact_refs||[]).map(ref=>ref.record_id));if([...relation.from,...relation.to].some(ref=>!optionRefs.includes(ref.record_id)))throw Error('資料參照錯誤：關係不屬於此比較組');}
  for(const layout of g.policy_layouts||[]){resolveRef(data,layout);for(const row of [...(layout.documents||[]),...(layout.application_overview||[])])project(data,row.ref);}
 }
 for(const r of relations){
  for(const ref of [...(r.from||[]),...(r.to||[])])resolveRef(data,ref);
  if(!r.from?.length||!r.to?.length)throw Error('資料參照錯誤：關係端點');
  if(!['unverified','verified','disputed','superseded'].includes(r.verification_status))throw Error('資料參照錯誤：關係狀態');
  if(new Set([...r.from,...r.to].map(ref=>ref.record_id)).size!==r.from.length+r.to.length)throw Error('資料參照錯誤：重複關係端點');
  if(r.verification_status==='verified'){
   if(!['exclusive','conditional','prerequisite'].includes(r.relation_type)||!r.checked_at||!r.next_review_at||!r.effective_from||!r.subject||!r.age_scope||!r.scenario_scope||!r.overlap||!r.direction||!r.region_code||r.conditions===null||r.exceptions===null||!['symmetric','from_to','to_from'].includes(r.direction))throw Error('資料參照錯誤：關係缺少範圍');
   for(const field of relationFields){const ev=(data.field_evidence||[]).find(v=>(r.evidence_refs||[]).includes(v.id)&&v.entity_id===r.id&&v.field_path==='/'+field&&v.verification_status==='verified'&&v.snapshot_id&&v.locator&&v.excerpt&&v.checked_at&&(data.source_registry||[]).some(s=>s.id===v.source_id&&!['查找入口','歷史辦法'].includes(s.source_type)));if(!ev)throw Error('資料參照錯誤：關係缺少證據');}
   for(const ref of [...r.from,...r.to]){const p=resolveRef(data,ref);if(p.period_status!=='known'||p.effective_from>r.effective_from||(p.effective_to && (!r.effective_to||p.effective_to<r.effective_to)))throw Error('資料參照錯誤：關係期間不相容');}
  }else if(!r.gap_reason)throw Error('資料參照錯誤：關係缺口');
 }
 return true;
}
export function relationState(data,r,today) {
 if(r.verification_status==='disputed')return 'disputed';
 if(r.verification_status==='superseded'||r.superseded_by||r.effective_to&&r.effective_to<today)return 'expired';
 if(r.effective_from>today)return 'future';
 if(r.verification_status!=='verified')return 'unknown';
 if(!r.effective_from)return 'undated';
 if([...r.from,...r.to].some(ref=>{const p=resolveRef(data,ref);return p.superseded_by||['superseded','disputed'].includes(p.verification_status);}))return 'unknown';
 const sourceIDs=(data.field_evidence||[]).filter(ev=>(r.evidence_refs||[]).includes(ev.id)).map(ev=>ev.source_id);
 if(r.next_review_at<today||(data.source_registry||[]).some(s=>sourceIDs.includes(s.id)&&s.policy_review_status==='待重新核對'))return 'stale';
 return 'current';
}
export function relationHTML(data,g,today,suffix='') {
 if(!g)return '';
 const relationLabels={exclusive:'兩者擇一，不可同時領取',conditional:'有條件搭配',prerequisite:'有前提，請依方向確認'};
 const states={unknown:'兩者能否同時使用：待確認',disputed:'領取關係有不同說明，待核對',future:'關係為未來生效版本，現階段仍待確認',expired:'關係為歷史版本，現階段仍待確認',undated:'關係適用期間未明，仍待確認'};
 const rs=(g.relation_refs||[]).map(id=>data.policy_relations.find(r=>r.id===id));
 return `<header class="decision-heading" id="decision-${e(g.id+suffix)}"><h2>${e(g.question)}</h2><p>比較範圍：${e(g.scope)}</p>${rs.map(r=>{const state=relationState(data,r,today),known=['current','stale'].includes(state);const label=refs=>g.options.filter(o=>(o.fact_refs||[]).some(f=>refs.some(ref=>ref.record_id===f.record_id))).map(o=>o.label).join('／');const pair=g.options.length>2?label(r.from)+'與'+label(r.to)+'：':'';return `<div class="support-rule ${known?'':'unknown'}"><strong>${e(pair)}${e(known?`${r.subject}、${r.overlap}：${relationLabels[r.relation_type]}`:states[state])}</strong>${known?`<span>${e(r.age_scope)}；${e(r.region_code)}。${e(r.conditions)}${e(r.exceptions)}${r.relation_type==='prerequisite'?`；方向：${e(r.direction==='to_from'?label(r.to)+'先於'+label(r.from):label(r.from)+'先於'+label(r.to))}`:''}</span>${state==='stale'?`<span>資料待重查；上次核對 ${e(r.checked_at)}</span>`:''}`:`<span>${e(r.gap_reason||'目前版本與範圍尚待重新核對')}；${e(r.verify_with)}。</span>`}<a href="#relation-${e(r.id)}">${known?'查看關係範圍與依據':'關係依據與待核對範圍'}</a></div>`;}).join('')}${g.editorial_note?`<p class="editorial-note">準備建議：${e(g.editorial_note)}</p>`:''}</header>`;
}
