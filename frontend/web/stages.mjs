export const stageChapters = [
  ['costs', '費用與支持'],
  ['health', '健康準備'],
  ['daily', '生活安排']
];

export function stageURL(stage, chapter, question, topic, from) {
  const query = new URLSearchParams();
  for (const [key,value] of Object.entries({chapter,topic,question,from})) {
    if (value) query.set(key,value);
  }
  return '/stages/'+stage+(query.size ? '?'+query : '');
}

export function stageQuestion(stages, id) {
  for (const stage of stages) {
    for (const topic of stage.topics) {
      const question = topic.questions.find(({key}) => id === questionId(stage.id,key));
      if (question) return {...question,url:stageURL(stage.id,topic.chapter,question.key,topic.id)};
    }
  }
}

export const questionId = (stage,key) => 'stage_'+stage+'_'+key;
