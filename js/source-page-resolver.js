// /js/source-page-resolver.js  (ES module, override-aware)

/**
 * initSourcePageResolver({
 *   chapterId: "notebook/chapter-1-the-basel-problem.html",
 *   docId: "Old_main",
 *   // Use your explicit URLs (best for your layout):
 *   mapUrl: "/data/cafes/zeta-zero-cafe/sources/Old_main.map.json",
 *   overridesUrl: "/data/cafes/zeta-zero-cafe/sources/Old_main.overrides.json",
 *
 *   // optional:
 *   anchorAttr: "data-source-anchor",
 *   badgeClass: "src-badge",
 *   pageIndexOffset: 0, // set to +1 or -1 if your viewer needs it
 *   linkToSourceHtml: (docId, chapterId, anchorId, from, to) => `/cafes/zeta-zero-cafe/source.html?pdf=${encodeURIComponent(docId)}&para=${encodeURIComponent(anchorId)}&chapter=${encodeURIComponent(chapterId)}&from=${from}&to=${to}`
 * })
 */

export async function initSourcePageResolver({
  chapterId,
  docId = "Old_main",
  mapUrl,
  overridesUrl,
  anchorAttr = "data-source-anchor",
  badgeClass = "src-badge",
  pageIndexOffset = 0,
  linkToSourceHtml = (docId_, chapterId_, anchorId_, from_, to_) =>
    `/cafes/zeta-zero-cafe/source.html?pdf=${encodeURIComponent(docId_)}&para=${encodeURIComponent(anchorId_)}&chapter=${encodeURIComponent(chapterId_)}&from=${from_}&to=${to_}`,
} = {}) {
  if (!chapterId) throw new Error("initSourcePageResolver: chapterId is required.");

  const [defaultMap, overrides] = await Promise.all([
    safeFetchJson(mapUrl),
    safeFetchJson(overridesUrl, { allow404: true }),
  ]);

  // ---- schema helpers -------------------------------------------------------
  const getChapterBlock = (root, chap) => {
    if (!root?.chapters) return null;
    // supports root.chapters[chap] (direct) OR root.chapters[chap].items
    const block = root.chapters[chap];
    if (!block) return null;
    return block.items || block; // normalize to an object of anchors
  };

  const pickAnchor = (obj, rawId) => {
    // Try: exact raw ("osf-11"), then "para-osf-11", then "fig-.." unchanged
    if (!obj || !rawId) return null;
    if (rawId in obj) return obj[rawId];
    const maybePara = rawId.startsWith("para-") ? rawId : `para-${rawId}`;
    if (maybePara in obj) return obj[maybePara];
    return null;
  };

  const normalizeRecord = (rec) => {
    // Accept {page} or {from,to}. Return {from,to,type?,partition?,note?}
    if (!rec) return null;
    if (typeof rec.page === "number") {
      return { from: rec.page, to: rec.page, type: rec.type, partition: rec.partition, note: rec.note };
    }
    if (typeof rec.from === "number" && typeof rec.to === "number") {
      return { from: rec.from, to: rec.to, type: rec.type, partition: rec.partition, note: rec.note };
    }
    return null;
  };

  function getSourceRange(chapter, anchorRaw) {
    const ovBlock = getChapterBlock(overrides, chapter);
    const mpBlock = getChapterBlock(defaultMap, chapter);

    // Look up override first
    const ovRec = normalizeRecord(pickAnchor(ovBlock, anchorRaw));
    if (ovRec) return ovRec;

    // Fallback to baseline map
    const mpRec = normalizeRecord(pickAnchor(mpBlock, anchorRaw));
    if (mpRec) return mpRec;

    return null;
  }

  // ---- badge rendering ------------------------------------------------------
  const nodes = document.querySelectorAll(`[${anchorAttr}]`);
  nodes.forEach((el) => {
    const rawAnchor = (el.getAttribute(anchorAttr) || "").trim(); // e.g. "osf-11" or "fig-1-01"
    const rec = getSourceRange(chapterId, rawAnchor);

    const badge = document.createElement("a");
    badge.className = badgeClass;

    if (rec?.from != null && rec?.to != null) {
      const from = rec.from + pageIndexOffset;
      const to   = rec.to   + pageIndexOffset;

      // Text: p.8 or p.8–9
      badge.textContent = from === to ? `p.${from}` : `p.${from}–${to}`;
      badge.href  = linkToSourceHtml(docId, chapterId, rawAnchor, from, to);
      badge.title = from === to ? `Open source at page ${from}` : `Open source pages ${from}–${to}`;
    } else {
      badge.textContent = "—";
      badge.href = "javascript:void(0)";
      badge.title = "No mapping found";
      badge.setAttribute("aria-disabled", "true");
    }

    el.insertAdjacentElement("beforeend", badge);
  });

  return { defaultMap, overrides };
}

// ---------- utils ----------
async function safeFetchJson(url, { allow404 = false } = {}) {
  if (!url) return null;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      if (allow404 && r.status === 404) return null;
      throw new Error(`${r.status} ${r.statusText}`);
    }
    return await r.json();
  } catch (e) {
    if (allow404) return null;
    console.warn("source-page-resolver: failed to load", url, e);
    return null;
  }
}
