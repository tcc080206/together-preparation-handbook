import {escapeText as e} from './reading.mjs';

const groupKeys = ['provided', 'self', 'buy'];
const pending = '待向院所確認';

export function packingEditor(groups, links) {
  return `<div class="packing-questions" data-packing-editor>
    <span class="packing-pending">${pending}</span>
    <ul data-packing-list="pending" aria-label="${pending}" hidden></ul>
    ${links ? `<div class="stage-related">${links}</div>` : ''}
    <dl>${groups.map(([label,question], index)=>`<div><dt>${e(label)}</dt><dd>${e(question)}
      <ul data-packing-list="${groupKeys[index]}" aria-label="${e(label)}" hidden></ul></dd></div>`).join('')}</dl>
    <div class="packing-actions">
      <span class="hint" data-packing-progress role="status"></span>
      <details class="packing-add">
        <summary>新增物品</summary>
        <form data-packing-form>
          <label for="packing-name">物品名稱</label>
          <input id="packing-name" name="name" required maxlength="80">
          <button type="submit">加入清單</button>
        </form>
      </details>
      <button type="button" class="primary" data-packing-save></button>
    </div>
    <div class="packing-message" role="status" data-packing-message></div>
  </div>`;
}

export function bindPacking(root, record, save, openPlan, markDirty) {
  const lists = [...root.querySelectorAll('[data-packing-list]')];
  const progress = root.querySelector('[data-packing-progress]');
  const message = root.querySelector('[data-packing-message]');
  const button = root.querySelector('[data-packing-save]');
  const form = root.querySelector('[data-packing-form]');
  const input = form.elements.name;
  const options = lists.map(list=>[list.dataset.packingList,list.getAttribute('aria-label')]);
  const original = Array.isArray(record?.packing) ? record.packing : [];
  const items = original.filter(item=>typeof item?.id==='string' && typeof item.name==='string' &&
    options.some(([group])=>group===item.group)).map(item=>({...item}));
  let exists = Boolean(record);
  let saved = JSON.stringify(items);
  const changed = () => JSON.stringify(items)!==saved;
  const updateActions = () => {
    const self = items.filter(item=>item.group==='self');
    progress.textContent = self.length ? `自備用品已備妥 ${self.filter(item=>item.ready).length}／${self.length}` : '尚未確認需要自備的用品';
    button.textContent = changed() ? '儲存清單至我的安排' : exists ? '查看我的安排' : '把提問加入安排';
    button.classList.toggle('saved',exists && !changed());
    markDirty(changed());
  };
  const render = () => {
    for (const list of lists) {
      const rows = items.filter(item=>item.group===list.dataset.packingList);
      list.hidden = rows.length===0;
      list.innerHTML = rows.map(({id,name,group,ready})=>`<li data-packing-item="${e(id)}">
        <span class="packing-name">${e(name)}</span>
        <select aria-label="${e(name)}的分類" data-packing-group>${options.map(([key,label])=>
          `<option value="${key}" ${key===group?'selected':''}>${e(label)}</option>`).join('')}</select>
        ${group==='self'?`<label class="packing-check"><input type="checkbox" data-packing-ready ${ready?'checked':''} aria-label="${e(name)}已備妥">已備妥</label>`:''}
        <button type="button" class="quiet" data-packing-remove aria-label="移除${e(name)}">移除</button>
      </li>`).join('');
    }
    updateActions();
  };
  form.onsubmit = event => {
    event.preventDefault();
    const name = input.value.trim();
    if (!name) {
      input.setCustomValidity('請填寫物品名稱。');
      input.reportValidity();
      return;
    }
    items.push({id:crypto.randomUUID(),name,group:'pending',ready:false});
    form.reset();
    render();
    input.focus();
  };
  input.oninput = () => input.setCustomValidity('');
  root.onchange = ({target}) => {
    const row = target.closest('[data-packing-item]');
    if (!row) return;
    const item = items.find(item=>item.id===row.dataset.packingItem);
    if (target.matches('[data-packing-group]')) {
      item.group = target.value;
      item.ready = false;
      render();
      [...root.querySelectorAll('[data-packing-item]')].find(row=>row.dataset.packingItem===item.id)
        .querySelector('[data-packing-group]').focus();
    } else if (target.matches('[data-packing-ready]')) {
      item.ready = target.checked;
      updateActions();
    }
  };
  root.onclick = ({target}) => {
    if (!target.matches('[data-packing-remove]')) return;
    const index = items.findIndex(item=>item.id===target.closest('[data-packing-item]').dataset.packingItem);
    items.splice(index,1);
    render();
    root.querySelector('.packing-add summary').focus();
  };
  button.onclick = () => {
    if (exists && !changed()) {
      openPlan();
      return;
    }
    if (save(items)) {
      saved = JSON.stringify(items);
      exists = true;
      message.textContent = '住院準備已儲存至我的安排，記錄保存在這個瀏覽器。';
      updateActions();
    } else {
      message.textContent = '此次變更尚未儲存，請重試。';
      button.textContent = '重試儲存';
    }
  };
  render();
}
