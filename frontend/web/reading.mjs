// Semantic editorial views. Text is escaped; emphasis never contains arbitrary HTML.
export const escapeText = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e = escapeText;
function semanticText(text) {
 return String(text).split(/(?<=[。；])/).map(sentence => /待確認|待向|待專業/.test(sentence) ? `<span class="unknown">${e(sentence)}</span>` : e(sentence)).join('');
}
export function conditionRows(rows, logic) {
 const description = {all:'以下皆須符合',any:'符合其中一項',unparsed:'條件尚未完整整理；組合邏輯待確認'}[logic];
 return `${description ? `<p class="condition-logic">${description}</p>` : ''}<dl class="condition-rows">${rows.map(r => `<div${r.emphasis_role === 'restriction' ? ' class="restriction"' : ''}><dt>${e(r.label)}</dt><dd>${r.emphasis_role === 'decision' ? `<strong>${semanticText(r.text)}</strong>` : semanticText(r.text)}</dd></div>`).join('')}</dl>`;
}
export function renderSection(s, {funding, time, comparisonValue}) {
 let body = '';
 if (s.content_type === 'funding') body = funding();
 else if (s.content_type === 'time') body = time();
 else if (s.content_type === 'comparison') body = `<div class="reading-comparison">${s.dimensions.map(d => `<section class="comparison-dimension"><h3>${e(d.label)}</h3><dl style="--option-count:${s.options.length}">${s.options.map((o,n) => `<div><dt>${e(o)}</dt><dd>${semanticText(comparisonValue?.(s,d,n) ?? d.values[n])}</dd></div>`).join('')}</dl></section>`).join('')}</div>`;
 else if (s.content_type === 'age_map') body = `<p class="restriction"><strong>特別留意</strong>：以下是閱讀分組，不表示服務或補助的適用年齡，也不表示生日當天切換。</p>${s.bands.map(b => `<section class="age-band"><h3>${e(b.heading)}</h3>${conditionRows(b.rows)}</section>`).join('')}`;
 else body = conditionRows(s.rows, s.condition_logic);
 return `<section class="guide-section${s.content_type === 'comparison' ? ' wide-section' : ''}" aria-labelledby="${e(s.id)}"><h2 id="${e(s.id)}" tabindex="-1">${e(s.heading)}</h2>${body}</section>`;
}
export function readingBody(g, adapters) {
 const economic = adapters.economics?.() || '';
 const bodySections = g.sections.map(s=>economic && s.id==='funding'?{...s,id:'funding-conditions'}:s);
 const sections = [...(economic?[{id:'funding',heading:'費用與支持'}]:[]),...(economic.includes('id="policy-details"')?[{id:'policy-details',heading:'資格與辦理方式'}]:[]),...(g.support_comparison?[{id:'guide-reminders',heading:'變更照顧方式與其他提醒'}]:bodySections), {id:'next-steps',heading:'下一步'}];
 const summary = g.support_comparison ? '' : `<section class="key-points" aria-labelledby="key-points"><h2 id="key-points">先知道這${g.key_points.length === 3 ? '三' : g.key_points.length === 2 ? '兩' : '一'}件事</h2><ul>${g.key_points.map(p => `<li>${e(p)}</li>`).join('')}</ul></section>`;
 return `<div class="guide-layout"><nav class="page-toc" aria-label="本頁目錄"><p>本頁內容</p>${sections.map(s => `<a href="#${e(s.id)}">${e(s.heading)}</a>`).join('')}</nav><article class="guide-content">${economic}${summary}${g.support_comparison?`<details class="guide-reminders" id="guide-reminders"><summary>變更照顧方式與其他提醒</summary>${bodySections.map(s=>renderSection(s,adapters)).join('')}</details>`:bodySections.map(s => renderSection(s, adapters)).join('')}<section class="guide-section"><h2 id="next-steps" tabindex="-1">下一步</h2><ul class="next-actions">${g.next_actions.map(a => `<li>${e(a)}</li>`).join('')}</ul>${adapters.addButton()}</section>${adapters.related?.() || ''}</article></div>`;
}
