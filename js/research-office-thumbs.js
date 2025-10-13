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
