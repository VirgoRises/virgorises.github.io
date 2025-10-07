/* Research Office — loads a single paragraph preview + nearby figures/tables
   Query: ?para=osf-N&chapter=notebook/<file>.html&return=<encoded-url>
*/
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  // Basic context
  const params = new URLSearchParams(location.search);
  const paraId   = params.get('para') || '';                  // e.g. osf-5
  const chapter  = decodeURIComponent(params.get('chapter')||''); // notebook/chapter-1-…html
  const retUrl   = decodeURIComponent(params.get('return')||'');
  const cafeSlug = location.pathname.split('/').filter(Boolean)[1] || 'zeta-zero-cafe'; // cafes/<slug>/…

  // DOM targets
  const previewBox = $('#paraPreview');       // the paragraph preview container
  const numBadge   = $('#osfNum');            // small #N badge
  const figsList   = $('#figList');
  const tblList    = $('#tblList');
  const backBtn    = $('#backBtn');
  const copyBtn    = $('#copyLinkBtn');

  // Utils
  const chapterFile   = chapter.split('/').pop();                   // chapter-1-the-…html
  const chapterSlug   = chapterFile.replace(/\.html$/,'');          // chapter-1-the-…
  const cafeBase      = `/cafes/${cafeSlug}`;
  const chapterUrlAbs = `${cafeBase}/${chapter}`;                   // absolute URL to chapter html
  const anchorsUrl    = `/data/cafes/${cafeSlug}/anchors/${chapterSlug}.json`;

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
    if (!backBtn) return;
    const href = retUrl || `${cafeBase}/${chapter}`;
    backBtn.addEventListener('click', e => {
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
      if (!src) return;
      if (/^(https?:|data:|\/)/i.test(src)) return; // absolute/data ok
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
      // Clear any previous jax + labels before rendering a fresh paragraph
      if (MathJax.typesetClear) MathJax.typesetClear([container]);
      if (MathJax.texReset)     MathJax.texReset();
    } catch (_) {}
    await MathJax.typesetPromise ? MathJax.typesetPromise([container]) : MathJax.typeset([container]);
  }

  function copyLinkToClipboard() {
    const link = `${location.origin}${cafeBase}/${chapter}#${paraId}`;
    navigator.clipboard?.writeText(link).then(() => {
      copyBtn?.setAttribute('data-copied', '1');
      copyBtn?.classList.add('ok');
      setTimeout(() => copyBtn?.classList.remove('ok'), 1000);
    }).catch(() => {
      alert('Could not copy link to clipboard.');
    });
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
      const li = document.createElement('div');
      li.className = 'ref';
      li.innerHTML = `
        <label class="x">
          <input type="checkbox" data-id="${f.id}">
          <span>${escapeHtml(f.caption)}</span>
          <a class="open" href="${f.href}" target="_blank" rel="noopener">open</a>
        </label>
      `;
      figsList.appendChild(li);
    });

    refs.tables.forEach(t => {
      const li = document.createElement('div');
      li.className = 'ref';
      li.innerHTML = `
        <label class="x">
          <input type="checkbox" data-id="${t.id}">
          <span>${escapeHtml(t.caption)}</span>
          <a class="open" href="${t.href}" target="_blank" rel="noopener">open</a>
        </label>
      `;
      tblList.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  async function loadChapterDom() {
    const html = await fetch(chapterUrlAbs, { credentials: 'omit' }).then(r => r.text());
    const doc  = new DOMParser().parseFromString(html, 'text/html');
    return doc;
  }

  async function previewParagraph(doc, anchorsJson, para) {
    // 1) Find the <pre id="osf-N"> in the chapter DOM
    const pre = doc.getElementById(para);
    if (!pre) {
      previewBox.innerHTML = `<div class="warn">Could not locate <code>#${para}</code> in the chapter.</div>`;
      return;
    }

    // 2) Inject a *clone* into the preview
    previewBox.innerHTML = '';
    const clone = pre.cloneNode(true);
    // Be generous: remove explicit width on images if any
    $$('img', clone).forEach(img => img.removeAttribute('width'));
    previewBox.appendChild(clone);

    // 3) Make relative assets work
    normalisePreviewAssets(previewBox);

    // 4) Typeset math freshly (no duplicate labels)
    await typeset(previewBox);

    // 5) Fill figure/table lists from the chapter
    const refs = listChapterFiguresAndTables(doc);
    renderRefLists(refs);

    // 6) Copy-link button
    copyBtn?.addEventListener('click', copyLinkToClipboard, { once: true });
  }

  async function init() {
    if (!paraId || !chapter) {
      previewBox.innerHTML = `<div class="warn">Missing or invalid query parameters.</div>`;
      return;
    }
    setBackLink();
    setBadge(paraNumberFrom(paraId));

    try {
      // Anchors JSON (not strictly used here, but useful if later we want extra meta)
      // If it 404s we continue; preview comes straight from the chapter DOM.
      await fetch(anchorsUrl, { credentials: 'omit' }).catch(() => null);

      const chapterDoc = await loadChapterDom();
      await previewParagraph(chapterDoc, null, paraId);
    } catch (err) {
      console.error('[research-office] failed:', err);
      previewBox.innerHTML = `<div class="warn">Failed to load the chapter or paragraph preview.</div>`;
    }
  }

  // Kick off when DOM is ready
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

