import {escapeText as e} from './reading.mjs';
import {stageChapters, stageURL} from './stages.mjs';

export function adjacentStages(stages, current) {
  const index = stages.indexOf(current);
  const previous = stages[index-1];
  const next = stages[index+1];
  const stageLink = (stage, direction, arrow) => {
    const marker = `<span aria-hidden="true">${arrow}</span>`;
    return `<a href="${stageURL(stage.id,stageChapters[0][0])}" data-focus-key="stage-${e(stage.id)}"
      aria-label="${direction}階段・${e(stage.title)}">${previous===stage ? marker : ''}${e(stage.title)}${next===stage ? marker : ''}</a>`;
  };
  return `<nav class="stage-neighbors" aria-label="階段前後導覽">
    ${previous ? stageLink(previous,'上一','‹') : ''}
    ${next ? stageLink(next,'下一','›') : ''}
  </nav>`;
}

export function chapterFooter(stage, chapter, indexURL, finalStage) {
  const position = stageChapters.findIndex(([key])=>key===chapter);
  const adjacent = ([key,title], direction, className) =>
    `<a class="${className}" href="${stageURL(stage,key)}">${direction}章・${e(title)}</a>`;
  const previous = stageChapters[position-1];
  const next = stageChapters[position+1];
  return `<nav class="chapter-footer" aria-label="章節前後導覽">
    ${previous ? adjacent(previous,'上一','chapter-previous') : ''}
    ${next ? adjacent(next,'下一','chapter-next') :
      `<a class="chapter-next" href="${e(indexURL)}">回本階段目錄</a>${finalStage ? '<a class="chapter-home" href="/">手冊首頁</a>' : ''}`}
  </nav>`;
}

export function handoffTable(questions, questionMarkup, findPlan) {
  return `<table class="handoff-table"><thead><tr>
    <th scope="col">時段</th><th scope="col">要接手的事</th><th scope="col">向誰確認</th>
    </tr></thead><tbody>${questions.map(question=>{
      const record = findPlan(question.key);
      return `<tr>
        <td><span class="handoff-label" aria-hidden="true">時段</span><span>${e(record?.date||'未指定')}</span></td>
        <td><span class="handoff-label" aria-hidden="true">要接手的事</span>${questionMarkup(question)}</td>
        <td><span class="handoff-label" aria-hidden="true">向誰確認</span><span>${e(record?.owner||'未指定')}</span></td>
      </tr>`;
    }).join('')}</tbody></table>`;
}
