// /js/ro/snippets.js
// Core list/preview rendering + tiny modal editor.
// Relies on: snippets-compile.js

import { mdToHtml, queueTypeset } from '/js/ro/snippets-compile.js';

// ---------------------------------
// state + utils
// ---------------------------------
const STORE_KEY = 'ro_snips_v3';
let SNIPS = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
let ACTIVE_ID = SNIPS[0]?.id || null;

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9);
const save = () => localStorage.setItem(STORE_KEY, JSON.stringify(SNIPS));
const escapeHtml = s => (s||'').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

// seed so the page isn’t empty
function ensureSeed() {
  if (SNIPS.length) return;
  SNIPS = [
    { id: uid(), type: 'Observation', title: 'LaTeX test',
      body: '\\[ \\zeta(2)=\\tfrac{\\pi^2}{6} \\]' },

    { id: uid(), type: 'Observation', title: 'Ladder up the wall',
      body: 'We see a family of ratios that look like roots of fractions.' },

    { id: uid(), type: 'Hypothesis', title: '√n/(n+1) relationship',
      body: 'It appears that \\[ r_q = \\forall n\\,\\sqrt{\\frac{n}{n+1}} \\to \\{ \\sqrt{\\tfrac{1}{2}}, \\sqrt{\\tfrac{2}{3}}, \\sqrt{\\tfrac{3}{4}}, \\dots \\} \\tag{05:01} \\]' },

    { id: uid(), type: 'Evidence', title: 'Figure crop + table', body: `
<table style="width:100%; table-layout:fixed; border-collapse:collapse;">
  <colgroup><col style="width:120px;"><col></colgroup>
  <tbody><tr>
    <td style="padding:0;vertical-align:top;">
      <div style="--x:.4;--y:0;width:100%;aspect-ratio:1/1;position:relative;overflow:hidden;border-radius:4px;">
        <img src="https://virgorises.github.io/cafes/zeta-zero-cafe/notebook/figures/Figure_5.3_Triangular_numbers_-_chord_density.PNG"
             alt="" style="position:absolute;display:block;width:280%;height:280%;left:calc(-1*var(--x)*10%);top:calc(-1*var(--y)*10%);">
      </div>
    </td>
    <td style="padding:8px 9px;vertical-align:top;">
      <table style="width:100%;border-collapse:collapse;margin:0;">
        <thead><tr>
          <th style="text-align:left;border:1px solid #273341;padding:6px 8px;">n</th>
          <th style="text-align:left;border:1px solid #273341;padding:6px 8px;">math</th>
        </tr></thead>
        <tbody><tr>
          <td style="border:1px solid #273341;padding:6px 8px;">1</td>
          <td style="border:1px solid #273341;padding:6px 8px;">\\[ r_q=\\forall n\\,\\sqrt{\\frac{n}{n+1}} \\to \\{ \\sqrt{\\tfrac{1}{2}}, \\sqrt{\\tfrac{2}{3}}, \\sqrt{\\tfrac{3}{4}}, \\dots \\} \\tag{05:01} \\]</td>
        </tr></tbody>
      </table>
    </td>
  </tr></tbody>
</table>`.trim() }
  ];
  ACTIVE_ID = SNIPS[0].id;
  save();
}

function typeColor(t){
  return t==='Observation' ? '#2e7dbb'
       : t==='Hypothesis'  ? '#6a9d28'
       : t==='Evidence'    ? '#b07a0a'
       : '#3a4556';
}

// ---------------------------------
// rendering
// ---------------------------------
function renderList() {
  const root = $('#list');
  root.innerHTML = '';

  SNIPS.forEach(sn => {
    const wrap = document.createElement('div');
    wrap.className = 'snip collapsed' + (sn.id===ACTIVE_ID ? ' active' : '');
    wrap.dataset.id = sn.id;
    wrap.innerHTML = `
      <div class="bar" style="border-left:6px solid ${typeColor(sn.type)}">
        <div class="left">
          <span class="badge">${sn.type}</span>
          <span class="title">${escapeHtml(sn.title||'')}</span>
        </div>
        <div class="tools">
          <button class="btn" data-act="edit" title="Edit">✏️</button>
        </div>
      </div>
      <div class="body">${mdToHtml(sn.body || '')}</div>
    `;
    root.appendChild(wrap);

    // hover-to-expand
    wrap.addEventListener('mouseenter', ()=>wrap.classList.remove('collapsed'));
    wrap.addEventListener('mouseleave', ()=>{
      if (sn.id!==ACTIVE_ID) wrap.classList.add('collapsed');
    });
  });

  // typeset math in list
  queueTypeset(root);
}

function renderPreview() {
  const pv = $('#preview');
  pv.innerHTML = '';

  SNIPS.forEach(sn => {
    const c = document.createElement('div');
    c.className = 'pv-snip' + (sn.id===ACTIVE_ID ? ' active' : '');
    c.innerHTML = `
      <div class="head">
        <span class="badge">${sn.type}</span><strong>${escapeHtml(sn.title||'')}</strong>
      </div>
      <div class="body">${mdToHtml(sn.body || '')}</div>
    `;
    pv.appendChild(c);
  });

  // typeset math in preview
  queueTypeset(pv);
}

// ---------------------------------
// interactions
// ---------------------------------
function wireToolbar() {
  $('#btnAddObs').onclick = ()=>addSnip('Observation');
  $('#btnAddHyp').onclick = ()=>addSnip('Hypothesis');
  $('#btnAddEvi').onclick = ()=>addSnip('Evidence');
  $('#btnExport').onclick = exportMemo;
  $('#btnFocus').onclick = ()=>$('#preview')?.scrollIntoView({behavior:'smooth',block:'start'});
}

function wireListClicks() {
  $('#list').addEventListener('click', e=>{
    const card = e.target.closest('.snip'); if(!card) return;
    const id   = card.dataset.id;
    const idx  = SNIPS.findIndex(x=>x.id===id);
    if (idx<0) return;

    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'edit') {
      openEditModal(SNIPS[idx], sn=>{
        SNIPS[idx] = { ...SNIPS[idx], ...sn };
        ACTIVE_ID = SNIPS[idx].id;
        save(); renderList(); renderPreview();
      });
      return;
    }

    // select
    ACTIVE_ID = id;
    renderList(); renderPreview();
  });
}

// ---------------------------------
// small modal editor (inline)
// ---------------------------------
function openEditModal(sn, onSave){
  const back = $('#modalBack');
  const ipt  = $('#mTitle');
  const ta   = $('#mBody');
  const btnSave  = $('#modalSave');
  const btnCancel= $('#modalCancel');
  const btnClose = $('#modalClose');
  const btnSplit = $('#modalSplit');

  ipt.value = sn.title || '';
  ta.value  = sn.body  || '';
  back.style.display = 'flex';
  ipt.focus();

  function cleanup(){
    back.style.display = 'none';
    btnSave.onclick = btnCancel.onclick = btnClose.onclick = btnSplit.onclick = null;
  }

  btnSave.onclick = ()=>{
    const body = ta.value.replace(/\[split\]/gi,'').trim();
    const title= ipt.value.trim();
    cleanup();
    onSave({ title, body });
  };
  btnCancel.onclick = btnClose.onclick = ()=>cleanup();

  btnSplit.onclick = ()=>{
    if(!/\[split\]/i.test(ta.value)) { alert('Insert [split] in the body where you want to split.'); return; }
    const [partA, partB] = ta.value.split(/\[split\]/i);
    // overwrite current, insert sibling after
    sn.title = ipt.value.trim();
    sn.body  = (partA||'').trim();
    const newSn = { ...sn, id: uid(), title: (sn.title||'') + ' (cont.)', body: (partB||'').trim() };
    const i = SNIPS.findIndex(x=>x.id===sn.id);
    SNIPS.splice(i+1, 0, newSn);
    save();
    cleanup();
    ACTIVE_ID = newSn.id;
    renderList(); renderPreview();
  };
}

// ---------------------------------
// helpers
// ---------------------------------
function addSnip(type){
  const sn = { id: uid(), type, title: type+' title', body: '' };
  SNIPS.push(sn);
  ACTIVE_ID = sn.id;
  save(); renderList(); renderPreview();
}

function exportMemo(){
  const text = SNIPS.map(s=>`[${s.type}] ${s.title}\n\n${s.body}\n`).join('\n\n---\n\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type:'text/plain'}));
  a.download = 'memo.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------------------------------
// boot
// ---------------------------------
ensureSeed();
wireToolbar();
wireListClicks();
renderList();
renderPreview();
