export const statuses=['待確認','準備中','已完成','暫緩'];
export const regionLabels=Object.fromEntries([['TW-TPE','臺北市'],['TW-NWT','新北市'],['TW-TAO','桃園市'],['TW-TXG','臺中市'],['TW-TNN','臺南市'],['TW-KHH','高雄市'],['TW-KEE','基隆市'],['TW-HSZ','新竹市'],['TW-HSQ','新竹縣'],['TW-MIA','苗栗縣'],['TW-CHA','彰化縣'],['TW-NAN','南投縣'],['TW-YUN','雲林縣'],['TW-CYI','嘉義市'],['TW-CYQ','嘉義縣'],['TW-PIF','屏東縣'],['TW-ILA','宜蘭縣'],['TW-HUA','花蓮縣'],['TW-TTT','臺東縣'],['TW-PEN','澎湖縣'],['TW-KIN','金門縣'],['TW-LIE','連江縣']]);
export function readingStages(item){
 const extra=[];
 if(/生產|分娩|住院|待產|產假|陪產|急救課程/.test(item.title)) extra.push('childbirth');
 if(/月子|月嫂|產後|哺乳|泌乳|母乳|育嬰|生育給付/.test(item.title)) extra.push('postpartum');
 return [...new Set([...item.stages,...extra])];
}
export function searchItems(data,{q='',stage='',category='',subject=''}={}){
 const words=q.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
 return data.items.filter(i=>(!stage||readingStages(i).includes(stage))&&(!category||i.category_ids.includes(category))&&(!subject||i.subjects.includes(subject))&&words.every(w=>[i.title,...i.aliases,...i.category_ids.map(c=>data.categories.find(x=>x.id===c)?.label||'')].join(' ').toLocaleLowerCase().includes(w)));
}
export function visibleProgram(p,region){return p.provider_type!=='local_government'||Boolean(region&&p.jurisdiction_codes.includes(region));}
export function costGroup(item,categories=[]){
 if(/月子|月嫂/.test(item.title))return '產後照護';
 if(/托嬰|公托|保母/.test(item.title))return '托育服務';
 if(/用品|安全座椅|嬰兒床|奶粉/.test(item.title))return '育兒用品';
 return categories.find(c=>item.category_ids.includes(c.id))?.label||'其他服務';
}
export function addRecord(records,record){return records.some(r=>r.id===record.id)?records:[...records,{status:'待確認',date:'',owner:'',notes:'',createdAt:new Date().toISOString(),...record}];}
export function sortedPlan(records,sort){return [...records].sort((a,b)=>sort==='added'?a.createdAt.localeCompare(b.createdAt):(a.date||'9999').localeCompare(b.date||'9999')||a.createdAt.localeCompare(b.createdAt));}
export function evidence(data,id){return data.evidence_links.filter(e=>e.entity_id===id).map(e=>({...e,fragment:data.source_fragments.find(f=>f.id===e.fragment_id),source:data.sources.find(s=>s.id===e.source_id)}));}
export function publishedGuide(data,id){return data.item_guides.find(g=>g.item_id===id&&g.publication_status==='published');}
