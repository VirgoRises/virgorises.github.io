/* research.office.js — drop-in
 *
 * Restores:
 *  • resolveFrom(chapter, para) via chapter manifest (or ?from=)
 *  • thumbnail probe under /cafes/<slug>/sources/thumbs/page-XXX.jpg
 *  • thumbnail-first display + grid init; PDF fallback to /source.html
 *  • Marked loader (local → CDN), MathJax ensure (uses mathconfig.js, then CDN)
 *  • “Preview” in the memo card: Markdown + LaTeX typeset in-place
 *
 * Safe to paste over the current file.
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

      // Accept either shape:
      // { paras:[{id,page,offset?},…] }  or  { items:{ id:{page,offset?}, … } }
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
    try {
      await loadScript('/js/marked.min.js');   // local first (if you have it)
    } catch {
      await loadScript('https://cdn.jsdelivr.net/npm/marked@12/marked.min.js');
    }
  }

  // Try to use *your* MathJax config first (same as chapters).
  async function ensureMathJax() {
    if (window.MathJax) return;

    // Prefer your project’s mathconfig.js
    const cfg = document.querySelector('script[src*="notebook/math/mathconfig.js"]');
    if (!cfg) {
      // inject if missing
      try {
        await loadScript(`/cafes/${cafeSlug}/notebook/math/mathconfig.js`);
      } catch { /* ignore, will try CDN next */ }
    }

    // If still no MathJax after a tick, inject CDN engine (safe with config).
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
    // Be resilient to markup variations.
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

    // Create/locate a sibling preview panel
    let panel = card.querySelector('.memo-preview');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'memo-preview';
      panel.style.marginTop = '8px';
      panel.style.padding = '12px';
      panel.style.border = '1px solid var(--line,#334)';
      panel.style.borderRadius = '8px';
      panel.style.background = 'var(--panel,#0d1217)';
      // Insert after the textarea (keeps layout stable)
      textarea.parentElement.insertAdjacentElement('afterend', panel);
    }

    // Render function
    async function renderNow() {
      await ensureMarked();
      const src = textarea.value || '';
      // Let marked render HTML, then MathJax will sweep LaTeX
      const html = window.marked.parse(src, { breaks: true, gfm: true });
      panel.innerHTML = html;
      await typeset(panel);
      // Optional: scroll preview into view on first render
      // panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    previewBtn.addEventListener('click', renderNow);
  }

  // ---------- Grid bootstrap ----------
  async function boot() {
    const chapter = get('chapter');
    const para    = get('para');

    if (!chapter || !para) { setStatus('Missing ?chapter or ?para.'); return; }

    // 1) resolve page
    const page = await resolveFrom(chapter, para);

    // 2) probe thumb (or fallback)
    const thumb = await probeThumb(page);
    if (!thumb) { openSourceViewer(chapter, para, page); return; }

    // 3) show image and init overlay grid
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
          imgEl: img
        });
      } else {
        setStatus('Grid module not found (initResearchOfficeGrid missing).');
      }
    } catch (e) {
      setStatus(`Grid init failed: ${String(e)}`);
    }

    // 4) wire memo preview (independent of grid)
    wireMemoPreview();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
