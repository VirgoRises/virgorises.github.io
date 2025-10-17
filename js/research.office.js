// /js/research.office.js
(() => {
  // -------------------------
  // tiny utils
  // -------------------------
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const once = (fn) => { let done=false; return (...a)=>done?undefined:(done=true,fn(...a)); };

  const qs = new URLSearchParams(location.search);
  const paraId   = qs.get('para') || '';
  const chapter  = qs.get('chapter') || '';
  const cafeSlug = location.pathname.split('/').filter(Boolean)[1] || 'zeta-zero-cafe';

  const els = {
    status: $('#ro-status') || {textContent:''},
    memoTA:  $('#memoBody') || $('#memo') || $('#memo-text') || $('textarea'),
    previewBtn: $('#btnPreview') || $('#memoPreviewBtn'),
    previewOut: $('#memoPreview'),
    tokenSink:  $('#token') || $('#tokenSink')
  };

  const setStatus = (msg) => { if (els.status) els.status.textContent = msg; };

  // ---------------------------------------------------
  // 1) Loader: Marked (local → CDN)
  // ---------------------------------------------------
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error('load failed: ' + src));
      document.head.appendChild(s);
    });
  }

  async function ensureMarked() {
    if (window.marked?.parse) return;
    try {
      // try local first
      await loadScript('/js/vendor/marked.min.js');
    } catch {
      // fallback CDN
      await loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js');
    }
  }

  // ---------------------------------------------------
  // 2) Loader: MathJax (cooperate with mathconfig.js)
  //     - if mathconfig.js already set MathJax up, reuse it
  //     - otherwise lazy-load tex-chtml
  // ---------------------------------------------------
  async function ensureMathJax() {
    if (window.MathJax?.typesetPromise) return;
    await loadScript('https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js');
    // give it a tick
    await new Promise(r => setTimeout(r, 0));
  }

  // ---------------------------------------------------
  // 3) Preview wiring (Markdown + LaTeX)
  // ---------------------------------------------------
  function wirePreview() {
    if (!els.previewBtn || !els.memoTA || !els.previewOut) return;

    els.previewBtn.addEventListener('click', async () => {
      try {
        await ensureMarked();
        await ensureMathJax();

        const raw = els.memoTA.value || '';
        els.previewOut.innerHTML = window.marked.parse(raw);
        els.previewOut.hidden = false;

        // typeset inline + display math in the preview area only
        if (window.MathJax?.typesetPromise) {
          await window.MathJax.typesetPromise([els.previewOut]);
        } else if (window.MathJax?.typeset) {
          window.MathJax.typeset([els.previewOut]);
        }
      } catch (err) {
        console.error(err);
        setStatus('Preview failed to render.');
      }
    });
  }

  // ---------------------------------------------------
  // 4) Resolve start page BEFORE accepting tokens
  //     Strategy:
  //       a) fetch the chapter HTML, read <pre id="osf-n" data-page="…">
  //       b) if not found, fall back to manifest JSON if present
  // ---------------------------------------------------
  let resolvedPage = null;
  const resolveOnce = once(async function resolveStartPage() {
    setStatus('Resolving page…');

    // (a) chapter HTML probe
    try {
      if (chapter && paraId) {
        const html = await (await fetch(`/${chapter}`)).text();
        const dom = new DOMParser().parseFromString(html, 'text/html');
        const el = dom.querySelector(`pre#${CSS.escape(paraId)}.osf`);
        const p = el?.dataset?.page && Number(el.dataset.page);
        if (Number.isFinite(p) && p > 0) {
          resolvedPage = p;
          setStatus(`Start page resolved from HTML: p.${p}.`);
          return p;
        }
      }
    } catch (e) {
      // ignore, try manifest next
    }

    // (b) manifest JSON probe (optional)
    try {
      const manifestPath = `/${chapter}.manifest.json`;
      const j = await (await fetch(manifestPath)).json();
      const hit = (j?.paras || []).find(x => x.id === paraId && Number.isFinite(x.page));
      if (hit) {
        resolvedPage = Number(hit.page);
        setStatus(`Start page resolved from manifest: p.${resolvedPage}.`);
        return resolvedPage;
      }
    } catch {
      // ignore; final fallback happens below
    }

    // fallback
    resolvedPage = 1;
    setStatus('Start page defaulted to p.1 (no page metadata).');
    return 1;
  });

  // ---------------------------------------------------
  // 5) Token sink watcher
  //      - waits for resolver to finish
  //      - rewrites accidental p1=… to the resolved page
  //      - dedupes identical tokens
  // ---------------------------------------------------
  function wireTokenSink() {
    if (!els.tokenSink) return;

    const seen = new Set();

    const insertIntoMemo = (token) => {
      if (!els.memoTA) return;
      const body = els.memoTA.value;
      if (seen.has(token) || body.includes(token)) return; // de-dupe
      els.memoTA.value = (body ? body.replace(/\s*$/, '') + '\n' : '') + token + '\n';
    };

    const mo = new MutationObserver(async () => {
      const txt = els.tokenSink.textContent || '';
      const m = txt.match(/\[mm\|p(\d+)=([^\]]+)\]/);
      if (!m) return;

      // wait for page resolution (first time only)
      if (resolvedPage == null) await resolveOnce();

      let page = Number(m[1]);
      const payload = m[2];

      // if grid emitted p1 while we know the true page, rewrite
      if (page === 1 && Number.isFinite(resolvedPage) && resolvedPage > 1) {
        page = resolvedPage;
      }

      const token = `[mm|p${page}=${payload}]`;
      seen.add(token);
      insertIntoMemo(token);
    });

    mo.observe(els.tokenSink, {childList: true, characterData: true, subtree: true});
  }

  // ---------------------------------------------------
  // 6) Kick everything
  //     (a) resolve page (non-blocking for UI)
  //     (b) wire preview + token sink
  // ---------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    wirePreview();
    wireTokenSink();

    // start resolver promptly; we purposely do not block the UI here
    resolveOnce();
  });
})();
