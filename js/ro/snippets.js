/* RO Snippets — modular-only controller (v4)
   - Modal logic is imported from /js/ro/snippets-modal.js
   - Rendering/MathJax is imported from /js/ro/snippets-compile.js
   - No inline modal fallback, no feature flags
*/

import { modalAPI } from '/js/ro/snippets-modal.js';
import { compileToHTML, typesetInto } from '/js/ro/snippets-compile.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2,9);

const STORE = { KEY: 'ro_snips_v3', GROUPS: 'ro_snips_v3_groups' };

let SNIPS=[], GROUPS={}, ACTIVE=null;

/* ---------------- persistence ---------------- */
const saveSnips  = () => localStorage.setItem(STORE.KEY, JSON.stringify(SNIPS));
const saveGroups = () => localStorage.setItem(STORE.GROUPS, JSON.stringify(GROUPS));

/* ---------------- util ---------------- */
function typeColor(t){
  return t==='Observation' ? '#2e7dbb'
       : t==='Hypothesis'  ? '#6a9d28'
       : t==='Evidence'    ? '#b07a0a'
       : t==='Dock'        ? '#788197'
       : '#3a4556';
}
function idxOf(id){ return SNIPS.findIndex(s => s && s.id === id); }
function escapeHtml(s=''){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

/* ---------------- MathJax ---------------- */
function queueTypeset(scope){
  try { typesetInto(scope); } catch { /* no-op if MathJax not ready */ }
}

/* ---------------- seed + sanitize ---------------- */
function sanitizeSnips(arr){
  // keep only objects with an id
  return (arr || []).filter(x => x && typeof x === 'object' && x.id);
}
function ensureSeed(){
  try { SNIPS  = JSON.parse(localStorage.getItem(STORE.KEY)    || '[]'); } catch { SNIPS = []; }
  try { GROUPS = JSON.parse(localStorage.getItem(STORE.GROUPS) || '{}'); } catch { GROUPS = {}; }

  SNIPS = sanitizeSnips(SNIPS);

  if(!SNIPS.length){
    SNIPS = [
      { id:uid(), type:'Observation', title:'LaTeX test', body:'\\\\[ \\zeta(2) = \\frac{\\pi^2}{6} \\\\]' },
      { id:uid(), type:'Observation', title:'Ladder up the wall', body:'We see a family of ratios that look like roots of fractions.' },
      { id:uid(), type:'Hypothesis',  title:'√n/(n+1) relationship', body:'\\\\[ r_q = \\forall n\\,\\sqrt{\\frac{n}{n+1}} \\to \\{ \\sqrt{\\tfrac{1}{2}}, \\sqrt{\\tfrac{2}{3}}, \\sqrt{\\tfrac{3}{4}}, \\dots \\} \\tag{05:01} \\\\]' }
    ];
    saveSnips();
  }

  // ensure group objects for any Docks that exist
  for(const sn of SNIPS){
    if(sn.type==='Dock' && !GROUPS[sn.id]){
      GROUPS[sn.id] = { collapsed:false, members:[] };
    }
  }
  saveGroups();

  ACTIVE = SNIPS[0]?.id || null;
}

/* ---------------- dock membership (defensive) ---------------- */
function computeMembership(){
  let currentDockId = null;
  // Preserve index alignment with SNIPS (robust to nulls)
  return SNIPS.map(sn=>{
    if(!sn) return { id:null, type:null, dockId:null, _null:true };
    if(sn.type==='Dock'){
      currentDockId = sn.id;
      return { id:sn.id, type:sn.type, dockId:null };
    }
    return { id:sn.id, type:sn.type, dockId:currentDockId };
  });
}

/* ---------------- render: list ---------------- */
function renderList(){
  const list = $('#list'); if(!list) return;
  list.innerHTML = '';

  const membership = computeMembership();

  SNIPS.forEach((sn, idx) => {
    if(!sn) return;

    const isActive = sn.id === ACTIVE;
    const isDock   = sn.type === 'Dock';

    const row = document.createElement('div');
    row.className = 'snip' + (isActive ? ' active' : ' collapsed') + (isDock ? ' dock' : '');
    row.dataset.id  = sn.id;
    row.dataset.idx = String(idx);
    row.draggable = true;

    row.innerHTML = `
      <div class="bar" style="border-left:6px solid ${typeColor(sn.type)}">
        <div class="left">
          <span class="badge">${sn.type}</span>
          <span class="title">${escapeHtml(sn.title || '')}</span>
        </div>
        <div class="tools">
          ${isDock ? `<button class="btn" data-act="dock-toggle">${GROUPS[sn.id]?.collapsed?'Expand':'Collapse'}</button>` : ''}
          <button class="btn" data-act="edit" title="Edit">✏️</button>
        </div>
      </div>
      <!-- list body is raw (not compiled) on purpose; preview is compiled -->
      <div class="body">${sn.body || ''}</div>
    `;

    // prevent drag from starting on toolbar buttons
    row.querySelectorAll('.tools button').forEach(b=>{
      b.setAttribute('draggable','false');
      b.style.webkitUserDrag='none';
    });

    // group-member visibility
    const mem = membership[idx];
    const gid = mem ? mem.dockId : null;
    if(gid){
      row.classList.add('group-member');
      if(GROUPS[gid]?.collapsed) row.classList.add('hidden');
    }

    list.appendChild(row);
  });

  queueTypeset(list);
}

/* ---------------- render: preview (compiled) ---------------- */
function renderPreview(){
  const pv = $('#preview'); if(!pv) return;
  pv.innerHTML = '';

  const membership = computeMembership();

  SNIPS.forEach((sn, idx) => {
    if(!sn) return;

    const card = document.createElement('div');
    card.className = 'pv-snip' + (sn.id === ACTIVE ? ' active' : '');
    card.innerHTML = `
      <div class="head">
        <span class="badge">${sn.type}</span>
        <strong class="title">${escapeHtml(sn.title || '')}</strong>
      </div>
      <div class="body">${compileToHTML(sn.body || '')}</div>
    `;

    // collapse members when their dock is collapsed
    const mem = membership[idx];
    const gid = mem ? mem.dockId : null;
    if(gid && GROUPS[gid]?.collapsed){
      card.classList.add('group-member','hidden');
      card.style.display='none';
    }

    pv.appendChild(card);
  });

  queueTypeset(pv);

  // scroll active near top for editing real estate
  const activeEl = pv.querySelector('.pv-snip.active');
  if (activeEl) {
    const top = activeEl.offsetTop;
    pv.scrollTo({ top: Math.max(0, top - 24), behavior: 'smooth' });
  }
}

/* ---------------- events: list ---------------- */
function wireListEvents(){
  // selection + tools
  $('#list').addEventListener('click', (ev)=>{
    const card = ev.target.closest('.snip'); if(!card) return;
    const id   = card.dataset.id;
    const btn  = ev.target.closest('[data-act]');
    const i    = idxOf(id); if(i<0) return;
    const sn   = SNIPS[i];

    if(btn){
      const act = btn.dataset.act;
      if(act === 'edit'){ modalAPI.openModal(sn); return; }
      if(act === 'dock-toggle' && sn.type === 'Dock'){
        (GROUPS[sn.id] ||= { collapsed:false, members:[] }).collapsed = !GROUPS[sn.id].collapsed;
        saveGroups(); renderList(); renderPreview(); return;
      }
      return;
    }

    ACTIVE = id;
    renderList(); renderPreview(); saveSnips();
    card.scrollIntoView({ block:'center', behavior:'smooth' });
  });

  // drag reorder
  let dragIndex = -1;

  $('#list').addEventListener('dragstart', (e)=>{
    if(e.target.closest('.tools')){ e.preventDefault(); return; }
    const card = e.target.closest('.snip'); if(!card) return;
    dragIndex = idxOf(card.dataset.id);
    card.classList.add('drag-hint');
    e.dataTransfer.effectAllowed='move';
    e.dataTransfer.setData('text/plain', card.dataset.id);
  });

  $('#list').addEventListener('dragend', ()=>{
    $$('.snip.drag-hint').forEach(x=>x.classList.remove('drag-hint'));
  });

  $('#list').addEventListener('dragover', (e)=>{
    e.preventDefault();
    const over = e.target.closest('.snip'); if(!over) return;
    const overIdx = idxOf(over.dataset.id);
    if(overIdx<0 || dragIndex<0 || overIdx===dragIndex) return;

    const rect = over.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height/2;

    const [moving] = SNIPS.splice(dragIndex,1);
    if(!moving){ return; } // ultra defensive
    let insertAt = overIdx + (before ? 0 : 1);
    if(insertAt < 0) insertAt = 0;

    SNIPS.splice(insertAt, 0, moving);
    dragIndex = insertAt;

    saveSnips();
    renderList();
    renderPreview();
  });
}

/* ---------------- topbar ---------------- */
function wireTopbar(){
  const add = (type)=>{
    const s = { id:uid(), type, title:'', body:'' };
    SNIPS.push(s); ACTIVE = s.id;
    saveSnips(); renderList(); renderPreview(); modalAPI.openModal(s);
  };

  $('#btnAddObs') ?.addEventListener('click', ()=>add('Observation'));
  $('#btnAddHyp') ?.addEventListener('click', ()=>add('Hypothesis'));
  $('#btnAddEv')  ?.addEventListener('click', ()=>add('Evidence'));
  $('#btnAddDock')?.addEventListener('click', ()=>{
    const s = { id:uid(), type:'Dock', title:'New Dock', body:'' };
    SNIPS.push(s); ACTIVE = s.id;
    GROUPS[s.id] = GROUPS[s.id] || { collapsed:false, members:[] };
    saveGroups(); saveSnips(); renderList(); renderPreview();
  });

  $('#btnInsertMM')?.addEventListener('click', ()=>{
    alert('Insert MM via the modal (Insert MM).');
  });

  $('#btnExport')?.addEventListener('click', ()=>{
    const txt = SNIPS.filter(Boolean).map(s=>`<!-- ${s.type}: ${s.title}\n-->\n${s.body}\n`).join('\n\n');
    const blob = new Blob([txt],{type:'text/plain;charset=utf-8'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='memo-snippets.txt'; a.click(); URL.revokeObjectURL(a.href);
  });

  $('#btnPop')?.addEventListener('click', ()=>{
    const w = window.open('about:blank','_blank');
    const html = `
<!doctype html><meta charset="utf-8"/>
<title>Live Preview</title>
<style>
  body{margin:0;background:#0f141a;color:#e6edf3;font:15px/1.6 system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif}
  .wrap{max-width:900px;margin:0 auto;padding:18px}
  .pv-snip{border:1px solid #273341;border-radius:10px;margin:12px 0;overflow:hidden}
  .pv-snip .head{display:flex;gap:8px;align-items:center;padding:8px 10px;border-bottom:1px solid #122031}
  .badge{font-size:12px;color:#9fb3c8;border:1px solid #3a4556;border-radius:999px;padding:2px 8px}
</style>
<div class="wrap" id="root">${$('#preview').innerHTML}</div>
<script src="/cafes/zeta-zero-cafe/notebook/math/mathconfig.js"><\/script>
<script id="MathJax-script" defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"><\/script>
<script>
document.addEventListener('DOMContentLoaded',()=>{ setTimeout(()=>{ if(window.MathJax && MathJax.typesetPromise){ MathJax.typesetPromise(); } },0); });
<\/script>`;
    w.document.write(html);
    w.document.close();
  });
}

/* ---------------- boot ---------------- */
export function initSnippetsApp(){
  ensureSeed();
  // give MathJax a tick on some hosts
  setTimeout(()=>{
    renderList();
    renderPreview();
    wireListEvents();
    wireTopbar();
    // bind modal API once DOM is ready
    modalAPI.wireModal({ SNIPS, idxOf, saveSnips, renderList, renderPreview });
  }, 0);
}
