// snippets-bridge.js
// Compose Memo-to-Self (read-only) from snippets, update preview.

import { compileToHTML, typesetInto } from '/js/ro/snippets-compile.js';
import { getSnippets } from '/js/ro/snippets.js';

function ensureSeed(arr) {
  if (arr && arr.length) return arr;
  return [{
    id: Math.random().toString(36).slice(2, 9),
    type: 'Observation',
    title: 'New Observation',
    body: 'Start your first observation here.'
  }];
}

function composeMemoText(snips) {
  return (snips||[])
    .map(s => `<!-- ${s.type||'Block'}: ${s.title||''} -->\n${(s.body||'').trim()}`)
    .join('\n\n---\n\n');
}

function renderMemo() {
  const memoTa = document.getElementById('memoBody');
  const preview = document.getElementById('memoPreview');
  if (!memoTa || !preview) return;

  const snips = ensureSeed(getSnippets());
  const md = composeMemoText(snips);

  memoTa.value = md;
  preview.innerHTML = compileToHTML(md);
  typesetInto(preview);
}

function boot() {
  renderMemo();
  window.addEventListener('ro:snipsChanged', renderMemo);
  window.addEventListener('storage', (ev) => {
    if (ev.key === 'ro_snips_v3') renderMemo();
  });
  console.log('[RO] Memo bridge active');
}
document.addEventListener('DOMContentLoaded', boot);
