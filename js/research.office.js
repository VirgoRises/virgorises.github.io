/* Research Office — loads a single paragraph preview + nearby figures/tables.
   Query: ?para=osf-N&chapter=notebook/<file>.html&return=<encoded-url>
*/
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  // Basic context
  const params   = new URLSearchParams(location.search);
  const paraId   = params.get('para') || '';                        // e.g. osf-5
  const chapter  = decodeURIComponent(params.get('chapter')||'');   // notebook/chapter-1-…html
  const retUrl   = decodeURIComponent(params.get('return')||'');
  const cafeSlug = location.pathname.split('/').filter(Boolean)[1] || 'zeta-zero-cafe'; // cafes/<slug>/…

  // DOM targets (match IDs in HTML)
  const previewBox = $('#paraPreview');
  const numBadge   = $('#paraNum');
  const figsList   = $('#figList');
  const tblList    = $('#tblList');
  const backLink   = $('#backLink');
  const copyLink   = $('#copyLink');
  const memoBody   = $('#memoBody');
  const memoList   = $('#memoList');

  // Derived URLs
  const chapterFile   = chapter.split('/').pop() || '';
  const chapterSlug   = chapterFile.replace(/\.html$/,'');
  const cafeBase      = `/cafes/${cafeSlug}`;
  const chapterUrlAbs = `${cafeBase}/${chapter}`;                   // absolute URL to chapter html

  function paraNumberFrom(para) {
    const m = String(para).match(/osf-(\d+)/);
    return m ? Number(m[1]) : null;
  }

  function setBadge(n) {
    if (!numBadge) return;
    numBadge.textContent = n != null ? `#${n}` : '#';
    numBadge.title = n != null ? `Paragraph ${n}` : '';
  }

  function setBackLink() {
    if (!backLink) return;
    const href = retUrl || `${cafeBase}/${chapter}`;
    backLink.addEventListener('click', e => {
      e.preventDefault();
      location.href = href;
    });
  }

  function buildOpenLink(anchorId) {
    // open link points back into the chapter
    return `${cafeBase}/${chapter}#${anchorId}`;
  }

  function normalisePreviewAssets(container) {
    // Make relative images load from /cafes/<slug>/notebook/
    $$('img', container).forEach(img => {
      const src = img.getAttribute('src') || '';
      if (!src || /^(https?:|data:|\/)/i.test(src)) return; // absolute/data ok
      img.src = `${cafeBase}/notebook/${src}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '0 auto';
    });
  }

  async function typeset(container) {
    if (!window.MathJax) return;
    try {
      if (MathJax.typesetClear) MathJax.typesetClear([container]);
      if (MathJax.texReset)     MathJax.texReset();
    } catch (_) {}
    await (MathJax.typesetPromise ? MathJax.typesetPromise([container]) : MathJax.typeset([container]));
  }

  function copyLinkToClipboard() {
    const link = `${location.origin}${cafeBase}/${chapter}#${paraId}`;
    navigator.clipboard?.writeText(link).then(() => {
      copyLink?.classList.add('ok');
      setTimeout(() => copyLink?.classList.remove('ok'), 900);
    }).catch(() => alert('Could not copy link to clipboard.'));
  }

  function listChapterFiguresAndTables(chapterDoc) {
    // Anything <figure id="..."> inside the chapter becomes a selectable reference
    const figures = [];
    const tables  = [];

    $$('figure[id]', chapterDoc).forEach(fig => {
      const id = fig.id;
      const caption = $('figcaption', fig)?.textContent?.trim() || id;
      const isTable = fig.querySelector('table') !== null;

      const item = { id, caption, href: buildOpenLink(id) };
      (isTable ? tables : figures).push(item);
    });

    return { figures, tables };
  }

  function renderRefLists(refs) {
    figsList.innerHTML = '';
    tblList .innerHTML = '';

    refs.figures.forEach(f => {
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = `
        <label>
          <input type="checkbox" data-id="${f.id}">
          <span>${escapeHtml(f.caption)}</span>
        </label>
        <a class="open" href="${f.href}" target="_blank" rel="noopener">open</a>
      `;
      figsList.appendChild(row);
    });

    refs.tables.forEach(t => {
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = `
        <label>
          <input type="checkbox" data-id="${t.id}">
          <span>${escapeHtml(t.caption)}</span>
        </label>
        <a class="open" href="${t.href}" target="_blank" rel="noopener">open</a>
      `;
      tblList.appendChild(row);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  async function loadChapterDom() {
    const html = await fetch(chapterUrlAbs, { credentials: 'omit' }).then(r => r.text());
    return new DOMParser().parseFromString(html, 'text/html');
  }

  async function previewParagraph(doc, para) {
    // 1) Find the <pre id="osf-N"> in the chapter DOM
    const pre = doc.getElementById(para);
    if (!pre) {
      previewBox.innerHTML = `<div class="warn">Could not locate <code>#${para}</code> in the chapter.</div>`;
      return;
    }

    // 2) Inject a *clone* into the preview
    previewBox.innerHTML = '';
    const clone = pre.cloneNode(true);
    // remove fixed image widths, if any
    $$('img', clone).forEach(img => img.removeAttribute('width'));
    previewBox.appendChild(clone);

    // 3) Make relative assets work
    normalisePreviewAssets(previewBox);

    // 4) Typeset math freshly (no duplicate labels)
    await typeset(previewBox);

    // 5) Fill figure/table lists from the chapter
    const refs = listChapterFiguresAndTables(doc);
    renderRefLists(refs);
  }

  // ---------------- Memos (local only) ----------------
  function loadMemos() {
    try { return JSON.parse(localStorage.getItem('ro:memos') || '[]'); }
    catch { return []; }
  }
  function saveMemos(list) {
    localStorage.setItem('ro:memos', JSON.stringify(list));
  }
  function renderMemoList() {
    const memos = loadMemos();
    memoList.innerHTML = '';
    memos.slice().reverse().forEach(m => {
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = `<div class="mono" style="opacity:.7">${escapeHtml(m.title)}</div>`;
      memoList.appendChild(row);
    });
  }

  function wireMemoButtons() {
    $('#saveDraft')?.addEventListener('click', () => {
      const body = memoBody?.value?.trim() || '';
      if (!body) return;
      const memos = loadMemos();
      memos.push({ title: `${chapterSlug} · ${paraId}`, body, ts: Date.now() });
      saveMemos(memos);
      renderMemoList();
    });

    $('#exportJson')?.addEventListener('click', () => {
      const payload = {
        chapter, para: paraId,
        memo: memoBody?.value || '',
        when: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${chapterSlug}-${paraId}.memo.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  // ---------------- Init ----------------
  async function init() {
    if (!paraId || !chapter) {
      previewBox.innerHTML = `<div class="warn">Missing or invalid query parameters.</div>`;
      return;
    }
    setBackLink();
    setBadge(paraNumberFrom(paraId));
    copyLink?.addEventListener('click', copyLinkToClipboard, { once: true });

    try {
      const chapterDoc = await loadChapterDom();
      await previewParagraph(chapterDoc, paraId);
      renderMemoList();
      wireMemoButtons();
    } catch (err) {
      console.error('[research-office] failed:', err);
      previewBox.innerHTML = `<div class="warn">Failed to load the chapter or paragraph preview.</div>`;
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
