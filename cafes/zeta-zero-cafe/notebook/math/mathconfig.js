// zeta-zero-cafe/notebook/math/mathconfig.js
window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$','$$'], ['\\[','\\]']],
    packages: {'[+]': ['ams', 'textmacros']},   // add textmacros so \# etc. work
    processEnvironments: true,
    processEscapes: true
  },
  loader: { load: ['[tex]/ams', '[tex]/textmacros'] }, // load both components
  options: {
    // Let MathJax process <pre>/<code> (you asked for this in chapter pages).
    skipHtmlTags: ['script','noscript','style','textarea']
    // Alternatively, use processHtmlClass to target specific blocks.
  },
  svg: { fontCache: 'global' }
};
