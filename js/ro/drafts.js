// /js/ro/drafts.js
import { STATE } from './state.js';
import { escapeHtml } from './util.js';

const LS_KEY = 'ro:memos';

export function bootDrafts(){
  const list = STATE.dom.memoList; if (!list) return;
  if (document.getElementById('draftsControls')) return;
  const wrap=document.createElement('div'); wrap.id='draftsControls'; wrap.className='bar';
  const a=document.createElement('button'); a.className='btn btn-sm'; a.textContent='Show all drafts';
  const b=document.createElement('button'); b.className='btn btn-sm'; b.textContent='Show only this paragraph';
  const s=document.createElement('input'); s.type='search'; s.placeholder='Filter drafts… (text / chapter / para)'; s.className='mono';
  s.style.cssText='flex:1; min-width:220px; padding:6px 8px; border-radius:8px; border:1px solid rgba(255,255,255,.16); background:#0f141a; color:#e7edf3;';
  const c=document.createElement('span'); c.className='tag draft-count'; c.style.marginLeft='auto';
  list.parentElement.insertBefore(wrap, list); wrap.append(a,b,s,c);

  const deb=(fn,ms=150)=>{let t; return (...x)=>{clearTimeout(t); t=setTimeout(()=>fn(...x),ms);}};

  a.addEventListener('click', ()=>renderDraftList('all', s.value.trim()));
  b.addEventListener('click', ()=>renderDraftList('current', s.value.trim()));
  s.addEventListener('input', deb(()=>renderDraftList(list.dataset.filter||'all', s.value.trim())));
}

function loadAll(){ try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); } catch { return []; } }
function saveAll(arr){ try { localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0, 200))); } catch{} }

export function getAllDrafts(){ return loadAll(); }

export function persistDraftDraftlist(){
  const arr = loadAll();
  const payload = { ts: Date.now(), chapter: STATE.params.chapter, paraId: STATE.params.paraId, body: STATE.dom.memoTa.value };
  const idx = arr.findIndex(x => x.chapter===payload.chapter && x.paraId===payload.paraId);
  if (idx>=0) arr[idx]=payload; else arr.unshift(payload);
  saveAll(arr);
  renderDraftList(STATE.dom.memoList.dataset.filter||'current');
}

export function renderDraftList(filter='current', query=''){
  const arr = loadAll();
  const list = STATE.dom.memoList; if (!list) return;
  list.dataset.filter = filter;
  const q=query.toLowerCase();
  const matches = d => !q || (d.body||'').toLowerCase().includes(q) || (d.chapter||'').toLowerCase().includes(q) || (d.paraId||'').toLowerCase().includes(q);
  const isCurrent = d => d.chapter===STATE.params.chapter && d.paraId===STATE.params.paraId;
  let rows = (filter==='all'? arr : arr.filter(isCurrent)).filter(matches).sort((a,b)=>b.ts-a.ts);
  list.innerHTML = '';
  if (!rows.length){
    const empty=document.createElement('div'); empty.className='muted';
    empty.textContent = (filter==='all') ? (q?'No drafts match your search.':'No drafts stored in this browser yet.') : (q?'No drafts for this paragraph match your search.':'No drafts for this paragraph yet.');
    list.appendChild(empty);
  } else {
    rows.forEach(d=>{
      const row=document.createElement('div'); row.className='item'; row.style.alignItems='center';
      row.innerHTML = `
        <div class="mono muted">${new Date(d.ts).toLocaleString()}</div>
        <div class="mono" style="opacity:.9">${escapeHtml((d.body||'').slice(0,140))}${(d.body||'').length>140?'…':''}</div>
        <div class="mono" style="opacity:.7;margin-top:4px">chapter: ${escapeHtml(d.chapter)} • para: ${escapeHtml(d.paraId)}</div>`;
      const actions=document.createElement('div'); actions.style.display='flex'; actions.style.gap='6px';
      const here=document.createElement('button'); here.className='btn btn-sm'; here.textContent='Open here'; here.disabled = !(d.chapter===STATE.params.chapter && d.paraId===STATE.params.paraId);
      here.addEventListener('click', ()=>{ STATE.dom.memoTa.value=d.body||''; window.dispatchEvent(new CustomEvent('ro:memoChanged')); });
      const open=document.createElement('button'); open.className='btn btn-sm'; open.textContent='Open'; open.addEventListener('click', ()=>{
        const base = location.origin + location.pathname;
        const url = `${base}?chapter=${encodeURIComponent(d.chapter)}&para=${encodeURIComponent(d.paraId)}${STATE.params.rodebug?'&rodebug=1':''}`;
        location.href = url;
      });
      const del=document.createElement('button'); del.className='btn btn-sm'; del.textContent='Delete'; del.addEventListener('click', ()=>{ if(!confirm('Delete this draft?')) return; const all=loadAll(); const i=all.findIndex(x=>x.ts===d.ts&&x.chapter===d.chapter&&x.paraId===d.paraId); if(i>=0){all.splice(i,1); saveAll(all); renderDraftList(filter, query);} });
      actions.append(here,open,del); row.append(actions); list.appendChild(row);
    });
  }
  document.querySelector('#draftsControls .draft-count')?.replaceChildren(document.createTextNode(`count: ${arr.length}`));
}
