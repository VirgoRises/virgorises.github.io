// Rebuilds "Memo to Self" from snippets on every change.
// Adds dock headings ("## Title") only if the dock has non-empty content.
// Renders Markdown with window.marked.parse if present; preserves inline HTML.

import { getSnippets } from '/js/ro/snippets.js';

function q(id){ return document.getElementById(id); }

// robust renderer: prefer marked, else passthrough
function renderHtmlFromMixed(md) {
  try {
    if (window.marked && typeof window.marked.parse === 'function') {
      // keep HTML, enable GFM, avoid header IDs/mangling
      window.marked.setOptions?.({ gfm:true, headerIds:false, mangle:false, breaks:true });
      return window.marked.parse(md ?? '');
    }
  } catch {}
  return String(md ?? '');
}

function composeMemoFromSnippets() {
  const ta = q('memoBody');      // read-only textarea
  const pv = q('memoPreview');   // Preview tab
  if (!ta) return;

  const flat = (getSnippets() || []).filter(Boolean);

  const out = [];
  let currentDock = null;
  let dockHeaderQueued = false;

  const pushDockHeaderIfNeeded = () => {
    if (currentDock && dockHeaderQueued) {
      const title = String(currentDock.title || '').trim() || 'Section';
      out.push(`## ${title}`);
      dockHeaderQueued = false;
    }
  };

  for (const sn of flat) {
    const t = (sn.type || '').toLowerCase();
    if (t === 'dock') {
      currentDock = { id: sn.id, title: sn.title || '' };
      dockHeaderQueued = true;          // only emit when content follows
      continue;
    }
    const body = String(sn.body || '').trim();
    if (!body) continue;
    if (currentDock) pushDockHeaderIfNeeded();
    out.push(body);
  }

  const memoText = out.join('\n\n');

  // overwrite Memo to Self
  ta.value = memoText;

  // mirror Preview
  if (pv) {
    pv.innerHTML = renderHtmlFromMixed(memoText);
    try {
      if (window.MathJax?.typesetPromise) {
        window.MathJax.typesetClear?.([pv]);
        window.MathJax.typesetPromise([pv]).catch(()=>{});
      }
    } catch {}
  }

  window.dispatchEvent(new CustomEvent('ro:memoRebuilt', { detail: { length: memoText.length } }));
}

function bootBridge() {
  composeMemoFromSnippets();
  window.addEventListener('ro:snipsChanged', composeMemoFromSnippets);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootBridge, { once:true });
} else {
  bootBridge();
}
