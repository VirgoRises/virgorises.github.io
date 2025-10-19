/* Research Office Controller
   A: Resolver   B: Viewer + Thumbs   C: Memo↔Thumbs   E: Markdown+LaTeX
   ++ Millimeter page grid + token-driven markers, auto-insert on draw
*/
(() => {
  const $  = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  // ---- Params ---------------------------------------------------------------
  const params    = new URLSearchParams(location.search);
  const paraId    = params.get('para') || '';
  const chapter   = decodeURIComponent(params.get('chapter')||'');
  const retUrl    = decodeURIComponent(params.get('return')||'');
  const rodebug   = params.get('rodebug') === '1';
  const cafeSlug  = (location.pathname.split('/').filter(Boolean)[1]) || 'zeta-zero-cafe';

  const cafeBase      = `/cafes/${cafeSlug}`;
  const chapterFile   = chapter.split('/').pop() || '';
  const chapterSlug   = chapterFile.replace(/\.html$/,'');
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
  const thumbsWrap  = $('#pageChips'); // thumbnails container

  const viewer      = $('#viewer');
  const stage       = $('#stage');
  const pageImg     = $('#pageImg');
  const overlay     = $('#overlay');

  // Tools
  const toolPanBtn   = $('#toolPan');
  const toolPointBtn = $('#toolPoint');
  const toolBoxBtn   = $('#toolBox');
  const zoomSlider   = $('#zoomSlider');
  const zoomRead     = $('#zoomRead');
  const zoomFitBtn   = $('#zoomFit');
  const zoom100Btn   = $('#zoom100');

  const memoTa      = $('#memoBody');
  const memoPrev    = $('#memoPreview');
  const memoList    = $('#memoList');

  // ---- State ----------------------------------------------------------------
  const STATE = {
    chapterDoc: null,
    primaryPage: null,
    referencedPages: new Set(),
    activePage: null,
    // token index (parsed) for quick redraw: page -> [{kind, coords, label}]
    tokensByPage: new Map(),

    // viewer transform
    scale: 1,
    tx: 0, ty: 0,
    dragging: false,
    dragStart: {x:0, y:0},
    tool: 'pan', // 'pan' | 'point' | 'box'
    boxStart: null,

    // page metric in millimeters, chosen by aspect ratio
    pageMM: { w: 210, h: 297, standard: 'A4' }, // default
  };

  // ---- Utils ----------------------------------------------------------------
  const log  = (...a) => rodebug && console.debug('[RO]', ...a);
  const pad3 = n => String(n).padStart(3,'0');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function paraNumberFrom(para) {
    const m = String(para).match(/osf-(\d+)/);
    return m ? Number(m[1]) : null;
  }
  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function setBadge(n) {
    if (!numBadge) return;
    numBadge.textContent = n != null ? `#${n}` : '#';
    numBadge.title = n != null ? `Paragraph ${n}` : '';
  }
  function setBackLink() {
    const href = retUrl || `${cafeBase}/${chapter}`;
    backBtn?.addEventListener('click', e => { e.preventDefault(); location.href = href; });
  }

  // ---- Resolver (A) ---------------------------------------------------------
  async function fetchText(url){ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error(`HTTP ${r.status} for ${url}`); return r.text(); }
  async function loadChapterDom(){ return new DOMParser().parseFromString(await fetchText(chapterUrlAbs),'text/html'); }

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
    } catch (_) {}
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
    $$('img', container).forEach(img => { img.style.maxWidth='100%'; img.style.height='auto'; img.style.display='block'; img.style.margin='0 auto'; });
  }
  async function typeset(container){
    if (!window.MathJax) return;
    try { MathJax.typesetClear?.([container]); MathJax.texReset?.(); } catch(_){}
    await (MathJax.typesetPromise ? MathJax.typesetPromise([container]) : MathJax.typeset([container]));
  }
  function listChapterFiguresAndTables(doc){
    const figures=[], tables=[];
    $$('figure[id]', doc).forEach(fig=>{
      const id=fig.id, caption=$('figcaption',fig)?.textContent?.trim()||id, isTable=!!fig.querySelector('table');
      const href = new URL(`${chapterUrlAbs}#${id}`, location.origin).toString();
      (isTable?tables:figures).push({ id, caption, href });
    });
    return { figures, tables };
  }
  function renderRefLists(refs){
    figsList.innerHTML=''; tblList.innerHTML='';
    refs.figures.forEach(f=>{
      const div=document.createElement('div'); div.className='ref';
      div.innerHTML=`<label class="x"><input type="checkbox" data-id="${f.id}"><span>${escapeHtml(f.caption)}</span><a class="open" href="${f.href}" target="_blank" rel="noopener">open</a></label>`;
      figsList.appendChild(div);
    });
    refs.tables.forEach(t=>{
      const div=document.createElement('div'); div.className='ref';
      div.innerHTML=`<label class="x"><input type="checkbox" data-id="${t.id}"><span>${escapeHtml(t.caption)}</span><a class="open" href="${t.href}" target="_blank" rel="noopener">open</a></label>`;
      tblList.appendChild(div);
    });
  }
  async function previewParagraph(doc){
    const pre = doc.querySelector(`pre.osf#${CSS.escape(paraId)}`);
    if (!pre) { previewBox.innerHTML = `<div class="warn">Paragraph not found in chapter.</div>`; return; }
    previewBox.innerHTML=''; const clone=pre.cloneNode(true);
    $$('img', clone).forEach(img=>img.removeAttribute('width'));
    previewBox.appendChild(clone); normalisePreviewAssets(previewBox); await typeset(previewBox);
    renderRefLists(listChapterFiguresAndTables(doc));
    copyBtn?.addEventListener('click', () => {
      const link = `${location.origin}${cafeBase}/${chapter}#${paraId}`;
      navigator.clipboard?.writeText(link).then(()=>{ copyBtn.classList.add('ok'); setTimeout(()=>copyBtn.classList.remove('ok'), 1000); })
      .catch(()=>alert('Could not copy link to clipboard.'));
    }, { once: true });
  }

  // ---- Thumbs / Viewer (B) --------------------------------------------------
  function thumbUrlForPage(n){ return `${cafeBase}/sources/thumbs/page-${pad3(n)}.jpg`; }

  function setActivePage(n, source='ui') {
    STATE.activePage = n;
    const url = thumbUrlForPage(n);
    pageImg.src = url; pageImg.alt = `Page ${n}`;
    pageImg.onerror = () => {
      pageImg.removeAttribute('src'); pageImg.alt = `Missing thumbnail for page ${n}`;
      warn(`Missing thumbnail: ${url}`);
    };
    highlightActiveThumb(n);
    scrollActiveThumbToCenter();
    // reset transform & redraw when image loads
    pageImg.onload = () => {
      fitToViewer();
      computePageMillimeters();
      sizeOverlayToImage();
      drawGrid();          // always redraw grid first
      drawMarkersForPage(n); // render tokens for active page only
    };
    log('activePage <-', n, `(${source})`);
  }

  // Thumbnail strip
  function renderThumbs() {
    const all = new Set(STATE.referencedPages);
    if (STATE.primaryPage) all.add(STATE.primaryPage);
    const ordered = Array.from(all).sort((a,b) => a - b);

    thumbsWrap.innerHTML = '';
    ordered.forEach(n => {
      const item = document.createElement('div');
      item.className = 'thumb' + (n === STATE.primaryPage ? ' primary' : '');
      item.dataset.page = String(n);

      const img = document.createElement('img');
      img.loading = 'lazy'; img.decoding = 'async';
      img.src = thumbUrlForPage(n); img.alt = `p${n}`;
      img.onerror = () => { item.classList.add('missing'); };

      const tag = document.createElement('span');
      tag.className = 'thumb-tag'; tag.textContent = `p${n}`;

      const del = document.createElement('button');
      del.className = 'thumb-x'; del.type='button'; del.title='Invalidate ALL tokens for this page in the memo'; del.textContent='×';
      del.addEventListener('click', (e) => { e.stopPropagation(); invalidateAllTokensForPage(n); });

      item.appendChild(img); item.appendChild(tag); item.appendChild(del);
      item.addEventListener('click', () => setActivePage(n, 'thumb'));
      thumbsWrap.appendChild(item);
    });

    highlightActiveThumb(STATE.activePage ?? STATE.primaryPage);
    scrollActiveThumbToCenter();
  }
  function highlightActiveThumb(n){
    $$('.thumb', thumbsWrap).forEach(el => el.classList.toggle('active', Number(el.dataset.page) === n));
  }
  function scrollActiveThumbToCenter(){
    const el = $('.thumb.active', thumbsWrap);
    if (!el || !thumbsWrap) return;
    const parent = thumbsWrap;
    const elCenter = el.offsetLeft + el.offsetWidth/2;
    const target = Math.max(0, elCenter - parent.clientWidth/2);
    parent.scrollTo({ left: target, behavior: 'smooth' });
  }

  // ---- Memo tokens (C) ------------------------------------------------------
  // Accept both mm and legacy normalized tokens. Invalidate syntax: "[del]mm|..."
  // Capture the RHS to parse numbers.
  const TOKEN_RE_FULL = /\[(mm\|)?\s*(?:p|page)(\d+)\s*=\s*([^\]]+)\]/g;

  // parse tokens from memo -> STATE.tokensByPage (active-only rendering later)
  function indexTokens(text){
    STATE.tokensByPage.clear();
    for (const m of text.matchAll(TOKEN_RE_FULL)) {
      const whole = m[0];
      const isInvalidated = /\[del\]\s*$/.test(text.slice(Math.max(0, m.index-6), m.index));
      if (isInvalidated) continue;

      const page = Number(m[2]);
      const rhs  = m[3].trim().replace(/^"|"$/g,''); // coords[:coords][:"label"]
      const parts = rhs.split(':').map(s => s.trim());
      let label = "label";
      // label may be present as final :"label"
      if (parts.length >= 2 && /^".*"$/.test(parts[parts.length-1])) {
        label = parts.pop().slice(1,-1);
      } else if (parts.length >=3 && /^".*"$/.test(parts[2])) {
        label = parts[2].slice(1,-1);
      }

      const parsePair = (p) => p.split(',').map(v => Number(v.trim()));
      const p1 = parsePair(parts[0] || '0,0');
      const isBox = parts.length >= 2 && parts[1] && !parts[1].startsWith('"');
      const p2 = isBox ? parsePair(parts[1]) : null;

      const entry = { kind: isBox ? 'box':'point', p1, p2, label };

      if (!STATE.tokensByPage.has(page)) STATE.tokensByPage.set(page, []);
      STATE.tokensByPage.get(page).push(entry);
    }
    // Also update referenced pages set used for thumbs
    const pages = new Set([...STATE.tokensByPage.keys()]);
    STATE.referencedPages = pages;
  }

  function invalidateAllTokensForPage(pageN) {
    const text = memoTa.value;
    // true invalidation: "[mm|...]" -> "[del]mm|...]" (drop opening '[')
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
    indexTokens(memoTa.value);
    renderThumbs();
    drawGrid();
    drawMarkersForPage(STATE.activePage); // re-render markers for current page
    renderMemoPreview(memoTa.value);
    persistDraftDraftlist();
  }

  // ---- Markdown + LaTeX preview (E) ----------------------------------------
  function renderMemoPreview(text){
    try { memoPrev.innerHTML = (window.marked?.parse ? window.marked.parse(text) : escapeHtml(text)); typeset(memoPrev); }
    catch { memoPrev.innerHTML = `<div class="warn">Preview failed to render.</div>`; }
  }

  // ---- Drafts ---------------------------------------------------------------
  const LS_KEY = 'ro:memos';
  function persistDraftDraftlist() {
    try {
      const payload = { ts: Date.now(), chapter, paraId, body: memoTa.value };
      const arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      const idx = arr.findIndex(x => x.chapter === chapter && x.paraId === paraId);
      if (idx >= 0) arr[idx] = payload; else arr.unshift(payload);
      localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0, 50)));
      renderDraftList(arr);
    } catch(e) { log('persist failed', e); }
  }
  function renderDraftList(arr){
    memoList.innerHTML=''; arr.filter(x=>x.chapter===chapter && x.paraId===paraId).forEach(x=>{
      const div=document.createElement('div'); div.className='item';
      const when = new Date(x.ts).toLocaleString();
      div.innerHTML = `<div><div class="mono muted">${escapeHtml(when)}</div><div class="mono">${escapeHtml((x.body||'').slice(0,120))}${x.body.length>120?'…':''}</div></div>`;
      memoList.appendChild(div);
    });
  }

  // ---- Page millimeter model + grid ----------------------------------------
  function computePageMillimeters(){
    const iw = pageImg.naturalWidth, ih = pageImg.naturalHeight;
    if (!iw || !ih) { STATE.pageMM = {w:210,h:297,standard:'A4'}; return; }
    const r = ih/iw;             // image aspect
    const a4 = 297/210;          // ≈1.414
    const letter = 279/216;      // ≈1.292
    const diffA4 = Math.abs(r - a4);
    const diffL  = Math.abs(r - letter);

    if (diffA4 < 0.06) {         // close to A4
      STATE.pageMM = { w:210, h:297, standard: 'A4' };
    } else if (diffL < 0.06) {   // close to Letter
      STATE.pageMM = { w:216, h:279, standard: 'Letter' };
    } else {
      // Custom: fix width 210mm and derive height from aspect; round to nearest mm
      const h = Math.round(210 * r);
      STATE.pageMM = { w:210, h, standard: 'Custom' };
    }
    log('pageMM', STATE.pageMM);
  }

  function sizeOverlayToImage(){
    overlay.width  = pageImg.naturalWidth  || overlay.width;
    overlay.height = pageImg.naturalHeight || overlay.height;
  }

  function drawGrid(){
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0,0,overlay.width, overlay.height);

    const { w:mmW, h:mmH } = STATE.pageMM;
    const pxPerMMx = overlay.width  / mmW;
    const pxPerMMy = overlay.height / mmH;

    // minor 5mm, major 10mm
    ctx.save();
    ctx.lineWidth = 1;

    // minor grid (5mm)
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    for (let x=5; x<mmW; x+=5){
      const px = Math.round(x*pxPerMMx)+0.5;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, overlay.height); ctx.stroke();
    }
    for (let y=5; y<mmH; y+=5){
      const py = Math.round(y*pxPerMMy)+0.5;
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(overlay.width, py); ctx.stroke();
    }

    // major grid (10mm) + labels
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.fillStyle   = 'rgba(255,255,255,0.6)';
    ctx.font = '12px ui-monospace, monospace';
    ctx.textBaseline = 'top';

    for (let x=10; x<mmW; x+=10){
      const px = Math.round(x*pxPerMMx)+0.5;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, overlay.height); ctx.stroke();
      ctx.fillText(String(x), px+2, 2);
    }
    for (let y=10; y<mmH; y+=10){
      const py = Math.round(y*pxPerMMy)+0.5;
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(overlay.width, py); ctx.stroke();
      ctx.fillText(String(y), 2, py+2);
    }

    // page border
    ctx.strokeStyle = 'rgba(255,179,71,0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0.5, 0.5, overlay.width-1, overlay.height-1);
    ctx.restore();
  }

  // ---- Markers (draw from tokens for active page) ---------------------------
  function drawMarkersForPage(page){
    if (!page) { clearMarkers(); return; }
    const ctx = overlay.getContext('2d');
    // redraw full grid first
    drawGrid();

    const toks = STATE.tokensByPage.get(page) || [];
    const { w:mmW, h:mmH } = STATE.pageMM;
    const pxPerMMx = overlay.width  / mmW;
    const pxPerMMy = overlay.height / mmH;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(129,169,255,0.95)';
    ctx.fillStyle   = 'rgba(129,169,255,0.18)';
    ctx.font = '12px ui-monospace, monospace';
    ctx.textBaseline = 'bottom';

    toks.forEach(t => {
      // Support legacy normalized coords (0..1) as well as integer mm:
      const toPx = (pair) => {
        const [a,b] = pair;
        const useNorm = (a <= 1 && b <= 1);
        const x = useNorm ? a * overlay.width  : a * pxPerMMx;
        const y = useNorm ? b * overlay.height : b * pxPerMMy;
        return [x,y];
      };

      if (t.kind === 'point') {
        const [x,y] = toPx(t.p1);
        ctx.beginPath(); ctx.arc(x,y, Math.max(overlay.width,overlay.height)*0.006, 0, Math.PI*2);
        ctx.fill(); ctx.stroke();
        ctx.fillText(t.label || 'label', x+6, y-4);
      } else {
        const [x1,y1] = toPx(t.p1);
        const [x2,y2] = toPx(t.p2);
        const left = Math.min(x1,x2), top = Math.min(y1,y2);
        const w = Math.abs(x2-x1), h = Math.abs(y2-y1);
        ctx.fillRect(left, top, w, h);
        ctx.strokeRect(left, top, w, h);
        ctx.fillText(t.label || 'label', left+4, top+h-4);
      }
    });
    ctx.restore();
  }

  function clearMarkers(){
    drawGrid();
  }

  // ---- Viewer tools: pan/zoom/overlay --------------------------------------
  function applyTransform(){
    stage.style.transform = `translate(${STATE.tx}px, ${STATE.ty}px) scale(${STATE.scale})`;
    zoomSlider.value = String(STATE.scale);
    zoomRead.textContent = `${STATE.scale.toFixed(2)}×`;
  }
  function fitToViewer(){
    if (!pageImg.complete || !pageImg.naturalWidth) { STATE.scale=1; STATE.tx=0; STATE.ty=0; applyTransform(); return; }
    const vw = viewer.clientWidth, vh = viewer.clientHeight;
    const iw = pageImg.naturalWidth, ih = pageImg.naturalHeight;
    const s = Math.min(vw/iw, vh/ih);
    STATE.scale = clamp(s, 0.1, 4);
    STATE.tx = (vw - iw*STATE.scale)/2;
    STATE.ty = (vh - ih*STATE.scale)/2;
    applyTransform();
  }
  function onWheel(ev){
    if (!(ev.ctrlKey || ev.shiftKey)) return; // require modifier
    ev.preventDefault();
    const r = viewer.getBoundingClientRect();
    const mx = ev.clientX - r.left, my = ev.clientY - r.top;

    // to image-space before zoom
    const ix = (mx - STATE.tx) / STATE.scale;
    const iy = (my - STATE.ty) / STATE.scale;

    const delta = (ev.deltaY < 0 ? -0.1 : 0.1);
    const next = clamp(STATE.scale + delta, 1, 4);

    // adjust translation so (ix,iy) stays under cursor
    STATE.tx = mx - ix * next;
    STATE.ty = my - iy * next;
    STATE.scale = next;
    applyTransform();
  }

  function setTool(name){
    STATE.tool = name;
    [toolPanBtn, toolPointBtn, toolBoxBtn].forEach(b => b.classList.remove('active'));
    ({pan:toolPanBtn, point:toolPointBtn, box:toolBoxBtn}[name])?.classList.add('active');
    viewer.classList.toggle('cursor-cross', name !== 'pan');
  }

  function onMouseDown(ev){
    const imgPt = toImageSpace(ev.clientX, ev.clientY);
    if (STATE.tool === 'pan'){
      STATE.dragging = true;
      STATE.dragStart = {x: ev.clientX - STATE.tx, y: ev.clientY - STATE.ty};
      return;
    }
    if (STATE.tool === 'point'){
      // draw + auto-insert token (mm, rounded)
      const mm = toMillimeters(imgPt.x, imgPt.y, true);
      appendPointToken(mm.x, mm.y);
      drawMarkersForPage(STATE.activePage);
      return;
    }
    if (STATE.tool === 'box'){
      STATE.dragging = true;
      STATE.boxStart = imgPt;
      // show live box
      drawLiveBox(imgPt.x, imgPt.y, imgPt.x, imgPt.y);
    }
  }
  function onMouseMove(ev){
    if (!STATE.dragging) return;
    if (STATE.tool === 'pan'){
      STATE.tx = ev.clientX - STATE.dragStart.x;
      STATE.ty = ev.clientY - STATE.dragStart.y;
      applyTransform();
      return;
    }
    if (STATE.tool === 'box'){
      const p = toImageSpace(ev.clientX, ev.clientY);
      drawLiveBox(STATE.boxStart.x, STATE.boxStart.y, p.x, p.y);
    }
  }
  function onMouseUp(ev){
    if (!STATE.dragging) return;
    if (STATE.tool === 'box'){
      const end = toImageSpace(ev.clientX, ev.clientY);
      const a = toMillimeters(STATE.boxStart.x, STATE.boxStart.y, true);
      const b = toMillimeters(end.x, end.y, true);
      appendBoxToken(a.x, a.y, b.x, b.y);
      drawMarkersForPage(STATE.activePage);
    }
    STATE.dragging = false;
    STATE.boxStart = null;
  }

  // helpers for drawing temporary live box (over grid)
  function drawLiveBox(x1,y1,x2,y2){
    drawGrid(); // redraw grid then temp box
    const ctx = overlay.getContext('2d');
    const left = Math.min(x1,x2), top = Math.min(y1,y2);
    const w = Math.abs(x2-x1), h = Math.abs(y2-y1);
    ctx.save();
    ctx.strokeStyle = 'rgba(129,169,255,0.95)';
    ctx.fillStyle   = 'rgba(129,169,255,0.18)';
    ctx.lineWidth   = 2;
    ctx.fillRect(left, top, w, h);
    ctx.strokeRect(left, top, w, h);
    ctx.restore();
  }

  // coordinate transforms
  function toImageSpace(clientX, clientY){
    const r = viewer.getBoundingClientRect();
    const x = (clientX - r.left - STATE.tx) / STATE.scale;
    const y = (clientY - r.top  - STATE.ty) / STATE.scale;
    return { x, y };
  }
  function toMillimeters(xImg, yImg, roundWhole){
    const { w:mmW, h:mmH } = STATE.pageMM;
    const x = xImg / overlay.width  * mmW;
    const y = yImg / overlay.height * mmH;
    return {
      x: roundWhole ? Math.round(x) : x,
      y: roundWhole ? Math.round(y) : y
    };
  }

  // token insertion (auto, with standard label "label")
  function appendPointToken(xmm, ymm){
    if (STATE.activePage == null) return;
    const token = `[mm|p${STATE.activePage}=${xmm},${ymm}:"label"]`;
    insertAtCaret(memoTa, token + '\n');
    onMemoChange();
  }
  function appendBoxToken(x1mm,y1mm,x2mm,y2mm){
    if (STATE.activePage == null) return;
    const token = `[mm|p${STATE.activePage}=${x1mm},${y1mm}:${x2mm},${y2mm}:"label"]`;
    insertAtCaret(memoTa, token + '\n');
    onMemoChange();
  }
  function insertAtCaret(el, text){
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after  = el.value.slice(end);
    el.value = before + text + after;
    const pos = start + text.length;
    el.setSelectionRange(pos, pos);
    el.focus();
  }

  // ---- UX -------------------------------------------------------------------
  function warn(msg){
    const tag=document.createElement('span'); tag.className='tag warn'; tag.textContent=msg;
    statusLine.appendChild(tag); log('WARN:', msg);
  }

  // ---- Boot -----------------------------------------------------------------
  async function init(){
    cafeNameEl.textContent = cafeSlug;
    chapNameEl.textContent = chapterFile.replace(/\.html$/,'');
    setBackLink(); setBadge(paraNumberFrom(paraId));

    if (!paraId || !chapter) { previewBox.innerHTML = `<div class="warn">Missing or invalid query parameters.</div>`; return; }

    // tool wiring
    setTool('pan');
    toolPanBtn .addEventListener('click', () => setTool('pan'));
    toolPointBtn.addEventListener('click', () => setTool('point'));
    toolBoxBtn  .addEventListener('click', () => setTool('box'));

    zoomSlider.addEventListener('input', () => {
      const r = viewer.getBoundingClientRect();
      // keep roughly centered on slider changes
      const cx = r.width/2, cy = r.height/2;
      const ix = (cx - STATE.tx) / STATE.scale;
      const iy = (cy - STATE.ty) / STATE.scale;
      const next = Number(zoomSlider.value);
      STATE.tx = cx - ix * next;
      STATE.ty = cy - iy * next;
      STATE.scale = next;
      applyTransform();
    });
    zoomFitBtn.addEventListener('click', () => { fitToViewer(); });
    zoom100Btn.addEventListener('click', () => { STATE.scale=1; STATE.tx=0; STATE.ty=0; applyTransform(); });

    viewer.addEventListener('wheel', onWheel, { passive:false });
    viewer.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    try {
      const doc = await loadChapterDom(); STATE.chapterDoc = doc;
      const res = await resolvePrimaryPage(doc); STATE.primaryPage = res.chosen; setStatus(res);

      await previewParagraph(doc);

      // parse memo initially (in case existing tokens)
      indexTokens(memoTa.value);

      setActivePage(STATE.primaryPage, 'resolver');

      memoTa.addEventListener('input', onMemoChange);

      $('#saveDraft')?.addEventListener('click', () => {
        persistDraftDraftlist(); const btn = $('#saveDraft'); btn?.classList.add('ok'); setTimeout(()=>btn?.classList.remove('ok'), 800);
      });
      $('#exportJson')?.addEventListener('click', () => {
        const fileName = `memo_${chapterSlug}_${paraId}.json`;
        const blob = new Blob([JSON.stringify({
          chapter, paraId, body: memoTa.value, pages: Array.from(STATE.referencedPages), primary: STATE.primaryPage
        }, null, 2)], { type: 'application/json' });
        const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fileName; a.click(); URL.revokeObjectURL(a.href);
      });
      $('#submitDiscord')?.addEventListener('click', () => alert('Discord submission wiring is stubbed here.\n(We’ll hook your bot endpoint in a later phase.)'));
    } catch (err) {
      console.error('[research-office] failed:', err);
      previewBox.innerHTML = `<div class="warn">Failed to load the chapter or paragraph preview.</div>`;
      warn('Resolver failed.');
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
