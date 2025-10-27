// /js/ro/snippets.js
// Orchestrates: state, list rendering, drag/sort, selection, dock groups,
// preview compilation, and persistence.

import { TPL } from '/js/ro/snippets-templates.js';
import { openEditorFor, closeEditor, isEditorOpen, setEditorHandlers, getEditorValue, setEditorValue } from '/js/ro/snippets-modal.js';
import { compileSnippets, queueTypeset, mdToHtml } from '/js/ro/snippets-compile.js?v=7';

const LS_KEY = 'ro.snips.v3';          // sandbox-only key
const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

export const STATE = {
  snips: [],
  activeId: null,
  groups: {},          // {dockId: {collapsed:boolean}}
};

// ---------- persistence ----------
function save() {
  localStorage.setItem(LS_KEY, JSON.stringify({
    snips: STATE.snips,
    activeId: STATE.activeId,
    groups: STATE.groups
  }));
}
function load() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return false;
  try {
    const o = JSON.parse(raw);
    STATE.snips = Array.isArray(o.snips)? o.snips : [];
    STATE.activeId = o.activeId || null;
    STATE.groups = o.groups || {};
    return true;
  } catch(_){ return false; }
}

// ---------- ID helpers ----------
function uid() { return 'id'+Math.random().toString(36).slice(2,9); }
function byId(id){ return STATE.snips.find(s=>s.id===id); }
function idxById(id){ return STATE.snips.findIndex(s=>s.id===id); }
function typeColor(t){ return ({Observation:'#238636',Hypothesis:'#2f81f7',Evidence:'#f0b429',Dock:'#6e7681'})[t]||'#6e7681'; }

// ---------- membership (dock grouping) ----------
function computeMembership(){
  let currentDock = null;
  return STATE.snips.map(sn=>{
    if (sn.type==='Dock'){ currentDock=sn.id; return {id:sn.id, type:'Dock', dockId:null}; }
    return {id:sn.id, type:sn.type, dockId:currentDock};
  });
}

// ---------- rendering ----------
export function renderAll(){
  renderList();
  renderPreview();
  save();
}

export function renderList(){
  const list = $('#snipList'); if (!list) return;
  list.innerHTML = '';
  const mem = computeMembership();

  STATE.snips.forEach((sn, i)=>{
    const isDock = sn.type==='Dock';
    const active = STATE.activeId===sn.id;
    const div = document.createElement('div');
    div.className = 'snip' + (active?' active':' collapsed') + (isDock?' dock':'');
    div.dataset.id = sn.id;
    div.dataset.idx = i;
    div.draggable = true;

    div.innerHTML = `
      <div class="bar" style="border-left:6px solid ${typeColor(sn.type)}">
        <div class="left">
          <span class="badge">${sn.type}</span>
          <span class="title">${escapeHtml(sn.title||'')}</span>
        </div>
        <div class="tools">
          ${isDock?`
            <button class="btn dock-toggle" data-act="dock-toggle">${STATE.groups[sn.id]?.collapsed?'Expand':'Collapse'}</button>
            <button class="btn" data-act="edit" title="Edit">✏️</button>
          `:`
            <button class="btn" data-act="edit" title="Edit">✏️</button>
          `}
        </div>
      </div>
      <div class="body">${mdToHtml(sn.body||'')}</div>
    `;

    // dock membership hide
    const grp = mem[i].dockId;
    if (grp){
      div.classList.add('group-member');
      if (STATE.groups[grp]?.collapsed) div.classList.add('hidden');
    }

    // drag events
    div.addEventListener('dragstart', e=>{
      if (e.target.closest('.tools')) { e.preventDefault(); return; }
      div.classList.add('drag-hint'); e.dataTransfer.setData('text/plain', sn.id);
    });
    div.addEventListener('dragend', ()=>div.classList.remove('drag-hint'));
    div.addEventListener('dragover', e=> e.preventDefault());
    div.addEventListener('drop', e=>{
      e.preventDefault();
      const src = e.dataTransfer.getData('text/plain');
      if (!src || src===sn.id) return;
      moveBefore(src, sn.id);
    });

    // click / hover
    div.addEventListener('mouseenter', ()=>activate(sn.id));
    div.addEventListener('click', e=>{
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act==='edit'){ openEditor(sn.id); return; }
      if (act==='dock-toggle'){ toggleDock(sn.id); return; }
      activate(sn.id);
    });

    list.appendChild(div);
  });

  // typeset MathJax in list drawers
  queueTypeset(list);
}

export function renderPreview(){
  const prev = $('#snipPreview'); if (!prev) return;
  prev.innerHTML = compileSnippets(STATE.snips, STATE.groups, STATE.activeId);
  queueTypeset(prev);
  // scroll active into view
  const active = prev.querySelector('.pv-card.active');
  if (active) active.scrollIntoView({block:'nearest'});
}

function toggleDock(dockId){
  STATE.groups[dockId] = STATE.groups[dockId] || {collapsed:false};
  STATE.groups[dockId].collapsed = !STATE.groups[dockId].collapsed;
  renderAll();
}

function activate(id){
  STATE.activeId = id;
  // expand selected card
  $$('#snipList .snip').forEach(el=>{
    el.classList.toggle('active', el.dataset.id===id);
    if (el.dataset.id===id) el.classList.remove('collapsed');
  });
  renderPreview();
  save();
}

function moveBefore(srcId, dstId){
  const si = idxById(srcId), di = idxById(dstId);
  if (si<0||di<0) return;
  const [it] = STATE.snips.splice(si,1);
  const insertAt = (si<di) ? di-1 : di;
  STATE.snips.splice(insertAt,0,it);
  renderAll();
}

// ---------- Editor wiring ----------
function openEditor(id){
  const sn = byId(id);
  if (!sn) return;
  STATE.activeId = id;
  renderList(); // set active style
  openEditorFor(sn);
}
setEditorHandlers({
  onSave(sn){
    const i = idxById(sn.id); if (i<0) return;
    STATE.snips[i] = sn;
    renderAll();
  },
  onDuplicate(sn){
    const i = idxById(sn.id); if (i<0) return;
    const copy = structuredClone(sn);
    copy.id = uid();
    STATE.snips.splice(i+1,0,copy);
    STATE.activeId = copy.id;
    renderAll(); openEditor(copy.id);
  },
  onDelete(sn){
    const i = idxById(sn.id); if (i<0) return;
    STATE.snips.splice(i,1);
    if (STATE.activeId===sn.id) STATE.activeId = null;
    renderAll();
  },
  onMergePrev(sn){
    const i = idxById(sn.id); if (i<=0) return;
    const prev = STATE.snips[i-1];
    if (prev.type!==sn.type) return;
    prev.body = (prev.body||'') + '\n\n' + (sn.body||'');
    STATE.snips.splice(i,1);
    STATE.activeId = prev.id;
    renderAll(); openEditor(prev.id);
  },
  onMergeNext(sn){
    const i = idxById(sn.id); if (i<0 || i===STATE.snips.length-1) return;
    const next = STATE.snips[i+1];
    if (next.type!==sn.type) return;
    sn.body = (sn.body||'') + '\n\n' + (next.body||'');
    STATE.snips.splice(i+1,1);
    renderAll(); openEditor(sn.id);
  },
  onInsertMM(label='sample label'){
    const ta = $('#editorBody');
    if (!ta) return;
    const tok = `[mm|p54=60,129:104,169:"${label}"]`;
    insertAtCaret(ta, tok);
  }
});

// caret insert
function insertAtCaret(ta, text){
  const st = ta.selectionStart, en = ta.selectionEnd;
  const val = ta.value;
  ta.value = val.slice(0,st) + text + val.slice(en);
  ta.selectionStart = ta.selectionEnd = st + text.length;
  ta.dispatchEvent(new Event('input', {bubbles:true}));
}

// ---------- toolbar (add buttons) ----------
function add(type){
  const base = { id:uid(), type, title:'', body:'', dockId:null };
  const sn = TPL.seed(type, base);
  STATE.snips.push(sn);
  STATE.activeId = sn.id;
  renderAll(); openEditor(sn.id);
}

export function bootSnippets(){
  // seed on first run
  if (!load()){
    STATE.snips = [
      TPL.seed('Observation',{id:uid(),title:'LaTeX test',body:'\\[ \\zeta\\left(2\\right)=\\frac{\\pi^2}{6} \\]'}),
      TPL.seed('Observation',{id:uid(),title:'Ladder up the wall',body:'We see a family of ratios that look like roots of fractions.'}),
      TPL.seed('Hypothesis',{id:uid(),title:'√n/(n+1) relationship',body:'It appears that\n\n\\[ r_q=\\forall n\\,\\sqrt{\\frac{n}{n+1}} \\to \\{ \\sqrt{\\tfrac{1}{2}}, \\sqrt{\\tfrac{2}{3}}, \\sqrt{\\tfrac{3}{4}}, \\dots \\} \\tag{05:01} \\]'}),
      TPL.seed('Evidence',{id:uid(),title:'Figure crop + table',body:TPL.figCropTable()}),
      TPL.seed('Dock',{id:uid(),title:'This is the first Dock',body:''})
    ];
  }

  $('#btnAddObs')?.addEventListener('click', ()=>add('Observation'));
  $('#btnAddHyp')?.addEventListener('click', ()=>add('Hypothesis'));
  $('#btnAddEvi')?.addEventListener('click', ()=>add('Evidence'));
  $('#btnAddDock')?.addEventListener('click', ()=>add('Dock'));
  $('#btnInsertMM')?.addEventListener('click', ()=>{
    if (!STATE.activeId) return;
    openEditor(STATE.activeId);
    // insert handled by modal toolbar "Insert MM"
  });

  renderAll();
}

// expose for sandbox toggles if needed
export function getState(){ return STATE; }

// small util
function escapeHtml(s){ return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

