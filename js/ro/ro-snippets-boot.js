import { initSnippetsApp } from '/js/ro/snippets.js';
import { compileToHTML, typesetInto } from '/js/ro/snippets-compile.js';

// Boot snippets and restore the “render on hover + first active render” behavior
document.addEventListener('DOMContentLoaded', async () => {
  // give MathJax a tick to attach; keeps prior timing
  await new Promise(r => setTimeout(r, 60));

  initSnippetsApp();

  // 1) Compile-on-hover for expanded list cards (left column)
  const list = document.getElementById('list');
  if (list) {
    list.addEventListener('mouseenter', (ev) => {
      const card = ev.target.closest('.snip');
      if (!card || card.dataset.rendered === '1') return;

      const bodyEl = card.querySelector('.body');
      if (!bodyEl) return;

      try {
        const raw = JSON.parse(localStorage.getItem('ro_snips_v3') || '[]');
        const sn = raw.find(s => s && s.id === card.dataset.id);
        if (sn) {
          bodyEl.innerHTML = compileToHTML(sn.body || '');
          if (typeof typesetInto === 'function') typesetInto(bodyEl);
          card.dataset.rendered = '1';
        }
      } catch (_) { /* no-op */ }
    }, true);
  }

  // 2) Compile the already-expanded ACTIVE snippet once after boot
  setTimeout(() => {
    const active = document.querySelector('#list .snip.active');
    if (!active || active.dataset.rendered === '1') return;
    const bodyEl = active.querySelector('.body');
    if (!bodyEl) return;

    try {
      const raw = JSON.parse(localStorage.getItem('ro_snips_v3') || '[]');
      const sn = raw.find(s => s && s.id === active.dataset.id);
      if (sn) {
        bodyEl.innerHTML = compileToHTML(sn.body || '');
        if (typeof typesetInto === 'function') typesetInto(bodyEl);
        active.dataset.rendered = '1';
      }
    } catch (_) { /* swallow */ }
  }, 120);
});
