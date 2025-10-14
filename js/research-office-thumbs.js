// research-office-thumbs.js
// Minimal helper that *only* selects the correct thumbnail file
// and puts it into #ro-page. No PDF.js anywhere.

export function thumbUrlFor(page, root = "/cafes/zeta-zero-cafe/sources/thumbs") {
  const n = Math.max(1, Number(page) | 0);
  const name = `page-${String(n).padStart(3, "0")}.jpg`;
  return `${root}/${name}`;
}

/**
 * Sets the given <img> to the specific page thumbnail.
 * Fires a custom event 'ro:thumb-loaded' on the image when ready.
 */
export function setThumbPage(imgEl, page, root) {
  if (!imgEl) return;
  const url = thumbUrlFor(page, root);
  imgEl.onload = () => {
    imgEl.dispatchEvent(new CustomEvent("ro:thumb-loaded", {
      detail: {
        url,
        naturalWidth: imgEl.naturalWidth,
        naturalHeight: imgEl.naturalHeight
      }
    }));
  };
  imgEl.decoding = "async";
  imgEl.loading = "eager";
  imgEl.src = url;
}
// research-office-thumbs.js
(function (){
  const qs = new URLSearchParams(location.search);
  const PARA    = qs.get("para")     || "";
  const CHAPTER = qs.get("chapter")  || "";
  const FROM    = parseInt(qs.get("from") || "0", 10) || 0;

  // cafe slug = second segment after /cafes/
  // e.g. /cafes/zeta-zero-cafe/research_office.html -> zeta-zero-cafe
  const segs = location.pathname.split("/").filter(Boolean);
  const i = segs.indexOf("cafes");
  const slug = (i >= 0 && segs[i+1]) ? segs[i+1] : "zeta-zero-cafe";

  const thumbsRoot = `/cafes/${slug}/sources/thumbs`;
  const pageImg = document.getElementById("ro-page");

  // Optional: a resolver you already have on window (exposed by research.office.js)
  async function resolveFrom(chapter, para) {
    try { return await window.__roResolveFrom?.(chapter, para) ?? 0; }
    catch { return 0; }
  }

  (async () => {
    const fromPage = FROM > 0 ? FROM : await resolveFrom(CHAPTER, PARA);
    if (fromPage > 0 && pageImg) {
      const nnn = String(fromPage).padStart(3, "0");
      pageImg.src = `${thumbsRoot}/page-${nnn}.jpg`;
      pageImg.alt = "source page";
    }

    // Initialize overlay/grid
    if (typeof window.initResearchOfficeGrid === "function") {
      window.initResearchOfficeGrid({
        para: PARA,
        chapter: CHAPTER,
        fromPage,
        thumbsRoot,
        initialZoom: "fit"
      });
    }
  })();
})();