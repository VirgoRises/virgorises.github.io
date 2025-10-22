/* Research Office Controller — Zen Flow + Drafts Manager (safe + search) + Robust loader + Pop-out Preview
   A: Resolver   B: Viewer + Thumbs   C: Memo↔Thumbs   E: Markdown+LaTeX
*/
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  // ---- Params ---------------------------------------------------------------
  const params = new URLSearchParams(location.search);
  const paraId = params.get('para') || '';
  const chapter = decodeURIComponent(params.get('chapter') || '');
  const retUrl = decodeURIComponent(params.get('return') || '');
  const rodebug = params.get('rodebug') === '1';
  const cafeSlug = (location.pathname.split('/').filter(Boolean)[1]) || 'zeta-zero-cafe';

  const cafeBase = `/cafes/${cafeSlug}`;
  const chapterFile = chapter.split('/').pop() || '';
  const chapterSlug = chapterFile.replace(/\.html$/, ''); // used for exports
  const chapterUrlAbs = `${cafeBase}/${chapter}`;
  const anchorsUrl = `/data/cafes/${cafeSlug}/anchors/${chapterSlug}.json`;

  // ---- DOM ------------------------------------------------------------------
  const backBtn = $('#backLink');
  const numBadge = $('#paraNum');
  const chapNameEl = $('#chapName');
  const cafeNameEl = $('#cafeName');

  const previewBox = $('#paraPreview');
  const figsList = $('#figList');
  const tblList = $('#tblList');
  const copyBtn = $('#copyLink');

  const statusLine = $('#roStatus');
  const thumbsWrap = $('#pageChips');

  const viewer = $('#viewer');
  const stage = $('#stage');
  const pageImg = $('#pageImg');
  const overlay = $('#overlay');

  // Tools & page nav
  const toolPanBtn = $('#toolPan');
  const toolPointBtn = $('#toolPoint');
  const toolBoxBtn = $('#toolBox');
  const zoomSlider = $('#zoomSlider');
  const zoomRead = $('#zoomRead');
  const zoomFitBtn = $('#zoomFit');
  const zoom100Btn = $('#zoom100');

  const btnPrev = $('#pagePrev');
  const btnPrimary = $('#pagePrimary');
  const btnNext = $('#pageNext');
  const btnAddRef = $('#pageAddRef');

  const memoTa = $('#memoBody');
  const memoPrev = $('#memoPreview');
  const memoList = $('#memoList');

  // ---- State ----------------------------------------------------------------
  const STATE = {
    chapterDoc: null,
    primaryPage: null,
    referencedPages: new Set(),
    activePage: null,
    tokensByPage: new Map(),
    // viewer transform
    scale: 1, tx: 0, ty: 0,
    dragging: false, dragStart: { x: 0, y: 0 },
    tool: 'pan', boxStart: null,
    pageMM: { w: 210, h: 297, standard: 'A4' },
    _chapterUrlResolved: null
  };

  // ---- Zoom mapping (slider value ↔ scale) ----------------------------------
  const MIN_SCALE = 0.25, MAX_SCALE = 4;
  function sliderToScale(v) {
    const vv = Number(v);
    return vv >= 0 ? 1 + (MAX_SCALE - 1) * (vv / 4)
      : 1 / (1 + (MAX_SCALE - 1) * ((-vv) / 4));
  }
  function scaleToSlider(s) {
    const ss = Number(s);
    return ss >= 1 ? ((ss - 1) / (MAX_SCALE - 1)) * 4
      : - ((1 / ss - 1) / (MAX_SCALE - 1)) * 4;
  }
  function updateZoomUI() {
    if (zoomRead) zoomRead.textContent = `${STATE.scale.toFixed(2)}×`;
    if (zoomSlider) zoomSlider.value = String(scaleToSlider(STATE.scale));
  }

  // ---- Utils ----------------------------------------------------------------
  const log = (...a) => rodebug && console.debug('[RO]', ...a);
  const pad3 = n => String(n).padStart(3, '0');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const escapeHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function paraNumberFrom(para) {
    const m = String(para).match(/osf-(\d+)/);
    return m ? Number(m[1]) : null;
  }

  // ---- Robust fetch helpers -------------------------------------------------
  async function fetchText(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return r.text();
  }
  async function loadChapterDom() {
    const tries = [];
    const chapterDecoded = decodeURIComponent(chapter || '');
    const chapterEncoded = encodeURIComponent(chapterDecoded).replace(/%2F/gi, '/');
    tries.push(`${cafeBase}/${chapterDecoded}`);
    tries.push(`${cafeBase}/${chapterEncoded}`);
    if (chapterDecoded.startsWith('/')) tries.push(chapterDecoded);
    tries.push(chapterDecoded);
    let lastErr;
    for (const u of tries) {
      try {
        const html = await fetchText(u);
        log('chapter load OK:', u);
        STATE._chapterUrlResolved = u;
        return new DOMParser().parseFromString(html, 'text/html');
      } catch (e) { lastErr = e; log('chapter load failed:', u, e.message); }
    }
    throw lastErr || new Error('All chapter URL attempts failed.');
  }

  // ---- Resolver (A) ---------------------------------------------------------
  async function resolvePrimaryPage(chapterDoc) {
    const pre = chapterDoc.querySelector(`pre.osf#${CSS.escape(paraId)}`);
    let inHtml = null;
    if (pre) {
      const raw = pre.getAttribute('data-page');
      if (raw && /^\d+$/.test(raw)) inHtml = Number(raw);
    }
    let fromManifest = null;
    try {
      const json = JSON.parse(await fetchText(anchorsUrl));
      const item = json?.[paraId];
      const val = item?.page ?? item;
      if (val && /^\d+$/.test(String(val))) fromManifest = Number(val);
    } catch (_) { }
    const fallback = 1;
    const chosen = inHtml || fromManifest || fallback;
    return { inHtml, fromManifest, fallback, chosen };
  }

  function setBackLink() {
    const href = retUrl || `${cafeBase}/${chapter}`;
    backBtn?.addEventListener('click', e => { e.preventDefault(); location.href = href; });
  }
  function setBadge(n) {
    if (!numBadge) return;
    numBadge.textContent = n != null ? `#${n}` : '#';
    numBadge.title = n != null ? `Paragraph ${n}` : '';
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
    const resolved = STATE._chapterUrlResolved || chapterUrlAbs;
    base?.setAttribute('href', resolved.replace(/\/[^/]*$/, '/'));
    $$('img', container).forEach(img => {
      img.style.maxWidth = '100%'; img.style.height = 'auto'; img.style.display = 'block'; img.style.margin = '0 auto';
    });
  }
  async function typeset(container) {
    if (!window.MathJax) return;
    try { MathJax.typesetClear?.([container]); MathJax.texReset?.(); } catch (_) { }
    await (MathJax.typesetPromise ? MathJax.typesetPromise([container]) : MathJax.typeset([container]));
  }
  function listChapterFiguresAndTables(doc) {
    const figures = [], tables = [];
    $$('figure[id]', doc).forEach(fig => {
      const id = fig.id, caption = $('figcaption', fig)?.textContent?.trim() || id, isTable = !!fig.querySelector('table');
      const href = new URL(`${(STATE._chapterUrlResolved || chapterUrlAbs)}#${id}`, location.origin).toString();
      (isTable ? tables : figures).push({ id, caption, href });
    });
    return { figures, tables };
  }
  function renderRefLists(refs) {
    figsList.innerHTML = ''; tblList.innerHTML = '';
    refs.figures.forEach(f => {
      const div = document.createElement('div'); div.className = 'ref';
      div.innerHTML = `<label class="x"><input type="checkbox" data-id="${f.id}"><span>${escapeHtml(f.caption)}</span><a class="open" href="${f.href}" target="_blank" rel="noopener">open</a></label>`;
      figsList.appendChild(div);
    });
    refs.tables.forEach(t => {
      const div = document.createElement('div'); div.className = 'ref';
      div.innerHTML = `<label class="x"><input type="checkbox" data-id="${t.id}"><span>${escapeHtml(t.caption)}</span><a class="open" href="${t.href}" target="_blank" rel="noopener">open</a></label>`;
      tblList.appendChild(div);
    });
  }
  async function previewParagraph(doc) {
    const pre = doc.querySelector(`pre.osf#${CSS.escape(paraId)}`);
    if (!pre) { previewBox.innerHTML = `<div class="warn">Paragraph not found in chapter.</div>`; return; }
    previewBox.innerHTML = '';
    const clone = pre.cloneNode(true);
    $$('img', clone).forEach(img => img.removeAttribute('width'));
    previewBox.appendChild(clone);
    normalisePreviewAssets(previewBox);
    await typeset(previewBox);
    renderRefLists(listChapterFiguresAndTables(doc));
    copyBtn?.addEventListener('click', () => {
      const link = `${location.origin}${cafeBase}/${chapter}#${paraId}`;
      navigator.clipboard?.writeText(link).then(() => { copyBtn.classList.add('ok'); setTimeout(() => copyBtn.classList.remove('ok'), 1000); })
        .catch(() => alert('Could not copy link to clipboard.'));
    }, { once: true });
  }

  // ---- Thumbs / Viewer (B) --------------------------------------------------
  function thumbUrlForPage(n) { return `${cafeBase}/sources/thumbs/page-${pad3(n)}.jpg`; }
  function setActivePage(n, source = 'ui') {
    if (!n || n < 1) return;
    STATE.activePage = n;
    const url = thumbUrlForPage(n);
    pageImg.src = url; pageImg.alt = `Page ${n}`;
    pageImg.onerror = () => {
      pageImg.removeAttribute('src'); pageImg.alt = `Missing thumbnail for page ${n}`;
      warn(`Missing thumbnail: ${url}`);
    };
    highlightActiveThumb(n);
    scrollActiveThumbToCenter();
    pageImg.onload = () => {
      fitToViewer();
      computePageMillimeters();
      sizeOverlayToImage();
      drawGrid();
      drawMarkersForPage(n);
    };
    log('activePage <-', n, `(${source})`);
  }
  function renderThumbs() {
    const all = new Set(STATE.referencedPages);
    if (STATE.primaryPage) all.add(STATE.primaryPage);
    const ordered = Array.from(all).sort((a, b) => a - b);
    thumbsWrap.classList.add('thumbs');
    thumbsWrap.innerHTML = '';
    ordered.forEach(n => {
      const item = document.createElement('div');
      item.className = 'thumb' + (n === STATE.primaryPage ? ' primary' : '');
      item.dataset.page = String(n);
      const img = document.createElement('img');
      img.loading = 'lazy'; img.decoding = 'async'; img.src = thumbUrlForPage(n); img.alt = `p${n}`;
      img.onerror = () => { item.classList.add('missing'); };
      const tag = document.createElement('span'); tag.className = 'thumb-tag'; tag.textContent = `p${n}`;
      const del = document.createElement('button'); del.className = 'thumb-x'; del.type = 'button'; del.title = 'Invalidate ALL tokens for this page in the memo'; del.textContent = '×';
      del.addEventListener('click', (e) => { e.stopPropagation(); invalidateAllTokensForPage(n); });
      item.append(img, tag, del);
      item.addEventListener('click', () => setActivePage(n, 'thumb'));
      thumbsWrap.appendChild(item);
    });
    highlightActiveThumb(STATE.activePage ?? STATE.primaryPage);
    scrollActiveThumbToCenter();
  }
  function highlightActiveThumb(n) {
    $$('.thumb', thumbsWrap).forEach(el => el.classList.toggle('active', Number(el.dataset.page) === n));
  }
  function scrollActiveThumbToCenter() {
    const el = $('.thumb.active', thumbsWrap);
    if (!el || !thumbsWrap) return;
    const parent = thumbsWrap;
    const elCenter = el.offsetLeft + el.offsetWidth / 2;
    const target = Math.max(0, elCenter - parent.clientWidth / 2);
    parent.scrollTo({ left: target, behavior: 'smooth' });
  }

  // ---- Memo tokens (C) ------------------------------------------------------
  const TOKEN_RE_FULL = /\[(mm\|)?\s*(?:p|page)(\d+)\s*=\s*([^\]]+)\]/g;
  function indexTokens(text) {
    STATE.tokensByPage.clear();
    for (const m of text.matchAll(TOKEN_RE_FULL)) {
      const isInvalidated = /\[del\]\s*$/.test(text.slice(Math.max(0, m.index - 6), m.index));
      if (isInvalidated) continue;
      const page = Number(m[2]);
      const rhs = m[3].trim().replace(/^"|"$/g, '');
      const parts = rhs.split(':').map(s => s.trim());
      let label = "label";
      if (parts.length >= 2 && /^".*"$/.test(parts[parts.length - 1])) label = parts.pop().slice(1, -1);
      else if (parts.length >= 3 && /^".*"$/.test(parts[2])) label = parts[2].slice(1, -1);
      const parsePair = (p) => p.split(',').map(v => Number(v.trim()));
      const p1 = parsePair(parts[0] || '0,0');
      const isBox = parts.length >= 2 && parts[1] && !parts[1].startsWith('"');
      const p2 = isBox ? parsePair(parts[1]) : null;
      const entry = { kind: isBox ? 'box' : 'point', p1, p2, label };
      if (!STATE.tokensByPage.has(page)) STATE.tokensByPage.set(page, []);
      STATE.tokensByPage.get(page).push(entry);
    }
    STATE.referencedPages = new Set([...STATE.tokensByPage.keys()]);
  }
  function invalidateAllTokensForPage(pageN) {
    const text = memoTa.value;
    const updated = text.replace(/\[mm\|\s*(?:p|page)(\d+)\s*=[^\]]*?\]|\[\s*(?:p|page)(\d+)\s*=[^\]]*?\]/g,
      (match, p1, p2, offset, whole) => {
        const num = Number(p1 || p2);
        if (num !== pageN) return match;
        const before = whole.slice(Math.max(0, offset - 6), offset);
        if (/\[del\]\s*$/.test(before)) return match;
        return match.replace(/^\[/, '[del]');
      });
    if (updated !== text) { memoTa.value = updated; onMemoChange(); }
  }
  function onMemoChange() {
    autosaveMarkDirty();
    autosaveSchedule();
    indexTokens(memoTa.value);
    renderThumbs();
    drawGrid();
    drawMarkersForPage(STATE.activePage);
    renderMemoPreview(memoTa.value);
    persistDraftDraftlist();
  }

  // ---- Markdown + LaTeX preview (E) + Pop-out sync --------------------------
  function renderMemoPreview(text) {
    try {
      memoPrev.innerHTML = (window.marked?.parse ? window.marked.parse(text) : escapeHtml(text));
      typeset(memoPrev);
      pushPreviewToWindow();   // keep pop-out in sync
    } catch {
      memoPrev.innerHTML = `<div class="warn">Preview failed to render.</div>`;
    }
  }

  // ==== DRAFTS MANAGER (SAFE + SEARCH) ======================================
  const LS_KEY = 'ro:memos';
  function ensureDraftsControls() {
    if (!memoList) return;
    if (document.getElementById('draftsControls')) return;
    const wrap = document.createElement('div');
    wrap.id = 'draftsControls'; wrap.className = 'bar';

    const btnShowAll = document.createElement('button');
    btnShowAll.className = 'btn btn-sm'; btnShowAll.id = 'btnShowAllDrafts'; btnShowAll.textContent = 'Show all drafts';

    const btnShowCurrent = document.createElement('button');
    btnShowCurrent.className = 'btn btn-sm'; btnShowCurrent.id = 'btnShowCurrentDrafts'; btnShowCurrent.textContent = 'Show only this paragraph';

    const search = document.createElement('input');
    search.id = 'draftSearch'; search.type = 'search';
    search.placeholder = 'Filter drafts… (text / chapter / para)';
    search.className = 'mono';
    search.style.cssText = 'flex:1; min-width:220px; padding:6px 8px; border-radius:8px; border:1px solid rgba(255,255,255,.16); background:#0f141a; color:#e7edf3;';

    const countBadge = document.createElement('span');
    countBadge.className = 'tag draft-count'; countBadge.style.marginLeft = 'auto';

    memoList.parentElement.insertBefore(wrap, memoList);
    wrap.append(btnShowAll, btnShowCurrent, search, countBadge);

    const getQ = () => (search.value || '').trim();
    const debounced = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

    btnShowAll.addEventListener('click', () => renderDraftList(loadAllDrafts(), 'all', getQ()));
    btnShowCurrent.addEventListener('click', () => renderDraftList(loadAllDrafts(), 'current', getQ()));
    search.addEventListener('input', debounced(() => renderDraftList(loadAllDrafts(), memoList.dataset.filter || 'all', getQ())));
  }
  function loadAllDrafts() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
  }
  function saveAllDrafts(arr) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0, 200))); } catch (_) { }
  }
  function persistDraftDraftlist() {
    const arr = loadAllDrafts();
    const payload = { ts: Date.now(), chapter, paraId, body: memoTa.value };
    const idx = arr.findIndex(x => x.chapter === chapter && x.paraId === paraId);
    if (idx >= 0) arr[idx] = payload; else arr.unshift(payload);
    saveAllDrafts(arr);
    const filter = memoList.dataset.filter || 'current';
    const q = (document.getElementById('draftSearch')?.value || '').trim();
    renderDraftList(arr, filter, q);
  }
  function renderDraftList(arr, filter = 'current', query = '') {
    ensureDraftsControls();
    memoList.dataset.filter = filter;
    const q = query.toLowerCase();
    const matchesQuery = (d) => {
      if (!q) return true;
      return (d.body || '').toLowerCase().includes(q)
        || (d.chapter || '').toLowerCase().includes(q)
        || (d.paraId || '').toLowerCase().includes(q);
    };
    const isCurrent = (d) => d.chapter === chapter && d.paraId === paraId;
    let list = (filter === 'all') ? arr : arr.filter(isCurrent);
    list = list.filter(matchesQuery).sort((a, b) => b.ts - a.ts);
    memoList.innerHTML = '';
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = (filter === 'all')
        ? (q ? 'No drafts match your search.' : 'No drafts stored in this browser yet.')
        : (q ? 'No drafts for this paragraph match your search.' : 'No drafts for this paragraph yet.');
      memoList.appendChild(empty);
    } else {
      list.forEach((d) => {
        const row = document.createElement('div');
        row.className = 'item'; row.style.alignItems = 'center';
        const info = document.createElement('div');
        info.innerHTML = `
          <div class="mono muted">${new Date(d.ts).toLocaleString()}</div>
          <div class="mono" style="opacity:.9">${escapeHtml((d.body || '').slice(0, 140))}${(d.body || '').length > 140 ? '…' : ''}</div>
          <div class="mono" style="opacity:.7;margin-top:4px">chapter: ${escapeHtml(d.chapter)} • para: ${escapeHtml(d.paraId)}</div>`;
        const actions = document.createElement('div');
        actions.style.display = 'flex'; actions.style.gap = '6px';
        const btnHere = document.createElement('button');
        btnHere.className = 'btn btn-sm'; btnHere.textContent = 'Open here';
        const isHere = (d.chapter === chapter && d.paraId === paraId);
        btnHere.disabled = !isHere;
        btnHere.title = isHere ? 'Load into the current memo' : 'Draft belongs to a different paragraph';
        btnHere.addEventListener('click', () => {
          const prev = memoTa.value; memoTa.value = d.body || ''; onMemoChange();
          const end = memoTa.value.length; memoTa.setSelectionRange(end, end); memoTa.focus({ preventScroll: true });
          const s = document.getElementById('memoStatus'); if (s) s.innerHTML += ` <span class="tag">Opened</span>`;
        });
        const btnOpen = document.createElement('button');
        btnOpen.className = 'btn btn-sm'; btnOpen.textContent = 'Open'; btnOpen.title = 'Navigate to this draft’s paragraph';
        btnOpen.addEventListener('click', () => {
          const base = location.origin + location.pathname;
          const url = `${base}?chapter=${encodeURIComponent(d.chapter)}&para=${encodeURIComponent(d.paraId)}${rodebug ? '&rodebug=1' : ''}`;
          location.href = url;
        });
        const btnDel = document.createElement('button');
        btnDel.className = 'btn btn-sm'; btnDel.textContent = 'Delete'; btnDel.title = 'Remove this draft from browser storage';
        btnDel.addEventListener('click', () => {
          if (!confirm('Delete this draft from this browser?')) return;
          const all = loadAllDrafts();
          const idx = all.findIndex(x => x.ts === d.ts && x.chapter === d.chapter && x.paraId === d.paraId);
          if (idx >= 0) { all.splice(idx, 1); saveAllDrafts(all); renderDraftList(all, filter, query); }
        });
        actions.append(btnHere, btnOpen, btnDel);
        row.append(info, actions); memoList.appendChild(row);
      });
    }
    const badge = document.querySelector('#draftsControls .draft-count');
    if (badge) badge.textContent = `count: ${arr.length}`;
  }

  // ---- Page metrics & grid --------------------------------------------------
  function computePageMillimeters() {
    const iw = pageImg.naturalWidth, ih = pageImg.naturalHeight;
    if (!iw || !ih) { STATE.pageMM = { w: 210, h: 297, standard: 'A4' }; return; }
    const r = ih / iw;
    const a4 = 297 / 210, letter = 279 / 216;
    const diffA4 = Math.abs(r - a4), diffL = Math.abs(r - letter);
    if (diffA4 < 0.06) STATE.pageMM = { w: 210, h: 297, standard: 'A4' };
    else if (diffL < 0.06) STATE.pageMM = { w: 216, h: 279, standard: 'Letter' };
    else { STATE.pageMM = { w: 210, h: Math.round(210 * r), standard: 'Custom' }; }
  }
  function sizeOverlayToImage() {
    overlay.width = pageImg.naturalWidth || overlay.width;
    overlay.height = pageImg.naturalHeight || overlay.height;
  }
  function drawGrid() {
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const { w: mmW, h: mmH } = STATE.pageMM;
    const pxPerMMx = overlay.width / mmW;
    const pxPerMMy = overlay.height / mmH;
    ctx.save(); ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    for (let x = 5; x < mmW; x += 5) { const px = Math.round(x * pxPerMMx) + 0.5; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, overlay.height); ctx.stroke(); }
    for (let y = 5; y < mmH; y += 5) { const py = Math.round(y * pxPerMMy) + 0.5; ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(overlay.width, py); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px ui-monospace, monospace'; ctx.textBaseline = 'top';
    for (let x = 10; x < mmW; x += 10) { const px = Math.round(x * pxPerMMx) + 0.5; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, overlay.height); ctx.stroke(); ctx.fillText(String(x), px + 2, 2); }
    for (let y = 10; y < mmH; y += 10) { const py = Math.round(y * pxPerMMy) + 0.5; ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(overlay.width, py); ctx.stroke(); ctx.fillText(String(y), 2, py + 2); }
    ctx.strokeStyle = 'rgba(255,179,71,0.55)'; ctx.lineWidth = 2; ctx.strokeRect(0.5, 0.5, overlay.width - 1, overlay.height - 1);
    ctx.restore();
  }
  function drawMarkersForPage(page) {
    if (!page) { drawGrid(); return; }
    drawGrid();
    const ctx = overlay.getContext('2d');
    const toks = STATE.tokensByPage.get(page) || [];
    const { w: mmW, h: mmH } = STATE.pageMM;
    const pxPerMMx = overlay.width / mmW;
    const pxPerMMy = overlay.height / mmH;
    ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(129,169,255,0.95)'; ctx.fillStyle = 'rgba(129,169,255,0.18)';
    ctx.font = '12px ui-monospace, monospace'; ctx.textBaseline = 'bottom';
    const toPx = ([a, b]) => {
      const useNorm = (a <= 1 && b <= 1);
      const x = useNorm ? a * overlay.width : a * pxPerMMx;
      const y = useNorm ? b * overlay.height : b * pxPerMMy;
      return [x, y];
    };
    toks.forEach(t => {
      if (t.kind === 'point') {
        const [x, y] = toPx(t.p1);
        ctx.beginPath(); ctx.arc(x, y, Math.max(overlay.width, overlay.height) * 0.006, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke(); ctx.fillText(t.label || 'label', x + 6, y - 4);
      } else {
        const [x1, y1] = toPx(t.p1); const [x2, y2] = toPx(t.p2);
        const left = Math.min(x1, x2), top = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
        ctx.fillRect(left, top, w, h); ctx.strokeRect(left, top, w, h); ctx.fillText(t.label || 'label', left + 4, top + h - 4);
      }
    });
    ctx.restore();
  }

  // ---- Viewer tools: pan/zoom/draw -----------------------------------------
  function applyTransform() { stage.style.transform = `translate(${STATE.tx}px, ${STATE.ty}px) scale(${STATE.scale})`; updateZoomUI(); }
  function fitToViewer() {
    if (!pageImg.complete || !pageImg.naturalWidth) { STATE.scale = 1; STATE.tx = 0; STATE.ty = 0; applyTransform(); return; }
    const vw = viewer.clientWidth, vh = viewer.clientHeight;
    const iw = pageImg.naturalWidth, ih = pageImg.naturalHeight;
    const s = Math.min(vw / iw, vh / ih);
    STATE.scale = clamp(s, MIN_SCALE, MAX_SCALE);
    STATE.tx = (vw - iw * STATE.scale) / 2; STATE.ty = (vh - ih * STATE.scale) / 2; applyTransform();
  }
  function onWheel(ev) {
    if (!(ev.ctrlKey || ev.shiftKey)) return;
    ev.preventDefault();
    const r = viewer.getBoundingClientRect();
    const mx = ev.clientX - r.left, my = ev.clientY - r.top;
    const ix = (mx - STATE.tx) / STATE.scale;
    const iy = (my - STATE.ty) / STATE.scale;
    const delta = (ev.deltaY < 0 ? -0.1 : 0.1);
    const nextScale = clamp(STATE.scale + delta, MIN_SCALE, MAX_SCALE);
    STATE.tx = mx - ix * nextScale; STATE.ty = my - iy * nextScale; STATE.scale = nextScale; applyTransform();
  }
  function setTool(name) {
    STATE.tool = name;
    [toolPanBtn, toolPointBtn, toolBoxBtn].forEach(b => b && b.classList.remove('active'));
    const map = { pan: toolPanBtn, point: toolPointBtn, box: toolBoxBtn };
    map[name]?.classList.add('active');
    viewer.classList.toggle('cursor-cross', name !== 'pan');
  }
  function toImageSpace(clientX, clientY) {
    const r = viewer.getBoundingClientRect();
    const x = (clientX - r.left - STATE.tx) / STATE.scale;
    const y = (clientY - r.top - STATE.ty) / STATE.scale;
    return { x, y };
  }
  function onMouseDown(ev) {
    const p = toImageSpace(ev.clientX, ev.clientY);
    if (STATE.tool === 'pan') {
      STATE.dragging = true; STATE.dragStart = { x: ev.clientX - STATE.tx, y: ev.clientY - STATE.ty }; return;
    }
    if (STATE.tool === 'point') {
      const mm = toMillimeters(p.x, p.y, true); appendPointToken(mm.x, mm.y); drawMarkersForPage(STATE.activePage); return;
    }
    if (STATE.tool === 'box') {
      STATE.dragging = true; STATE.boxStart = p; drawLiveBox(p.x, p.y, p.x, p.y);
    }
  }
  function onMouseMove(ev) {
    if (!STATE.dragging) return;
    if (STATE.tool === 'pan') { STATE.tx = ev.clientX - STATE.dragStart.x; STATE.ty = ev.clientY - STATE.dragStart.y; applyTransform(); return; }
    if (STATE.tool === 'box') { const p = toImageSpace(ev.clientX, ev.clientY); drawLiveBox(STATE.boxStart.x, STATE.boxStart.y, p.x, p.y); }
  }
  function onMouseUp(ev) {
    if (!STATE.dragging) return;
    if (STATE.tool === 'box') {
      const end = toImageSpace(ev.clientX, ev.clientY);
      const a = toMillimeters(STATE.boxStart.x, STATE.boxStart.y, true);
      const b = toMillimeters(end.x, end.y, true);
      appendBoxToken(a.x, a.y, b.x, b.y); drawMarkersForPage(STATE.activePage);
    }
    STATE.dragging = false; STATE.boxStart = null;
  }
  function drawLiveBox(x1, y1, x2, y2) {
    drawGrid();
    const ctx = overlay.getContext('2d');
    const left = Math.min(x1, x2), top = Math.min(y1, y2);
    const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    ctx.save(); ctx.strokeStyle = 'rgba(129,169,255,0.95)'; ctx.fillStyle = 'rgba(129,169,255,0.18)'; ctx.lineWidth = 2;
    ctx.fillRect(left, top, w, h); ctx.strokeRect(left, top, w, h); ctx.restore();
  }
  function toMillimeters(xImg, yImg, roundWhole) {
    const { w: mmW, h: mmH } = STATE.pageMM;
    const x = xImg / overlay.width * mmW;
    const y = yImg / overlay.height * mmH;
    return { x: roundWhole ? Math.round(x) : x, y: roundWhole ? Math.round(y) : y };
  }
  function appendPointToken(xmm, ymm) {
    if (STATE.activePage == null) return;
    const token = `[mm|p${STATE.activePage}=${xmm},${ymm}:"label"]`;
    insertAtCaret(memoTa, token + '\n'); onMemoChange();
  }
  function appendBoxToken(x1mm, y1mm, x2mm, y2mm) {
    if (STATE.activePage == null) return;
    const token = `[mm|p${STATE.activePage}=${x1mm},${y1mm}:${x2mm},${y2mm}:"label"]`;
    insertAtCaret(memoTa, token + '\n'); onMemoChange();
  }
  function insertAtCaret(el, text) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start), after = el.value.slice(end);
    el.value = before + text + after;
    const pos = start + text.length;
    el.setSelectionRange(pos, pos); el.focus({ preventScroll: true });
  }

  // ---- Zen Flow AUTOSAVE ----------------------------------------------------
  const AS_KEY = (chapter && paraId) ? `ro:autosave:${chapter}|${paraId}` : 'ro:autosave';
  const AH_KEY = `${AS_KEY}:history`;    // ring buffer
  const AC_KEY = `${AS_KEY}:caret`;      // caret/selection
  let AS_timer = null, undoTimer = null;
  const now = () => Date.now();
  const fmt = (ts) => new Date(ts).toLocaleTimeString();
  const online = () => navigator.onLine;

  // Status line (reuses existing #memoStatus OR injects one)
  let memoStatus, historyBtn, historyPane;
  function ensureStatusUI() {
    if (!memoStatus) {
      memoStatus = document.getElementById('memoStatus');
      if (!memoStatus) {
        memoStatus = document.createElement('div');
        memoStatus.id = 'memoStatus'; memoStatus.className = 'mono muted';
        memoStatus.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:6px;font-size:12px;opacity:.9';
        memoTa.parentElement.insertBefore(memoStatus, memoTa);
      }
    }
    if (!historyPane) {
      historyPane = document.getElementById('histToggle');
      if (!historyPane) {
        historyPane = document.createElement('div');
        historyPane.style.cssText = 'display:none;position:relative;margin-top:6px;';
        const list = document.createElement('div'); list.id = 'historyList'; list.className = 'list';
        list.style.maxHeight = '180px'; list.style.overflow = 'auto'; historyPane.appendChild(list);
        memoTa.parentElement.appendChild(historyPane);
      }
    }
    if (!historyBtn) {
      historyBtn = document.createElement('button'); historyBtn.type = 'button'; historyBtn.className = 'btn btn-sm';
      historyBtn.textContent = 'History'; historyBtn.style.marginLeft = '8px'; historyBtn.addEventListener('click', toggleHistory);
    }
    if (!memoStatus.contains(historyBtn)) memoStatus.appendChild(historyBtn);
  }
  function setStatus(text) {
    ensureStatusUI();
    const dot = online() ? '🟢' : '⚪';
    memoStatus.innerHTML = `<span>${dot}</span><span>${escapeHtml(text)}</span>`;
    memoStatus.appendChild(historyBtn);
  }
  function saveCaret() {
    try {
      const pos = { start: memoTa.selectionStart || 0, end: memoTa.selectionEnd || 0, ts: now() };
      localStorage.setItem(AC_KEY, JSON.stringify(pos));
    } catch (_) { }
  }
  function restoreCaret() {
    try {
      const raw = localStorage.getItem(AC_KEY); if (!raw) return;
      const pos = JSON.parse(raw);
      const len = memoTa.value.length;
      const s = Math.min(pos.start ?? 0, len), e = Math.min(pos.end ?? s, len);
      memoTa.setSelectionRange(s, e); memoTa.focus({ preventScroll: true });
    } catch (_) { }
  }
  function historyPushSnapshot(ts, body) {
    try {
      const arr = JSON.parse(localStorage.getItem(AH_KEY) || '[]'); arr.unshift({ ts, body });
      localStorage.setItem(AH_KEY, JSON.stringify(arr.slice(0, 10)));
    } catch (_) { }
  }
  function renderHistory() {
    ensureStatusUI();
    const list = document.getElementById('histList') || document.getElementById('historyList');
    if (!list) return;
    const arr = JSON.parse(localStorage.getItem(AH_KEY) || '[]');
    list.innerHTML = '';
    if (!arr.length) { const d = document.createElement('div'); d.className = 'muted'; d.textContent = 'No snapshots yet.'; list.appendChild(d); return; }
    arr.forEach((s) => {
      const row = document.createElement('div'); row.className = 'item'; row.style.alignItems = 'center';
      row.innerHTML = `<div class="mono muted">${new Date(s.ts).toLocaleString()}</div>`;
      const btn = document.createElement('button'); btn.className = 'btn btn-sm'; btn.textContent = 'Restore';
      btn.addEventListener('click', () => {
        const prev = memoTa.value; memoTa.value = s.body; onMemoChange();
        setStatus(`Restored from history · ${new Date(s.ts).toLocaleTimeString()}`); offerUndo(prev);
      });
      row.appendChild(btn); list.appendChild(row);
    });
    if (historyPane && historyPane.tagName === 'DETAILS') historyPane.open = true;
  }
  function toggleHistory() {
    ensureStatusUI();
    if (historyPane && historyPane.tagName === 'DETAILS') {
      historyPane.open = !historyPane.open; if (historyPane.open) renderHistory(); return;
    }
    const visible = historyPane.style.display !== 'none';
    if (visible) { historyPane.style.display = 'none'; return; }
    renderHistory(); historyPane.style.display = 'block';
  }
  function autosaveNow(force = false) {
    try {
      const payload = { ts: now(), chapter, paraId, body: memoTa.value };
      const last = JSON.parse(localStorage.getItem(AS_KEY) || 'null');
      const changed = force || !last || last.body !== payload.body;
      if (changed) {
        localStorage.setItem(AS_KEY, JSON.stringify(payload));
        sessionStorage.setItem(AS_KEY, JSON.stringify(payload));
        historyPushSnapshot(payload.ts, payload.body);
        setStatus(`Saved ✓ ${fmt(payload.ts)}`);
      } else { setStatus(`Saved ✓ ${fmt(last.ts)}`); }
      saveCaret();
    } catch (e) { setStatus('Save error (localStorage)'); console.warn(e); }
  }
  function autosaveSchedule() { clearTimeout(AS_timer); AS_timer = setTimeout(() => autosaveNow(false), 400); }
  function autosaveMarkDirty() { setStatus('Saving…'); }

  function offerUndo(prevBody) {
    ensureStatusUI();
    const undo = document.createElement('button'); undo.className = 'btn btn-sm'; undo.textContent = 'Undo restore';
    const clearUndo = () => { undo.remove(); if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; } };
    undo.addEventListener('click', () => { memoTa.value = prevBody; onMemoChange(); setStatus('Undo complete'); clearUndo(); });
    memoStatus.appendChild(undo);
    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = setTimeout(clearUndo, 60000);
  }
  window.addEventListener('beforeunload', () => { autosaveNow(true); });
  window.addEventListener('online', () => setStatus('Online'));
  window.addEventListener('offline', () => setStatus('Offline (local saves only)'));

  // ---- Pop-out Live Preview -------------------------------------------------
  let previewWin = null;
  function openPreviewWindow() {
    let w = null;
    try { w = window.open('about:blank', 'ro_live_preview', 'width=700,height=900'); } catch (_) { }
    if (!w) {
      const html = buildPreviewHtml();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.target = 'ro_live_preview'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      try { w = window.open('', 'ro_live_preview'); } catch (_) { }
      if (!w) { alert('Popup was blocked. Tip: allow popups for this site or Ctrl/Cmd–click the button.'); return; }
    }
    if (w.document && !w.document.body.childElementCount) { w.document.open(); w.document.write(buildPreviewHtml()); w.document.close(); }
    previewWin = w; pushPreviewToWindow();
    function buildPreviewHtml() {
      const css = `
        body{ margin:0; font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background:#0B1117; color:#E6EDF3; }
        header{ position:sticky; top:0; padding:8px 12px; background:#0F141A; border-bottom:1px solid #1f2a36; display:flex; justify-content:space-between; align-items:center;}
        #container{ padding:16px; }
        .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size:12px; opacity:.75 }
      `;
      const mjScript = document.getElementById('mathjax-script');
      const mjPath = mjScript ? mjScript.getAttribute('src') : '/js/vendor/MathJax/tex-mml-chtml.js';
      const mjCfgEl = document.getElementById('mathjax-config');
      const mjCfg = mjCfgEl ? mjCfgEl.textContent : 'window.MathJax = { tex: { inlineMath: [[\'$\',\'$\'], [\'\\\\(\',\'\\\\)\']] } }';
      return `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>Live Preview</title>
<style>${css}</style>
<script id="mathjax-config">${mjCfg}</script>
<script src="${mjPath}"></script>
</head>
<body>
  <header><strong>Live Preview</strong><span class="mono" id="stamp"></span></header>
  <div id="container"></div>
  <script>
    function typeset(c){ try{ MathJax.typesetClear?.([c]); MathJax.texReset?.(); }catch(_){} return (MathJax.typesetPromise?MathJax.typesetPromise([c]):MathJax.typeset([c])); }
    window.addEventListener('message', async (ev) => {
      const d = ev.data || {}; if (d.kind !== 'ro_preview') return;
      const el = document.getElementById('container'); el.innerHTML = d.html;
      document.getElementById('stamp').textContent = new Date(d.ts).toLocaleTimeString();
      await typeset(el);
    });
  </script>
</body></html>`;
    }
  }
  function pushPreviewToWindow() {
    try { if (previewWin && !previewWin.closed) { previewWin.postMessage({ kind: 'ro_preview', html: memoPrev.innerHTML, ts: Date.now() }, '*'); } } catch (_) { }
  }
  function ensurePopPreviewButton() {
    let head = null;
    if (memoPrev) {
      head = memoPrev.previousElementSibling && memoPrev.previousElementSibling.classList.contains('head')
        ? memoPrev.previousElementSibling
        : memoPrev.parentElement && memoPrev.parentElement.previousElementSibling && memoPrev.parentElement.previousElementSibling.classList.contains('head')
          ? memoPrev.parentElement.previousElementSibling
          : null;
    }
    const makeFloating = () => {
      if (document.getElementById('popPreviewBtn')) return;
      const btn = document.createElement('button'); btn.id = 'popPreviewBtn'; btn.className = 'btn btn-sm'; btn.textContent = 'Pop-out Preview';
      btn.style.cssText = 'position:sticky; left:100%; transform:translateX(-100%); margin:-8px 0 8px 0;';
      memoPrev?.parentElement?.insertBefore(btn, memoPrev); btn.addEventListener('click', openPreviewWindow);
    };
    if (head) {
      if (head.querySelector('#popPreviewBtn')) return;
      const btn = document.createElement('button'); btn.id = 'popPreviewBtn'; btn.className = 'btn btn-sm'; btn.textContent = 'Pop-out Preview'; btn.style.marginLeft = '8px';
      head.appendChild(btn); btn.addEventListener('click', openPreviewWindow);
    } else { makeFloating(); }
  }

  // ---- UX -------------------------------------------------------------------
  function warn(msg) { const tag = document.createElement('span'); tag.className = 'tag warn'; tag.textContent = msg; statusLine.appendChild(tag); log('WARN:', msg); }

  // ---- Boot -----------------------------------------------------------------
  async function init() {
    cafeNameEl.textContent = cafeSlug;
    chapNameEl.textContent = chapterFile.replace(/\.html$/, ''); setBackLink(); setBadge(paraNumberFrom(paraId));
    if (!paraId || !chapter) { previewBox.innerHTML = `<div class="warn">Missing or invalid query parameters.</div>`; return; }

    // tools
    setTool('pan');
    toolPanBtn?.addEventListener('click', () => setTool('pan'));
    toolPointBtn?.addEventListener('click', () => setTool('point'));
    toolBoxBtn?.addEventListener('click', () => setTool('box'));

    zoomSlider?.addEventListener('input', () => {
      const r = viewer.getBoundingClientRect();
      const cx = r.width / 2, cy = r.height / 2;
      const ix = (cx - STATE.tx) / STATE.scale;
      const iy = (cy - STATE.ty) / STATE.scale;
      const nextScale = clamp(sliderToScale(zoomSlider.value), MIN_SCALE, MAX_SCALE);
      STATE.tx = cx - ix * nextScale; STATE.ty = cy - iy * nextScale; STATE.scale = nextScale; applyTransform();
    });
    zoomFitBtn?.addEventListener('click', () => { fitToViewer(); });
    zoom100Btn?.addEventListener('click', () => { STATE.scale = 1; applyTransform(); });

    viewer.addEventListener('wheel', onWheel, { passive: false });
    viewer.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    btnPrev?.addEventListener('click', () => setActivePage((STATE.activePage || 1) - 1, 'prev'));
    btnNext?.addEventListener('click', () => setActivePage((STATE.activePage || 1) + 1, 'next'));
    btnPrimary?.addEventListener('click', () => setActivePage(STATE.primaryPage, 'primary'));
    btnAddRef?.addEventListener('click', () => {
      if (STATE.activePage == null) return;
      const token = `[mm|p${STATE.activePage}=0,0:"label"]`; insertAtCaret(memoTa, token + '\n'); onMemoChange();
    });

    const refit = () => { if (pageImg?.naturalWidth) fitToViewer(); };
    const ro = new ResizeObserver(refit); if (viewer) ro.observe(viewer);
    window.addEventListener('resize', refit);

    ensureStatusUI();
    try {
      const raw = localStorage.getItem(AS_KEY) || sessionStorage.getItem(AS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if ((memoTa.value.trim() === '') && (saved.body?.trim())) {
          const prev = memoTa.value; memoTa.value = saved.body; onMemoChange();
          setStatus(`Restored ✓ ${new Date(saved.ts).toLocaleTimeString()}`); offerUndo(prev); restoreCaret();
        } else { setStatus('Ready'); }
      } else setStatus('Ready');
    } catch { setStatus('Autosave unavailable'); }

    try {
      const doc = await loadChapterDom(); STATE.chapterDoc = doc;
      const res = await resolvePrimaryPage(doc); STATE.primaryPage = res.chosen; setStatus(res);
      await previewParagraph(doc);
      ensurePopPreviewButton();
      indexTokens(memoTa.value); renderThumbs();
      setActivePage(STATE.primaryPage, 'resolver');
      memoTa.addEventListener('input', onMemoChange);
      if (typeof saveCaret === 'function') {
        memoTa.addEventListener('keyup', saveCaret);
        memoTa.addEventListener('click', saveCaret);
      }
      renderDraftList(loadAllDrafts(), 'all', '');
      $('#saveDraft')?.addEventListener('click', () => { persistDraftDraftlist(); const btn = $('#saveDraft'); btn?.classList.add('ok'); setTimeout(() => btn?.classList.remove('ok'), 800); });
      $('#exportJson')?.addEventListener('click', () => {
        const fileName = `memo_${chapterSlug}_${paraId}.json`;
        const blob = new Blob([JSON.stringify({ chapter, paraId, body: memoTa.value, pages: Array.from(STATE.referencedPages), primary: STATE.primaryPage }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName; a.click(); URL.revokeObjectURL(a.href);
      });
      $('#submitDiscord')?.addEventListener('click', () => alert('Discord submission wiring is stubbed here.'));
    } catch (err) {
      console.error('[research-office] failed:', err);
      previewBox.innerHTML = `<div class="warn">Failed to load the chapter or paragraph preview.<br><span class="mono" style="opacity:.8">${String(err && err.message || err)}</span></div>`;
      warn('Resolver failed.');
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
