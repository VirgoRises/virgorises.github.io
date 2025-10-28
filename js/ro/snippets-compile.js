/* ro/snippets-compile.js
 * Compile mixed Markdown + raw HTML + LaTeX to HTML, then MathJax typeset.
 * Mirrors the behavior in markdown-latex.regression.html so it can render math-test.md.
 */

//// ------------------------ tiny loader helpers ------------------------
function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const abs = new URL(src, location.href).toString();
    if ([...document.scripts].some(s => s.src === abs)) return resolve(src);
    const s = document.createElement('script');
    s.src = abs; s.async = true;
    s.onload = () => resolve(src);
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

async function ensureMarked() {
  if (window.marked) return 'present';
  try {
    await loadScriptOnce('/js/marked.min.js');
    if (!window.marked) throw new Error('no local marked');
    return 'local';
  } catch {
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/marked@12/marked.min.js');
    if (!window.marked) throw new Error('no CDN marked');
    return 'cdn';
  }
}

async function ensureMathJax() {
  if (window.MathJax?.typesetPromise) return 'present';

  // If no site-wide config (e.g., chapters’ mathconfig.js) was loaded, provide a minimal one.
  if (!window.MathJax) {
    window.MathJax = {
      tex: {
        inlineMath: [['\\(', '\\)'], ['$', '$']],
        displayMath: [['$$','$$']],
        packages: {'[+]':['ams','textmacros']},
      },
      loader: { load: ['[tex]/ams','[tex]/textmacros'] },
    };
  }

  const candidates = [
    '/js/mathjax/es5/tex-chtml.js',
    '/js/mathjax/tex-chtml.js',
    'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js',
    'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-chtml.min.js',
  ];
  for (const src of candidates) {
    try {
      await loadScriptOnce(src);
      if (window.MathJax?.startup?.promise) await window.MathJax.startup.promise;
      const t0 = performance.now();
      while (!window.MathJax?.typesetPromise && performance.now() - t0 < 2000) {
        await new Promise(r => setTimeout(r, 50));
      }
      if (window.MathJax?.typesetPromise) return src;
    } catch { /* try next */ }
  }
  throw new Error('MathJax unavailable');
}

//// ------------------------ Markdown + TeX pipeline ------------------------

/** Convert ```math ...``` fenced blocks into $$ ... $$ so authors can use markdown fences. */
function normalizeFencedMath(md) {
  return md.replace(/```+\s*math\s*\r?\n([\s\S]+?)\r?\n```+/gi, (_, body) => `$$${body}$$`);
}

/** Protect triple-backtick code fences so math regexes never touch them. */
function protectCodeFences(md) {
  const store = [];
  const token = i => `@@__CODE_${i}__@@`;
  const re = /```+([\s\S]*?)```+/g;
  let out = '';
  let lastIdx = 0, m;
  while ((m = re.exec(md))) {
    out += md.slice(lastIdx, m.index);
    const i = store.length; store.push(m[0]);
    out += token(i);
    lastIdx = re.lastIndex;
  }
  out += md.slice(lastIdx);
  return {
    text: out,
    restore: (s) => s.replace(/@@__CODE_(\d+)__@@/g, (_, i) => store[+i] ?? '')
  };
}

/** Freeze TeX runs into placeholders so marked doesn’t escape or mangle them. */
function freezeTeX(md) {
  const texStore = [];
  const place = i => `<span data-tex="${i}"></span>`;

  // Display math: $$ ... $$
  md = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, body) => {
    const i = texStore.length; texStore.push(`$$${body}$$`); return place(i);
  });

  // Inline math: $...$ — avoid $$ and avoid greed; also avoid touching code we already protected.
  md = md.replace(/(^|[^\$])\$(?!\$)([^$\n]+?)\$(?!\$)/g, (m, pre, body) => {
    const i = texStore.length; texStore.push(`$${body}$`); return pre + place(i);
  });

  return { text: md, texStore };
}

/** Thaw placeholders back to raw TeX after marked generated HTML. */
function thawTeXToHTML(html, texStore) {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('span[data-tex]').forEach(sp => {
    const idx = Number(sp.getAttribute('data-tex'));
    const raw = texStore[idx] || '';
    sp.replaceWith(document.createTextNode(raw));
  });
  return div.innerHTML;
}

//// ------------------------ Public API ------------------------

/**
 * Compile a snippet’s body (Markdown + raw HTML + LaTeX) into HTML.
 * @param {Object} sn - { body: string }
 * @returns {Promise<string>} html
 */
export async function compileToHTML(sn) {
  const body = (sn?.body ?? '').toString();

  // 1) optional fenced-math normalization
  let md = normalizeFencedMath(body);

  // 2) protect code fences
  const code = protectCodeFences(md);
  md = code.text;

  // 3) freeze TeX
  const frozen = freezeTeX(md);
  md = frozen.text;

  // 4) restore code fences before Markdown → so marked handles them correctly
  md = code.restore(md);

  // 5) Markdown parse (allow raw HTML passthrough; marked’s default is fine)
  await ensureMarked();
  const html = window.marked.parse(md);

  // 6) thaw TeX back into the HTML as raw strings
  const withTeX = thawTeXToHTML(html, frozen.texStore);
  return withTeX;
}

/**
 * Typeset MathJax inside a container element. Safe to call repeatedly.
 * @param {HTMLElement} el
 */
export async function typesetInto(el) {
  if (!el) return;
  try {
    await ensureMathJax();
    if (MathJax.typesetClear) MathJax.typesetClear([el]);
    if (MathJax.texReset) MathJax.texReset();
    if (MathJax.typesetPromise) await MathJax.typesetPromise([el]); else MathJax.typeset([el]);
  } catch (e) {
    // Silent: show raw TeX if MathJax can’t be loaded.
    // console.warn('MathJax typeset skipped:', e);
  }
}
