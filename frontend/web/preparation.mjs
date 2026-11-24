// Editorial questions are separate from the reviewed public record feed.
import {escapeText as e} from './reading.mjs';

export function preparation(guide) {
  if (!guide) return '';
  const [kind, heading, ...entries] = guide;
  if (kind === 'care') {
    const methods = ['托嬰中心','居家保母','家人照顧'];
    return `<section class="care-sheet"><h2>${e(heading)}</h2><div class="choices" role="group" aria-label="比較面向">${entries.map((entry,i)=>`<button data-prompt="${i}" aria-pressed="${i===0}">${e(entry.split('|')[0])}</button>`).join('')}</div>
      <div aria-live="polite">${entries.map((entry,i)=>{
        const [label,...questions]=entry.split('|');
        return `<table class="care-table" data-prompt-text="${i}" ${i?'hidden':''}><caption>家庭討論用提問</caption><thead><tr><th scope="col">照顧方式</th><th scope="col">${e(label)}要問什麼？</th></tr></thead><tbody>${methods.map((method,j)=>`<tr><th scope="row">${method}</th><td>${e(questions[j])}</td></tr>`).join('')}</tbody></table>`;
      }).join('')}</div></section>`;
  }
  return `<section class="prompt-sheet ${kind}"><h2>${e(heading)}</h2><div class="choices" role="group" aria-label="${e(heading)}">${entries.map((entry, i) => {
    const [label] = entry.split('|');
    return `<button type="button" data-prompt="${i}" aria-pressed="${i === 0}">${kind === 'steps' ? `<b>${i+1}</b>` : ''}<span class="choice-label">${e(label)}</span></button>`;
  }).join('')}</div><div aria-live="polite">${entries.map((entry, i) => `<p data-prompt-text="${i}" ${i ? 'hidden' : ''}>${e(entry.split('|')[1])}</p>`).join('')}</div></section>`;
}

export function bindPreparation(root, selected, onChange) {
  const buttons = [...root.querySelectorAll('[data-prompt]')];
  const show = index => {
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.prompt === index)));
    root.querySelectorAll('[data-prompt-text]').forEach(p => p.hidden = p.dataset.promptText !== index);
  };
  if (buttons.some(b=>b.dataset.prompt===selected)) show(selected);
  buttons.forEach(button => button.onclick = () => {
    show(button.dataset.prompt);
    onChange?.(button.dataset.prompt);
  });
}
