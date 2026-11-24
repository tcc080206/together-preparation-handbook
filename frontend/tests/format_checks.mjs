// This function runs in the browser so all measurements use its actual CJK fonts.
export function inspectFormat() {
  const faults = [];
  const root = document.querySelector('dialog[open]') || document.body;
  const all = selector => [...root.querySelectorAll(selector)].filter(el =>
    el.getClientRects().length && el.checkVisibility() && !el.closest('details:not([open]) > :not(summary)'));
  const name = el => el.id || (el.innerText || el.className || el.tagName).trim().slice(0,36);
  const rect = el => el.getBoundingClientRect();
  const rectsForText = el => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return [...range.getClientRects()].filter(r=>r.width && r.height);
  };

  for (const el of all('main,article,section,table,td,th,.paper,.book,.guide-card,.plan-tools,.record-picker,.picked-title,.context-bar,.choices,.editor-actions,.status-options,.tabs,.dialog-actions')) {
    if (el.scrollWidth > el.clientWidth + 2)
      faults.push(name(el)+' 內容超出容器 '+(el.scrollWidth-el.clientWidth)+'px');
  }

  // Scroll width alone misses a date split at a dash or an orphaned short label.
  for (const el of all('.term,.amount,time,.choice-label,header nav a,.tabs button,.status-options a')) {
    const lines = rectsForText(el);
    if (lines.length && Math.max(...lines.map(r=>r.top)) >= Math.min(...lines.map(r=>r.bottom)))
      faults.push(name(el)+' 短標籤斷行');
  }

  for (const table of all('table').filter(table=>getComputedStyle(table).display==='table')) {
    const heads = [...table.tHead.rows[0].cells].map(rect);
    for (const row of table.tBodies[0].rows) {
      [...row.cells].forEach((cell,i) => {
        const column = heads[i];
        const bounds = rect(cell);
        if (!column || Math.abs(bounds.left-column.left)>1 || Math.abs(bounds.right-column.right)>1)
          faults.push(name(cell)+' 與表頭未對齊');
        for (const run of rectsForText(cell))
          if (run.left<bounds.left-1 || run.right>bounds.right+1) {
            faults.push(name(cell)+' 文字跨欄');
            break;
          }
      });
    }
  }

  const canvas = document.createElement('canvas').getContext('2d');
  for (const el of all('select')) {
    const box = rect(el);
    if (box.height < 43) faults.push(name(el)+' 選單高度不足');
    const value = el.selectedOptions[0]?.label || '';
    if (el.hasAttribute('data-record-choice')) {
      const title = el.parentElement.querySelector('.picked-title');
      if (title.textContent !== value || rect(title).height > box.height+1)
        faults.push('記錄選單與可見名稱不符');
    } else {
      const css = getComputedStyle(el);
      canvas.font = css.fontWeight+' '+css.fontSize+' '+css.fontFamily;
      const room = el.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
      if (canvas.measureText(value).width > room + 1) faults.push(value+' 選取文字被截斷');
    }
  }

  const controls = all('a[href],button,summary,select,input,textarea').filter(el=>!el.matches('.skip'));
  const controlRects = new Map(controls.map(el => {
    const clip = el.closest('.stage-record-panel,.record-body')?.getBoundingClientRect();
    const rects = [...el.getClientRects()].map(r => clip ? {
      left: Math.max(r.left,clip.left), right: Math.min(r.right,clip.right),
      top: Math.max(r.top,clip.top), bottom: Math.min(r.bottom,clip.bottom)
    } : r);
    return [el,rects];
  }));
  for (let i=0;i<controls.length;i++) {
    const a=controls[i];
    for (const b of controls.slice(i+1)) {
      if (a.contains(b) || b.contains(a)) continue;
      for (const x of controlRects.get(a)) for (const y of controlRects.get(b)) {
        if (Math.min(x.right,y.right)-Math.max(x.left,y.left)>2 &&
            Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>2)
          faults.push(name(a)+' 與 '+name(b)+' 重疊');
      }
    }
  }
  if (innerWidth<520) for (const card of all('.guide-card')) {
    if (Math.abs(card.offsetWidth-card.parentElement.clientWidth)>2) faults.push('窄螢幕分類卡未使用整欄');
  }
  return {
    faults:[...new Set(faults)],
    screens:document.documentElement.scrollHeight/innerHeight,
    overflow:document.documentElement.scrollWidth-innerWidth
  };
}
