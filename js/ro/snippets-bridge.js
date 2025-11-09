// /js/ro/snippets-bridge.js
import { compileToHTML, typesetInto } from '/js/ro/snippets-compile.js';

// ---- Utilities ----
function getSnippets() {
  try { return JSON.parse(localStorage.getItem('ro_snips_v3') || '[]'); }
  catch { return []; }
}

function ensureSeed() {
  let snips = getSnippets();
  if (!snips.length) {
    snips = [{
      id: Math.random().toString(36).slice(2, 9),
      type: 'Observation',
      title: 'New Observation',
      body: 'Start your first observation here.'
    }];
    localStorage.setItem('ro_snips_v3', JSON.stringify(snips));
  }
  return snips;
}

// Convert snippet list into a single combined Markdown text
function composeMemoText() {
  const snips = ensureSeed();
  return snips
    .map(s => `<!-- ${s.type}: ${s.title} -->\n${s.body || ''}`)
    .join('\n\n---\n\n');
}

// Push composed text into Memo to Self drawer + render live preview
function updateMemoToSelf() {
  const memoTa = document.getElementById('memoBody');
  const preview = document.getElementById('memoPreview');
  if (!memoTa || !preview) return;

  const md = composeMemoText();
  memoTa.value = md;

  const html = compileToHTML(md);
  preview.innerHTML = html;
  if (typeof typesetInto === 'function') typesetInto(preview);
}

function bootBridge() {
  // Render immediately on load
  updateMemoToSelf();

  // Watch for snippet changes (localStorage events across modules)
  window.addEventListener('storage', (ev) => {
    if (ev.key === 'ro_snips_v3') updateMemoToSelf();
  });

  // Also hook into custom app events
  window.addEventListener('ro:snipsChanged', updateMemoToSelf);

  // Initial render done
  console.log('[RO] Memo bridge active (read-only Memo to Self)');
}

document.addEventListener('DOMContentLoaded', bootBridge);
