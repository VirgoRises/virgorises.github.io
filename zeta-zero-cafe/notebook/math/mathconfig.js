// zeta-zero-cafe/notebook/math/mathconfig.js
window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$','$$'], ['\\[','\\]']],
    packages: {'[+]': ['ams']},
    processEnvironments: true,
    processEscapes: true
  },
  loader: { load: ['[tex]/ams'] },

  svg: {
    fontCache: 'global',
    // Enable automatic line breaking
    linebreaks: { automatic: true, width: 'container' }
  },

  // (If you also use the CHTML output, apply the same linebreaks there)
  chtml: {
    linebreaks: { automatic: true, width: 'container' }
  }
};

