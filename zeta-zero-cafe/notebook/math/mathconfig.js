// zeta-zero-cafe/notebook/math/mathconfig.js
window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$','$$'], ['\\[','\\]']],
    packages: {'[+]': ['ams']},       // enable AMS environments (align, split, etc.)
    processEnvironments: true,
    processEscapes: true
  },
  loader: { load: ['[tex]/ams'] },     // actually load the AMS component
  options: {
    // Let MathJax process <pre>/<code> since your OSF text is verbatim.
    // (Default skips them; we remove 'pre' and 'code' from the skip list.)
    skipHtmlTags: ['script','noscript','style','textarea']
    // If you prefer to target specific blocks instead, keep default skip list
    // and add:  processHtmlClass: 'osf'   then put class="osf" on containers to scan.
  },
  
  svg: { fontCache: 'global' }
};
