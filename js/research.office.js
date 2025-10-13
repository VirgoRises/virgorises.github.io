/* research.office.js — drop-in
   - Robust chapter resolver for Paragraph preview
   - Safe boot that won’t explode if grid init name differs
   - Tiny MathJax guard (uses site config if already loaded)
*/

(() => {
  // ---------------- URL + DOM handles ----------------
  const Q = new URLSearchParams(location.search);
  const PARA = Q.get('para') || '';
  const CHAPTER = Q.get('chapter') || '';
  const RETURN = Q.get('return') || '';

  const previewBox = document.getElementById('paraPreview');

  // ---------------- MathJax guard ----------------
  async function ensureMathJax() {
    if (window.MathJax && MathJax.typesetPromise) return;
    // If your HTML already loads math/mathconfig.js this will immediately resolve.
    // Otherwise we noop; preview still renders plain text.
    await Promise.resolve();
  }
  // boot – call the preview loader after DOM is ready
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      if (window.ROGrid?.init) await window.ROGrid.init();   // grid if present
    } catch (e) { console.warn('grid init skipped:', e); }

    try {
      if (typeof loadParagraphPreview === 'function') {
        await loadParagraphPreview();
      }
    } catch (e) {
      console.error('preview failed:', e);
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    const memo = document.querySelector('#memo, textarea[name="memo"], .memo textarea');
    const toolbar = memo && memo.closest('.card, .panel, body').querySelector('button, .memo-toolbar')?.parentNode;
    if (!memo) return;

    // Event delegation: react to any <button> in the memo panel
    memo.closest('.card, body').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const label = btn.textContent.trim();

      const wrap = (left, right = left) => {
        const t = memo; const s = t.selectionStart ?? 0; const e2 = t.selectionEnd ?? 0;
        const before = t.value.slice(0, s);
        const sel = t.value.slice(s, e2);
        const after = t.value.slice(e2);
        t.value = before + left + sel + right + after;
        const pos = (before + left + sel + right).length;
        t.setSelectionRange(pos, pos);
        t.focus();
        memo.dispatchEvent(new Event('input')); // keep autosave alive
      };

      switch (label) {
        case 'B': wrap('**'); break;
        case 'I': wrap('_'); break;
        case '{}': wrap('**', '**'); break; // you can swap to `{}` if you prefer
        case '`': wrap('`'); break;
        case '∑': wrap('$$', '$$'); break;
        case 'Preview':
          // trigger the preview button’s native behavior if you already have one
          if (typeof window.renderMemoPreview === 'function') window.renderMemoPreview();
          break;
        default: return;
      }
    });
  });

  // ---------------- Resilient paragraph preview loader ----------------
  async function loadParagraphPreview() {
    if (!CHAPTER || !PARA) {
      previewBox.innerHTML = `<div class="muted">Failed to load the chapter or paragraph preview.</div>`;
      return;
    }

    const slug = location.pathname.split('/').filter(Boolean)[1] || 'zeta-zero-cafe';
    const candidates = [
      new URL(CHAPTER, location.href).toString(),
      CHAPTER.startsWith('/') ? CHAPTER : '/' + CHAPTER,
      `/cafes/${slug}/${CHAPTER.replace(/^\/+/, '')}`,
      `/cafes/${slug}/notebook/${CHAPTER.split('/').pop()}`
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    let chosenUrl = null, html = null, lastStatus = null;
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        lastStatus = res.status;
        if (res.ok) { chosenUrl = url; html = await res.text(); break; }
      } catch (e) { lastStatus = String(e); }
    }

    if (!html) {
      previewBox.innerHTML =
        `<div class="muted">Failed to load the chapter or paragraph preview.<br>
        <span class="mono tiny">Tried:</span>
        <div class="tiny mono" style="max-width:100%;overflow:auto">${candidates.map(c => `• ${c}`).join('<br>')}</div>
        <div class="tiny mono">Last status: ${lastStatus}</div>
       </div>`;
      return;
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    let anchor = doc.getElementById(PARA) ||
      doc.querySelector(`[data-source-anchor="${PARA}"], [data-anchor="${PARA}"]`);

    if (!anchor) {
      previewBox.innerHTML =
        `<div class="muted">Loaded <span class="mono tiny">${chosenUrl}</span>, but couldn’t find anchor
        <span class="mono">${PARA}</span>.</div>`;
      return;
    }

    // 1) Prefer the nearest “atomic” block (card/figure/table/paragraph)
    let container = anchor.closest('.card, figure, table, .paragraph, .para, .fig, .tbl');

    // 2) If none, slice a minimal section: from a safe start node up to the next anchor-like
    if (!container) {
      let start = anchor;
      while (start.parentElement && start.parentElement !== doc.body) {
        if (start.previousElementSibling) break;
        start = start.parentElement;
      }
      const frag = doc.createDocumentFragment();
      let cur = start;
      const isSectionStart = el =>
        el.matches?.('.card, figure, table, .paragraph, .para, .fig, .tbl, [id^="osf-"], [data-source-anchor], [data-anchor]');

      while (cur && cur !== doc.body) {
        if (cur !== start && isSectionStart(cur)) break;
        frag.appendChild(cur.cloneNode(true));
        cur = cur.nextElementSibling;
      }
      container = document.createElement('div');
      container.appendChild(frag);
    }

    // Absolutize URLs relative to the chosen chapter
    (function absolutizeUrls(root, baseUrl) {
      const base = new URL(baseUrl, location.href);
      root.querySelectorAll('img').forEach(img => {
        const v = img.getAttribute('src'); if (!v) return;
        try { img.src = new URL(v, base).toString(); } catch { }
        img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
      });
      root.querySelectorAll('a').forEach(a => {
        const v = a.getAttribute('href'); if (!v) return;
        try { a.href = new URL(v, base).toString(); } catch { }
      });
    })(container, chosenUrl);

    // Inject & typeset
    previewBox.innerHTML = '';
    const dbg = document.createElement('div');
    dbg.className = 'tiny muted mono';
    dbg.textContent = `preview from: ${chosenUrl}`;
    previewBox.appendChild(dbg);
    previewBox.appendChild(container.cloneNode(true));

    try {
      await ensureMathJax();
      if (MathJax.typesetClear) MathJax.typesetClear([previewBox]);
      if (MathJax.texReset) MathJax.texReset();
      if (MathJax.typesetPromise) await MathJax.typesetPromise([previewBox]);
      else MathJax.typeset([previewBox]);
    } catch (e) {
      console.warn('MathJax not available in paragraph preview.', e);
    }
  }

})();
