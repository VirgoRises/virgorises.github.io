/* Research Office — loads a paragraph preview + figures/tables and memo actions.
   Query: ?para=osf-N&chapter=notebook/<file>.html&return=<encoded-url>
*/
(() => {
  // ---------- tiny DOM helpers ----------
  const $  = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  // ---------- query / context ----------
  const qs       = new URLSearchParams(location.search);
  const PARA_ID  = qs.get("para") || "";                        // e.g. osf-7
  let   CHAPTER  = qs.get("chapter") || "";                     // e.g. notebook/chapter-1-…html
  try { CHAPTER = decodeURIComponent(CHAPTER); } catch {}

  // cafes/<slug>/...
  const cafeSlug = location.pathname.split("/").filter(Boolean)[1] || "zeta-zero-cafe";
  const cafeBase = `/cafes/${cafeSlug}`;

  // ---------- targets (match your HTML) ----------
  const previewBox = $("#paraPreview");
  const numBadge   = $("#paraNum");
  const figsList   = $("#figlist");
  const tblList    = $("#tbllist");
  const memoBody   = $("#memoBody");
  const draftsList = $("#draftsList");

  // buttons
  const btnSaveDraft = $("#saveDraft");
  const btnExport    = $("#exportMemo");
  const btnDiscord   = $("#openDiscord");

  // ---------- utils ----------
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  const paraNumberFrom = (id) => {
    const m = String(id).match(/osf-(\d+)/);
    return m ? Number(m[1]) : null;
  };

  const setBadge = (n) => {
    if (!numBadge) return;
    numBadge.textContent = n != null ? `#${n}` : "#";
    numBadge.title = n != null ? `Paragraph ${n}` : "";
  };

  const buildOpenLink = (anchorId) => `${cafeBase}/${CHAPTER.replace(/^\/+/, "")}#${anchorId}`;

  function normalisePreviewAssets(container) {
    // Make relative images load from /cafes/<slug>/notebook/
    $$("img", container).forEach(img => {
      const src = img.getAttribute("src") || "";
      if (!src || /^(https?:|data:|\/)/i.test(src)) return; // absolute/data ok
      img.src = `${cafeBase}/notebook/${src}`;
      img.loading = "lazy";
      img.decoding = "async";
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.display = "block";
      img.style.margin = "0 auto";
    });
  }

  // --- MathJax: ensure present + typeset container ---------------------------
  async function ensureMathJax() {
    if (window.MathJax) return;
    // minimal config: allow \( \) and $ $
    window.MathJax = window.MathJax || {
      tex: { inlineMath: [['\\(','\\)'], ['$', '$']] },
      options: { skipHtmlTags: { '[-]': ['script','noscript','style','textarea','pre','code'] } }
    };
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.id = "MathJax-script";
      s.async = true;
      s.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("Failed to load MathJax"));
      document.head.appendChild(s);
    });
    await new Promise(r => setTimeout(r, 50));
  }

  async function typeset(container) {
    try {
      await ensureMathJax();
      if (MathJax.typesetClear) MathJax.typesetClear([container]);
      if (MathJax.texReset)     MathJax.texReset();
      if (MathJax.typesetPromise) {
        await MathJax.typesetPromise([container]);
      } else if (MathJax.typeset) {
        MathJax.typeset([container]);
      }
    } catch (e) {
      console.warn("MathJax typeset skipped:", e);
    }
  }

  // ---------- robust chapter fetch ----------
  function normPath(s){ return (s||"").replace(/\\/g,"/").replace(/^\/+|\/+$/g,""); }
  function candidatesForChapter(ch) {
    const c = normPath(ch);
    const list = [];
    if (c.startsWith("http")) list.push(c);
    if (c.startsWith("/"))    list.push(c);
    list.push(`${cafeBase}/${c}`);                 // cafe-relative
    list.push(c.replace(/^\/+/, ""));              // bare relative (if served from same root)
    return [...new Set(list)];
  }

  async function loadChapterDom() {
    const tries = candidatesForChapter(CHAPTER);
    let lastErr = null;
    for (const url of tries) {
      try {
        const res = await fetch(url, { credentials: "omit" });
        if (!res.ok) { lastErr = new Error(`HTTP ${res.status} on ${url}`); continue; }
        const html = await res.text();
        const doc  = new DOMParser().parseFromString(html, "text/html");
        return { doc, usedUrl: url };
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("Failed to fetch chapter HTML");
  }

  // ---------- preview + lists ----------
  function listChapterFiguresAndTables(chapterDoc) {
    const figures = [];
    const tables  = [];
    $$("figure[id]", chapterDoc).forEach(fig => {
      const id = fig.id;
      const caption = $("figcaption", fig)?.textContent?.trim() || id;
      const isTable = fig.querySelector("table") !== null;
      const item = { id, caption, href: buildOpenLink(id) };
      (isTable ? tables : figures).push(item);
    });
    return { figures, tables };
  }

  function renderRefLists(refs) {
    if (figsList) figsList.innerHTML = "";
    if (tblList)  tblList .innerHTML = "";

    refs.figures.forEach(f => {
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `
        <label>
          <input type="checkbox" data-id="${f.id}">
          <span>${escapeHtml(f.caption)}</span>
        </label>
        <a class="open" href="${f.href}" target="_blank" rel="noopener">open</a>
      `;
      figsList?.appendChild(row);
    });

    refs.tables.forEach(t => {
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `
        <label>
          <input type="checkbox" data-id="${t.id}">
          <span>${escapeHtml(t.caption)}</span>
        </label>
        <a class="open" href="${t.href}" target="_blank" rel="noopener">open</a>
      `;
      tblList?.appendChild(row);
    });
  }

  async function previewParagraph(chapterDoc, paraId, usedUrl) {
    // find requested anchor, or fall back to first osf-*
    let node = chapterDoc.getElementById(paraId);
    if (!node) node = chapterDoc.querySelector("[id^='osf-']");

    if (!node) {
      previewBox.textContent =
        "Loaded chapter, but could not find paragraph anchor.\n" +
        `Anchor: ${paraId || "(missing)"}\nURL: ${usedUrl || "(?)"}`;
      return;
    }

    const pickedId = node.id || paraId || "osf-?";
    setBadge(paraNumberFrom(pickedId));

    // choose a readable preview chunk (section/card around the anchor)
    const container = node.closest("section, article, .osf, .card") || node.parentElement || node;

    // inject clone
    previewBox.innerHTML = "";
    const clone = container.cloneNode(true);
    $$("img", clone).forEach(img => img.removeAttribute("width"));
    previewBox.appendChild(clone);

    // fix relative assets + typeset math
    normalisePreviewAssets(previewBox);
    await typeset(previewBox);

    // figure/table lists
    renderRefLists(listChapterFiguresAndTables(chapterDoc));
  }

  // ---------- local memos ----------
  function loadMemos() {
    try { return JSON.parse(localStorage.getItem("ro:memos") || "[]"); }
    catch { return []; }
  }
  function saveMemos(list) {
    localStorage.setItem("ro:memos", JSON.stringify(list));
  }
  function renderDrafts() {
    const memos = loadMemos();
    if (draftsList) draftsList.innerHTML = "";
    memos.slice().reverse().forEach(m => {
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `<div class="mono" style="opacity:.75">${escapeHtml(m.title)}</div>`;
      draftsList?.appendChild(row);
    });
  }
  function wireMemoButtons() {
    btnSaveDraft?.addEventListener("click", () => {
      const body = memoBody?.value?.trim() || "";
      if (!body) return;
      const chapterFile = CHAPTER.split("/").pop() || "";
      const chapterSlug = chapterFile.replace(/\.html$/,"");
      const memos = loadMemos();
      memos.push({ title: `${chapterSlug} · ${PARA_ID||"osf-?"}`, body, ts: Date.now() });
      saveMemos(memos);
      renderDrafts();
    });

    btnExport?.addEventListener("click", () => {
      const chapterFile = CHAPTER.split("/").pop() || "";
      const chapterSlug = chapterFile.replace(/\.html$/,"");
      const payload = {
        chapter: CHAPTER,
        para: PARA_ID,
        memo: memoBody?.value || "",
        when: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${chapterSlug}-${PARA_ID||"osf"}.memo.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 800);
    });

    btnDiscord?.addEventListener("click", () => {
      alert("Wire this to your Discord flow when ready.");
    });
  }

  // ---------- init ----------
  async function init() {
    if (!previewBox) return;
    if (!PARA_ID || !CHAPTER) {
      previewBox.textContent = "Missing or invalid query parameters (para / chapter).";
      return;
    }

    setBadge(paraNumberFrom(PARA_ID));

    try {
      const { doc, usedUrl } = await loadChapterDom();
      await previewParagraph(doc, PARA_ID, usedUrl);
      renderDrafts();
      wireMemoButtons();
    } catch (err) {
      console.error("[research-office] preview failed:", err);
      previewBox.textContent =
        "Failed to load the chapter or paragraph preview.\n" +
        (err ? String(err) : "");
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
