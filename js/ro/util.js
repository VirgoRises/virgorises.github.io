// /js/ro/util.js
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

/**
 * Single source of truth for MathJax typesetting.
 * - Waits for MathJax startup.promise (from your canonical math/mathconfig.js).
 * - Clears previous typeset and re-renders only the given container.
 */
export async function typeset(container){
  if (!container || !window.MathJax) return;
  try {
    // Ensure MathJax is fully initialized
    if (window.MathJax.startup?.promise) {
      await window.MathJax.startup.promise;
    }
    window.MathJax.typesetClear?.([container]);
    window.MathJax.texReset?.();
    if (window.MathJax.typesetPromise) {
      await window.MathJax.typesetPromise([container]);
    } else {
      window.MathJax.typeset?.([container]);
    }
  } catch (_) {
    /* no-op */
  }
}
