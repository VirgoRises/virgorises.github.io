// Snippets list + state; emits "ro:snipsChanged" on every mutation.
// Dock grouping: items after a Dock belong to that Dock until next Dock.

import { initSnippetsModal, openSnippetModal, closeSnippetModal } from '/js/ro/snippets-modal.js';

const STORE_KEY = 'ro_snips_v3';
let SNIPS = [];
let dragging = null;
let INIT = false;
let WIRED = false;
let ACTIVE_ID = null;

// ---------- persistence ----------
export function getSnippets() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
  catch { return []; }
}
export function setSnippets(arr) {
  localStorage.setItem(STORE_KEY, JSON.stringify(arr || []));
  window.dispatchEvent(new CustomEvent('ro:snipsChanged'));
}
function load() {
  SNIPS = getSnippets().filter(Boolean);
  if (!SNIPS.length) {
    SNIPS = [{ id: rid(), type:'Observation', title:'New Observation', body:'Start your first observation here.' }];
    localStorage.setItem(STORE_KEY, JSON.stringify(SNIPS));
  }
}
function save(){ setSnippets(SNIPS); }

// ---------- utils ----------
const rid = () => Math.random().toString(36).slice(2, 9);
const cssSafe = s => String(s).toLowerCase().replace(/[^a-z0-9_-]+/g,'-');
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function cleanedForDelete(s){
  return String(s||'').replace(/\[split\]/g,'').replace(/\u00A0/g,' ')
    .replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/[\s\r\n]+/g,'').trim();
}

// ---------- grouping ----------
function groupByDock(arr){
  const groups=[]; let current=null;
  arr.forEach(sn=>{
    if ((sn.type||'').toLowerCase()==='dock') { current={dock:sn,items:[]}; groups.push(current); }
    else if (current) { current.items.push(sn); }
    else { groups.push({dock:null,items:[sn]}); }
  });
  return groups;
}

// ---------- active highlight ----------
function markActive(id){
  ACTIVE_ID = id || null;
  document.querySelectorAll('#list .snip').forEach(el=>el.classList.remove('active'));
  if (id){
    const el=document.querySelector(`#list .snip[data-id="${CSS.escape(id)}"]`);
    if (el){ el.classList.add('active'); try{el.scrollIntoView({block:'nearest',behavior:'smooth'})}catch{} }
  }
  document.querySelectorAll('#preview .pv-snip').forEach(el=>el.classList.remove('active'));
  if (id){
    const pv=document.querySelector(`#preview .pv-snip[data-id="${CSS.escape(id)}"]`);
    if (pv) pv.classList.add('active');
  }
}
window.addEventListener('ro:snipsChanged', ()=>{ if (ACTIVE_ID) setTimeout(()=>markActive(ACTIVE_ID),0); });

// ---------- render ----------
function render(){
  const list=document.getElementById('list'); if (!list) return;
  list.innerHTML='';
  const groups=groupByDock(SNIPS);

  groups.forEach(g=>{
    if (g.dock){
      const d=g.dock;
      const dockEl=document.createElement('div');
      dockEl.className='snip';
      dockEl.classList.add(`type-${cssSafe(d.type||'dock')}`);
      dockEl.dataset.id=d.id;

      const bar=document.createElement('div');
      bar.className='bar';
      const isOpen=!!d.open;
      bar.innerHTML=`
        <span class="type">${escapeHtml(d.type||'Dock')}</span>
        <span class="title" title="${escapeHtml(d.title||'')}">${escapeHtml(d.title||'')}</span>
        <div class="tools">
          <button class="icon edit" title="Edit">✎</button>
          <button class="icon toggle" title="${isOpen?'Collapse':'Expand'}">${isOpen?'▾':'▸'}</button>
        </div>`;
      dockEl.appendChild(bar);

      const kids=document.createElement('div');
      kids.className='dock-children';
      kids.style.display=isOpen?'':'none';
      dockEl.appendChild(kids);

      bar.querySelector('.toggle').addEventListener('click',e=>{
        e.stopPropagation(); d.open=!d.open; save(); render(); markActive(d.id);
      });
      bar.querySelector('.edit').addEventListener('click',()=>{ markActive(d.id); editById(d.id); });
      bar.addEventListener('click',()=>markActive(d.id));

      g.items.forEach(sn=>kids.appendChild(renderItem(sn)));

      // drag whole dock block
      dockEl.draggable=true;
      dockEl.addEventListener('dragstart',e=>{
        dragging={id:d.id,from:SNIPS.findIndex(s=>s.id===d.id)};
        dockEl.classList.add('drag-hint'); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', d.id);
      });
      dockEl.addEventListener('dragend',()=>{ dragging=null; dockEl.classList.remove('drag-hint'); });
      dockEl.addEventListener('dragover',e=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; });
      dockEl.addEventListener('drop',e=>{
        e.preventDefault();
        if (!dragging || dragging.id===d.id) return;
        const from=dragging.from; const to=SNIPS.findIndex(s=>s.id===d.id);
        const [m]=SNIPS.splice(from,1); SNIPS.splice(to,0,m); save(); render(); markActive(m.id);
      });

      list.appendChild(dockEl);
    } else {
      g.items.forEach(sn=>list.appendChild(renderItem(sn)));
    }
  });

  if (ACTIVE_ID) markActive(ACTIVE_ID);
}

function renderItem(sn){
  const div=document.createElement('div');
  const type=(sn.type||'Block').trim();
  div.className='snip collapsed';
  div.classList.add(`type-${cssSafe(type)}`);
  div.dataset.id=sn.id; div.draggable=true;

  const bar=document.createElement('div'); bar.className='bar';
  bar.innerHTML=`
    <span class="type">${escapeHtml(type)}</span>
    <span class="title" title="${escapeHtml(sn.title||'')}">${escapeHtml(sn.title||'')}</span>
    <div class="tools"><button class="icon edit" title="Edit">✎</button></div>`;
  div.appendChild(bar);

  const body=document.createElement('div'); body.className='body'; body.textContent=sn.body||''; div.appendChild(body);

  div.addEventListener('mouseenter',()=>div.classList.remove('collapsed'));
  div.addEventListener('mouseleave',()=>div.classList.add('collapsed'));
  bar.addEventListener('click',()=>markActive(sn.id));
  bar.querySelector('.edit').addEventListener('click',ev=>{ ev.stopPropagation(); markActive(sn.id); editById(sn.id); });

  div.addEventListener('dragstart',e=>{
    dragging={id:sn.id,from:SNIPS.findIndex(s=>s.id===sn.id)};
    div.classList.add('drag-hint'); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', sn.id);
  });
  div.addEventListener('dragend',()=>{ dragging=null; div.classList.remove('drag-hint'); });
  div.addEventListener('dragover',e=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; });
  div.addEventListener('drop',e=>{
    e.preventDefault();
    if (!dragging || dragging.id===sn.id) return;
    const from=dragging.from; const to=SNIPS.findIndex(s=>s.id===sn.id);
    const [m]=SNIPS.splice(from,1); SNIPS.splice(to,0,m); save(); render(); markActive(m.id);
  });

  div.querySelectorAll('.tools button').forEach(b=>{ b.setAttribute('draggable','false'); b.style.webkitUserDrag='none'; });

  return div;
}

// ---------- edit flow (all callbacks re-resolve by id) ----------
function editById(id){
  const idx0 = SNIPS.findIndex(s=>s.id===id);
  if (idx0<0) return;
  const sn0 = SNIPS[idx0];

  openSnippetModal({
    snippet: sn0,
    onSave: ({title, body}) => {
      const i = SNIPS.findIndex(s=>s.id===id); if (i<0) return;
      SNIPS[i].title = String(title||'').trim();
      SNIPS[i].body  = String(body||'').replace(/\[split\]/g,'').trim();
      save(); render(); markActive(id);
      closeSnippetModal(); // close after save
    },
    onSplit: (left, right) => {
      const i = SNIPS.findIndex(s=>s.id===id); if (i<0) return;
      SNIPS[i].body = String(left||'').trim();
      const twin = { ...SNIPS[i], id: rid(), title: (SNIPS[i].title||'')+' (part 2)', body: String(right||'').trim() };
      SNIPS.splice(i+1, 0, twin);
      save(); render(); markActive(twin.id);
    },
    onMergePrev: () => {
      const i = SNIPS.findIndex(s=>s.id===id); if (i<=0) return;
      const A = SNIPS[i-1], B = SNIPS[i];
      if ((A.type||'').toLowerCase() !== (B.type||'').toLowerCase()) { alert('Can only merge snippets of the same type.'); return; }
      A.body = (A.body||'') + '\n\n' + (B.body||'');
      const keepId = A.id;
      SNIPS.splice(i,1); save(); render(); markActive(keepId);
    },
    onMergeNext: () => {
      const i = SNIPS.findIndex(s=>s.id===id); if (i<0 || i>=SNIPS.length-1) return;
      const A = SNIPS[i], B = SNIPS[i+1];
      if ((A.type||'').toLowerCase() !== (B.type||'').toLowerCase()) { alert('Can only merge snippets of the same type.'); return; }
      A.body = (A.body||'') + '\n\n' + (B.body||'');
      SNIPS.splice(i+1,1); save(); render(); markActive(A.id);
    },
    onDuplicate: () => {
      const i = SNIPS.findIndex(s=>s.id===id); if (i<0) return;
      const clone = { ...SNIPS[i], id: rid(), title: (SNIPS[i].title||'') + ' (copy)' };
      SNIPS.splice(i+1, 0, clone); save(); render(); markActive(clone.id);
    },
    onDelete: (currentEditorText) => {
      const i = SNIPS.findIndex(s=>s.id===id); if (i<0) return;
      const type = (SNIPS[i].type||'').toLowerCase();
      if (type === 'dock') {
        if (!confirm('Delete this Dock header? (Contained snippets remain.)')) return;
        SNIPS.splice(i,1);
        if (!SNIPS.length) SNIPS=[{ id: rid(), type:'Observation', title:'New Observation', body:'' }];
        save(); render(); if (ACTIVE_ID===id) markActive(null); return;
      }
      const liveClean  = cleanedForDelete(currentEditorText);
      const savedClean = cleanedForDelete(SNIPS[i].body);
      if (liveClean.length || savedClean.length) { alert('Empty the snippet body first (no invisible characters), then delete.'); return; }
      SNIPS.splice(i,1);
      if (!SNIPS.length) SNIPS=[{ id: rid(), type:'Observation', title:'New Observation', body:'' }];
      save(); render(); if (ACTIVE_ID===id) markActive(null);
    }
  });
}

// ---------- adders (no double wiring) ----------
function wireAdders(){
  if (WIRED) return; WIRED = true;
  const A=(id,type)=>{
    const b=document.getElementById(id); if (!b) return;
    b.addEventListener('click',()=>{
      const sn={ id: rid(), type, title:'', body:'' };
      SNIPS.push(sn); save(); render(); markActive(sn.id);
    });
  };
  A('btnAddObs','Observation');
  A('btnAddHyp','Hypothesis');
  A('btnAddEv','Evidence');
  A('btnAddDock','Dock');
}

// ---------- boot ----------
export function initSnippetsApp(){
  if (INIT) return; INIT=true;
  load(); render(); wireAdders(); initSnippetsModal();
  console.log('[RO] Snippets ready (dock grouping, active highlight, delete-safety, DnD)');
}
document.addEventListener('DOMContentLoaded', initSnippetsApp);

