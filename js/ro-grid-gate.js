/* ro-grid-gate.js — Block grid clicks until __roResolveFrom() yields a valid page.
   Does not touch layout or grid math. Optional #ro-status (tiny) will show one-liners. */
(function () {
  'use strict';

  function qs(name) {
    try { return new URLSearchParams(location.search).get(name) || ''; }
    catch (_) { return ''; }
  }
  function setStatus(msg) {
    try { var el = document.getElementById('ro-status'); if (el) el.textContent = msg; } catch (_) {}
  }

  function canEmit(page) {
    // If your grid exposes a hook, respect it; otherwise: page > 0 is enough
    if (typeof window.__roCanEmitMarker === 'function') {
      try { return !!window.__roCanEmitMarker(page); } catch(_) {}
    }
    return Number(page) > 0;
  }

  async function ensureResolved(chapter, para) {
    try {
      if (typeof window.__roResolveFrom === 'function') {
        return await window.__roResolveFrom(chapter, para);
      }
    } catch (_) {}
    return 0;
  }

  function wire() {
    var stage = document.getElementById('ro-stage');
    if (!stage) return;

    var chapter = qs('chapter');
    var para = qs('para');
    var resolvedPage = null;
    var resolving = false;

    async function getPage() {
      if (resolvedPage != null) return resolvedPage;
      if (resolving) return 0;
      resolving = true;
      try { resolvedPage = await ensureResolved(chapter, para); }
      finally { resolving = false; }
      return resolvedPage;
    }

    // capture-phase blocker until ready
    async function captureBlock(ev) {
      if (canEmit(resolvedPage)) {
        stage.removeEventListener('pointerdown', captureBlock, true);
        return;
      }
      ev.stopPropagation();
      ev.preventDefault();
      setStatus('Resolving page…');
      var pg = await getPage();
      if (canEmit(pg)) {
        setStatus('Ready. Click to mark.');
        stage.removeEventListener('pointerdown', captureBlock, true);
      } else {
        setStatus('Page unresolved; markers disabled.');
      }
    }

    // Prime resolver; if not ready, install temporary gate
    (async function init() {
      var pg = await getPage();
      if (!canEmit(pg)) {
        stage.addEventListener('pointerdown', captureBlock, true);
      } else {
        setStatus('Ready. Click to mark.');
      }
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, { once: true });
  } else {
    wire();
  }
})();
