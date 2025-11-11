// /js/ro/snippets-bridge.js
// Rebuilds "Memo to Self" from snippets on every change.
// Adds tasteful dock headings: "## {Dock Title}" only if that dock has content.
// No separators are introduced; memo is fully overwritten each time.

import { getSnippets } from '/js/ro/snippets.js';
import * as Comp from '/js/ro/snippets-compile.js';

// Resolve a compiler function regardless of export name
const asHtml =
  Comp.mdToHtml ||
  Comp.compileToHtml ||
  Comp.toHtml ||
  Comp.renderMixed ||
  Comp.render ||
  ((s) => String(s)); // fallback: identity

function q(id){ return document.getElementById(id); }

function composeMemoFromSnippets() {
  const ta = q('memoBody');      // read-only textarea
  const pv = q('memoPreview');   // preview container
  if (!ta) return;

  const flat = (getSnippets() || []).filter(Boolean);

  const out = [];
  let currentDock = null;        // { id, title }
  let dockHeaderQueued = false;  // header pending until first real content

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
      dockHeaderQueued = true;   // only emit when content follows
      continue;
    }

    const body = String(sn.body || '').trim();
    if (!body) continue;

    if (currentDock) pushDockHeaderIfNeeded();
    out.push(body);
  }

  const memoText = out.join('\n\n');  // clean join

  // Overwrite Memo to Self
  ta.value = memoText;

  // Mirror into Preview
  if (pv) {
    pv.innerHTML = asHtml(memoText || '');
    try {
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetClear && window.MathJax.typesetClear([pv]);
        window.MathJax.typesetPromise([pv]).catch(()=>{});
      }
    } catch (_) {}
  }

  window.dispatchEvent(new CustomEvent('ro:memoRebuilt', { detail: { length: memoText.length } }));
}

function bootBridge() {
  composeMemoFromSnippets();
  window.addEventListener('ro:snipsChanged', composeMemoFromSnippets);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootBridge, { once: true });
} else {
  bootBridge();
}
