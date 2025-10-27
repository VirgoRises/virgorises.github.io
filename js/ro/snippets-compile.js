// /js/ro/snippets-compile.js
// Markdown -> HTML (keeps raw HTML & TeX delimiters)
let __MD__;
function md() {
  if (!__MD__) {
    // markdown-it with HTML enabled; do NOT typographer (keeps backslashes)
    __MD__ = window.markdownit({
      html: true,
      breaks: true,
      typographer: false,
      linkify: false
    });
  }
  return __MD__;
}

export function mdToHtml(src) {
  return md().render(src || '');
}

// ---- MathJax helpers ----
export function queueTypeset(scopeEl) {
  const MJ = window.MathJax;
  if (!MJ) return;
  const scope = scopeEl ? [scopeEl] : undefined;

  // If startup promise exists, wait; then typeset.
  if (MJ.startup && MJ.startup.promise) {
    MJ.startup.promise.then(() => {
      MJ.typesetClear && MJ.typesetClear(scope);
      MJ.typesetPromise ? MJ.typesetPromise(scope)
                        : MJ.typeset && MJ.typeset(scope);
    });
  } else {
    // Fallback
    MJ.typesetClear && MJ.typesetClear(scope);
    MJ.typesetPromise ? MJ.typesetPromise(scope)
                      : MJ.typeset && MJ.typeset(scope);
  }
}
