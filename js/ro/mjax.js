// /js/ro/mjax.js
export async function typeset(el) {
  if (!el || !window.MathJax) return;
  try {
    // Wait until MathJax is fully initialized (from your canonical math/mathconfig.js)
    if (window.MathJax.startup?.promise) {
      await window.MathJax.startup.promise;
    }
    window.MathJax.typesetClear?.([el]);
    window.MathJax.texReset?.();
    if (window.MathJax.typesetPromise) {
      await window.MathJax.typesetPromise([el]);
    } else {
      window.MathJax.typeset?.([el]);
    }
  } catch (_) {
    /* ignore */
  }
}
