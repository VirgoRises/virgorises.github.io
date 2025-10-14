/* research.office.js — drop-in
   - Paragraph preview (resilient chapter URL + MathJax typeset)
   - Memo toolbar (lightweight, id-less)
   - Weak resolver stub for &from= fallback
*/

(() => {
  // ---------------- URL + DOM handles ----------------
  const Q = new URLSearchParams(location.search);
  const PARA    = Q.get('para')    || '';
  const CHAPTER = Q.get('chapter') || '';
  const RETURN  = Q.get('return')  || '';

  const previewBox = document.getElementById('paraPreview');

  // ---------------- MathJax guard ----------------
  async function ensureMathJax() {
    if (window.MathJax && MathJax.typesetPromise) return;
    await Promise.resolve(); // config is loaded by the page; noop here
  }

  // ---------------- Memo toolbar (simple delegation) ----------------
  document.addEventListener('DOMContentLoaded', () => {
    const memo = document.querySelector('#memo, textarea[name="memo"], .memo textarea');
    if (!memo) return;

    // Toggle preview
    const previewBtn = document.getElementById('memoPreviewBtn');
    const previewPane = document.getElementById('memoPreview');
    if (previewBtn && previewPane) {
      previewBtn.addEventListener('click', async () => {
        const showing = previewPane.style.display !== 'none';
        if (showing) {
          previewPane.style.display = 'none';
          return;
        }
        // Render Markdown + MathJax
        const raw = memo.value;
        previewPane.innerHTML = raw
          .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
          .replace(/_(.+?)_/g,'<em>$1</em>')
          .replace(/`(.+?)`/g,'<code>$1</code>')
          .replace(/\n/g,'<br>');
        previewPane.style.display = 'block';
        try {
          await ensureMathJax();
          if (window.MathJax) {
            if (MathJax.typesetClear) MathJax.typesetClear([previewPane]);
            if (MathJax.texReset) MathJax.texReset();
            if (MathJax.typesetPromise) await MathJax.typesetPromise([previewPane]);
            else MathJax.typeset([previewPane]);
          }
        } catch {}
      });
    }

    // Simple buttons (B / I / code / link / tex)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.ro-memo-toolbar button');
      if (!btn) return;
      const mode = btn.getAttribute('data-md');

      const wrap = (left, right = left) => {
        const t = memo; const s = t.selectionStart ?? 0; const e2 = t.selectionEnd ?? 0;
        const before = t.value.slice(0, s);
        const sel    = t.value.slice(s, e2);
        const after  = t.value.slice(e2);
        t.value = before + left + sel + right + after;
        const pos = (before + left + sel + right).length;
        t.setSelectionRange(pos, pos);
        t.focus();
        t.dispatchEvent(new Event('input'));
      };

      switch (mode) {
        case 'b':    wrap('**'); break;
        case 'i':    wrap('_'); break;
        case 'code': wrap('`'); break;
        case 'link': wrap('[', '](url)'); break;
        case 'tex':  wrap('\\(', '\\)'); break; // inline math
        default: return;
      }
    });
  });

  // ---------------- Paragraph preview (resilient) ----------------
  async function loadParagraphPreview() {
    if (!previewBox) return;
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
          <div class="tiny mono" style="max-width:100%;overflow:auto">${candidates.map(c=>`• ${c}`).join('<br>')}</div>
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

    // prefer an atomic block around the anchor
    let container = anchor.closest('.card, figure, table, .paragraph, .para, .fig, .tbl');
    if (!container) {
      // slice minimal section if no wrapper
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

    // absolutize asset URLs relative to chapter
    (function absolutizeUrls(root, baseUrl) {
      const base = new URL(baseUrl, location.href);
      root.querySelectorAll('img').forEach(img => {
        const v = img.getAttribute('src'); if (!v) return;
        try { img.src = new URL(v, base).toString(); } catch {}
        img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
      });
      root.querySelectorAll('a').forEach(a => {
        const v = a.getAttribute('href'); if (!v) return;
        try { a.href = new URL(v, base).toString(); } catch {}
      });
    })(container, chosenUrl);

    // inject & typeset
    previewBox.innerHTML = '';
    const dbg = document.createElement('div');
    dbg.className = 'tiny muted mono';
    dbg.textContent = `preview from: ${chosenUrl}`;
    previewBox.appendChild(dbg);
    previewBox.appendChild(container.cloneNode(true));

    try {
      await ensureMathJax();
      if (window.MathJax) {
        if (MathJax.typesetClear) MathJax.typesetClear([previewBox]);
        if (MathJax.texReset) MathJax.texReset();
        if (MathJax.typesetPromise) await MathJax.typesetPromise([previewBox]);
        else MathJax.typeset([previewBox]);
      }
    } catch (e) {
      console.warn('MathJax not available in paragraph preview.', e);
    }
  }

  // expose for bootstrap
  window.loadParagraphPreview = loadParagraphPreview;

  // ---------------- Weak resolver (page) ----------------
  // Replace later with a real chapter/anchor→page lookup
  window.__roResolveFrom = async (chapter, para) => 0;

})();
