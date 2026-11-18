import {STORAGE_KEY,validateRecords,parseBackup,mergeRecords,filterMovies,normalize} from './core.js';
const $=s=>document.querySelector(s);
const icons={compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.7 5.3L8 16l2.7-5.3Z"/>',bookmark:'<path d="M6 4h12v17l-6-4-6 4Z"/>',check:'<path d="m5 12 4 4L19 6"/>',user:'<circle cx="12" cy="8" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',shuffle:'<path d="M4 5h3l10 14h3M4 19h3l4-5M14 9l3-4h3"/><path d="m17 2 3 3-3 3m0 8 3 3-3 3"/>',sort:'<path d="M4 6h16M4 12h11M4 18h6"/>',film:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4M17 8h4m-4 8h4"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.film}</svg>`;
const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
let records={}, catalog=null, catalogMovies=[], allMovies=[], view='explore',query='',genre='all',sort='relevance',limit=24,activeMovie=null,toastTimeout,undo=null,installPrompt=null,storageError=false;
try { records=validateRecords(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')); }
catch { storageError=true; }
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function notify(message,undoAction=null){clearTimeout(toastTimeout);undo=undoAction;$('#toast-message').textContent=message;$('#undo-button').hidden=!undo;$('#toast').hidden=false;toastTimeout=setTimeout(()=>{$('#toast').hidden=true;undo=null;},undo?10000:5500);}
$('#undo-button').addEventListener('click',()=>{const action=undo;undo=null;if(action)action();});
function persist(next){
  try {localStorage.setItem(STORAGE_KEY,JSON.stringify(next));records=next;storageError=false;combineMovies();refresh();return true;}
  catch {notify('Não foi possível salvar. Verifique o espaço ou as permissões do navegador.');return false;}
}
function combineMovies(){const ids=new Set(catalogMovies.map(m=>m.id));allMovies=[...catalogMovies,...Object.values(records).filter(r=>!ids.has(r.movie.id)).map(r=>r.movie)];}
function refreshCounts(){const want=Object.values(records).filter(r=>r.status==='watchlist').length;const watched=Object.keys(records).length-want;$('#want-count').textContent=want;$('#watched-count').textContent=watched;$('#stats-want').textContent=want;$('#stats-watched').textContent=watched;}
function changeStatus(id,status){
  const movie=allMovies.find(m=>m.id===id);if(!movie)return;
  const before=records[id];const timestamp=new Date().toISOString();
  const next={...records,[id]:{rating:0,note:'',watchedOn:'',addedAt:timestamp,...before,status,updatedAt:timestamp,movie}};
  if(status==='watched'&&!next[id].watchedOn)next[id].watchedOn=today();
  if(persist(next)){notify(status==='watched'?'Filme marcado como assistido.':'Filme salvo em Quero assistir.',()=>restore(id,before));if(activeMovie?.id===id)renderDetail();}
}
function restore(id,before){const next={...records};if(before)next[id]=before;else delete next[id];if(persist(next)){notify('Alteração desfeita.');if(activeMovie?.id===id)renderDetail();}}
function removeMovie(id){const before=records[id];if(!before)return;const next={...records};delete next[id];if(persist(next)){notify('Filme removido da sua lista.',()=>restore(id,before));if(activeMovie?.id===id)renderDetail();}}
function updateRecord(id,patch){const record=records[id];if(!record)return false;return persist({...records,[id]:{...record,...patch,updatedAt:new Date().toISOString()}});}
function setView(next){view=['explore','watchlist','watched'].includes(next)?next:'explore';query='';genre='all';limit=24;$('#search').value='';sort=view==='explore'?'relevance':'recent';$('#sort').value=sort;document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});$('#hero').hidden=view!=='explore';const titles={explore:['DÊ PLAY NA DESCOBERTA','Encontre sua próxima história','Filmes da Netflix Brasil, reunidos para você explorar.'],watchlist:['SEU PRÓXIMO PLAY','Quero assistir','As histórias que você guardou para o momento certo.'],watched:['SUA MEMÓRIA DE CINEMA','Já assisti','Os filmes que já fizeram parte da sua história.']};const t=titles[view];$('#section-kicker').textContent=t[0];$('#section-title').innerHTML=`${t[1]}<span>.</span>`;$('#section-description').textContent=t[2];renderGenres();refresh();}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{location.hash=b.dataset.view;}));
window.addEventListener('hashchange',()=>setView(location.hash.slice(1)));
function renderGenres(){const used=view==='explore'?catalogMovies:allMovies.filter(m=>records[m.id]?.status===view);const values=[...new Set(used.flatMap(m=>m.genres))].sort((a,b)=>a.localeCompare(b,'pt-BR'));$('#genres').innerHTML=[['all','Todos os filmes'],...values.map(v=>[v,v])].map(([value,label])=>`<button class="chip ${genre===value?'selected':''}" data-genre="${escape(value)}" aria-pressed="${genre===value}">${escape(label)}</button>`).join('');}
$('#genres').addEventListener('click',e=>{const button=e.target.closest('[data-genre]');if(!button)return;genre=button.dataset.genre;limit=24;renderGenres();renderMovies();});
function visibleMovies(){return filterMovies(view==='explore'?catalogMovies:allMovies,records,{view,query,genre,sort});}
function renderMovies(){
  const isTribute=normalize(query.trim())==='rafaela';
  $('#tribute').hidden=!isTribute;
  $('#movies').hidden=isTribute;
  $('#genres').hidden=isTribute;
  $('.sort').hidden=isTribute;
  $('.region').hidden=isTribute;
  $('#shuffle-button').hidden=isTribute;
  if(isTribute){
    $('#result-count').textContent='Uma história especial, só para você.';
    $('#clear-filters').hidden=false;
    $('#empty').hidden=true;
    $('#load-more').hidden=true;
    $('#movies').replaceChildren();
    return;
  }
  const filtered=visibleMovies();const shown=filtered.slice(0,limit);
  $('#result-count').innerHTML=`<strong>${filtered.length.toLocaleString('pt-BR')}</strong> ${filtered.length===1?'filme encontrado':'filmes encontrados'}`;
  $('#clear-filters').hidden=!query&&genre==='all';
  $('#movies').innerHTML=shown.map(m=>{
    const r=records[m.id],saved=!!r;
    return `<article class="movie-card"><div class="movie-image"><button class="image-open" data-open="${m.id}" aria-label="Ver detalhes de ${escape(m.title)}"><span class="image-fallback">${icon('film')}</span>${m.image?`<img src="${escape(m.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`:''}</button>${r?`<span class="status-badge">${icon(r.status==='watched'?'check':'bookmark')}${r.status==='watched'?'Já assisti':'Na sua lista'}</span>`:''}<button class="quick-add ${saved?'saved':''}" data-quick="${m.id}" aria-label="${saved?'Abrir opções de':'Quero assistir:'} ${escape(m.title)}">${icon(saved?'check':'plus')}</button></div><button class="movie-title" data-open="${m.id}" title="${escape(m.title)}">${escape(m.title)}</button><div class="movie-meta"><span class="genre-text">${escape(m.genres.filter(g=>g!=='Outros').slice(0,2).join(' · ')||'Filme')}</span>${r?.rating?`<span class="personal-rating" aria-label="Sua avaliação: ${r.rating} de 5">★ ${r.rating}/5</span>`:'<span class="netflix-label"><b>N</b> Netflix</span>'}</div></article>`;
  }).join('');
  $('#movies').querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>img.classList.add('broken'),{once:true}));
  $('#load-more').hidden=limit>=filtered.length;
  $('#empty').hidden=filtered.length>0 || !catalog;
  if(filtered.length===0){const searching=!!query||genre!=='all';$('#empty-title').textContent=searching?'Esse filme ainda não apareceu.':view==='watched'?'Seu diário de cinema começa aqui.':'Uma boa lista começa com um filme.';$('#empty-description').textContent=searching?'Tente outro título ou limpe os filtros. Nossa seleção pode não incluir todos os filmes da Netflix.':view==='watched'?'Marque os filmes que já assistiu e guarde sua avaliação.':'Explore os filmes e toque no + para guardar o que quer assistir.';$('#empty-action').textContent=searching?'Limpar filtros':'Explorar filmes';}
  $('#shuffle-button').disabled=filtered.length===0;
}
function refresh(){refreshCounts();renderMovies();}
$('#movies').addEventListener('click',e=>{const open=e.target.closest('[data-open]');const quick=e.target.closest('[data-quick]');if(open)openMovie(open.dataset.open);else if(quick){if(records[quick.dataset.quick])openMovie(quick.dataset.quick);else changeStatus(quick.dataset.quick,'watchlist');}});
$('#search').addEventListener('input',e=>{query=e.target.value;limit=24;renderMovies();});
$('#sort').addEventListener('change',e=>{sort=e.target.value;limit=24;renderMovies();});
function clearFilters(){query='';genre='all';limit=24;$('#search').value='';renderGenres();renderMovies();}
$('#clear-filters').addEventListener('click',clearFilters);
$('#tribute-back').addEventListener('click',()=>{clearFilters();$('#search').focus({preventScroll:true});});
$('#empty-action').addEventListener('click',()=>{if(query||genre!=='all')clearFilters();else{location.hash='explore';if(view==='explore')setView('explore');}});
$('#load-more').addEventListener('click',()=>{limit+=24;renderMovies();});
$('#hero-cta').addEventListener('click',()=>{$('.library').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('#search').focus({preventScroll:true});});
$('#shuffle-button').addEventListener('click',()=>{let choices=visibleMovies();if(view==='explore'){const wanted=choices.filter(m=>records[m.id]?.status==='watchlist');choices=wanted.length?wanted:choices.filter(m=>records[m.id]?.status!=='watched');}if(!choices.length){notify('Todos os filmes deste filtro já foram assistidos. Explore outro gênero.');return;}const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);openMovie(choices[bytes[0]%choices.length].id);});
function openMovie(id){activeMovie=allMovies.find(m=>m.id===id);if(!activeMovie)return;renderDetail();$('#movie-dialog').showModal();}
function renderDetail(){
  const m=activeMovie,r=records[m.id];
  $('#movie-content').innerHTML=`<div class="detail-cover">${m.image?`<img src="${escape(m.image)}" alt="" referrerpolicy="no-referrer">`:''}<button class="icon-button close-detail" data-close="movie-dialog" aria-label="Fechar detalhes">${icon('close')}</button></div><div class="detail-body"><span class="eyebrow"><span class="netflix-n">N</span> FILME · NETFLIX BRASIL</span><h2 id="detail-title">${escape(m.title)}</h2><p class="detail-genres">${escape(m.genres.join(' · '))}</p><div class="detail-info">${catalogMovies.some(x=>x.id===m.id)?'Encontrado nas páginas públicas da Netflix Brasil.':'Salvo na sua lista. Este filme não está na seleção atual.'} <a href="${m.url}" target="_blank" rel="noopener noreferrer">Confira a disponibilidade na Netflix.</a></div><div class="detail-actions"><button class="button secondary ${r?.status==='watchlist'?'is-selected':''}" data-status="watchlist" aria-pressed="${r?.status==='watchlist'}">${icon('bookmark')}${r?.status==='watchlist'?'Quero assistir ✓':'Quero assistir'}</button><button class="button secondary ${r?.status==='watched'?'is-selected':''}" data-status="watched" aria-pressed="${r?.status==='watched'}">${icon('check')}${r?.status==='watched'?'Já assisti ✓':'Já assisti'}</button></div>${r?`<div class="detail-form">${r.status==='watched'?`<div><span class="field-label" id="rating-label">O que achou do filme?</span><div class="rating-row"><div class="stars" role="group" aria-labelledby="rating-label">${[1,2,3,4,5].map(n=>`<button class="star ${n<=r.rating?'filled':''}" data-rating="${n}" aria-label="Avaliar com ${n} ${n===1?'estrela':'estrelas'}" aria-pressed="${r.rating===n}">${n<=r.rating?'★':'☆'}</button>`).join('')}</div><button class="text-button" data-clear-rating ${r.rating?'':'hidden'}>Limpar nota</button></div></div><label><span class="field-label">Quando você assistiu?</span><input id="watched-date" type="date" max="${today()}" value="${escape(r.watchedOn)}"></label>`:''}<label><span class="field-label">Uma nota para lembrar</span><textarea id="movie-note" maxlength="2000" placeholder="O que fez você salvar esse filme?">${escape(r.note)}</textarea></label><button class="button secondary" id="save-note">Salvar anotação</button></div>`:''}<div class="detail-footer"><a href="${m.url}" class="button secondary" target="_blank" rel="noopener noreferrer"><span class="netflix-n">N</span>Abrir na Netflix</a>${r?'<button class="remove" id="remove-movie">Remover da lista</button>':''}</div></div>`;
}
$('#movie-content').addEventListener('click',e=>{
  const status=e.target.closest('[data-status]');const rating=e.target.closest('[data-rating]');
  if(status)changeStatus(activeMovie.id,status.dataset.status);
  else if(rating){const focused=Number(rating.dataset.rating);updateRecord(activeMovie.id,{rating:focused});renderDetail();$(`[data-rating="${focused}"]`).focus();}
  else if(e.target.closest('[data-clear-rating]')){updateRecord(activeMovie.id,{rating:0});renderDetail();}
  else if(e.target.closest('#remove-movie'))removeMovie(activeMovie.id);
  else if(e.target.closest('#save-note')){const id=activeMovie.id;if(updateRecord(id,{note:$('#movie-note').value}))notify('Anotação salva.');}
});
// Save draft text before a different detail action rebuilds the dialog.
$('#movie-content').addEventListener('focusout',e=>{if(e.target.id==='movie-note'&&activeMovie&&records[activeMovie.id]&&records[activeMovie.id].note!==e.target.value)updateRecord(activeMovie.id,{note:e.target.value});});
$('#movie-content').addEventListener('change',e=>{if(e.target.id==='watched-date'){if(e.target.value>today()||!e.target.validity.valid){notify('Escolha hoje ou uma data anterior.');e.target.value=records[activeMovie.id].watchedOn;return;}updateRecord(activeMovie.id,{watchedOn:e.target.value});}});
document.addEventListener('click',e=>{const close=e.target.closest('[data-close]');if(close)document.getElementById(close.dataset.close).close();});
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
$('#movie-dialog').addEventListener('close',()=>{activeMovie=null;});
function openSettings(){refreshCounts();$('#settings-dialog').showModal();}
$('#settings-button').addEventListener('click',openSettings);$('#catalog-info').addEventListener('click',openSettings);
$('#export-button').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({app:'flix-list',version:1,exportedAt:new Date().toISOString(),records},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`flix-list-backup-${today()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);notify('Backup exportado. Guarde o arquivo em um lugar seguro.');});
$('#import-button').addEventListener('click',()=>$('#import-file').click());
$('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>15*1024*1024)throw Error('O arquivo é grande demais. O limite é 15 MB.');const incoming=parseBackup(await file.text());if(persist(mergeRecords(records,incoming))){renderGenres();notify('Backup importado. Suas listas foram combinadas.');}}catch(error){notify(error instanceof SyntaxError?'Não foi possível ler esse arquivo. Escolha um backup JSON do Flix List.':error.message);}finally{e.target.value='';}});
window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY){try{records=validateRecords(JSON.parse(e.newValue||'{}'));combineMovies();renderGenres();refresh();if(activeMovie)renderDetail();}catch{notify('Não foi possível ler a atualização da outra aba.');}}});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!document.querySelector('dialog[open]')&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus();}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#install-button').hidden=false;});
$('#install-button').addEventListener('click',async()=>{if(!installPrompt)return;await installPrompt.prompt();installPrompt=null;$('#install-button').hidden=true;});
async function initialize(){
  try{
    const response=await fetch('./catalog.json');if(!response.ok)throw Error('catalog');
    catalog=await response.json();catalogMovies=catalog.movies;
    // A few recognized films lead the selection; all remaining titles stay searchable.
    const featuredIds=['81326035','81426931','81167887','80115328','81043665','81277950','80192098','81447461'];
    catalogMovies.sort((a,b)=>{const ai=featuredIds.indexOf(a.id),bi=featuredIds.indexOf(b.id);return(ai<0?100:ai)-(bi<0?100:bi);});
    combineMovies();const featured=catalogMovies.find(m=>m.title==='O Mundo Depois de Nós'&&m.image)||catalogMovies.find(m=>m.image);
    if(featured){$('#hero-art').style.backgroundImage=`url("${featured.image.replace(/["\\\n\r]/g,'')}")`;$('#hero-title').textContent=featured.title;$('#hero-feature').hidden=false;$('#hero-feature').addEventListener('click',()=>openMovie(featured.id));}
    $('#source-description').textContent=`${catalogMovies.length.toLocaleString('pt-BR')} filmes na seleção. Consulta em ${new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeZone:'America/Sao_Paulo'}).format(new Date(catalog.updatedAt))}.`;
    $('#loading').hidden=true;setView(location.hash.slice(1)||'explore');
    if(storageError)notify('Não foi possível ler sua lista salva. Exporte uma cópia antes de fazer novas alterações.');
  }catch{catalog={movies:[]};combineMovies();$('#loading').hidden=true;$('#empty').hidden=false;$('#empty-title').textContent='Não foi possível carregar os filmes.';$('#empty-description').textContent='Verifique sua conexão e tente novamente. Suas listas salvas continuam aqui.';$('#empty-action').textContent='Tentar novamente';$('#empty-action').onclick=()=>location.reload();$('#result-count').textContent='Catálogo indisponível';refreshCounts();if(Object.keys(records).length){setView('watchlist');}}
}
initialize();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
