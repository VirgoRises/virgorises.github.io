// /cafes/zeta-zero-cafe/js/ro/resolver.js
import { STATE, statusTags } from './state.js';
import { $$, fetchText, typeset, log } from './util.js';

export async function loadChapterDom(){
  const tries = [];
  const chapter = STATE.params.chapter;
  const dec = decodeURIComponent(chapter||'');
  const enc = encodeURIComponent(dec).replace(/%2F/gi,'/');
  tries.push(`${STATE.cafeBase}/${dec}`);
  tries.push(`${STATE.cafeBase}/${enc}`);
  if (dec.startsWith('/')) tries.push(dec);
  tries.push(dec);

  let lastErr;
  for(const u of tries){
    try{
      const html = await fetchText(u);
      STATE._chapterUrlResolved = u;
      log('chapter OK', u);
      return new DOMParser().parseFromString(html, 'text/html');
    }catch(e){ lastErr = e; log('chapter failed', u, e.message); }
  }
  throw lastErr || new Error('All chapter URL attempts failed.');
}

export async function resolvePrimaryPage(doc){
  const pre = doc.querySelector(`pre.osf#${CSS.escape(STATE.params.paraId)}`);
  let inHtml=null;
  if(pre){ const raw = pre.getAttribute('data-page'); if(raw && /^\d+$/.test(raw)) inHtml = Number(raw); }
  let fromManifest=null;
  try{
    const anchorsUrl = `/data${STATE.cafeBase}/anchors/${STATE.chapterSlug}.json`;
    const json = JSON.parse(await fetchText(anchorsUrl));
    const item = json?.[STATE.params.paraId];
    const val  = item?.page ?? item;
    if (val && /^\d+$/.test(String(val))) fromManifest = Number(val);
  }catch(_){}
  const chosen = inHtml || fromManifest || 1;
  statusTags({ inHtml, fromManifest, chosen });
  return { inHtml, fromManifest, fallback:1, chosen };
}

export async function previewParagraph(doc){
  const pre = doc.querySelector(`pre.osf#${CSS.escape(STATE.params.paraId)}`);
  if (!pre) { STATE.dom.previewBox.innerHTML = `<div class="warn">Paragraph not found in chapter.</div>`; return; }
  STATE.dom.previewBox.innerHTML = '';
  const clone = pre.cloneNode(true);
  $$('img', clone).forEach(img=>img.removeAttribute('width'));
  STATE.dom.previewBox.appendChild(clone);

  // base href so relative assets resolve
  const base = document.getElementById('ro-base');
  const resolved = STATE._chapterUrlResolved || `${STATE.cafeBase}/${STATE.params.chapter}`;
  base?.setAttribute('href', resolved.replace(/\/[^/]*$/,'/'));

  // normalize images
  $$('img', STATE.dom.previewBox).forEach(img => {
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin  = '0 auto';
  });
  await typeset(STATE.dom.previewBox);

  // copy link
  STATE.dom.copyBtn?.addEventListener('click', () => {
    const link = `${location.origin}${STATE.cafeBase}/${STATE.params.chapter}#${STATE.params.paraId}`;
    navigator.clipboard?.writeText(link).then(()=>{ STATE.dom.copyBtn.classList.add('ok'); setTimeout(()=>STATE.dom.copyBtn.classList.remove('ok'), 1000); })
    .catch(()=>alert('Could not copy link.'));
  }, { once: true });
}
