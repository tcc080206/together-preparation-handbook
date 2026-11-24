import {central, recordReader, visibleRecords} from './handbook.mjs';
import {regionLabels} from './model.mjs';
import {escapeText as e} from './reading.mjs';

const careFields = ['服務時段','服務範圍','計費單位'];
function careComparison(choices, variant) {
  return `<table class="postpartum-comparison ${variant}" role="table"><caption>照護比較提問</caption>
    <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">比較項目</th>${choices.map(choice=>`<th role="columnheader" scope="col">${e(choice.label)}</th>`).join('')}</tr></thead>
    <tbody role="rowgroup">${careFields.map((label,index)=>`<tr role="row"><th role="rowheader" scope="row">${label}</th>${
      choices.map(choice=>`<td role="cell"><span class="care-cell-label" aria-hidden="true">${e(choice.label.split('／')[0])}</span>${e(choice.comparison[index])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

export function topicRecords(data, topic, guide, region) {
  const records = guide ? visibleRecords(data, guide, region) : [];
  if (topic.display === 'care') {
    const general = records.filter(({fields})=>!fields.照護方式);
    const coverage = (rows,label,key) => rows.length ? `<details class="record-section"><summary>${label}</summary><div data-topic-records="${key}"></div></details>` : '';
    const compare = topic.choices.length > 1 ? `<details class="care-mobile"><summary>比較兩種照護方式</summary>
      <div class="care-pair">${[1,2].map(index=>`<div><label>選項 ${index}<select data-care-pair>${topic.choices.map(({id,label})=>
        `<option value="${e(id)}">${e(label.split('／')[0])}</option>`).join('')}</select></label>
        <button type="button" class="quiet" data-care-detail>查看資料</button></div>`).join('')}</div>
      <div data-care-comparison tabindex="0" role="region" aria-label="兩種照護方式的比較"></div>
    </details>` : '';
    return `${coverage(general.filter(r=>central(r.fields.地區)),'中央／全國資料','care-central')}
      ${region ? coverage(general.filter(r=>r.fields.地區===region),e(regionLabels[region])+'資料','care-local') : ''}
      ${coverage(general.filter(r=>!r.fields.地區),'適用地區待確認','care-unknown')}
      ${careComparison(topic.choices,'care-desktop')}<div class="care-single"><div class="choices care-choices" role="group" aria-label="照護方式">
      ${topic.choices.map(({id,label},i)=>`<button type="button" data-care="${e(id)}" aria-pressed="${i===0}">${e(label)}</button>`).join('')}
      </div><p class="hint" data-care-status role="status" hidden></p><div data-topic-records></div></div>${compare}`;
  }
  if (topic.display === 'prenatal') {
    const national = records.filter(r=>central(r.fields.地區) && r.fields.提供者類型 !== '院所');
    const local = records.filter(r=>region && r.fields.地區===region && r.fields.提供者類型 !== '院所');
    const extras = records.filter(r=>r.fields.提供者類型 === '院所');
    const unknown = records.filter(r=>!r.fields.地區 && !extras.includes(r));
    const group = (rows,label,gap,key) => rows.length
      ? `<details class="record-section stage-data-group" name="topic-record-group"><summary>${label} · ${e(rows[0].title)}（已核對 ${rows.length} 筆）</summary><div data-topic-records="${key}"></div></details>`
      : `<p class="hint">${gap}</p>`;
    return group(national,'中央／全國','中央產檢公費資料待補','central')+
      (region ? group(local,e(regionLabels[region]),e(regionLabels[region])+'產檢補助資料待補','local') : '')+
      group(extras,'具名院所費用與自選項目','院所自費與掛號費資料待補，請向院所確認。','provider')+
      (unknown.length ? group(unknown,'適用地區待確認','','unknown') : '');
  }
  return Object.hasOwn(topic,'guideId') ? (records.length ?
    '<div data-topic-records></div>' : '<p class="hint">公開資料待補</p>') : '';
}

export function bindTopicRecords(root, data, topic, guide, region) {
  const records = guide ? visibleRecords(data,guide,region) : [];
  const paint = (panel, rows, key, selected) => {
    panel.classList.add('stage-record-panel');
    panel.tabIndex = 0;
    panel.setAttribute('role','region');
    panel.setAttribute('aria-label','已核對記錄');
    panel.innerHTML = recordReader(rows, selected, key, 'all');
    const picker = panel.querySelector('[data-record-choice]');
    picker.onchange = () => {
      paint(panel,rows,key,picker.value);
      panel.querySelector('[data-record-choice]').focus();
    };
  };
  if (topic.display === 'care') {
    const buttons = [...root.querySelectorAll('[data-care]')];
    const panel = root.querySelector('[data-topic-records=""]');
    const status = root.querySelector('[data-care-status]');
    const choices = new Map(topic.choices.map(choice=>[choice.id,choice]));
    const selected = new URLSearchParams(location.search).get('care');
    const initial = choices.has(selected) ? selected : topic.choices[0].id;
    const general = records.filter(({fields})=>!fields.照護方式);
    const centralPanel = root.querySelector('[data-topic-records=care-central]');
    const localPanel = root.querySelector('[data-topic-records=care-local]');
    const unknownPanel = root.querySelector('[data-topic-records=care-unknown]');
    if(centralPanel)paint(centralPanel,general.filter(r=>central(r.fields.地區)),'care-central');
    if(localPanel)paint(localPanel,general.filter(r=>r.fields.地區===region),'care-local');
    if(unknownPanel)paint(unknownPanel,general.filter(r=>!r.fields.地區),'care-unknown');
    const show = id => {
      const choice = choices.get(id);
      buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.care===id)));
      const rows = records.filter(r=>[choice.id,choice.label].includes(r.fields.照護方式));
      const gap = rows.length ? '' : id==='family'?'家人協助支出：待補':'具名服務報價資料待補';
      const localGap = region && ![...rows,...general].some(r=>r.fields.地區===region);
      status.hidden = !gap && !localGap;
      status.innerHTML = `${gap ? `<span>${gap}</span>` : ''}${localGap ? `<span>${e(regionLabels[region])}：本縣市資料待補。</span>` : ''}`;
      panel.innerHTML = `<dl class="care-fields" aria-label="照護比較提問">${careFields.map((label,index)=>
        `<div><dt>${label}</dt><dd>${e(choice.comparison?.[index])}</dd></div>`).join('')}</dl>
        <details class="record-section care-guidance"><summary>詢問重點</summary><p>${e(choice.prompt)}</p></details>`+
        (rows.length ? '<details class="record-section"><summary>具名服務記錄</summary><div data-care-records></div></details>' : '');
      if(rows.length) {
        const quotes = rows.map(record=>['報價','價格','金額','費用'].some(name=>Object.hasOwn(record.fields,name)) ?
          record : {...record,fields:{...record.fields,報價:null}});
        paint(panel.querySelector('[data-care-records]'),quotes,'care');
      }
    };
    const selectCare = id => {
      const url=new URL(location.href);
      url.searchParams.set('care',id);
      history.replaceState(history.state,'',url);
      show(id);
    };
    buttons.forEach(button=>button.onclick=()=>selectCare(button.dataset.care));
    show(initial);
    const comparison = root.querySelector('[data-care-comparison]');
    if (!comparison) return;
    const selects = [...root.querySelectorAll('[data-care-pair]')];
    const viewDetails = [...root.querySelectorAll('[data-care-detail]')];
    selects[0].value = initial;
    selects[1].value = topic.choices.find(choice=>choice.id!==initial).id;
    const compare = () => {
      selects.forEach((select,index)=>{
        [...select.options].forEach(option=>option.disabled=option.value===selects[1-index].value);
        viewDetails[index].setAttribute('aria-label','查看'+choices.get(select.value).label+'資料');
      });
      comparison.innerHTML = careComparison(selects.map(select=>choices.get(select.value)),'care-side-by-side');
    };
    selects.forEach(select=>select.onchange=compare);
    viewDetails.forEach((button,index)=>button.onclick=()=>{
      const id = selects[index].value;
      selectCare(id);
      button.closest('details').open=false;
      (panel.querySelector('details:has([data-care-records]) > summary') || buttons.find(button=>button.dataset.care===id)).focus();
    });
    compare();
    return;
  }
  root.querySelectorAll('[data-topic-records]').forEach(panel=>{
    const key = panel.dataset.topicRecords;
    const rows = records.filter(r=>{
      const area = r.fields.地區;
      const provider = r.fields.提供者類型 === '院所';
      if(key==='central') return !provider && central(area);
      if(key==='local') return !provider && area===region;
      if(key==='provider') return provider;
      if(key==='unknown') return !provider && !area;
      return true;
    });
    if(rows.length) paint(panel,rows,key||'topic');
  });
}
