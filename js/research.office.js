// research.office.js — minimal, self-contained Markdown + LaTeX preview wiring
// NOTE: does not touch grid/thumbnail code or layout; only memo preview logic.

// ---------- tiny utilities ----------
function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const abs = new URL(src, location.href).toString();
    if ([...document.scripts].some(s => s.src === abs)) { resolve(abs); return; }
    const s = document.createElement('script');
    s.src = abs; s.async = true;
    s.onload = () => resolve(abs);
    s.onerror = () => reject(new Error('Failed to load ' + abs));
    document.head.appendChild(s);
  });
}

// ---------- Marked (Markdown) ----------
async function ensureMarked() {
  if (window.marked) return;
  try {
    await loadScriptOnce('/js/marked.min.js');         // local, if you keep a copy
  } catch {
    /* ignore */
  }
  if (!window.marked) {
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/marked@12/marked.min.js');
  }
}

// ---------- MathJax (LaTeX) ----------
async function ensureMathJax() {
  // If chapters already loaded /cafes/.../math/mathconfig.js, this is already set.
  if (window.MathJax?.typesetPromise) return;

  // If a config wasn't provided yet, set a minimal compatible one (keeps \# working).
  if (!window.MathJax) {
    window.MathJax = {
      tex: {
        inlineMath: [['\\(', '\\)'], ['$', '$']],
        displayMath: [['$$','$$']],
        packages: {'[+]': ['ams', 'textmacros']},
      },
      loader: { load: ['[tex]/ams','[tex]/textmacros'] },
    };
  }

  // Try local, then CDN.
  const sources = [
    '/js/mathjax/es5/tex-chtml.js',
    '/js/mathjax/tex-chtml.js',
    'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js',
  ];
  for (const src of sources) {
    try {
      await loadScriptOnce(src);
      if (window.MathJax?.startup?.promise) {
        await window.MathJax.startup.promise;
      }
      if (window.MathJax?.typesetPromise) return;
    } catch {
      /* try next */
    }
  }
  // If we get here, we’ll still render Markdown; math will remain as raw TeX.
}

// ---------- Markdown + LaTeX renderer ----------
function normalizeFencedMath(md) {
  // Allow ```math ... ``` blocks by converting to $$...$$
  return md.replace(/```\s*math\s*\r?\n([\s\S]+?)\r?\n```/gi, (_, body) => `$$${body}$$`);
}

async function renderMdLatex(md, outEl) {
  await ensureMarked();
  md = normalizeFencedMath(md);

  // Freeze math into placeholders so Marked won’t escape it.
  const texStore = [];
  const place = i => `<span data-tex="${i}"></span>`;

  // Display math
  md = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, body) => {
    const i = texStore.length; texStore.push(`$$${body}$$`); return place(i);
  });
  // Inline math
  md = md.replace(/(^|[^\$])\$(?!\$)([^$\n]+?)\$(?!\$)/g, (m, pre, body) => {
    const i = texStore.length; texStore.push(`$${body}$`); return pre + place(i);
  });

  outEl.innerHTML = window.marked.parse(md);

  // Thaw: insert raw TeX back so MathJax can see it.
  outEl.querySelectorAll('span[data-tex]').forEach(sp => {
    const raw = texStore[Number(sp.getAttribute('data-tex'))] || '';
    sp.replaceWith(document.createTextNode(raw));
  });

  // Ask MathJax to typeset (if available)
  try {
    await ensureMathJax();
    if (window.MathJax?.typesetClear) MathJax.typesetClear([outEl]);
    if (window.MathJax?.texReset) MathJax.texReset();
    if (window.MathJax?.typesetPromise) await MathJax.typesetPromise([outEl]);
    else if (window.MathJax?.typeset) MathJax.typeset([outEl]);
  } catch {
    // No MathJax—leave raw TeX visible; that’s OK for drafts.
  }
}

// ---------- Memo toolbar wiring (Preview button only) ----------
function findMemoElements() {
  // We’re intentionally defensive: look inside the “Memo to self” card.
  const memoCard = $all('.card, .ro-card').find(el =>
    /Memo to self/i.test(el.textContent || '')
  ) || document;

  const textarea =
    $('#memoText', memoCard) ||
    $('textarea', memoCard); // there’s only one textarea in the memo card

  // Create (or reuse) a preview container right below the textarea
  let preview = $('#memoPreviewOut', memoCard);
  if (!preview && textarea) {
    preview = document.createElement('div');
    preview.id = 'memoPreviewOut';
    preview.className = 'ro-memo-preview card';
    preview.style.marginTop = '10px';
    preview.style.padding = '12px';
    preview.style.border = '1px solid var(--line, #1f2730)';
    preview.style.borderRadius = '10px';
    preview.style.background = 'var(--panel, #0e141b)';
    textarea.parentElement.insertAdjacentElement('afterend', preview);
  }

  // Find the “Preview” button inside the memo toolbar
  const previewBtn =
    $('#memoPreview', memoCard) ||
    $all('button', memoCard).find(b => (b.textContent || '').trim() === 'Preview');

  return { textarea, preview, previewBtn };
}

function initMemoPreview() {
  const { textarea, preview, previewBtn } = findMemoElements();
  if (!textarea || !preview || !previewBtn) return; // nothing to wire

  // Single click handler – render current memo content
  previewBtn.addEventListener('click', async () => {
    const md = textarea.value || '';
    preview.setAttribute('aria-busy', 'true');
    preview.textContent = 'Rendering preview…';
    try {
      await renderMdLatex(md, preview);
    } finally {
      preview.removeAttribute('aria-busy');
    }
  }, { once: false });
}

// ---------- boot ----------
document.addEventListener('DOMContentLoaded', () => {
  // Only wire the memo preview; all other modules (grid, thumbnails, etc.) are untouched.
  initMemoPreview();
});
