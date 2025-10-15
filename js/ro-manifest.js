// /js/ro-manifest.js
(function () {
  const cache = new Map();

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  function getSlug() {
    // cafes/<slug>/research_office.html → grabs the slug safely
    const parts = location.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("cafes");
    return i >= 0 && parts[i + 1] ? parts[i + 1] : "zeta-zero-cafe";
  }

  async function getManifest(chapterPath) {
    const slug = getSlug();
    const rel = chapterPath.replace(/^\/+/, "");
    const url = `/cafes/${slug}/${rel}.manifest.json`;
    if (!cache.has(url)) cache.set(url, fetchJSON(url).catch(e => { cache.delete(url); throw e; }));
    return cache.get(url);
  }

  // Resolve a para id (osf-*) to PDF page number using the chapter's manifest
  async function resolveFrom(chapterPath, paraId) {
    try {
      const mf = await getManifest(chapterPath);
      const hit = mf.paras.find(p => p.id === paraId);
      return (hit && Number.isFinite(hit.page) && hit.page > 0) ? hit.page : 0;
    } catch (e) {
      console.warn("manifest resolve failed:", e);
      return 0;
    }
  }

  window.RO_MANIFEST = { getManifest, resolveFrom, getSlug };
})();
