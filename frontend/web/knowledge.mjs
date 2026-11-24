import {escapeText as e} from './reading.mjs';

const phaseIcons = {
  menstruation: '<path d="M12 3c2 4 6 7 6 12a6 6 0 0 1-12 0c0-5 4-8 6-12Z"/>',
  follicular: '<path d="M7 20h10m-5 0c2-3 1-7 1-9m0 3C8 15 4 12 4 8c4-1 8 1 9 6Zm0-4c0-4 3-7 7-7 0 4-3 7-7 7Z"/>',
  ovulation: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  luteal: '<path d="M21 15.5A9 9 0 1 1 11.8 3 8 8 0 0 0 21 15.5Z"/>'
};

export function cycleKnowledge(content) {
  const {phases, source} = content;
  return `<section class="cycle-knowledge" aria-labelledby="cycle-heading">
    <h2 id="cycle-heading">一個週期中的四個重點</h2>
    <p class="cycle-takeaway">${e(content.takeaway)}</p>
    <div class="cycle-layout">
      <ul class="cycle-phases" role="list">${Object.entries(phaseIcons).map(([key, icon], index)=>{
        const [title, text] = phases[key];
        const number = String(index + 1).padStart(2, '0');
        return `<li class="cycle-${key}">
          <div class="cycle-phase-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">${icon}</svg><span>${number}</span>
          </div>
          <h3>${e(title)}</h3>
          <p>${e(text)}</p>
        </li>`;
      }).join('')}</ul>
      <figure class="cycle-figure">
        <svg class="cycle-diagram" viewBox="0 0 336 117" aria-hidden="true" focusable="false">
          <path class="cycle-alignment" d="M9 22v84"/>
          <text x="9" y="15">卵巢</text>
          <rect class="cycle-follicular" x="9" y="25" width="152" height="27" rx="6"/>
          <text x="20" y="44">${e(phases.follicular[0])}</text>
          <rect class="cycle-luteal" x="209" y="25" width="118" height="27" rx="6"/>
          <text x="223" y="44">${e(phases.luteal[0])}</text>
          <path class="cycle-connector" d="M161 38.5h48"/>
          <circle class="cycle-event" cx="185" cy="38.5" r="6"/>
          <text x="185" y="19" text-anchor="middle">${e(phases.ovulation[0])}</text>
          <text x="9" y="74">子宮內膜</text>
          <rect class="cycle-menstruation" x="9" y="82" width="91" height="27" rx="6"/>
          <text x="20" y="101">${e(phases.menstruation[0])}</text>
          <path class="cycle-connector" d="M100 95.5h227m-6-5 6 5-6 5"/>
        </svg>
        <figcaption>${e(content.summary)} <span>示意，時間因人及週期而異。</span></figcaption>
      </figure>
    </div>
    <a class="cycle-source" href="${e(source.url)}">${e(source.title)}</a>
  </section>`;
}
