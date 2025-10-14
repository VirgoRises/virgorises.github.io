/* Research Office — memo toolbar, preview, autosave, and grid bridge */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);

  // ---- locate memo textarea -------------------------------------------------
  const memoEl =
    document.getElementById('memo') ||
    document.getElementById('memoText') ||
    $('.ro-memo textarea') ||
    $('textarea[name="memo"]') ||
    $('textarea');

  // toolbar root (any container near the memo with buttons)
  let toolbarEl =
    document.getElementById('memo-toolbar') ||
    $('.ro-memo .toolbar') ||
    (memoEl && memoEl.parentElement?.querySelector('.toolbar'));

  // Preview output pane (created on demand if missing)
  let previewOut =
    document.getElementById('memo-preview') ||
    $('#memo-preview');

  // Public bridge for the grid: insert an [mm|…] token at the caret
  window.insertMemoMarkup = function insertMemoMarkup(snippet) {
    if (!memoEl) return;
    const s = memoEl.selectionStart ?? memoEl.value.length;
    const e = memoEl.selectionEnd   ?? memoEl.value.length;
    memoEl.value = memoEl.value.slice(0, s) + snippet + '\n' + memoEl.value.slice(e);
    const pos = s + snippet.length + 1;
    memoEl.setSelectionRange(pos, pos);
    memoEl.focus();
    memoEl.dispatchEvent(new Event('input', { bubbles: true }));
  };

  // Also expose current memo text so the grid can re-parse on demand
  window.roGetMemoText = () => memoEl?.value ?? '';

  if (!memoEl) return; // nothing to wire up

  // ---- autosave (per cafe / chapter / para) --------------------------------
  const params   = new URLSearchParams(location.search);
  const PARA     = params.get('para')    || '';
  const CHAPTER  = params.get('chapter') || '';
  const CAFE     = location.pathname.split('/').filter(Boolean)[1] || 'zeta-zero-cafe';
  const draftKey    = `ro:draft:${CAFE}:${CHAPTER}:${PARA}`;
  const versionsKey = `ro:versions:${CAFE}:${CHAPTER}:${PARA}`;

  function loadDraft() {
    try {
      const v = localStorage.getItem(draftKey);
      if (v != null) memoEl.value = v;
    } catch {}
    // let the grid repaint tokens from the memo text
    window.roRefreshFromMemo?.();
  }
  function saveDraft() {
    try { localStorage.setItem(draftKey, memoEl.value); } catch {}
  }

  loadDraft();
  memoEl.addEventListener('input', () => {
    saveDraft();
    window.roRefreshFromMemo?.();
  });

  // wire “Save draft / Save version” no matter where their buttons live
  function findButton(txt) {
    const want = String(txt).trim().toLowerCase();
    return Array.from(document.querySelectorAll('button'))
      .find(b => (b.textContent || '').trim().toLowerCase() === want);
  }
  const btnSaveDraft   = findButton('save draft');
  const btnSaveVersion = findButton('save version');

  btnSaveDraft && btnSaveDraft.addEventListener('click', (e) => {
    e.preventDefault(); saveDraft(); flash('Draft saved.');
  });

  btnSaveVersion && btnSaveVersion.addEventListener('click', (e) => {
    e.preventDefault();
    const versions = JSON.parse(localStorage.getItem(versionsKey) || '[]');
    versions.push({ ts: new Date().toISOString(), text: memoEl.value });
    localStorage.setItem(versionsKey, JSON.stringify(versions));
    flash('Version stored.');
  });

  function flash(msg) {
    let n = document.getElementById('ro-flash');
    if (!n) {
      n = document.createElement('div'); n.id = 'ro-flash';
      Object.assign(n.style, {
        position: 'fixed', bottom: '10px', right: '10px', zIndex: 9999,
        background: '#22313d', color: '#cfe8ff', padding: '6px 10px',
        borderRadius: '8px', transition: 'opacity .7s'
      });
      document.body.appendChild(n);
    }
    n.textContent = msg; n.style.opacity = '1';
    setTimeout(() => { n.style.opacity = '0'; }, 900);
  }

  // ---- Markdown + LaTeX preview --------------------------------------------
  // We keep *chapter’s* MathJax config as the single source of truth.
  // research_office.html should load:  /cafes/<cafe>/notebook/math/mathconfig.js
  // Here we only ensure the runtime exists (local path -> CDN fallback).

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const abs = new URL(src, location.href).toString();
      if ([...document.scripts].some(s => s.src === abs)) return resolve(abs);
      const s = document.createElement('script');
      s.src = abs; s.async = true;
      s.onload = () => resolve(abs);
      s.onerror = () => reject(new Error('Failed to load ' + abs));
      document.head.appendChild(s);
    });
  }

  async function ensureMarked() {
    if (window.marked) return window.marked;
    try {
      await loadScriptOnce('/js/marked.min.js');
    } catch {
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/marked@12/marked.min.js');
    }
    return window.marked;
  }

  async function ensureMathJax() {
    // If chapter config + engine are already present, we’re done.
    if (window.MathJax?.typesetPromise) return window.MathJax;

    const candidates = [
      '/js/mathjax/es5/tex-chtml.js',
      '/js/mathjax/tex-chtml.js',
      'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js',
      'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-chtml.min.js',
    ];
    for (const src of candidates) {
      try {
        await loadScriptOnce(src);
        if (window.MathJax?.startup?.promise) {
          await window.MathJax.startup.promise;
        }
        if (window.MathJax?.typesetPromise) return window.MathJax;
      } catch { /* try next */ }
    }
    throw new Error('MathJax engine could not be loaded');
  }

  // Convert ```math fences → $$…$$ so authors can use either
  function normalizeFencedMath(md) {
    return md.replace(/```\s*math\s*\r?\n([\s\S]+?)\r?\n```/gi, (_, body) => `$$${body}$$`);
  }

  // Freeze TeX so Markdown doesn’t mangle it; thaw, then typeset.
  async function renderMemoPreview(srcTextarea, outContainer) {
    let md = srcTextarea.value || '';
    md = normalizeFencedMath(md);

    const stash = [];
    const tag = i => `<span data-tex="${i}"></span>`;

    // block $$…$$
    md = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, b) => {
      const i = stash.length; stash.push(`$$${b}$$`); return tag(i);
    });
    // inline $…$ (avoid $$)
    md = md.replace(/(^|[^\$])\$(?!\$)([^$\n]+?)\$(?!\$)/g, (m, pre, b) => {
      const i = stash.length; stash.push(`$${b}$`); return pre + tag(i);
    });

    const marked = await ensureMarked();
    outContainer.innerHTML = marked.parse(md);

    // thaw TeX
    outContainer.querySelectorAll('span[data-tex]').forEach(sp => {
      const raw = stash[Number(sp.getAttribute('data-tex'))] || '';
      sp.replaceWith(document.createTextNode(raw));
    });

    // typeset via chapter MathJax config
    const MJ = await ensureMathJax();
    MJ.typesetClear?.([outContainer]); MJ.texReset?.();
    if (MJ.typesetPromise) await MJ.typesetPromise([outContainer]);
    else MJ.typeset?.([outContainer]);
  }

  function ensurePreviewPane() {
    if (previewOut && previewOut.isConnected) return previewOut;
    previewOut = document.createElement('div');
    previewOut.id = 'memo-preview';
    previewOut.className = 'memo-preview';
    // Insert right after the toolbar (preferred) or after the textarea
    if (toolbarEl?.parentElement) {
      toolbarEl.parentElement.insertAdjacentElement('afterend', previewOut);
    } else {
      memoEl.insertAdjacentElement('afterend', previewOut);
    }
    return previewOut;
  }

  async function doPreview() {
    const pane = ensurePreviewPane();
    await renderMemoPreview(memoEl, pane);
    pane.scrollIntoView({ block: 'nearest' });
  }

  // ---- toolbar wiring (bold / italic / code / math / preview) --------------
  function wrap(left, right = left) {
    const s = memoEl.selectionStart ?? 0, e = memoEl.selectionEnd ?? 0;
    const val = memoEl.value, sel = val.slice(s, e);
    const out = left + sel + right;
    memoEl.value = val.slice(0, s) + out + val.slice(e);
    const after = s + left.length + sel.length;
    memoEl.setSelectionRange(after, after);
    memoEl.dispatchEvent(new Event('input', { bubbles: true }));
    memoEl.focus();
  }

  function bindToolbar() {
    const root = toolbarEl || memoEl.parentElement || document;
    root.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button'); if (!btn) return;
      const t = (btn.dataset.action || btn.textContent || '').trim().toLowerCase();
      if (t === 'preview') { ev.preventDefault(); doPreview(); return; }
      if (t === 'b' || t === 'bold') wrap('**');
      if (t === '/' || t === 'italic') wrap('*');
      if (t === '{}' || t === 'code') wrap('`');
      if (t.includes('\\(x\\)') || t === 'math') wrap('$', '$');
    });
    // also hook a button with explicit id (if present)
    const previewBtn = document.getElementById('memoPreviewBtn');
    previewBtn && previewBtn.addEventListener('click', (e) => { e.preventDefault(); doPreview(); });
  }

  bindToolbar();
})();
