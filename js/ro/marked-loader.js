// Load Marked with a safe fallback (same behavior you had inline).
(function loadMarked() {
  if (window.marked) return;
  const s = document.createElement('script');
  s.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
  s.defer = true;
  s.onerror = function () {
    // super-minimal fallback
    window.marked = {
      parse: (t) => String(t)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
    };
  };
  document.head.appendChild(s);
})();
