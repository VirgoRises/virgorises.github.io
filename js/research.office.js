/* Research Office Controller
   Phases implemented: A (Resolver), B (Grid/Viewer coupling & chips), C (Memo↔chips sync), E (Markdown+LaTeX preview)
   Query: ?para=osf-N&chapter=notebook/<file>.html&return=<encoded-url>
*/
(() => {
  const $  = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  // ---- Context & Params -----------------------------------------------------
  const params    = new URLSearchParams(location.search);
  const paraId    = params.get('para') || '';                      // e.g. osf-5
  const chapter   = decodeURIComponent(params.get('chapter')||''); // notebook/chapter-1-…html
  const retUrl    = decodeURIComponent(params.get('return')||'');
  const rodebug   = params.get('rodebug') === '1';
  const cafeSlug  = (location.pathname.split('/').filter(Boolean)[1]) || 'zeta-zero-cafe'; // cafes/<slug>/…

  const cafeBase      = `/cafes/${cafeSlug}`;
  const chapterFile   = chapter.split('/').pop() || '';
  const chapterSlug   = chapterFile.replace(/\.html$/,'');          // chapter-1-the-…
  const chapterUrlAbs = `${cafeBase}/${chapter}`;
  const anchorsUrl    = `/data/cafes/${cafeSlug}/anchors/${chapterSlug}.json`;

  // ---- DOM ------------------------------------------------------------------
  const backBtn     = $('#backLink');
  const numBadge    = $('#paraNum');
  const chapNameEl  = $('#chapName');
  const cafeNameEl  = $('#cafeName');

  const previewBox  = $('#paraPreview');
  const figsList    = $('#figList');
  const tblList     = $('#tblList');
  const copyBtn     = $('#copyLink');

  const statusLine  = $('#roStatus');
  const chipsEl     = $('#pageChips');
  const pageImg     = $('#pageImg');

  const memoTa      = $('#memoBody');
  const memoPrev    = $('#memoPreview');
  const memoList    = $('#memoList');

  const STATE = {
    resolved: false,
    chapterDoc: null,
    paraNum: null,
    primaryPage: null,
    referencedPages: new Set(), // from memo tokens
    activePage: null,
    // optional future index: page -> [{coords,label,textOffset}]
    tokenMeta: new Map()
  };

  // ---- Utilities ------------------------------------------------------------
  const log = (...a) => rodebug && console.debug('[RO]', ...a);

  const pad3 = n => String(n).padStart(3,'0');

  function paraNumberFrom(para) {
    const m = String(para).match(/osf-(\d+)/);
    return m ? Number(m[1]) : null;
  }

  function escapeHtml(s){ return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function setBadge(n) {
    if (!numBadge) return;
    numBadge.textContent = n != null ? `#${n}` : '#';
    numBadge.title = n != null ? `Paragraph ${n}` : '';
  }

  function setBackLink() {
    const href = retUrl || `${cafeBase}/${chapter}`;
    backBtn?.addEventListener('click', e => { e.preventDefault(); location.href = href; });
  }

  function buildOpenLink(anchorId) {
    const url = new URL(`${chapterUrlAbs}#${anchorId}`, location.origin);
    return url.toString();
  }

  // ---- Resolver (A) ---------------------------------------------------------
  async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
  }

  async function loadChapterDom() {
    const html = await fetchText(chapterUrlAbs);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc;
  }

  async function resolvePrimaryPage(chapterDoc) {
    // 1) direct data-page on the target <pre.osf id="osf-N">
    const pre = chapterDoc.querySelector(`pre.osf#${CSS.escape(paraId)}`);
    let inHtml = null;
    if (pre) {
      const raw = pre.getAttribute('data-page');
      if (raw && /^\d+$/.test(raw)) inHtml = Number(raw);
    }

    // 2) anchors manifest (your /data/cafes/<slug>/anchors/<chapterSlug>.json)
    let fromManifest = null;
    try {
      const txt = await fetchText(anchorsUrl);
      const json = JSON.parse(txt);
      const key = paraId; // ‘osf-N’
      if (json && json[key] && /^\d+$/.test(String(json[key].page || json[key]))) {
        fromManifest = Number(json[key].page || json[key]);
      }
    } catch (e) {
      log('anchors.json missing or malformed', e);
    }

    // 3) fallback
    const fallback = 1;

    const chosen = inHtml || fromManifest || fallback;
    return { inHtml, fromManifest, fallback, chosen };
  }

  function setStatus(o) {
    const bits = [
      `chapter: ${escapeHtml(chapter)}`,
      `para: ${escapeHtml(paraId)}`,
      `primary: ${o?.chosen ?? '?'}`,
      (o?.inHtml ? `html=${o.inHtml}` : ''),
      (o?.fromManifest ? `manifest=${o.fromManifest}` : ''),
    ].filter(Boolean);
    statusLine.innerHTML = bits.map(b => `<span class="tag">${b}</span>`).join(' ');
  }

  // ---- Paragraph preview + refs --------------------------------------------
  function normalisePreviewAssets(container) {
    const base = document.getElementById('ro-base');
    base?.setAttribute('href', chapterUrlAbs.replace(/\/[^/]*$/,'/'));
    $$('img', container).forEach(img => {
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

  function listChapterFiguresAndTables(chapterDoc) {
    const figures = [];
    const tables  = [];
    $$('figure[id]', chapterDoc).forEach(fig => {
      const id = fig.id;
      const caption = $('figcaption', fig)?.textContent?.trim() || id;
      const isTable = !!fig.querySelector('table');
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
        </label>`;
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
        </label>`;
      tblList.appendChild(li);
    });
  }

  async function previewParagraph(doc) {
    const pre = doc.querySelector(`pre.osf#${CSS.escape(paraId)}`);
    if (!pre) {
      previewBox.innerHTML = `<div class="warn">Paragraph not found in chapter.</div>`;
      return;
    }
    previewBox.innerHTML = '';
    const clone = pre.cloneNode(true);
    $$('img', clone).forEach(img => img.removeAttribute('width'));
    previewBox.appendChild(clone);
    normalisePreviewAssets(previewBox);
    await typeset(previewBox);

    const refs = listChapterFiguresAndTables(doc);
    renderRefLists(refs);

    copyBtn?.addEventListener('click', () => {
      const link = `${location.origin}${cafeBase}/${chapter}#${paraId}`;
      navigator.clipboard?.writeText(link).then(() => {
        copyBtn.classList.add('ok');
        setTimeout(() => copyBtn.classList.remove('ok'), 1000);
      }).catch(() => alert('Could not copy link to clipboard.'));
    }, { once: true });
  }

  // ---- Thumbs / Viewer (B) --------------------------------------------------
  function thumbUrlForPage(n) {
    return `${cafeBase}/sources/thumbs/page-${pad3(n)}.jpg`;
  }

  function setActivePage(n, source='ui') {
    STATE.activePage = n;
    const url = thumbUrlForPage(n);
    pageImg.src = url;
    pageImg.alt = `Page ${n}`;
    pageImg.classList.toggle('primary', n === STATE.primaryPage);
    pageImg.onerror = () => {
      pageImg.removeAttribute('src');
      pageImg.alt = `Missing thumbnail for page ${n}`;
      warn(`Missing thumbnail: ${url}`);
    };
    log('activePage <-', n, `(${source})`);
  }

  // ---- Chips (memo → chips) (B & C) ----------------------------------------
  function renderChips() {
    const all = new Set(STATE.referencedPages);
    if (STATE.primaryPage) all.add(STATE.primaryPage);

    const ordered = Array.from(all).sort((a,b) => {
      if (a === STATE.primaryPage) return -1;
      if (b === STATE.primaryPage) return  1;
      return a - b;
    });

    chipsEl.innerHTML = '';
    ordered.forEach(n => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (n === STATE.primaryPage ? ' primary' : '');
      chip.textContent = `p${n}`;
      chip.title = (n === STATE.primaryPage ? 'Primary ' : '') + `page ${n}`;
      chip.addEventListener('click', () => setActivePage(n, 'chip'));

      const del = document.createElement('span');
      del.className = 'chip-x';
      del.textContent = '×';
      del.title = 'Invalidate ALL tokens for this page in the memo';
      del.addEventListener('click', (e) => { e.stopPropagation(); invalidateAllTokensForPage(n); });
      chip.appendChild(del);

      chipsEl.appendChild(chip);
    });
  }

  // ---- Memo tokens (C) ------------------------------------------------------
  // Accept:
  //   [mm|p12=...]
  //   [mm|page12=...]
  //   [mm|p10=x,y:x,y]
  //   [mm|p10=x,y:x,y:"label"]
  //
  // IMPORTANT: invalidation turns "[mm|page14=…]" into "[del]mm|page14=…]" (drop the opening '[').
  //            These invalidated sequences will no longer match TOKEN_RE.
  const TOKEN_RE = /\[mm\|\s*(?:p|page)(\d+)\s*=[^\]]*?\]/g;

  function parseReferencedPages(text) {
    const pages = new Set();
    STATE.tokenMeta.clear();

    // Only non-invalidated tokens match TOKEN_RE (because they start with "[mm|")
    for (const m of text.matchAll(TOKEN_RE)) {
      const full = m[0];
      const page = Number(m[1]);

      // Collect basic meta for future index (label parsing optional)
      let label = null;
      const labelMatch = full.match(/:"([^"]*)"\]\s*$/);
      if (labelMatch) label = labelMatch[1];

      if (!STATE.tokenMeta.has(page)) STATE.tokenMeta.set(page, []);
      STATE.tokenMeta.get(page).push({ label });

      pages.add(page);
    }
    return pages;
  }

  function invalidateAllTokensForPage(pageN) {
    const text = memoTa.value;
    // Replace ALL matching tokens for that page, both pN and pageN, IF not already invalidated
    // We need to ensure the char just before the match is NOT the trailing "l" of "[del]"
    const replacer = (match, num, offset, whole) => {
      if (Number(num) !== pageN) return match;
      const before = whole.slice(Math.max(0, offset - 6), offset); // check for "[del]"
      if (/\[del\]\s*$/.test(before)) return match; // already invalidated nearby (rare edge)
      // True invalidation: change leading "[" to "[del]"
      return match.replace(/^\[/, '[del]');
    };

    // Two passes (p and page) are covered by one regex; use replace with callback
    const updated = text.replace(TOKEN_RE, replacer);
    if (updated !== text) {
      memoTa.value = updated;
      onMemoChange();
    }
  }

  function onMemoChange() {
    const text = memoTa.value;
    STATE.referencedPages = parseReferencedPages(text);
    renderChips();

    if (STATE.activePage == null) {
      const next = STATE.primaryPage ?? Array.from(STATE.referencedPages)[0] ?? STATE.primaryPage;
      if (next != null) setActivePage(next, 'memo-init');
    }
    renderMemoPreview(text);
    persistDraftDraftlist();
  }

  // ---- Markdown + LaTeX preview (E) ----------------------------------------
  function renderMemoPreview(text) {
    try {
      const html = (window.marked?.parse ? window.marked.parse(text) : escapeHtml(text));
      memoPrev.innerHTML = html;
      typeset(memoPrev);
    } catch (e) {
      memoPrev.innerHTML = `<div class="warn">Preview failed to render.</div>`;
    }
  }

  // ---- Drafts in localStorage ----------------------------------------------
  const LS_KEY = 'ro:memos';

  function persistDraftDraftlist() {
    try {
      const payload = {
        ts: Date.now(),
        chapter,
        paraId,
        body: memoTa.value
      };
      const arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      const idx = arr.findIndex(x => x.chapter === chapter && x.paraId === paraId);
      if (idx >= 0) arr[idx] = payload; else arr.unshift(payload);
      localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0, 50)));
      renderDraftList(arr);
    } catch(e) { log('persist failed', e); }
  }

  function renderDraftList(arr) {
    memoList.innerHTML = '';
    arr.filter(x => x.chapter === chapter && x.paraId === paraId)
       .forEach(x => {
        const div = document.createElement('div');
        div.className = 'item';
        const when = new Date(x.ts).toLocaleString();
        div.innerHTML = `<div>
          <div class="mono muted">${escapeHtml(when)}</div>
          <div class="mono">${escapeHtml((x.body||'').slice(0,120))}${x.body.length>120?'…':''}</div>
        </div>`;
        memoList.appendChild(div);
       });
  }

  // ---- UX helpers -----------------------------------------------------------
  function warn(msg) {
    const tag = document.createElement('span');
    tag.className = 'tag warn';
    tag.textContent = msg;
    statusLine.appendChild(tag);
    log('WARN:', msg);
  }

  // ---- Boot ---------------------------------------------------------------
  async function init() {
    cafeNameEl.textContent = cafeSlug;
    chapNameEl.textContent = chapterFile.replace(/\.html$/,'');
    setBackLink();

    const n = paraNumberFrom(paraId);
    setBadge(n);

    if (!paraId || !chapter) {
      previewBox.innerHTML = `<div class="warn">Missing or invalid query parameters.</div>`;
      return;
    }

    try {
      const doc = await loadChapterDom();
      STATE.chapterDoc = doc;

      const res = await resolvePrimaryPage(doc);
      STATE.primaryPage = res.chosen;
      setStatus(res);

      await previewParagraph(doc);

      setActivePage(STATE.primaryPage, 'resolver');

      memoTa.addEventListener('input', onMemoChange);
      onMemoChange();

      $('#saveDraft')?.addEventListener('click', () => {
        persistDraftDraftlist();
        const btn = $('#saveDraft');
        btn?.classList.add('ok'); setTimeout(() => btn?.classList.remove('ok'), 800);
      });

      $('#exportJson')?.addEventListener('click', () => {
        const fileName = `memo_${chapterSlug}_${paraId}.json`;
        const blob = new Blob([JSON.stringify({
          chapter, paraId, body: memoTa.value, pages: Array.from(STATE.referencedPages),
          primary: STATE.primaryPage
        }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = fileName; a.click();
        URL.revokeObjectURL(a.href);
      });

      $('#submitDiscord')?.addEventListener('click', () => {
        alert('Discord submission wiring is stubbed here.\n(We’ll hook your bot endpoint in a later phase.)');
      });

    } catch (err) {
      console.error('[research-office] failed:', err);
      previewBox.innerHTML = `<div class="warn">Failed to load the chapter or paragraph preview.</div>`;
      warn('Resolver failed.');
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
