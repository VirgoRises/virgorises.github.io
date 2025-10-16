/* research.office.js — drop-in with MM de-dup bridge
 * - Resolver (manifest or ?from=)
 * - Thumbnail probe → grid init; PDF fallback to /source.html
 * - Marked + MathJax ensure; memo Preview (Markdown + LaTeX)
 * - Global roAddMemoToken(token) with de-dup guard to prevent doubles
 */

(function () {
  // ---------- tiny utils ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const qs = new URLSearchParams(location.search);
  const get = k => (qs.has(k) ? qs.get(k) : null);

  const statusEl = document.getElementById('ro-status');
  const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; console.log('[RO]', msg); };

  const cafeSlug = (() => {
    const parts = location.pathname.split('/').filter(Boolean);
    const i = parts.indexOf('cafes');
    return (i >= 0 && parts[i + 1]) ? parts[i + 1] : 'zeta-zero-cafe';
  })();

  const pad3 = (n) => String(Math.max(0, n|0)).padStart(3, '0');

  // ---------- MM token bridge (de-dup) ----------
  // Prevents duplicate MM lines when two listeners fire for the same click.
  (function installMemoBridgeOnce(){
    if (window.roAddMemoToken) return; // already installed

    const DEDUP_MS = 400;
    let last = { token: '', at: 0 };

    function findMemoTextarea() {
      // be resilient to small markup changes
      return document.querySelector(
        '.ro-memo textarea, #ro-memo, textarea[name="memo"], .memo-card textarea, textarea'
      );
    }

    window.roAddMemoToken = function roAddMemoToken(token) {
      try {
        if (!token || typeof token !== 'string') return;
        const now = Date.now();
        if (token === last.token && (now - last.at) < DEDUP_MS) return; // drop duplicate
        last = { token, at: now };

        const ta = findMemoTextarea();
        if (!ta) return;
        const needsNL = ta.value && !ta.value.endsWith('\n');
        ta.value += (needsNL ? '\n' : '') + token + '\n';
        // notify any autosave listeners
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      } catch (e) {
        console.warn('roAddMemoToken failed:', e);
      }
    };
  })();

  // ---------- resolver (manifest or ?from) ----------
  async function resolveFrom(chapter, para) {
    const explicit = get('from');
    if (explicit && Number.isFinite(+explicit)) {
      const p = +explicit | 0;
      setStatus(`Using ?from=${p}.`);
      return p;
    }

    const manifestUrl = `/cafes/${cafeSlug}/${chapter}.manifest.json`;
    try {
      const res = await fetch(manifestUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      let entry = null;
      if (Array.isArray(data.paras)) {
        entry = data.paras.find(p => String(p.id) === String(para)) || null;
      } else if (data.items && typeof data.items === 'object') {
        entry = data.items[para] || null;
      }

      if (entry && Number.isFinite(entry.page)) {
        const base = entry.page|0;
        const off  = (entry.offset||0)|0;
        const page = base + off;
        setStatus(`Resolved ${para} ⇒ p.${page} from manifest.`);
        return page;
      }

      setStatus(`Manifest loaded, no entry for ${para}; default p.0`);
      return 0;
    } catch (err) {
      setStatus(`No manifest for ${chapter} (${String(err)}); default p.0`);
      return 0;
    }
  }

  // ---------- thumb first; PDF fallback ----------
  const thumbUrlFor = (page) => `/cafes/${cafeSlug}/sources/thumbs/page-${pad3(page)}.jpg`;

  async function probeThumb(page) {
    const url = thumbUrlFor(page);
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      return res.ok ? url : null;
    } catch { return null; }
  }

  function openSourceViewer(chapter, para, page) {
    const ret = encodeURIComponent(location.pathname + location.search);
    const href =
      `/cafes/${cafeSlug}/source.html?pdf=Old_main` +
      `&para=${encodeURIComponent(para)}` +
      `&chapter=${encodeURIComponent(chapter)}` +
      `&return=${ret}` +
      (Number.isFinite(page) ? `&from=${page}` : '');
    setStatus(`No thumbnail for p.${page} → opening source viewer…`);
    location.href = href;
  }

  // ---------- Marked + MathJax loaders ----------
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error('failed ' + src));
      document.head.appendChild(s);
    });
  }

  async function ensureMarked() {
    if (window.marked) return;
    try { await loadScript('/js/marked.min.js'); }
    catch { await loadScript('https://cdn.jsdelivr.net/npm/marked@12/marked.min.js'); }
  }

  async function ensureMathJax() {
    if (window.MathJax) return;

    // Prefer project mathconfig.js (same as chapters)
    const hasCfg = !!document.querySelector('script[src*="notebook/math/mathconfig.js"]');
    if (!hasCfg) {
      try { await loadScript(`/cafes/${cafeSlug}/notebook/math/mathconfig.js`); }
      catch { /* ignore; will try CDN next */ }
    }

    await new Promise(r => setTimeout(r, 50));
    if (!window.MathJax) {
      await loadScript('https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js');
    }
  }

  async function typeset(container) {
    try {
      await ensureMathJax();
      const MJ = window.MathJax;
      if (MJ && MJ.typesetClear) MJ.typesetClear([container]);
      if (MJ && MJ.texReset)      MJ.texReset();
      if (MJ && MJ.typesetPromise) await MJ.typesetPromise([container]);
      else if (MJ && MJ.typeset)    MJ.typeset([container]);
    } catch (e) {
      console.warn('MathJax typeset failed:', e);
    }
  }

  // ---------- Memo preview wiring ----------
  function findMemoElements() {
    const card = document.querySelector('.ro-memo, .memo-card, #ro-memo-card') || document;
    const textarea = card.querySelector('textarea, #ro-memo, textarea[name="memo"]');
    const previewBtn =
      Array.from(card.querySelectorAll('button, input[type="button"]'))
        .find(b => /preview/i.test(b.textContent || b.value || ''));
    return { card, textarea, previewBtn };
  }

  async function wireMemoPreview() {
    const { card, textarea, previewBtn } = findMemoElements();
    if (!card || !textarea || !previewBtn) return;

    let panel = card.querySelector('.memo-preview');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'memo-preview';
      panel.style.marginTop = '8px';
      panel.style.padding = '12px';
      panel.style.border = '1px solid var(--line,#334)';
      panel.style.borderRadius = '8px';
      panel.style.background = 'var(--panel,#0d1217)';
      textarea.parentElement.insertAdjacentElement('afterend', panel);
    }

    async function renderNow() {
      await ensureMarked();
      const src = textarea.value || '';
      const html = window.marked.parse(src, { breaks: true, gfm: true });
      panel.innerHTML = html;
      await typeset(panel);
    }

    previewBtn.addEventListener('click', renderNow);
  }

  // ---------- Grid bootstrap ----------
  async function boot() {
    const chapter = get('chapter');
    const para    = get('para');

    if (!chapter || !para) { setStatus('Missing ?chapter or ?para.'); return; }

    const page = await resolveFrom(chapter, para);
    const thumb = await probeThumb(page);
    if (!thumb) { openSourceViewer(chapter, para, page); return; }

    const img = document.getElementById('ro-page');
    if (!img) { setStatus('Missing <img id="ro-page">.'); return; }
    img.style.display = 'block';
    img.style.width   = '100%';
    img.style.height  = 'auto';
    img.src = thumb;

    await new Promise(r => { if (img.complete && img.naturalWidth) r(); else img.addEventListener('load', r, { once:true }); });
    setStatus(`Loaded thumbnail p.${page}.`);

    try {
      if (typeof window.initResearchOfficeGrid === 'function') {
        window.initResearchOfficeGrid({
          chapter, para, fromPage: page,
          thumbsBase: `/cafes/${cafeSlug}/sources/thumbs/`,
          imgEl: img,
          // If your grid supports a callback prop, pass it too:
          onMemoToken: window.roAddMemoToken
        });
      } else {
        setStatus('Grid module not found (initResearchOfficeGrid missing).');
      }
    } catch (e) {
      setStatus(`Grid init failed: ${String(e)}`);
    }

    wireMemoPreview();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
