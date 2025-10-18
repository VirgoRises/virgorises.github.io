// /js/research.office.js  — focused fixes: memo markers & page strip
(() => {
  // tiny qs + DOM helpers
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // ---- elements we touch in the right column ----
  const els = {
    memoTA: $('#memoText'),
    refsWrap: $('#refStrip'),          // container that holds the page chips
    viewerImg: $('#thumbImg'),         // the left viewer’s <img> (already wired elsewhere)
    status: $('#ro-status')            // optional status line (if present)
  };

  const setStatus = (msg) => { if (els.status) els.status.textContent = msg; };

  // ---- primary page (decided by resolver/bootstrap elsewhere) ----
  // Expect a data-primary-page attribute on #refStrip (set by bootstrap).
  const getPrimaryPage = () => {
    const p = Number(els.refsWrap?.dataset?.primaryPage || 0);
    return Number.isFinite(p) && p > 0 ? p : 1;
  };

  const getMemoText = () => (els.memoTA?.value || '');
  const setMemoText = (s) => { if (els.memoTA) els.memoTA.value = s; };

  // ---------- token parsing ----------
  // LIVE marker shape: [mm|p7=12,34]  or [mm|p7=12,34:56,78]
  // DELETED marker shape: [del]mm|p7=...]
  //
  // We treat "[del]" as a hard prefix that makes the token inert. For parsing,
  // we first collect *all* occurrences of "[mm|...]" and then drop those that
  // have "[del]" immediately in front.
  const findAllTokens = (text) => {
    const tokens = [];
    const re = /\[mm\|p(\d+)=(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)(?::(\d+(?:\.\d+)?),(\d+(?:\.\d+)?))?\]/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      // If immediately preceded by "[del]" we treat it as deleted/inert
      const isDel = text.slice(Math.max(0, start - 5), start) === '[del]';
      tokens.push({
        page: Number(m[1]),
        x1: Number(m[2]),
        y1: Number(m[3]),
        x2: m[4] !== undefined ? Number(m[4]) : null,
        y2: m[5] !== undefined ? Number(m[5]) : null,
        kind: m[4] !== undefined ? 'box' : 'point',
        start,
        end: start + m[0].length,
        raw: m[0],
        deleted: isDel,
      });
    }
    return tokens;
  };

  const livePagesFromMemo = (text) => {
    const tks = findAllTokens(text).filter(t => !t.deleted);
    const seen = new Set();
    const order = [];
    for (const t of tks) {
      if (!seen.has(t.page)) { seen.add(t.page); order.push(t.page); }
    }
    return order;
  };

  // ---------- mutate memo: delete page tokens ----------
  // transforms every live “[mm|pN=…]” -> “[del]mm|pN=…]”
  function markPageDeletedInMemo(page) {
    const src = getMemoText();
    const toks = findAllTokens(src)
      .filter(t => !t.deleted && t.page === page)
      .sort((a,b) => b.start - a.start); // replace from the back

    if (!toks.length) return false;

    let out = src;
    for (const t of toks) {
      // turn "[mm|…]" into "[del]mm|…]"
      const replacement = '[del]' + t.raw.slice(1);
      out = out.slice(0, t.start) + replacement + out.slice(t.end);
    }
    setMemoText(out);
    return true;
  }

  // ---------- add page token (if not primary & not already present) ----------
  function addPageToken(page) {
    const primary = getPrimaryPage();
    if (page === primary) return; // never tokenise primary
    const text = getMemoText();
    const already = livePagesFromMemo(text).includes(page);
    if (already) return;
    // add at caret or append
    const token = `[mm|p${page}=x,y]`;
    const ta = els.memoTA;
    if (ta && typeof ta.selectionStart === 'number') {
      const s = ta.selectionStart, e = ta.selectionEnd;
      setMemoText(text.slice(0, s) + token + text.slice(e));
      ta.selectionStart = ta.selectionEnd = s + token.length;
    } else {
      setMemoText(text + (text.endsWith('\n') ? '' : '\n') + token);
    }
  }

  // ---------- ref strip rendering ----------
  function renderRefStrip() {
    if (!els.refsWrap) return;
    const primary = getPrimaryPage();
    const text = getMemoText();
    const pages = livePagesFromMemo(text);
    // ensure primary is first
    const uniq = [primary, ...pages.filter(p => p !== primary)];
    // clear
    els.refsWrap.innerHTML = '';
    for (const p of uniq) {
      const chip = document.createElement('div');
      chip.className = 'ref-chip';
      chip.dataset.page = String(p);
      chip.innerHTML = `
        <div class="thumbTag">p.${p}</div>
        <img class="thumb" alt="p.${p}" src="/cafes/zeta-zero-cafe/sources/thumbs/page-${String(p).padStart(3,'0')}.jpg" />
        ${p === primary ? '' : '<button class="chipDel" title="Mark deleted">×</button>'}
      `;
      if (p === primary) chip.classList.add('primary');
      els.refsWrap.appendChild(chip);
    }
  }

  function wireRefStrip() {
    if (!els.refsWrap) return;
    els.refsWrap.addEventListener('click', (ev) => {
      const delBtn = ev.target.closest('.chipDel');
      const chip   = ev.target.closest('.ref-chip');
      if (!chip) return;
      const page = Number(chip.dataset.page);
      if (delBtn) {
        // mark tokens for that page as deleted and re-render
        const changed = markPageDeletedInMemo(page);
        if (changed) {
          renderRefStrip();
          setStatus?.(`Marked p.${page} tokens as [del].`);
        }
        return;
      }
      // clicking chip: set viewer to that page (if viewer present)
      if (els.viewerImg) {
        els.viewerImg.src = `/cafes/zeta-zero-cafe/sources/thumbs/page-${String(page).padStart(3,'0')}.jpg`;
        els.viewerImg.dataset.page = String(page);
      }
    });
  }

  // ---------- hook “Add page” button in the left viewer toolbar (if present) ----------
  const addBtn = $('#addPageBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const page = Number(els.viewerImg?.dataset?.page || 0);
      if (page > 0) {
        addPageToken(page);
        renderRefStrip();
        setStatus?.(`Added page p.${page} to memo.`);
      }
    });
  }

  // keep strip in sync as user types
  if (els.memoTA) {
    els.memoTA.addEventListener('input', () => {
      renderRefStrip();
    });
  }

  // initial
  renderRefStrip();
  wireRefStrip();
})();
