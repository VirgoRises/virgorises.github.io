/* RO Snippets — core controller (modular, v3)
   Restores v2 behaviour with modules:
   - two-column grid, hover-to-open
   - dock headers + collapse
   - drag-reorder (list + preview stay in sync)
   - modal editor with smart inserts + merge/dup/delete
   - MathJax typeset in list and preview
*/

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2,9);

const STORE = { KEY: 'ro_snips_v3', GROUPS: 'ro_snips_v3_groups' };

let SNIPS=[], GROUPS={}, ACTIVE=null, EDITING=null;

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
function idxOf(id){ return SNIPS.findIndex(s=>s.id===id); }

/* compute dock membership to drive show/hide */
function computeMembership(){
  let currentDockId=null;
  return SNIPS.map(sn=>{
    if(sn.type==='Dock'){ currentDockId=sn.id; return {id:sn.id,type:sn.type,dockId:null}; }
    return {id:sn.id,type:sn.type,dockId:currentDockId};
  });
}

/* ---------------- MathJax ---------------- */
function queueTypeset(scope){
  if(!window.MathJax || !MathJax.typesetPromise) return;
  try{
    MathJax.typesetClear && MathJax.typesetClear([scope]);
    MathJax.typesetPromise([scope]);
  }catch{}
}

/* ---------------- seed ---------------- */
function ensureSeed(){
  SNIPS   = JSON.parse(localStorage.getItem(STORE.KEY)    || '[]');
  GROUPS  = JSON.parse(localStorage.getItem(STORE.GROUPS) || '{}');
  if(SNIPS.length){ ACTIVE = SNIPS[0]?.id || null; return; }

  SNIPS = [
    {id:uid(), type:'Observation', title:'LaTeX test', body:'\\\\[ \\zeta\\left(2\\right)=\\frac{\\pi^2}{6} \\\\]'},
    {id:uid(), type:'Observation', title:'Ladder up the wall', body:'We see a family of ratios that look like roots of fractions.'},
    {id:uid(), type:'Hypothesis',  title:'√n/(n+1) relationship', body:'It appears that \\\\[ r_q = \\forall n\\,\\sqrt{\\frac{n}{n+1}} \\to \\{ \\sqrt{\\tfrac{1}{2}}, \\sqrt{\\tfrac{2}{3}}, \\sqrt{\\tfrac{3}{4}}, \\dots \\} \\tag{05:01} \\\\]'},
    {id:uid(), type:'Evidence',    title:'Figure crop + table', body:`
<table style="width:100%; table-layout:fixed; border-collapse:collapse;">
  <colgroup><col style="width:120px;"><col></colgroup>
  <tbody><tr>
    <td style="padding:0; vertical-align:top;">
      <div style="--x:.4; --y:0; width:100%; aspect-ratio:1/1; position:relative; overflow:hidden; border-radius:4px;">
        <img src="https://virgorises.github.io/cafes/zeta-zero-cafe/notebook/figures/Figure_5.3_Triangular_numbers_-_chord_density.PNG"
             alt="" style="position:absolute; display:block; width:280%; height:280%; left:calc(-1 * var(--x) * 10%); top:calc(-1 * var(--y) * 10%);"/>
      </div>
    </td>
    <td style="padding:8px 9px; vertical-align:top;">
      <table style="width:100%; border-collapse:collapse; margin:0;">
        <thead><tr>
          <th style="text-align:left; border:1px solid #273341; padding:6px 8px;">n</th>
          <th style="text-align:left; border:1px solid #273341; padding:6px 8px;">math</th>
        </tr></thead>
        <tbody><tr>
          <td style="border:1px solid #273341; padding:6px 8px;">1</td>
          <td style="border:1px solid #273341; padding:6px 8px;">\\[ r_q=\\forall n\\,\\sqrt{\\frac{n}{n+1}} \\to \\{ \\sqrt{\\tfrac{1}{2}}, \\sqrt{\\tfrac{2}{3}}, \\sqrt{\\tfrac{3}{4}}, \\dots \\} \\tag{05:01} \\]</td>
        </tr></tbody>
      </table>
    </td>
  </tr></tbody>
</table>`}
  ];
  ACTIVE = SNIPS[0].id;
  saveSnips();
}

/* ---------------- render: list ---------------- */
function renderList(){
  const list = $('#list'); list.innerHTML='';
  const membership = computeMembership();

  SNIPS.forEach((sn, idx) => {
    const isActive = sn.id===ACTIVE;
    const isDock   = sn.type==='Dock';

    const row = document.createElement('div');
    row.className = 'snip' + (isActive ? ' active' : ' collapsed') + (isDock?' dock':'');
    row.dataset.id  = sn.id;
    row.dataset.idx = idx;
    row.draggable = true;

    row.innerHTML = `
      <div class="bar" style="border-left:6px solid ${typeColor(sn.type)}">
        <div class="left">
          <span class="badge">${sn.type}</span>
          <span class="title">${escapeHtml(sn.title||'')}</span>
        </div>
        <div class="tools">
          ${isDock ? `<button class="btn" data-act="dock-toggle">${GROUPS[sn.id]?.collapsed?'Expand':'Collapse'}</button>`:''}
          <button class="btn" data-act="edit" title="Edit">✏️</button>
        </div>
      </div>
      <div class="body">${sn.body || ''}</div>
    `;

    // stop drag starting from buttons/icons
    row.querySelectorAll('.tools button').forEach(b=>{
      b.setAttribute('draggable','false');
      b.style.webkitUserDrag='none';
    });

    // group-member visibility
    const gid = membership[idx].dockId;
    if(gid){
      row.classList.add('group-member');
      if(GROUPS[gid]?.collapsed) row.classList.add('hidden');
    }

    list.appendChild(row);
  });

  queueTypeset(list);
}

/* ---------------- render: preview ---------------- */
function renderPreview(){
  const pv = $('#preview'); pv.innerHTML='';
  const membership = computeMembership();

  SNIPS.forEach((sn, idx) => {
    const card = document.createElement('div');
    card.className = 'pv-snip' + (sn.id===ACTIVE?' active':'');
    card.innerHTML = `
      <div class="head">
        <span class="badge">${sn.type}</span>
        <strong class="title">${escapeHtml(sn.title||'')}</strong>
      </div>
      <div class="body">${(window.mdToHtml?window.mdToHtml(sn.body):(sn.body||''))}</div>
    `;

    const gid = membership[idx].dockId;
    if(gid && GROUPS[gid]?.collapsed){
      card.classList.add('group-member','hidden');
      card.style.display='none';
    }
    pv.appendChild(card);
  });

  queueTypeset(pv);
}

/* ---------------- events: list ---------------- */
function wireListEvents(){
  // click selection + tools
  $('#list').addEventListener('click', (ev)=>{
    const card = ev.target.closest('.snip'); if(!card) return;
    const id   = card.dataset.id;
    const btn  = ev.target.closest('[data-act]');
    const i    = idxOf(id); if(i<0) return;
    const sn   = SNIPS[i];

    if(btn){
      const act = btn.dataset.act;
      if(act==='edit'){ openModal(sn); return; }
      if(act==='dock-toggle' && sn.type==='Dock'){
        (GROUPS[sn.id] ||= {collapsed:false}).collapsed = !GROUPS[sn.id].collapsed;
        saveGroups(); renderList(); renderPreview(); return;
      }
      return;
    }

    ACTIVE = id;
    renderList(); renderPreview(); saveSnips();
    card.scrollIntoView({block:'center', behavior:'smooth'});
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
  $('#list').addEventListener('dragend', ()=> $$('.snip.drag-hint').forEach(x=>x.classList.remove('drag-hint')) );

  $('#list').addEventListener('dragover', (e)=>{
    e.preventDefault();
    const over = e.target.closest('.snip'); if(!over) return;
    const overIdx = idxOf(over.dataset.id);
    if(overIdx<0 || dragIndex<0 || overIdx===dragIndex) return;

    const rect = over.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height/2;

    const moving = SNIPS.splice(dragIndex,1)[0];
    let insertAt = overIdx + (before?0:1);
    if(insertAt<0) insertAt=0;
    SNIPS.splice(insertAt,0,moving);
    dragIndex = insertAt;

    saveSnips(); renderList(); renderPreview();
  });
}

/* ---------------- modal ---------------- */
function openModal(sn){
  EDITING = {id:sn.id};
  $('#modalTitle').textContent = `Edit — ${sn.type.toLowerCase()}`;
  $('#Title').value = sn.title || '';
  $('#Body').value  = sn.body  || '';
  updateSplitInfo(); updateModalMergeButtons();

  $('#snipMask').classList.remove('hidden');
  $('#snipModal').classList.remove('hidden');
  setTimeout(()=>$('#Body').focus(),0);
}
function closeModal(){
  EDITING=null;
  $('#snipMask').classList.add('hidden');
  $('#snipModal').classList.add('hidden');
}
function updateSplitInfo(){
  const b = $('#Body').value||'';
  const n = (b.match(/\[split\]/g)||[]).length;
  $('#splitInfo').textContent = `[split] markers: ${n}`;
}
function updateModalMergeButtons(){
  const bar = $('#modalTools');
  const i   = idxOf(EDITING?.id);
  if(i<0){ bar.querySelectorAll('[data-modal-act^="merge"]').forEach(x=>x.disabled=true); return; }
  const cur = SNIPS[i];
  const p = SNIPS[i-1], n = SNIPS[i+1];
  const canPrev = i>0 && p && p.type===cur.type && cur.type!=='Dock';
  const canNext = i<SNIPS.length-1 && n && n.type===cur.type && cur.type!=='Dock';
  bar.querySelector('[data-modal-act="merge-prev"]').disabled=!canPrev;
  bar.querySelector('[data-modal-act="merge-next"]').disabled=!canNext;
}

function wireModal(){
  $('#btnClose').onclick = closeModal;
  $('#btnCancel').onclick = closeModal;
  $('#snipMask').onclick  = closeModal;
  $('#Body').addEventListener('input', updateSplitInfo);

  $('#btnSave').onclick = ()=>{
    if(!EDITING) return;
    const i = idxOf(EDITING.id); if(i<0) return;
    SNIPS[i].title = $('#Title').value.trim();
    SNIPS[i].body  = $('#Body').value;
    saveSnips(); renderList(); renderPreview(); closeModal();
  };

  $('#btnSplit').onclick = ()=>{
    if(!EDITING) return;
    const i = idxOf(EDITING.id); if(i<0) return;
    const t = $('#Title').value.trim();
    const parts = ($('#Body').value||'').split(/\[split\]/i);
    if(parts.length<2){ alert('Insert [split] where you want to split.'); return; }
    SNIPS[i].title = t || SNIPS[i].title;
    SNIPS[i].body  = parts[0].trim();
    const rest = parts.slice(1).join('').trim();
    SNIPS.splice(i+1,0,{ id:uid(), type:SNIPS[i].type, title:t?`${t} (cont.)`:SNIPS[i].title, body:rest });
    ACTIVE = SNIPS[i].id;
    saveSnips(); renderList(); renderPreview();
    closeModal(); openModal(SNIPS[i]);
  };

  // smart inserts + modal actions (merge/dup/delete)
  $('#modalTools').addEventListener('click', (e)=>{
    const insertBtn = e.target.closest('[data-insert]');
    if(insertBtn){
      const map = {
        header:  `meta: chapter:[notebook/] chapter-5-chords.html para: osf-1 primary: 51 author-id (Discord …)`,
        discord: `discord: Rank r out of n (rfc) — [#dissent] ++ [#concur] — [Active|Dormant|Retracted]`,
        logic:   `**Logic construct — syllogism** Premise 1: If it's raining, then it's cloudy.\nPremise 2: It's raining.\nConclusion: It's cloudy.`,
        inline:  `\\\\( x^2 \\ge x^2 \\\\)`,
        block:   `\\\\[ x = e^{\\pi i} + 2 \\\\]`,
        figure:  `<table style="width:100%; table-layout:fixed; border-collapse:collapse;">
  <colgroup><col style="width:120px;"><col></colgroup>
  <tbody><tr>
    <td style="padding:0; vertical-align:top;">
      <div style="--x:.4; --y:0; width:100%; aspect-ratio:1/1; position:relative; overflow:hidden; border-radius:4px;">
        <img src="https://virgorises.github.io/cafes/zeta-zero-cafe/notebook/figures/Figure_5.3_Triangular_numbers_-_chord_density.PNG"
             alt="" style="position:absolute; display:block; width:280%; height:280%; left:calc(-1 * var(--x) * 10%); top:calc(-1 * var(--y) * 10%);"/>
      </div>
    </td>
    <td style="padding:8px 9px; vertical-align:top;">
      <table style="width:100%; border-collapse:collapse; margin:0;">
        <thead><tr>
          <th style="text-align:left; border:1px solid #273341; padding:6px 8px;">n</th>
          <th style="text-align:left; border:1px solid #273341; padding:6px 8px;">math</th>
        </tr></thead>
        <tbody><tr>
          <td style="border:1px solid #273341; padding:6px 8px;">1</td>
          <td style="border:1px solid #273341; padding:6px 8px;">\\\\[ r_q=\\\\forall n\\\\,\\\\sqrt{\\\\frac{n}{n+1}} \\to \\{ \\\\sqrt{\\\\tfrac{1}{2}}, \\\\sqrt{\\\\tfrac{2}{3}}, \\\\sqrt{\\\\tfrac{3}{4}}, \\\\dots \\} \\\\tag{05:01} \\\\]</td>
        </tr></tbody>
      </table>
    </td>
  </tr></tbody>
</table>`,
        mm:      `[mm|p54=60,129:104,169:"sample label"]`
      };
      const ta = $('#Body'); const val = map[insertBtn.dataset.insert]; if(!val) return;
      const s = ta.selectionStart||0, e = ta.selectionEnd||0, t = ta.value;
      ta.value = t.slice(0,s) + val + t.slice(e);
      ta.focus(); ta.setSelectionRange(s+val.length, s+val.length);
      updateSplitInfo();
      return;
    }

    const actBtn = e.target.closest('[data-modal-act]'); if(!actBtn) return;
    const act = actBtn.dataset.modalAct;
    const i = idxOf(EDITING?.id); if(i<0) return;
    const cur = SNIPS[i];

    if(act==='dup'){
      const copy = {...cur, id:uid()};
      SNIPS.splice(i+1,0,copy);
      saveSnips(); renderList(); renderPreview();
      return;
    }
    if(act==='del'){
      if((cur.body||'').trim()!==''){ alert('Clear the snippet body first, then delete.'); return; }
      if(confirm('Delete this empty snippet?')){
        SNIPS.splice(i,1);
        ACTIVE = SNIPS[i]?.id || SNIPS[i-1]?.id || null;
        saveSnips(); renderList(); renderPreview(); closeModal();
      }
      return;
    }
    if(act==='merge-prev'){
      const prev = SNIPS[i-1];
      if(i>0 && prev && prev.type===cur.type && cur.type!=='Dock'){
        prev.body = (prev.body||'') + '\n\n' + ($('#Body').value||'');
        prev.title = prev.title || cur.title;
        SNIPS.splice(i,1);
        ACTIVE = prev.id;
        saveSnips(); renderList(); renderPreview(); closeModal(); openModal(prev);
      }
      return;
    }
    if(act==='merge-next'){
      const next = SNIPS[i+1];
      if(next && next.type===cur.type && cur.type!=='Dock'){
        cur.body = ($('#Body').value||'') + '\n\n' + (next.body||'');
        SNIPS.splice(i+1,1);
        ACTIVE = cur.id;
        saveSnips(); renderList(); renderPreview(); updateModalMergeButtons();
      }
      return;
    }
  });
}

/* ---------------- topbar ---------------- */
function wireTopbar(){
  const add = (type)=>{
    const s={id:uid(),type,title:'',body:''};
    SNIPS.push(s); ACTIVE=s.id;
    saveSnips(); renderList(); renderPreview(); openModal(s);
  };
  $('#btnAddObs').onclick = ()=>add('Observation');
  $('#btnAddHyp').onclick = ()=>add('Hypothesis');
  $('#btnAddEv').onclick  = ()=>add('Evidence');
  $('#btnAddDock').onclick= ()=>{ const s={id:uid(),type:'Dock',title:'New Dock',body:''}; SNIPS.push(s); ACTIVE=s.id; saveSnips(); renderList(); renderPreview(); };

  $('#btnInsertMM').onclick = ()=>alert('MM insert lives in the modal now (Insert MM).');

  $('#btnExport').onclick = ()=>{
    const blob = new Blob([ SNIPS.map(s=>`<!-- ${s.type}: ${s.title}\n-->\n${s.body}\n`).join('\n\n') ], {type:'text/plain'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='memo.txt'; a.click();
  };

  $('#btnPop').onclick = ()=>{
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
<script>document.addEventListener('DOMContentLoaded',()=>{ setTimeout(()=>{ if(window.MathJax) MathJax.typesetPromise && MathJax.typesetPromise(); },0); });<\/script>`;
    w.document.write(html);
    w.document.close();
  };
}

/* ---------------- helpers + boot ---------------- */
function escapeHtml(s){ return (s||'').replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

export function initSnippetsApp(){
  ensureSeed();
  renderList();
  renderPreview();
  wireListEvents();
  wireModal();
  wireTopbar();
  // modal hidden by CSS .hidden; no stray modal at load
}
