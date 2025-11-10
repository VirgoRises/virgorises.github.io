// marked-loader.js
// Purpose: load "marked" once and expose it as window.marked (no exports needed).
(() => {
  const have = !!(window.marked && typeof window.marked.parse === 'function');
  if (have) return;

  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
  s.async = true;
  s.onload = () => {
    // Optional: minimal config
    if (window.marked?.use) {
      window.marked.use({ breaks: true, gfm: true });
    }
    console.log('[RO] marked ready');
  };
  document.head.appendChild(s);
})();
