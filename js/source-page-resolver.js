// source-page-resolver.js
export async function initSourcePageResolver({
  docId = "Old_main",
  chapterId,            // e.g. "notebook/chapter-1-the-basel-problem.html"
  mapUrl = `/data/${docId}.map.json`,
  overridesUrl = `/data/${docId}.overrides.json`, // can 404 (handled)
  anchorAttr = "data-source-anchor",              // attribute to mark anchors
  badgeClass = "src-badge",                       // CSS class for badges
  linkToSourceHtml = (docId, chapterId, anchorId, page) =>
    `/cafes/zeta-zero-cafe/source.html?pdf=${encodeURIComponent(docId)}&para=${encodeURIComponent(anchorId)}&chapter=${encodeURIComponent(chapterId)}&from=${page}&to=${page}`
}) {
  const safeFetch = async (url) => {
    try {
      const r = await fetch(url, {cache: "no-store"});
      if (!r.ok) throw new Error(`${r.status}`);
      return await r.json();
    } catch {
      return null; // allow missing overrides
    }
  };

  const [defaultMap, overrides] = await Promise.all([
    safeFetch(mapUrl), safeFetch(overridesUrl)
  ]);

  function getSourcePage(chapterId, anchorId) {
    const o = overrides?.chapters?.[chapterId]?.items?.[anchorId];
    if (o?.page != null) return o; // {page, partition?, type?, note?}
    const d = defaultMap?.chapters?.[chapterId]?.items?.[anchorId];
    return d ? { page: d.page, type: d.type || "paragraph" } : null;
  }

  // Heuristic: if authors tag things as osf-1 / fig-3 / tbl-2,
  // normalize to our keys: para-osf-1 / fig-3 / tbl-2.
  const normalizeAnchor = (raw) => {
    if (!raw) return raw;
    if (/^(para|fig|tbl|eqn|equation|figure|table)-/i.test(raw)) return raw;
    // common pattern: "osf-1" etc → treat as paragraph
    return `para-${raw}`;
  };

  // Add a little badge next to anything with data-source-anchor
  const nodes = document.querySelectorAll(`[${anchorAttr}]`);
  nodes.forEach((el) => {
    const rawAnchor = el.getAttribute(anchorAttr)?.trim();
    const anchorId = normalizeAnchor(rawAnchor);
    const rec = getSourcePage(chapterId, anchorId);

    const badge = document.createElement("a");
    badge.className = badgeClass;
    if (rec?.page != null) {
      badge.textContent = `p.${rec.page}` + (rec.partition ? ` ${rec.partition}` : "");
      badge.href = linkToSourceHtml(docId, chapterId, rawAnchor, rec.page);
      badge.title = `Open source PDF at page ${rec.page}`;
    } else {
      badge.textContent = "—";
      badge.href = "javascript:void(0)";
      badge.title = "No mapping found";
      badge.setAttribute("aria-disabled", "true");
    }

    // Insert after the element's content (or wherever you like)
    el.insertAdjacentElement("beforeend", badge);
  });

  // Also expose a small API if you need programmatic lookups later:
  return { getSourcePage, defaultMap, overrides };
}