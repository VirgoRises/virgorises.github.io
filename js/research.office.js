/* Research Office Controller
   Phases: A (Resolver), B (Viewer), C (Memo↔thumbs), E (Markdown+LaTeX)
   Upgrade: real 2×3 cm thumbnails in “Pages referenced in memo” with center-on-active
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
  const thumbsWrap  = $('#pageChips');  // repurposed as thumbnail strip
  const pageImg     = $('#pageImg');
  const viewer      = $('.viewer');

  const memoTa      = $('#memoBody');
  const memoPrev    = $('#memoPreview');
  const memoList    = $('#memoList');

  const STATE = {
    chapterDoc: null,
    primaryPage: null,
    referencedPages: new Set(),
    activePage: null,
    tokenMeta: new Map()
  };

  // ---- Utils ----------------------------------------------------------------
  const log = (...a) => rodebug && console.debug('[RO]', ...a);
  const pad3 = n => String(n).padStart(3,'0');

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
  function buildOpenLink(anchorId) {
    return new URL(`${chapterUrlAbs}#${anchorId}`, location.origin).toString();
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
      (isTable?tables:figures).push({ id, caption, href: buildOpenLink(id) });
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
    pageImg.classList.toggle('primary', n === STATE.primaryPage);
    pageImg.onerror = () => {
      pageImg.removeAttribute('src'); pageImg.alt = `Missing thumbnail for page ${n}`;
      warn(`Missing thumbnail: ${url}`);
    };
    highlightActiveThumb(n);
    scrollActiveThumbToCenter();
    log('activePage <-', n, `(${source})`);
  }

  // ---- Thumbnail strip (replaces chips) ------------------------------------
  function renderThumbs() {
    const all = new Set(STATE.referencedPages);
    if (STATE.primaryPage) all.add(STATE.primaryPage);

    const ordered = Array.from(all).sort((a,b) => a - b);

    thumbsWrap.classList.add('thumbs'); // CSS hooks
    thumbsWrap.innerHTML = '';

    ordered.forEach(n => {
      const item = document.createElement('div');
      item.className = 'thumb' + (n === STATE.primaryPage ? ' primary' : '');
      item.dataset.page = String(n);

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = thumbUrlForPage(n);
      img.alt = `p${n}`;
      img.onerror = () => { item.classList.add('missing'); };

      const tag = document.createElement('span');
      tag.className = 'thumb-tag';
      tag.textContent = `p${n}`;

      const del = document.createElement('button');
      del.className = 'thumb-x';
      del.type = 'button';
      del.title = 'Invalidate ALL tokens for this page in the memo';
      del.textContent = '×';
      del.addEventListener('click', (e) => { e.stopPropagation(); invalidateAllTokensForPage(n); });

      item.appendChild(img);
      item.appendChild(tag);
      item.appendChild(del);

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
  // Accepts:
  //   [mm|p12=...], [mm|page12=...], [mm|p10=x,y:x,y], [mm|p10=x,y:x,y:"label"]
  // Invalidation: "[mm|page14=…]" -> "[del]mm|page14=…]" (no opening '[')
  const TOKEN_RE = /\[mm\|\s*(?:p|page)(\d+)\s*=[^\]]*?\]/g;

  function parseReferencedPages(text) {
    const pages = new Set(); STATE.tokenMeta.clear();
    for (const m of text.matchAll(TOKEN_RE)) {
      const full = m[0]; const page = Number(m[1]);
      let label = null; const labelMatch = full.match(/:"([^"]*)"\]\s*$/);
      if (labelMatch) label = labelMatch[1];
      if (!STATE.tokenMeta.has(page)) STATE.tokenMeta.set(page, []);
      STATE.tokenMeta.get(page).push({ label });
      pages.add(page);
    }
    return pages;
  }

  function invalidateAllTokensForPage(pageN) {
    const text = memoTa.value;
    const updated = text.replace(TOKEN_RE, (match, num, offset, whole) => {
      if (Number(num) !== pageN) return match;
      const before = whole.slice(Math.max(0, offset - 6), offset);
      if (/\[del\]\s*$/.test(before)) return match;
      return match.replace(/^\[/, '[del]'); // true invalidation
    });
    if (updated !== text) { memoTa.value = updated; onMemoChange(); }
  }

  function onMemoChange() {
    const text = memoTa.value;
    STATE.referencedPages = parseReferencedPages(text);
    renderThumbs();

    if (STATE.activePage == null) {
      const next = STATE.primaryPage ?? Array.from(STATE.referencedPages)[0] ?? STATE.primaryPage;
      if (next != null) setActivePage(next, 'memo-init');
    }
    renderMemoPreview(text);
    persistDraftDraftlist();
  }

  // ---- Markdown + LaTeX preview (E) ----------------------------------------
  function renderMemoPreview(text){
    try {
      const html = (window.marked?.parse ? window.marked.parse(text) : escapeHtml(text));
      memoPrev.innerHTML = html; typeset(memoPrev);
    } catch { memoPrev.innerHTML = `<div class="warn">Preview failed to render.</div>`; }
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

    try {
      const doc = await loadChapterDom(); STATE.chapterDoc = doc;
      const res = await resolvePrimaryPage(doc); STATE.primaryPage = res.chosen; setStatus(res);

      await previewParagraph(doc);
      setActivePage(STATE.primaryPage, 'resolver');

      memoTa.addEventListener('input', onMemoChange);
      onMemoChange();

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
