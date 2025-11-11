// /js/ro/snippets.js
// Snippet state + list UI. Emits "ro:snipsChanged" on every mutation.
// Dock grouping: items after a Dock belong to that Dock until the next Dock.

import { initSnippetsModal, openSnippetModal } from '/js/ro/snippets-modal.js';

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
    SNIPS = [{
      id: rid(),
      type: 'Observation',
      title: 'New Observation',
      body: 'Start your first observation here.'
    }];
    localStorage.setItem(STORE_KEY, JSON.stringify(SNIPS)); // seed without double event
  }
}
function save() { setSnippets(SNIPS); }

// ---------- utils ----------
const rid = () => Math.random().toString(36).slice(2, 9);
const cssSafe = s => String(s).toLowerCase().replace(/[^a-z0-9_-]+/g,'-');
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

// sanitize for delete-safety
function cleanedForDelete(s){
  return String(s||'')
    .replace(/\[split\]/g,'')
    .replace(/\u00A0/g,' ')                // NBSP → space
    .replace(/[\u200B-\u200D\uFEFF]/g,'')  // zero-width chars
    .replace(/[\s\r\n]+/g,'')              // collapse all whitespace
    .trim();
}

// ---------- grouping (Dock) ----------
function groupByDock(arr) {
  const groups = [];
  let currentDock = null;

  arr.forEach(sn => {
    if ((sn.type||'').toLowerCase() === 'dock') {
      currentDock = { dock: sn, items: [] };
      groups.push(currentDock);
    } else if (currentDock) {
      currentDock.items.push(sn);
    } else {
      groups.push({ dock: null, items: [sn] });
    }
  });

  return groups;
}

// ---------- active highlight (list + preview) ----------
function markActive(id) {
  ACTIVE_ID = id || null;

  // list highlight
  document.querySelectorAll('#list .snip').forEach(el => el.classList.remove('active'));
  if (id) {
    const el = document.querySelector(`#list .snip[data-id="${CSS.escape(id)}"]`);
    if (el) {
      el.classList.add('active');
      try { el.scrollIntoView({ block:'nearest', behavior:'smooth' }); } catch {}
    }
  }

  // preview highlight
  document.querySelectorAll('#preview .pv-snip').forEach(el => el.classList.remove('active'));
  if (id) {
    const pv = document.querySelector(`#preview .pv-snip[data-id="${CSS.escape(id)}"]`);
    if (pv) pv.classList.add('active');
  }
}

// Re-apply active after any preview rebuild
window.addEventListener('ro:snipsChanged', () => {
  if (ACTIVE_ID) setTimeout(() => markActive(ACTIVE_ID), 0);
});

// ---------- render ----------
function render() {
  const list = document.getElementById('list');
  if (!list) return;
  list.innerHTML = '';

  const groups = groupByDock(SNIPS);

  groups.forEach(group => {
    if (group.dock) {
      // Render Dock header
      const d = group.dock;
      const dockEl = document.createElement('div');
      dockEl.className = 'snip';
      dockEl.classList.add(`type-${cssSafe(d.type||'dock')}`);
      dockEl.dataset.id = d.id;

      // header bar with toggle + edit
      const bar = document.createElement('div');
      bar.className = 'bar';
      const isOpen = !!d.open;

      bar.innerHTML = `
        <span class="type">${escapeHtml(d.type||'Dock')}</span>
        <span class="title" title="${escapeHtml(d.title||'')}">${escapeHtml(d.title||'')}</span>
        <div class="tools">
          <button class="icon edit" title="Edit">✎</button>
          <button class="icon toggle" title="${isOpen?'Collapse':'Expand'}">${isOpen?'▾':'▸'}</button>
        </div>
      `;
      dockEl.appendChild(bar);

      // children container
      const childWrap = document.createElement('div');
      childWrap.className = 'dock-children';
      childWrap.style.display = isOpen ? '' : 'none';
      dockEl.appendChild(childWrap);

      // toggle
      bar.querySelector('.toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        d.open = !d.open;
        save();
        render();
        markActive(d.id);
      });

      // edit Dock
      bar.querySelector('.edit').addEventListener('click', () => {
        markActive(d.id);
        editById(d.id);
      });

      // render children under dock
      group.items.forEach(sn => childWrap.appendChild(renderItem(sn)));

      // drag behavior on dock header (reorder dock block)
      dockEl.draggable = true;
      dockEl.addEventListener('dragstart', (e) => {
        const idx = SNIPS.findIndex(s => s.id === d.id);
        dragging = { id: d.id, from: idx };
        dockEl.classList.add('drag-hint');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', d.id); // needed in some browsers
      });
      dockEl.addEventListener('dragend', () => {
        dragging = null;
        dockEl.classList.remove('drag-hint');
      });
      dockEl.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
      dockEl.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!dragging || dragging.id === d.id) return;
        const from = dragging.from;
        const to   = SNIPS.findIndex(s => s.id === d.id);
        const [m] = SNIPS.splice(from, 1);
        SNIPS.splice(to, 0, m);
        save(); render();
        markActive(m.id);
      });

      // clicking the dock header marks it active
      bar.addEventListener('click', () => markActive(d.id));

      list.appendChild(dockEl);

    } else {
      // standalone items (not under any dock)
      group.items.forEach(sn => list.appendChild(renderItem(sn)));
    }
  });

  // restore highlight after re-render
  if (ACTIVE_ID) markActive(ACTIVE_ID);
}

function renderItem(sn) {
  const div = document.createElement('div');
  const type = (sn.type||'Block').trim();
  div.className = 'snip collapsed';
  div.classList.add(`type-${cssSafe(type)}`);
  div.dataset.id = sn.id;
  div.draggable = true;

  const bar = document.createElement('div');
  bar.className = 'bar';
  bar.innerHTML = `
    <span class="type">${escapeHtml(type)}</span>
    <span class="title" title="${escapeHtml(sn.title||'')}">${escapeHtml(sn.title||'')}</span>
    <div class="tools"><button class="icon edit" title="Edit">✎</button></div>`;
  div.appendChild(bar);

  const body = document.createElement('div');
  body.className = 'body';
  body.textContent = sn.body || '';
  div.appendChild(body);

  // hover expand/collapse
  div.addEventListener('mouseenter', () => div.classList.remove('collapsed'));
  div.addEventListener('mouseleave', () => div.classList.add('collapsed'));

  // select snippet (blue border + preview highlight)
  bar.addEventListener('click', () => markActive(sn.id));

  // edit
  bar.querySelector('.edit').addEventListener('click', (ev) => {
    ev.stopPropagation();
    markActive(sn.id);
    editById(sn.id);
  });

  // drag
  div.addEventListener('dragstart', (e) => {
    const idx = SNIPS.findIndex(s => s.id === sn.id);
    dragging = { id: sn.id, from: idx };
    div.classList.add('drag-hint');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sn.id); // needed in some browsers
  });
  div.addEventListener('dragend', () => {
    dragging = null;
    div.classList.remove('drag-hint');
  });
  div.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
  div.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!dragging || dragging.id === sn.id) return;
    const from = dragging.from;
    const to   = SNIPS.findIndex(s => s.id === sn.id);
    const [m] = SNIPS.splice(from, 1);
    SNIPS.splice(to, 0, m);
    save(); render();
    markActive(m.id);
  });

  // prevent drag from tool buttons
  div.querySelectorAll('.tools button').forEach(b=>{
    b.setAttribute('draggable','false');
    b.style.webkitUserDrag = 'none';
  });

  return div;
}

// ---------- edit flow ----------
function editById(id) {
  const i = SNIPS.findIndex(s => s.id === id);
  if (i < 0) return;
  const sn = SNIPS[i];

  openSnippetModal({
    snippet: sn,
    onSave: ({title, body}) => {
      const clean = String(body||'').replace(/\[split\]/g, '');
      SNIPS[i].title = String(title||'').trim();
      SNIPS[i].body  = clean;
      save(); render();
      markActive(id);
    },
    onSplit: (left, right) => {
      SNIPS[i].body = String(left||'').trim();
      const twin = { ...SNIPS[i], id: rid(), title: (SNIPS[i].title||'')+' (part 2)', body: String(right||'').trim() };
      SNIPS.splice(i+1, 0, twin);
      save(); render();
      markActive(twin.id);
    },
    onMergePrev: () => {
      if (i === 0) return;
      SNIPS[i-1].body = (SNIPS[i-1].body||'') + '\n\n' + (SNIPS[i].body||'');
      const keepId = SNIPS[i-1].id;
      SNIPS.splice(i, 1); save(); render(); markActive(keepId);
    },
    onMergeNext: () => {
      if (i >= SNIPS.length-1) return;
      SNIPS[i].body = (SNIPS[i].body||'') + '\n\n' + (SNIPS[i+1].body||'');
      SNIPS.splice(i+1, 1); save(); render(); markActive(SNIPS[i].id);
    },
    onDuplicate: () => {
      const clone = { ...SNIPS[i], id: rid(), title: (SNIPS[i].title||'') + ' (copy)' };
      SNIPS.splice(i+1, 0, clone); save(); render(); markActive(clone.id);
    },
    onDelete: (currentEditorText) => {
      const type = (SNIPS[i].type||'').toLowerCase();
      if (type === 'dock') {
        // Dock: ask confirmation (no emptiness requirement)
        if (!confirm('Delete this Dock header? (Contained snippets are left in place.)')) return;
        const delId = SNIPS[i].id;
        SNIPS.splice(i, 1);
        if (!SNIPS.length) {
          SNIPS = [{ id: rid(), type:'Observation', title:'New Observation', body:'' }];
        }
        save(); render();
        // clear active if it was the dock
        if (ACTIVE_ID === delId) markActive(null);
        return;
      }

      // regular snippet: enforce true emptiness (ignoring invisible chars and [split])
      const liveClean  = cleanedForDelete(currentEditorText);
      const savedClean = cleanedForDelete(SNIPS[i].body);
      if (liveClean.length || savedClean.length) {
        alert('Empty the snippet body first (no invisible characters), then delete.');
        return;
      }
      const delId = SNIPS[i].id;
      SNIPS.splice(i, 1);
      if (!SNIPS.length) {
        SNIPS = [{ id: rid(), type:'Observation', title:'New Observation', body:'' }];
      }
      save(); render();
      if (ACTIVE_ID === delId) markActive(null);
    }
  });
}

// ---------- add buttons (guarded against double wiring) ----------
function wireAdders() {
  if (WIRED) return; WIRED = true;

  const A = (id, type) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const handler = () => {
      const sn = { id: rid(), type, title:'', body:'' };
      SNIPS.push(sn);
      save(); render(); markActive(sn.id);
    };
    btn.addEventListener('click', handler, { once:false });
  };
  A('btnAddObs','Observation');
  A('btnAddHyp','Hypothesis');
  A('btnAddEv','Evidence');
  A('btnAddDock','Dock');
}

// ---------- boot ----------
export function initSnippetsApp() {
  if (INIT) return; INIT = true;
  load();
  render();
  wireAdders();
  initSnippetsModal();
  console.log('[RO] Snippets ready (dock grouping, active highlight, delete-safety, DnD)');
}
document.addEventListener('DOMContentLoaded', initSnippetsApp);
