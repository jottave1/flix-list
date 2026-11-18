export const STORAGE_KEY = 'flix-list:v1';
export const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function validateRecords(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Lista inválida.');
  const output = {};
  if (Object.keys(value).length > 20000) throw Error('O backup contém filmes demais.');
  for (const [id, record] of Object.entries(value)) {
    if (!/^\d{1,12}$/.test(id) || !record || !['watchlist','watched'].includes(record.status) || !record.movie || record.movie.id !== id || typeof record.movie.title !== 'string' || !record.movie.title.trim() || record.movie.title.length > 300 || !Number.isFinite(Date.parse(record.updatedAt))) throw Error('O backup contém um filme inválido.');
    const movie = record.movie;
    const image = typeof movie.image === 'string' && /^https:\/\/[a-z0-9.-]+\.nflxso\.net\//i.test(movie.image) ? movie.image : '';
    const genres = Array.isArray(movie.genres) ? movie.genres.filter(g=>typeof g === 'string' && g.length <= 60).slice(0,12) : ['Outros'];
    const date = typeof record.watchedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.watchedOn) && Number.isFinite(Date.parse(record.watchedOn)) ? record.watchedOn : '';
    output[id] = {status:record.status, rating:Number.isInteger(record.rating) && record.rating>=0 && record.rating<=5 ? record.rating : 0, note:typeof record.note==='string'?record.note.slice(0,2000):'', watchedOn:date, addedAt:Number.isFinite(Date.parse(record.addedAt))?record.addedAt:record.updatedAt, updatedAt:record.updatedAt, movie:{id,title:movie.title,genres,image,url:`https://www.netflix.com/br/title/${id}`}};
  }
  return output;
}
export function parseBackup(text) {
  const value=JSON.parse(text);
  if (value.app !== 'flix-list' || value.version !== 1) throw Error('Escolha um backup válido do Flix List.');
  return validateRecords(value.records);
}
export function mergeRecords(current,incoming) {
  const result={...current};
  for (const [id,record] of Object.entries(incoming)) if (!result[id] || Date.parse(record.updatedAt)>Date.parse(result[id].updatedAt)) result[id]=record;
  return result;
}
export function filterMovies(movies, records, {view='explore',query='',genre='all',sort='relevance'}={}) {
  const term=normalize(query.trim());
  const result=movies.filter(m=>(view==='explore'||records[m.id]?.status===view) && (!term||normalize(m.title).includes(term)) && (genre==='all'||m.genres.includes(genre)));
  if(sort==='title') result.sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
  if(sort==='recent') result.sort((a,b)=>(Date.parse(records[b.id]?.addedAt)||0)-(Date.parse(records[a.id]?.addedAt)||0));
  if(sort==='rating') result.sort((a,b)=>(records[b.id]?.rating||0)-(records[a.id]?.rating||0));
  return result;
}
