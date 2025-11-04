// /js/ro/resolver.js
import { STATE, statusTags } from './state.js';
import { typeset } from './util.js';

/** Prefix used by RO for chapter-relative assets */
const CAFE_PREFIX = "/cafes/zeta-zero-cafe/";

/** Ensure chapter path is absolute from site root under the cafe prefix */
function toAbsoluteChapterPath(chapterPath) {
  if (!chapterPath) return "";
  // Already absolute?
  if (chapterPath.startsWith("/")) return chapterPath;
  // Make absolute under the cafe
  return CAFE_PREFIX + chapterPath.replace(/^\.?\//, "");
}

/**
 * Load the chapter HTML and rewrite all relative URLs inside it so they
 * resolve against the chapter's folder (not the Research Office page).
 */
export async function loadChapterDom() {
  const chapterParam = STATE?.params?.chapter || "";
  const absChapterPath = toAbsoluteChapterPath(chapterParam);

  const res = await fetch(absChapterPath, { credentials: "same-origin" });
  if (!res.ok) {
    throw new Error(`Failed to fetch chapter: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const baseHref = chapterBaseHref(absChapterPath);
  absolutizeChapterUrls(doc, baseHref);

  return doc;
}

/**
 * Turn "/cafes/zeta-zero-cafe/notebook/chapter-1-....html"
 *   → "/cafes/zeta-zero-cafe/notebook/"
 */
export function chapterBaseHref(chapterAbsPath) {
  // chapterAbsPath is absolute (starts with "/")
  return chapterAbsPath.replace(/\/[^\/]*$/, "/");
}

/**
 * Rewrite relative URLs inside a parsed chapter Document to absolute paths
 * against the chapter's directory so that injected fragments (images/links)
 * work inside Research Office.
 */
export function absolutizeChapterUrls(doc, baseHref) {
  const fix = (el, attr) => {
    const v = el.getAttribute(attr);
    if (!v) return;
    // already absolute or protocol → leave
    if (/^([a-z]+:)?\/\//i.test(v) || v.startsWith("/")) return;
    // build absolute against the chapter base
    const u = new URL(v, location.origin + baseHref);
    el.setAttribute(attr, u.pathname + u.search + u.hash);
  };

  doc.querySelectorAll("img[src],a[href],link[href],script[src],source[srcset]").forEach(el => {
    if (el.hasAttribute("src"))  fix(el, "src");
    if (el.hasAttribute("href")) fix(el, "href");
    // (Optional) parse srcset here if you use it
  });

  return doc;
}

/**
 * Resolve the "primary page" to display based solely on HTML attributes
 * on the target paragraph:
 *   - data-page="N" → N
 *   - data-page-start="S" data-page-end="E" → S (range start)
 * If neither is present, fall back to 1.
 */
export async function resolvePrimaryPage(doc) {
  const paraId = STATE?.params?.paraId || "";
  const pre = paraId ? doc.querySelector(`pre.osf#${CSS.escape(paraId)}`) : null;

  let inHtml = null;
  if (pre) {
    const dps = pre.getAttribute('data-page-start');
    const dpe = pre.getAttribute('data-page-end');
    const dp  = pre.getAttribute('data-page');

    // Prefer explicit range start/end if present, else single page
    if (dps || dpe) {
      const start = Number(dps || dpe);
      if (!Number.isNaN(start)) inHtml = start;
    } else if (dp && /^\d+$/.test(dp)) {
      inHtml = Number(dp);
    }
  }

  const chosen = inHtml || 1;
  statusTags({ inHtml, fallback: 1, chosen });
  return { inHtml, fallback: 1, chosen };
}

/**
 * Render the selected paragraph (as HTML) into the right-column preview box
 * and typeset MathJax.
 */
export async function previewParagraph(doc) {
  const paraId = STATE?.params?.paraId;
  const box = STATE?.dom?.previewBox;
  if (!box || !doc || !paraId) {
    if (box) box.innerHTML = '<div class="muted">No paragraph selected.</div>';
    return;
  }

  try {
    const node = doc.getElementById(paraId);
    if (!node) {
      box.innerHTML = `<div class="warn">Paragraph ${paraId} not found in chapter.</div>`;
      return;
    }

    // Copy paragraph HTML exactly as in the chapter so MathJax sees the LaTeX.
    const html = node.innerHTML;
    box.innerHTML = `<div class="para-preview">${html}</div>`;

    await typeset(box);
  } catch (err) {
    console.error('[RO] previewParagraph failed:', err);
    box.innerHTML = `<div class="warn">Failed to load the chapter or paragraph preview.</div>`;
  }
}

