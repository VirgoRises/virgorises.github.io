/* RO Snippets modal module — modular, self-contained DOM + logic */

let SNIPS, idxOf, saveSnips, renderList, renderPreview;

// Lightweight DOM helper (module-local)
const $ = (s, r = document) => r.querySelector(s);

function bind(deps){
  ({ SNIPS, idxOf, saveSnips, renderList, renderPreview } = deps);
}

/* ---------- Public API ---------- */
function openModal(sn){
  const mask  = $('#snipMask');
  const modal = $('#snipModal');
  const h     = $('#modalTitle');
  const t     = $('#Title');
  const b     = $('#Body');

  if(!mask || !modal || !h || !t || !b){
    console.warn('[modal] DOM not found; ensure #snipMask, #snipModal, #modalTitle, #Title, #Body exist.');
    return;
  }

  // Keep EDITING public in case other modules check it
  window.EDITING = { id: sn.id };

  h.textContent = `Edit — ${String(sn.type || '').toLowerCase()}`;
  t.value = sn.title || '';
  b.value = sn.body  || '';

  mask.classList.remove('hidden');
  modal.classList.remove('hidden');

  // focus after paint
  setTimeout(()=> b.focus(), 0);
}

function closeModal(){
  const mask  = $('#snipMask');
  const modal = $('#snipModal');
  if(mask)  mask.classList.add('hidden');
  if(modal) modal.classList.add('hidden');
  window.EDITING = null;
}

function isEffectivelyEmpty(text){
  return (text || '')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')   // zero-widths
    .replace(/&nbsp;/g,' ')                 // nbsp
    .replace(/\[split\]/gi,'')              // split markers
    .replace(/^\s*([-*]){3,}\s*$/gm,'')     // pure HR lines
    .replace(/\s+/g,' ')
    .trim()
    .length === 0;
}

function updateSplitInfo(){
  const b = $('#Body'); if(!b) return;
  const n = (b.value.match(/\[split\]/g) || []).length;
  const el = $('#splitInfo'); if(el) el.textContent = `[split] markers: ${n}`;
}

function canMergeWithPrev(){
  const id = window.EDITING?.id; if(!id) return false;
  const i  = idxOf(id); if(i <= 0) return false;
  const cur = SNIPS[i], prev = SNIPS[i-1];
  return !!(prev && cur && prev.type === cur.type && cur.type !== 'Dock');
}

function canMergeWithNext(){
  const id = window.EDITING?.id; if(!id) return false;
  const i  = idxOf(id); if(i < 0 || i >= SNIPS.length-1) return false;
  const cur = SNIPS[i], next = SNIPS[i+1];
  return !!(next && cur && next.type === cur.type && cur.type !== 'Dock');
}

function updateModalMergeButtons(){
  const prevBtn = document.querySelector('[data-modal-act="merge-prev"]');
  const nextBtn = document.querySelector('[data-modal-act="merge-next"]');
  if(prevBtn) prevBtn.disabled = !canMergeWithPrev();
  if(nextBtn) nextBtn.disabled = !canMergeWithNext();
}

/* ---------- Wiring ---------- */
function wireModal(deps){
  bind(deps);

  const mask  = $('#snipMask');
  const modal = $('#snipModal');
  const title = $('#modalTitle');
  const t     = $('#Title');
  const b     = $('#Body');
  const btnClose  = $('#btnClose');
  const btnCancel = $('#btnCancel');
  const btnSave   = $('#btnSave');
  const btnSplit  = $('#btnSplit');
  const tools     = $('#modalTools');

  // Guard missing DOM once (don’t spam console)
  if(!mask || !modal || !title || !t || !b || !btnClose || !btnCancel || !btnSave || !btnSplit || !tools){
    console.warn('[modal] Some modal elements are missing; modal wiring skipped.');
    return;
  }

  btnClose.onclick  = closeModal;
  btnCancel.onclick = closeModal;
  mask.onclick      = closeModal;

  b.addEventListener('input', updateSplitInfo);

  btnSave.onclick = ()=>{
    const id = window.EDITING?.id; const i = idxOf(id);
    if(i < 0) return;
    SNIPS[i].title = t.value.trim();
    SNIPS[i].body  = b.value;
    saveSnips(); renderList(); renderPreview(); closeModal();
  };

  btnSplit.onclick = ()=>{
    const id = window.EDITING?.id; const i = idxOf(id);
    if(i < 0) return;
    const parts = (b.value || '').split(/\[split\]/i);
    if(parts.length < 2){ alert('Insert [split] where you want to split.'); return; }
    const keep = parts[0].trim();
    const rest = parts.slice(1).join('').trim();
    const type = SNIPS[i].type;
    const title = t.value.trim() || SNIPS[i].title;

    SNIPS[i].title = title;
    SNIPS[i].body  = keep;
    SNIPS.splice(i+1, 0, {
      id: Math.random().toString(36).slice(2,9),
      type, title: `${title} (cont.)`, body: rest
    });
    saveSnips(); renderList(); renderPreview(); closeModal();
  };

  tools.addEventListener('click', (e)=>{
    // Smart inserts
    const ins = e.target.closest('[data-insert]');
    if(ins){
      const map = {
        header:  `meta: chapter:[notebook/] chapter-5-chords.html para: osf-1 primary: 51 author-id (Discord …)`,
        discord: `discord: Rank r out of n (rfc) — [#dissent] ++ [#concur] — [Active|Dormant|Retracted]`,
        logic:   `**Logic construct — syllogism**\nPremise 1: If it's raining, then it's cloudy.\nPremise 2: It's raining.\nConclusion: It's cloudy.`,
        inline:  `\\\\( a^2 + b^2 = c^2 \\\\)`,
        block:   `\\\\[ \\zeta(2) = \\pi^2/6 \\\\]`,
        figure:  `<div style="display:flex;gap:12px;align-items:flex-start"><div style="--x:.4;--y:0;width:120px;aspect-ratio:1/1;position:relative;overflow:hidden;border-radius:4px;"><img src="https://virgorises.github.io/cafes/zeta-zero-cafe/notebook/figures/Figure_5.3_Triangular_numbers_-_chord_density.PNG" style="position:absolute;display:block;width:280%;height:280%;left:calc(-1*var(--x)*10%);top:calc(-1*var(--y)*10%);"></div><div style="flex:1;min-width:0"><p>Explain what the crop highlights…</p><p>\\\\[ r_q = \\\\sqrt{\\\\tfrac{n}{n+1}} \\\\]</p></div></div>\n\n`,
        mm:      `[mm|p54=60,129:104,169:"sample label"]`
      };
      const ta = $('#Body'); if(!ta) return;
      const val = map[ins.dataset.insert]; if(!val) return;
      const s = ta.selectionStart || 0, e2 = ta.selectionEnd || 0, tval = ta.value;
      ta.value = tval.slice(0,s) + val + tval.slice(e2);
      ta.focus(); ta.setSelectionRange(s + val.length, s + val.length);
      updateSplitInfo();
      return;
    }

    // Modal actions
    const actBtn = e.target.closest('[data-modal-act]');
    if(!actBtn) return;
    const act = actBtn.dataset.modalAct;

    const id = window.EDITING?.id; const i = idxOf(id);
    if(i < 0) return;
    const cur = SNIPS[i];

    if(act === 'dup'){
      const copy = { ...cur, id: Math.random().toString(36).slice(2,9) };
      SNIPS.splice(i+1, 0, copy);
      saveSnips(); renderList(); renderPreview();
      return;
    }

    if(act === 'del'){
      const live = ($('#Body')?.value || '');
      if(!isEffectivelyEmpty(live)){
        alert('Clear the snippet body first, then delete.');
        return;
      }
      if(confirm('Delete this empty snippet?')){
        SNIPS.splice(i,1);
        saveSnips(); renderList(); renderPreview(); closeModal();
      }
      return;
    }

    if(act === 'merge-prev'){
      if(!canMergeWithPrev()) return;
      const prev = SNIPS[i-1];
      prev.body = (prev.body||'') + '\n\n' + ($('#Body')?.value || '');
      prev.title = prev.title || cur.title;
      SNIPS.splice(i,1);
      saveSnips(); renderList(); renderPreview(); closeModal();
      return;
    }

    if(act === 'merge-next'){
      if(!canMergeWithNext()) return;
      const next = SNIPS[i+1];
      cur.body = ($('#Body')?.value || '') + '\n\n' + (next.body||'');
      SNIPS.splice(i+1,1);
      saveSnips(); renderList(); renderPreview();
      updateModalMergeButtons();
      return;
    }
  });

  // prime split count
  updateSplitInfo();
}

/* export the API */
export const modalAPI = { openModal, closeModal, wireModal };

