// /js/ro/snippets-bridge.js
// Glue between the Snippets editor (“Memo to order”) and the canonical
// “Memo to Self” drawer. No black boxes; uses the same compile pipeline.

import { compileToHTML, typesetInto } from '/js/ro/snippets-compile.js';

// ---- utilities ----
function getSnippets() {
  try { return JSON.parse(localStorage.getItem('ro_snips_v3') || '[]'); }
  catch { return []; }
}

// Compose a single RFC body from current snippets (Markdown/HTML mix).
// We add lightweight separators so the resulting memo is readable/editable.
function composeMemoText() {
  const snips = getSnippets() || [];
  // Example structure: comment header + body, separated by a horizontal rule
  return snips
    .filter(Boolean)
    .map(s => {
      const head = `<!-- ${s.type || 'Block'}: ${s.title || ''} -->`;
      const body = (s.body || '').trim();
      return body ? `${head}\n${body}` : head;
    })
    .join('\n\n---\n\n');
}

// Update the page-level “Preview” beneath the tabs to mirror Memo to Self.
function refreshMemoPreview() {
  const preview = document.getElementById('memoPreview');
  const memoTa  = document.getElementById('memoBody');
  if (!preview || !memoTa) return;

  const html = compileToHTML(memoTa.value || '');
  preview.innerHTML = html;
  if (typeof typesetInto === 'function') typesetInto(preview);
}

// Toggle the right column “combined” preview for snippets (optional)
function toggleSnipPreview(show) {
  const col = document.getElementById('snipPreviewCol');
  const out = document.getElementById('preview');
  if (!col || !out) return;
  col.style.display = show ? 'block' : 'none';

  if (show) {
    try {
      const md = composeMemoText();
      out.innerHTML = compileToHTML(md);
      if (typeof typesetInto === 'function') typesetInto(out);
    } catch (e) {
      out.innerHTML = `<div class="warn">Preview error: ${String(e)}</div>`;
    }
  } else {
    out.innerHTML = '';
  }
}

function bootBridge() {
  const btnToMemo = document.getElementById('btnToMemo');
  const btnPrev   = document.getElementById('btnPreviewCombined');
  const memoTa    = document.getElementById('memoBody');

  if (btnToMemo) {
    btnToMemo.addEventListener('click', () => {
      const md = composeMemoText();   // snippets → markdown-ish text
      if (memoTa) memoTa.value = md;

      // Let the rest of the app react (autosave/status/preview listeners)
      window.dispatchEvent(new CustomEvent('ro:memoChanged'));

      refreshMemoPreview();
    });
  }

  if (btnPrev) {
    let shown = false;
    btnPrev.addEventListener('click', () => {
      shown = !shown;
      toggleSnipPreview(shown);
      btnPrev.textContent = shown ? 'Hide combined' : 'Preview combined';
    });
  }

  if (memoTa) {
    memoTa.addEventListener('input', refreshMemoPreview);
  }
  window.addEventListener('ro:memoChanged', refreshMemoPreview);

  // Initial paint (handles restored memo text on load)
  refreshMemoPreview();
}

document.addEventListener('DOMContentLoaded', bootBridge);
