import {escapeText as e} from './reading.mjs';
import {preparation, bindPreparation} from './preparation.mjs';
import {regionLabels} from './model.mjs';

export const central = area => ['TW', '中央／全國', '全臺灣（中央上限，不含地方加碼）'].includes(area);
export function visibleRecords(data, guide, region) {
  return data.records.filter(({fields, type}) => guide.category_ids.includes(type) &&
    (!fields.地區 || central(fields.地區) || fields.地區 === region));
}

// Use only explicitly identified scenarios. Other titles, local rates and
// conflicting rows stay available in the record reader without being merged.
function position(record) {
  const {title, type, fields} = record;
  if (!central(fields.地區)) return;
  let m;
  if (type === 'allowance' && fields.單位 === '新臺幣／人／月' &&
      (m = title.match(/^(未滿2歲育兒津貼|2歲至學齡未滿5歲育兒津貼|學齡滿5歲至入國小前就學補助)：第(1名|2名|3名以上)$/))) {
    const names = ['未滿2歲育兒津貼','2歲至學齡未滿5歲育兒津貼','學齡滿5歲至入國小前就學補助'];
    return [names.indexOf(m[1]), m[1].endsWith('就學補助') ? '就學補助' : '育兒津貼', Number(m[2][0])-1];
  }
  if (type === 'childcare' && fields.單位 === '新臺幣／人／月（上限）' &&
      (m = title.match(/^(公共化托育|準公共托育)：一般家庭第(1名|2名|3名以上)$/))) {
    return [0, m[1], Number(m[2][0])-1];
  }
  if (type === 'tw-childcare-general' && fields.單位 === '新臺幣元／人／月' &&
      fields.金額性質 === '補助上限' &&
      (m = title.match(/^(公共化托育|準公共托育)一般家庭：第(1名|2名|3名以上)$/))) {
    return [0, m[1], Number(m[2][0])-1];
  }
  if (type === 'preschool-fees' && fields.單位 === '新臺幣元／月（家長繳費上限）' &&
      (m = title.match(/^(公立幼兒園|非營利幼兒園|準公共幼兒園)・(第1胎|第2胎|第3胎以上|低收入戶／中低收入戶)$/))) {
    return [m[2].startsWith('低') ? 4 : 3, m[1], m[2].startsWith('低') ? 0 : Number(m[2][1]) - 1];
  }
}

const comparisons = [
  ['未滿 2 歲', ['育兒津貼','公共化托育','準公共托育']],
  ['2 歲至學齡未滿 5 歲', ['育兒津貼']],
  ['學齡滿 5 歲至入國小前', ['就學補助']],
  ['依子女序位', ['公立幼兒園','非營利幼兒園','準公共幼兒園']],
  ['低收入戶／中低收入戶', ['公立幼兒園','非營利幼兒園','準公共幼兒園']]
];

function matrix(records, groups, group, conditions) {
  const [, rows] = comparisons[group];
  const columns = group === 4 ? ['繳費上限'] : ['第1名','第2名','<span class="term">第3名</span><span class="term">以上</span>'];
  const recordsAt = new Map();
  const matrixRecords = [];
  for (const record of records) {
    const point = position(record);
    if (point?.[0] !== group) continue;
    const key = point[1]+':'+point[2];
    if (!recordsAt.has(key)) recordsAt.set(key,[]);
    recordsAt.get(key).push(record);
    matrixRecords.push(record);
  }
  const commonField = field => {
    const values = new Set(matrixRecords.map(r=>r.fields[field]));
    return values.size === 1 ? matrixRecords[0].fields[field] : '';
  };
  const relation = commonField('併領規則');
  const limit = group >= 3 ? commonField('限制') : '';
  // Keep shared restrictions beside the comparison; the record retains its full wording.
  const restrictions = matrixRecords.map(r=>(r.fields.限制 || '').split('；'));
  const shared = group === 0 && (restrictions[0] || []).filter(clause=>
    /核實支付|津貼擇一/.test(clause) && restrictions.every(parts=>parts.includes(clause))
  ).join('；');
  const choices = groups.map(i => `<option value="${i}" ${i === group ? 'selected' : ''}>${e(comparisons[i][0])}</option>`).join('');
  const byCondition = group === 0 && conditions;
  const headings = byCondition ? ['第1名子女的照顧條件'] : columns;
  const caption = byCondition ? '未滿 2 歲・中央方案（戶籍、例外與申報限制見完整條件）' :
    group < 3 ? '中央支持金額・新臺幣元／人／月' : '中央基本繳費上限・新臺幣元／月';
  function cell(row,column) {
    const matches = recordsAt.get(row+':'+column) || [];
    if (matches.length !== 1) return `<td class="gap">${matches.length ? '請查完整記錄' : '待補'}</td>`;
    const r = matches[0];
    if (byCondition) {
      const conditions = r.fields.條件 || '';
      // Quote a complete care-related clause from the reviewed condition.
      // Keep other eligibility requirements and exceptions in the linked record.
      const clauses = conditions.split(/[；。]/);
      const care = clauses.find(text=>text.startsWith('送托') || text.startsWith('未同時請領'));
      return `<td class="criterion"><div class="criterion-body"><span>${e(care || conditions || '待確認')}</span><button class="record-link" data-record="${e(r.id)}" aria-label="完整條件：${e(r.title)}">完整條件</button></div></td>`;
    }
    if (!/^\d+$/.test(r.fields.金額 ?? '')) return `<td class="gap"><button class="record-link" data-record="${e(r.id)}" aria-label="金額待補，${e(r.title)}，查看記錄">待補</button></td>`;
    const amount = Number(r.fields.金額).toLocaleString('en-US');
    return `<td><button class="amount" data-record="${e(r.id)}" aria-label="${amount} 元，${e(r.title)}，查看記錄">${amount}</button></td>`;
  }
  return `<div class="matrix-head"><h2>${byCondition ? '照顧方式有何不同？' : group < 3 ? '每月可以領多少？' : '每月要繳多少？'}</h2>
    <label>${group < 3 ? '孩子年齡' : '比較情境'}<select id="matrix-group">${choices}</select></label></div>
    ${relation ? `<p class="rule">${e(relation)}</p>` : shared ? `<p class="rule">${e(shared.replace(/。$/, ''))}。</p>` : ''}
    ${group === 0 ? `<div class="choices comparison-mode" role="group" aria-label="比較面向"><button data-conditions="false" aria-pressed="${!conditions}">每月金額</button><button data-conditions="true" aria-pressed="${conditions}">照顧條件</button></div>` : ''}
    <table class="matrix ${byCondition ? 'conditions' : 'rates'}"><caption>${caption}</caption>
    <thead><tr><th scope="col">${group < 3 ? '方案' : '園所'}</th>${headings.map(c=>`<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(name => `<tr><th scope="row"><span class="term">${e(name)}</span>${name.endsWith('托育') ? '<small>一般家庭'+(byCondition?'':'上限')+'</small>' : ''}</th>${headings.map((_,i)=>cell(name,i)).join('')}</tr>`).join('')}</tbody></table>
    ${byCondition ? '' : `<p class="hint">${limit ? e(limit) : '點選金額查看該情境的條件、限制與來源。'}</p>`}`;
}
function overview(prompt, records, groups, group, conditions) {
  if (groups.length) return matrix(records, groups, group, conditions);
  return preparation(prompt) || (records.length ? recordReader(records, records[0].id, 'content') : '<p>此事項的準備內容待補。</p>');
}

const applicationField = name => /申辦|申請|文件|步驟|期限|管道/.test(name);
const fieldGroups = ['資格與限制','金額與內容','提供者與適用期間','辦理方式'];
function fieldGroup(name) {
  if (applicationField(name)) return 3;
  if (/條件|限制|資格|併領|排除|年齡/.test(name)) return 0;
  if (/日期|起日|迄日|期間|提供者|地區/.test(name)) return 2;
  return 1;
}
export function recordReader(records, selected, key, mode = key) {
  const record = records.find(r => r.id === selected) || records[0];
  const options = records.map(r=>`<option value="${e(r.id)}" ${r === record ? 'selected' : ''}>${e(r.title)}</option>`).join('');
  const sources = (record.sources || []).filter((s,i,all) => /^https?:\/\//i.test(s.url) &&
    all.findIndex(v=>v.url===s.url && v.locator===s.locator && v.title===s.title) === i);
  const fields = Object.entries(record.fields);
  const sections = fieldGroups.flatMap((label,i) => {
    const rows = fields.filter(([name])=>fieldGroup(name)===i && (mode !== 'application' || i === 3));
    if (!rows.length) return [];
    return [{label,body:`<dl class="fields">${rows.map(([name,value])=>`<div><dt>${e(name)}</dt><dd>${e(value ?? (/金額|費用|價格|報價|費率|補助後價|掛號費|診察費/.test(name) ? '待補' : '待確認'))}</dd></div>`).join('')}</dl>`}];
  });
  const empty = !sections.length;
  const area = record.fields.地區;
  const region = area === 'TW' ? '中央／全國' : regionLabels[area] || area || '待確認';
  const checked = record.checked_at ? `<time datetime="${e(record.checked_at)}">${e(record.checked_at)}</time>` : '待確認';
  sections.push({label:'核對日期與來源',body:`<p>適用地區 ${e(region)}・核對日期 ${checked}</p>${sources.map(s=>`<p><a href="${e(s.url)}">${e(s.title)}</a><br>${e(s.locator)}</p>`).join('') || '<p>來源待補。</p>'}`});
  return `<div class="record-choice"><label for="record-${key}">查看哪筆記錄</label>
    <div class="record-picker"><select id="record-${key}" data-record-choice>${options}</select><span class="picked-title" aria-hidden="true">${e(record.title)}</span></div></div>
    ${empty ? '<p class="notice">這筆記錄尚無已核對的申辦資訊。可從下方來源查詢。</p>' : ''}
    ${sections.map(({label,body},i)=>`<details class="record-section" name="record-${key}" ${i===0 && !empty ? 'open' : ''}><summary>${e(label)}</summary><div class="record-body">${body}</div></details>`).join('')}`;
}
export function reviewedDetail(root, guide, records, action, region, onViewChange, itemPublished, prompt, related) {
  const groups = guide.category_ids.includes('allowance') ? [0,1,2] :
    guide.category_ids.includes('preschool-fees') ? [3,4] : [];
  const published = records.length > 0;
  const labels = published ? [groups.length ? '方案比較' : '準備提問','完整記錄','申辦資訊'] :
    groups.length ? ['方案比較','資料狀態','準備提問'] : ['準備提問','資料狀態'];
  const local = records.filter(r => region && r.fields.地區 === region);
  const coverage = region ? `<span class="local-coverage">${e(regionLabels[region] || region)}：${local.length ?
    `<button class="record-link" data-local-record="${e(local[0].id)}">${local.length} 筆地方資料</button>` : '本縣市資料待補。'}</span>` : '';
  const status = published ? `已核對 ${records.length} 筆。` :
    itemPublished ? '目前所選範圍的公開資料待補。' : '此事項的公開資料待補。';
  const url = new URL(location.href);
  let group = groups.includes(Number(url.searchParams.get('group'))) ? Number(url.searchParams.get('group')) : groups[0];
  let record = records.find(r=>r.id === url.searchParams.get('record'))?.id || records[0]?.id;
  let conditions = url.searchParams.get('view') === 'conditions';
  let tab = Number(url.searchParams.get('task')) || 0;
  if (!labels[tab]) tab = 0;
  const checkedDates = records.map(r=>r.checked_at).filter(date=>/^\d{4}-\d{2}-\d{2}$/.test(date));
  const latest = checkedDates.sort().at(-1);
  root.innerHTML = `<div class="article-meta">${published ? `<span>最新資料核對 ${latest ? `<time datetime="${e(latest)}">${e(latest)}</time>` : '待確認'}</span>` : '<span>編輯提問</span>'}</div>
    <div class="tabs" role="tablist" aria-label="文章目錄與閱讀方式">${labels.map((l,i)=>`<button role="tab" id="task-${i}" aria-controls="panel-${i}">${l}</button>`).join('')}</div>
    ${labels.map((_,i)=>`<section role="tabpanel" id="panel-${i}" aria-labelledby="task-${i}" tabindex="0" hidden></section>`).join('')}
    <div class="detail-foot"><p>${status}${coverage}</p>${action}</div>`;
  const tabs = [...root.querySelectorAll('[role=tab]')];
  function paint(write) {
    tabs.forEach((t,i) => {t.setAttribute('aria-selected', String(i === tab));t.tabIndex = i === tab ? 0 : -1;root.querySelector('#panel-'+i).hidden = i !== tab;});
    const panel = root.querySelector('#panel-'+tab);
    panel.innerHTML = tab === 0 ? overview(prompt, records, groups, group, conditions) :
      published ? recordReader(records, record, tab === 2 ? 'application' : 'all') :
      tab === 2 ? preparation(prompt) :
      `<h2>公共資料待補</h2><p>${e(guide.title)}的${itemPublished ? '所選範圍' : '公開記錄'}待補。你可以先把想確認的問題留在「我的安排」。</p>`;
    const comparison = panel.querySelector('.care-sheet');
    if (related && comparison) comparison.insertAdjacentHTML('beforeend',`<div class="article-related">${related}</div>`);
    const comparisonURL = new URL(location.href);
    bindPreparation(panel, comparison ? comparisonURL.searchParams.get('comparison') : null,
      comparison ? value => {
        const url = new URL(location.href);
        url.searchParams.set('comparison',value);
        history.replaceState(history.state,'',url);
      } : undefined);
    panel.querySelectorAll('.record-section').forEach(section => {
      const body = section.querySelector('.record-body');
      const updateScrollFocus = () => {
        if (section.open && body.scrollHeight > body.clientHeight) {
          body.tabIndex = 0;
          body.setAttribute('role','region');
          body.setAttribute('aria-label',section.querySelector('summary').textContent);
        } else {
          body.removeAttribute('tabindex');
          body.removeAttribute('role');
          body.removeAttribute('aria-label');
        }
      };
      section.addEventListener('toggle',updateScrollFocus);
      updateScrollFocus();
    });
    onViewChange?.();
    const selector = panel.querySelector('#matrix-group');
    if (selector) selector.onchange = () => {group = Number(selector.value);paint(true);panel.querySelector('#matrix-group').focus();};
    panel.querySelectorAll('[data-conditions]').forEach(button => button.onclick = () => {
      conditions = button.dataset.conditions === 'true';
      paint(true);
      panel.querySelector('[data-conditions][aria-pressed=true]').focus();
    });
    const choice = panel.querySelector('[data-record-choice]');
    if (choice) choice.onchange = () => {record = choice.value;if(tab === 0) tab=1;paint(true);root.querySelector('#panel-'+tab+' [data-record-choice]').focus();};
    panel.querySelectorAll('[data-record]').forEach(b => b.onclick = () => {record=b.dataset.record;tab=1;paint(true);tabs[1].focus();});
    if (write) {
      const u = new URL(location.href);
      u.searchParams.set('task', tab);
      if (group !== undefined) u.searchParams.set('group', group);
      if (record) u.searchParams.set('record',record);
      if (group===0 && conditions) u.searchParams.set('view','conditions');
      else u.searchParams.delete('view');
      history.replaceState(history.state,'',u);
    }
  }
  tabs.forEach((t,i) => {
    t.onclick = () => {tab=i;paint(true);};
    t.onkeydown = ev => {
      const n = {Home:0, End:tabs.length-1, ArrowLeft:(i+tabs.length-1)%tabs.length, ArrowRight:(i+1)%tabs.length}[ev.key];
      if (n !== undefined) {ev.preventDefault();tabs[n].click();tabs[n].focus();}
    };
  });
  const localChoice = root.querySelector('[data-local-record]');
  if (localChoice) localChoice.onclick = () => {
    record = localChoice.dataset.localRecord;
    tab = 1;
    paint(true);
    tabs[1].focus();
  };
  const followAnchor = () => {
    const hash = location.hash.slice(1);
    const legacy = {'funding':0,'policy-details':1,'application-details':2};
    const numbered = hash.match(/^(?:task|panel)-([0-2])$/);
    const target = numbered ? Number(numbered[1]) : legacy[hash];
    if (!Number.isInteger(target) || !labels[target]) return;
    tab = target;
    paint(false);
    requestAnimationFrame(()=>tabs[tab].focus());
  };
  paint(false);
  followAnchor();
  window.onhashchange = followAnchor;
}
