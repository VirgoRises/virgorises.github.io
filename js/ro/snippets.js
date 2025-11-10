// snippets.js
// Snippet state + list UI. Emits "ro:snipsChanged" on every mutation.

const STORE_KEY = 'ro_snips_v3';
let SNIPS = [];
let dragging = null;

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
    setSnipsLocalOnly(SNIPS); // don’t double-emit on first load
  }
}
function setSnipsLocalOnly(arr){ localStorage.setItem(STORE_KEY, JSON.stringify(arr||[])); }
function save() { setSnippets(SNIPS); }

// ---------- utils ----------
const rid = () => Math.random().toString(36).slice(2, 9);
const cssSafe = s => String(s).toLowerCase().replace(/[^a-z0-9_-]+/g,'-');
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

// ---------- modal handshake (provided by snippets-modal.js) ----------
import { initSnippetsModal, openSnippetModal } from '/js/ro/snippets-modal.js';

// ---------- render ----------
function render() {
  const list = document.getElementById('list');
  if (!list) return;
  list.innerHTML = '';
  SNIPS.forEach((sn, idx) => {
    const type = (sn.type || 'Block').trim();
    const div = document.createElement('div');
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

    // edit
    bar.querySelector('.edit').addEventListener('click', () => edit(sn.id));

    // drag handlers
    div.addEventListener('dragstart', (e) => {
      dragging = { id: sn.id, from: idx };
      div.classList.add('drag-hint');
      e.dataTransfer.effectAllowed = 'move';
    });
    div.addEventListener('dragend', () => {
      dragging = null;
      div.classList.remove('drag-hint');
    });
    div.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    div.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragging || dragging.id === sn.id) return;
      const [m] = SNIPS.splice(dragging.from, 1);
      const to = idx + (dragging.from < idx ? 1 : 0);
      SNIPS.splice(to, 0, m);
      save(); render();
    });

    // prevent drag from tool buttons
    div.querySelectorAll('.tools button').forEach(b=>{
      b.setAttribute('draggable','false');
      b.style.webkitUserDrag = 'none';
    });

    list.appendChild(div);
  });
}

function edit(id) {
  const i = SNIPS.findIndex(s => s.id === id);
  if (i < 0) return;
  openSnippetModal({
    snippet: SNIPS[i],
    onSave: ({title, body}) => {
      // strip leftover [split]
      const clean = String(body||'').replace(/\[split\]/g, '');
      SNIPS[i].title = String(title||'').trim();
      SNIPS[i].body  = clean;
      save(); render();
    },
    onSplit: (left, right) => {
      SNIPS[i].body = left.trim();
      const twin = { ...SNIPS[i], id: rid(), title: (SNIPS[i].title||'')+' (part 2)', body: right.trim() };
      SNIPS.splice(i+1, 0, twin);
      save(); render();
    },
    onMergePrev: () => {
      if (i === 0) return;
      SNIPS[i-1].body = (SNIPS[i-1].body||'') + '\n\n' + (SNIPS[i].body||'');
      SNIPS.splice(i, 1); save(); render();
    },
    onMergeNext: () => {
      if (i >= SNIPS.length-1) return;
      SNIPS[i].body = (SNIPS[i].body||'') + '\n\n' + (SNIPS[i+1].body||'');
      SNIPS.splice(i+1, 1); save(); render();
    },
    onDuplicate: () => {
      const clone = { ...SNIPS[i], id: rid(), title: (SNIPS[i].title||'') + ' (copy)' };
      SNIPS.splice(i+1, 0, clone); save(); render();
    },
    onDelete: () => {
      // require empty body first (safety)
      if ((SNIPS[i].body||'').trim().length) {
        alert('Empty the snippet body first, then delete.');
        return;
      }
      SNIPS.splice(i, 1);
      if (!SNIPS.length) {
        SNIPS = [{ id: rid(), type:'Observation', title:'New Observation', body:'' }];
      }
      save(); render();
    }
  });
}

// top bar add buttons
function wireAdders() {
  const A = (id, type) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      SNIPS.push({ id: rid(), type, title:'', body:'' });
      save(); render();
    });
  };
  A('btnAddObs','Observation');
  A('btnAddHyp','Hypothesis');
  A('btnAddEv','Evidence');
  A('btnAddDock','Dock');
}

// boot
export function initSnippetsApp() {
  load();
  render();
  wireAdders();
  initSnippetsModal(); // ensure modal is wired once
  console.log('[RO] Snippets ready');
}
