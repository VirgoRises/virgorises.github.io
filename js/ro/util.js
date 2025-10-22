// /cafes/zeta-zero-cafe/js/ro/util.js
export const $  = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const pad3  = n => String(n).padStart(3, '0');
export const escapeHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export const log = (...a) => (window.RO_DEBUG ? console.debug('[RO]',...a) : void 0);

export async function fetchText(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.text();
}

export async function typeset(container){
  if (!window.MathJax) return;
  try { MathJax.typesetClear?.([container]); MathJax.texReset?.(); } catch(_){}
  await (MathJax.typesetPromise ? MathJax.typesetPromise([container]) : MathJax.typeset([container]));
}
