/* Minimal compiler layer.
   IMPORTANT: We preserve raw HTML and LaTeX for MathJax.
   If you later want real Markdown, swap mdToHtml with a safe parser. */
export function mdToHtml(src){ return (src ?? ""); }
