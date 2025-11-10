// snippets-compile.js
// Canonical renderer: Markdown → HTML (via window.marked) + MathJax typeset.

export function compileToHTML(text) {
  const raw = String(text || '');
  if (window.marked?.parse) {
    return window.marked.parse(raw);
  }
  // ultra-minimal fallback (keeps HTML raw for MathJax to see TeX)
  return raw
    .replace(/&/g,'&amp;').replace(/</g,'&lt;') // if you want HTML pass-through, remove these two lines
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

export function typesetInto(node) {
  // MathJax v3 friendly typeset of a specific container
  if (window.MathJax?.typesetPromise) {
    return window.MathJax.typesetPromise([node]).catch(()=>{});
  }
}

