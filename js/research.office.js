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
    activePage: null
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
    // open link points back into the chapter
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

    // 3) starts[chapter] fallback (page 1 if unknown)
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

  // ---- Paragraph preview + refs (existing left column) ----------------------
  function normalisePreviewAssets(container) {
    // Make relative assets (figures etc.) resolve relative to chapter file
    const base = document.getElementById('ro-base');
    base?.setAttribute('href', chapterUrlAbs.replace(/\/[^/]*$/,'/'));

    // Scale images down to panel
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

  async function previewParagraph(doc, _section, _anchorId) {
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
    // Your convention: /cafes/<slug>/sources/thumbs/page-###.jpg
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

    // order: primary first, then ascending
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
      // “Delete” action: mark the token as deleted, don’t actually remove it
      const del = document.createElement('span');
      del.className = 'chip-x';
      del.textContent = '×';
      del.title = 'Mark this page token as [del] in the memo';
      del.addEventListener('click', (e) => { e.stopPropagation(); markTokenDeleted(n); });
      chip.appendChild(del);
      chipsEl.appendChild(chip);
    });
  }

  // ---- Memo tokens (C) ------------------------------------------------------
  // Token grammar (live parsing):
  //   [mm|p12=Some note]    // references page 12
  //   [del][mm|p12=…]       // ignored (soft-deleted)
  // We gather referenced pages from non-[del] tokens.
  const TOKEN_RE = /\[mm\|p(\d+)=([^\]]*)\]/g;         // base token
  const DEL_PREFIX_RE = /\[del\]\s*\[mm\|p(\d+)=/;     // deleted prefix

  function parseReferencedPages(text) {
    const pages = new Set();
    for (const m of text.matchAll(TOKEN_RE)) {
      // ensure not preceded by [del]
      const before = text.slice(0, m.index);
      if (before.match(/\[del\]\s*$/)) continue;
      pages.add(Number(m[1]));
    }
    return pages;
  }

  function markTokenDeleted(pageN) {
    const text = memoTa.value;
    // Find the first non-[del] token for pN and prefix [del]
    // We do a simple scan; robust enough for memo usage.
    let idx = 0;
    while (idx < text.length) {
      const m = TOKEN_RE.exec(text);
      if (!m) break;
      const start = m.index;
      const end   = start + m[0].length;
      const n     = Number(m[1]);
      if (n === pageN) {
        // check not already [del]
        const prefix = text.slice(Math.max(0, start-6), start);
        if (!/\[del\]\s*$/.test(prefix)) {
          const updated = text.slice(0, start) + '[del]' + text.slice(start);
          memoTa.value = updated;
          onMemoChange();
          return;
        }
      }
      idx = end;
    }
  }

  function onMemoChange() {
    const text = memoTa.value;
    STATE.referencedPages = parseReferencedPages(text);
    renderChips();
    // Keep viewer synced: if active is null, show primary; else if token matches, follow newest token
    if (STATE.activePage == null) {
      setActivePage(STATE.primaryPage ?? Array.from(STATE.referencedPages)[0] ?? STATE.primaryPage, 'memo-init');
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
      // store/replace last for this chapter+para
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

      // Resolver (A)
      const res = await resolvePrimaryPage(doc);
      STATE.primaryPage = res.chosen;
      setStatus(res);

      // Left side preview & refs
      await previewParagraph(doc, null, paraId);

      // Right side initial viewer (B)
      setActivePage(STATE.primaryPage, 'resolver');

      // Memo wiring (C, E)
      memoTa.addEventListener('input', onMemoChange);
      onMemoChange(); // initialize chips + preview + drafts

      // Export / Save UI
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
