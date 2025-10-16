/* research.office.js  — drop-in
 * Restores:
 *  - resolveFrom(chapter, para) via chapter manifest
 *  - probeThumb(page) under /cafes/<slug>/sources/thumbs/page-XXX.jpg
 *  - thumbnail-first display; fallback to /source.html (PDF) when missing
 *  - one-line status via #ro-status (if present)
 *  - calls your existing initResearchOfficeGrid(...) once the image loads
 *
 * Assumes:
 *  - <img id="ro-page"> exists for the thumbnail
 *  - /js/research-office-grid.js provides initResearchOfficeGrid(...)
 */

(function () {
  // ---------- tiny utils ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const qs = new URLSearchParams(location.search);
  const get = (k) => (qs.has(k) ? qs.get(k) : null);
  const slugFromPath = () => {
    // /cafes/<slug>/research_office.html → <slug>
    const parts = location.pathname.split('/').filter(Boolean);
    const i = parts.indexOf('cafes');
    return i >= 0 && parts[i + 1] ? parts[i + 1] : 'zeta-zero-cafe';
  };
  const cafeSlug = slugFromPath();

  const statusEl = document.getElementById('ro-status');
  function setStatus(msg) {
    if (statusEl) {
      statusEl.textContent = msg;
    }
    // Always mirror to console for debugging.
    console.log('[RO]', msg);
  }

  function pad3(n) {
    n = Math.max(0, Number(n) | 0);
    return String(n).padStart(3, '0');
  }

  // ---------- resolver ----------
  async function resolveFrom(chapter, para) {
    // Respect explicit ?from
    const explicit = get('from');
    if (explicit) {
      const p = Number(explicit);
      if (Number.isFinite(p) && p >= 0) {
        setStatus(`Using ?from=${p}.`);
        return p;
      }
    }

    // Try manifest beside the chapter HTML:
    // /cafes/<slug>/<chapter>.manifest.json
    // Example chapter: notebook/chapter-1-the-basel-problem.html
    const manifestUrl = `/cafes/${cafeSlug}/${chapter}.manifest.json`;

    try {
      const res = await fetch(manifestUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Accept both shapes:
      // 1) { paras: [ { id, page, offset? }, ... ] }
      // 2) { items: { <id>: { page, offset? }, ... } }  (older)
      let entry = null;

      if (Array.isArray(data.paras)) {
        entry = data.paras.find(p => String(p.id) === String(para)) || null;
      } else if (data.items && typeof data.items === 'object') {
        entry = data.items[para] || null;
      }

      if (entry && Number.isFinite(entry.page)) {
        const base = Number(entry.page) | 0;
        const off = Number(entry.offset || 0) | 0;
        const page = base + off;
        setStatus(`Resolved ${para} ⇒ p.${page} from manifest.`);
        return page;
      }

      setStatus(`Manifest loaded but no entry for ${para}; default to p.0`);
      return 0;
    } catch (err) {
      setStatus(`No manifest for ${chapter} (${String(err)}); default to p.0`);
      return 0;
    }
  }

  // ---------- thumbnail probe ----------
  function thumbUrlFor(page) {
    // /cafes/<slug>/sources/thumbs/page-XXX.jpg
    return `/cafes/${cafeSlug}/sources/thumbs/page-${pad3(page)}.jpg`;
  }

  async function probeThumb(page) {
    const url = thumbUrlFor(page);
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      return res.ok ? url : null;
    } catch {
      return null;
    }
  }

  // ---------- fallback to source viewer ----------
  function openSourceViewer(chapter, para, page) {
    // Keep arguments identical to what worked already:
    // /cafes/<slug>/source.html?pdf=Old_main&para=<para>&chapter=<chapter>&return=<encoded>
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

  // ---------- bootstrap ----------
  async function boot() {
    const chapter = get('chapter');
    const para = get('para');

    if (!chapter || !para) {
      setStatus('Missing ?chapter or ?para in URL.');
      return;
    }

    const page = await resolveFrom(chapter, para);
    const thumb = await probeThumb(page);

    if (!thumb) {
      openSourceViewer(chapter, para, page);
      return;
    }

    // Show thumbnail and initialize overlay grid.
    const img = document.getElementById('ro-page');
    if (!img) {
      setStatus('Missing <img id="ro-page"> in DOM.');
      return;
    }

    // Make sure image is visible and sized by container
    img.style.display = 'block';
    img.style.width = '100%';
    img.style.height = 'auto';
    img.src = thumb;

    await new Promise((resolve) => {
      if (img.complete && img.naturalWidth) resolve();
      else img.addEventListener('load', resolve, { once: true });
    });

    setStatus(`Loaded thumbnail p.${page}.`);

    // Hand off to the existing grid overlay module.
    try {
      if (typeof window.initResearchOfficeGrid === 'function') {
        window.initResearchOfficeGrid({
          chapter,
          para,
          fromPage: page,
          // For completeness; the grid only needs page size metrics from the image.
          thumbsBase: `/cafes/${cafeSlug}/sources/thumbs/`,
          imgEl: img
        });
      } else {
        setStatus('Grid module not found (initResearchOfficeGrid missing).');
      }
    } catch (e) {
      setStatus(`Grid init failed: ${String(e)}`);
    }
  }

  // run
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
