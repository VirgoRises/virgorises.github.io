// /js/ro/resolver.js
import { STATE, statusTags } from './state.js';
import { $$, fetchText, typeset, log } from './util.js';

export async function loadChapterDom() {
  const tries = [];
  const chapter = STATE.params.chapter;
  const dec = decodeURIComponent(chapter || '');
  const enc = encodeURIComponent(dec).replace(/%2F/gi, '/');

  // Try a few plausible URLs in order
  tries.push(`${STATE.cafeBase}/${dec}`);
  tries.push(`${STATE.cafeBase}/${enc}`);
  if (dec.startsWith('/')) tries.push(dec);
  tries.push(dec);

  let lastErr;
  for (const u of tries) {
    try {
      const html = await fetchText(u);
      STATE._chapterUrlResolved = u;
      log('chapter OK', u);
      return new DOMParser().parseFromString(html, 'text/html');
    } catch (e) {
      lastErr = e;
      log('chapter failed', u, e.message);
    }
  }
  throw lastErr || new Error('All chapter URL attempts failed.');
}

export async function resolvePrimaryPage(doc) {
  const pre = doc.querySelector(`pre.osf#${CSS.escape(STATE.params.paraId)}`);
  let inHtml = null;
  if (pre) {
    const raw = pre.getAttribute('data-page');
    if (raw && /^\d+$/.test(raw)) inHtml = Number(raw);
  }

  let fromManifest = null;
  try {
    const anchorsUrl = `/data${STATE.cafeBase}/anchors/${STATE.chapterSlug}.json`;
    const json = JSON.parse(await fetchText(anchorsUrl));
    const item = json?.[STATE.params.paraId];
    const val = item?.page ?? item;
    if (val && /^\d+$/.test(String(val))) fromManifest = Number(val);
  } catch (_) { /* no anchors available */ }

  const chosen = inHtml || fromManifest || 1;
  statusTags({ inHtml, fromManifest, fallback: 1, chosen });
  return { inHtml, fromManifest, fallback: 1, chosen };
}

export async function previewParagraph(doc) {
  const paraId = STATE.params.paraId;
  const box = STATE.dom.previewBox;
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

    // Render math in Paragraph preview
    await typeset(box);
  } catch (err) {
    console.error('[RO] previewParagraph failed:', err);
    box.innerHTML = `<div class="warn">Failed to load the chapter or paragraph preview.</div>`;
  }
}
