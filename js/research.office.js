/* Research Office — preview + figures/tables + memo autosave + Markdown/LaTeX preview
   (with absolute URL rewrite for images/links inside the paragraph preview) */
(() => {
  const $  = (s,e=document)=>e.querySelector(s);
  const $$ = (s,e=document)=>Array.from(e.querySelectorAll(s));

  // Query context
  const qs       = new URLSearchParams(location.search);
  const PARA_ID  = qs.get("para") || "";
  let   CHAPTER  = qs.get("chapter") || "";
  try { CHAPTER = decodeURIComponent(CHAPTER); } catch {}
  const cafeSlug = location.pathname.split("/").filter(Boolean)[1] || "zeta-zero-cafe";
  const cafeBase = `/cafes/${cafeSlug}`;

  // Targets
  const previewBox = $("#paraPreview");   // MUST be a <div>, not <pre>
  const numBadge   = $("#paraNum");
  const figsList   = $("#figlist");
  const tblList    = $("#tbllist");
  const memoBody   = $("#memoBody");
  const draftsList = $("#draftsList");
  const mdbar      = $("#mdbar");
  const memoPreview= $("#memoPreview");
  const btnSave    = $("#saveDraft");
  const btnSaveVersion = $("#saveVersion");
  const btnExport  = $("#exportMemo");
  const btnExportAll = $("#exportAll");
  const inpImportAll = $("#importAll");
  const btnDiscord = $("#openDiscord");
  const btnPreview = $("#btnPreview");
  const versionsList = $("#versionsList");

  // Utilities
  const escapeHtml = (s)=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const paraNumberFrom = id => (String(id).match(/osf-(\d+)/)||[])[1] || null;
  const setBadge=(n)=>{ if(!numBadge) return; numBadge.textContent=n?`#${n}`:"#"; numBadge.title=n?`Paragraph ${n}`:""; };
  const normPath = s => (s||"").replace(/\\/g,"/").replace(/^\/+|\/+$/g,"");

  // Markdown + LaTeX preview
  async function ensureMarked(){
    if (window.marked) return;
    await new Promise((res,rej)=>{
      const s=document.createElement("script");
      s.src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js";
      s.onload=res; s.onerror=()=>rej(new Error("Failed to load marked"));
      document.head.appendChild(s);
    });
  }
  async function ensureMathJax(){
    if (window.MathJax) return;
    window.MathJax = window.MathJax || { tex:{ inlineMath:[['\\(','\\)'],['$','$']] } };
    await new Promise((res,rej)=>{
      const s=document.createElement("script");
      s.src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
      s.async=true; s.onload=res; s.onerror=()=>rej(new Error("Failed to load MathJax"));
      document.head.appendChild(s);
    });
    await new Promise(r=>setTimeout(r,50));
  }
  async function renderMemoPreview(){
    const md = memoBody?.value || "";
    await ensureMarked();
    memoPreview.innerHTML = window.marked.parse(md);
    await ensureMathJax();
    if (MathJax.typesetClear) MathJax.typesetClear([memoPreview]);
    if (MathJax.texReset) MathJax.texReset();
    if (MathJax.typesetPromise) await MathJax.typesetPromise([memoPreview]); else MathJax.typeset([memoPreview]);
  }

  // Chapter fetch
  function candidatesForChapter(ch){
    const c=normPath(ch); const list=[];
    if (c.startsWith("http")) list.push(c);
    if (c.startsWith("/"))    list.push(c);
    list.push(`${cafeBase}/${c}`);
    list.push(c.replace(/^\/+/,""));
    return [...new Set(list)];
  }
  async function loadChapterDom(){
    let last=null; for (const url of candidatesForChapter(CHAPTER)){
      try{
        const r=await fetch(url,{credentials:"omit"}); if(!r.ok){last=new Error(`HTTP ${r.status} on ${url}`); continue;}
        const html=await r.text(); const doc=new DOMParser().parseFromString(html,"text/html");
        return {doc,usedUrl:url};
      }catch(e){ last=e; }
    } throw last || new Error("Failed to fetch chapter HTML");
  }

  // Rewrite relative URLs inside fragment to absolute based on chapter URL
  function absolutizeUrls(root, baseUrl) {
    const abs = (u)=> {
      try { return new URL(u, baseUrl).toString(); }
      catch { return u; }
    };
    // src / href
    $$("[src]", root).forEach(el=>{
      const v=el.getAttribute("src"); if (v && !/^([a-z]+:)?\/\//i.test(v)) el.setAttribute("src", abs(v));
    });
    $$("[href]", root).forEach(el=>{
      const v=el.getAttribute("href"); if (v && !/^([a-z]+:)?\/\//i.test(v)) el.setAttribute("href", abs(v));
    });
    // srcset
    $$("[srcset]", root).forEach(el=>{
      const v=el.getAttribute("srcset"); if (!v) return;
      const parts = v.split(",").map(s=>s.trim()).map(item=>{
        const [url, desc] = item.split(/\s+/,2);
        const fixed = /^([a-z]+:)?\//i.test(url) ? url : abs(url);
        return desc ? `${fixed} ${desc}` : fixed;
      });
      el.setAttribute("srcset", parts.join(", "));
    });
  }

  function listChapterFiguresAndTables(doc){
    const figures=[], tables=[];
    $$("figure[id]",doc).forEach(fig=>{
      const id=fig.id; const caption=$("figcaption",fig)?.textContent?.trim()||id;
      const isTable=!!fig.querySelector("table");
      (isTable?tables:figures).push({id,caption,href:`${cafeBase}/${CHAPTER.replace(/^\/+/,"")}#${id}`});
    });
    return {figures,tables};
  }
  function renderRefLists(refs){
    figsList.innerHTML=""; tblList.innerHTML="";
    refs.figures.forEach(f=>{ const row=document.createElement("div"); row.className="item";
      row.innerHTML=`<label><input type="checkbox" data-id="${f.id}"><span>${escapeHtml(f.caption)}</span></label>
      <a class="open" href="${f.href}" target="_blank" rel="noopener">open</a>`;
      figsList.appendChild(row); });
    refs.tables.forEach(t=>{ const row=document.createElement("div"); row.className="item";
      row.innerHTML=`<label><input type="checkbox" data-id="${t.id}"><span>${escapeHtml(t.caption)}</span></label>
      <a class="open" href="${t.href}" target="_blank" rel="noopener">open</a>`;
      tblList.appendChild(row); });
  }

  async function previewParagraph(doc, paraId, usedUrl){
    let node = doc.getElementById(paraId) || doc.querySelector("[id^='osf-']");
    if(!node){ previewBox.textContent=`Loaded chapter, but could not find paragraph anchor.\nAnchor: ${paraId||"(missing)"}\nURL: ${usedUrl||"(?)"}`; return; }
    setBadge(paraNumberFrom(node.id||paraId));

    // Prefer the section/card containing the paragraph for context
    const container = node.closest("section, article, .osf, .card") || node.parentElement || node;
    const clone = container.cloneNode(true);

    // IMPORTANT: rewrite all relative URLs inside the cloned fragment
    absolutizeUrls(clone, usedUrl);

    // Render into the preview box (must be a DIV, not PRE)
    previewBox.innerHTML="";
    previewBox.appendChild(clone);

    // Typeset LaTeX after injection
    await ensureMathJax();
    if (MathJax.typesetClear) MathJax.typesetClear([previewBox]);
    if (MathJax.texReset) MathJax.texReset();
    if (MathJax.typesetPromise) await MathJax.typesetPromise([previewBox]); else MathJax.typeset([previewBox]);

    renderRefLists(listChapterFiguresAndTables(doc));
  }

  // Drafts / autosave + snapshots
  const KEY = `ro:memo:${cafeSlug}:${CHAPTER}:${PARA_ID}`;
  const INDEX = `ro:memos:index:${cafeSlug}`;
  const LIMIT = 50;

  function loadMemos(){ try{ return JSON.parse(localStorage.getItem(INDEX)||"[]"); }catch{ return []; } }
  function saveMemos(idx){ localStorage.setItem(INDEX, JSON.stringify(idx)); }

  function loadCurrent(){ return localStorage.getItem(KEY) || ""; }
  function saveCurrent(body){
    localStorage.setItem(KEY, body);
    const idx = loadMemos();
    idx.push({ key: KEY, chapter: CHAPTER, para: PARA_ID, ts: Date.now(), size: body.length });
    while (idx.length > LIMIT) idx.shift();
    saveMemos(idx);
    renderDrafts();
  }

  const VERSIONS_KEY = (key) => `ro:memo:versions:${key}`;
  function loadVersions(key) { try { return JSON.parse(localStorage.getItem(VERSIONS_KEY(key)) || "[]"); } catch { return []; } }
  function saveVersions(key, arr) { localStorage.setItem(VERSIONS_KEY(key), JSON.stringify(arr)); }

  function renderDrafts(){
    const idx = loadMemos().slice().reverse();
    draftsList.innerHTML="";
    idx.forEach(it=>{
      const row=document.createElement("div"); row.className="item";
      const when = new Date(it.ts).toLocaleString();
      row.innerHTML = `<div class="mono"><strong>${escapeHtml(it.para||"osf-?")}</strong> · ${escapeHtml(it.chapter.split("/").pop()||"")}</div>
        <div class="muted">${when}</div>`;
      row.addEventListener("click",()=>{
        const v = localStorage.getItem(it.key) || "";
        memoBody.value = v;
        memoPreview.hidden = true;
      });
      draftsList.appendChild(row);
    });
  }
  function renderVersions() {
    if (!versionsList) return;
    const arr = loadVersions(KEY).slice().sort((a,b)=>a.v-b.v);
    versionsList.innerHTML = "";
    if (!arr.length) {
      versionsList.innerHTML = `<div class="muted">No snapshots yet.</div>`;
      return;
    }
    arr.forEach(item => {
      const row = document.createElement("div");
      row.className = "item";
      const when = new Date(item.ts).toLocaleString();
      row.innerHTML = `
        <div class="mono"><strong>v${item.v}</strong> · ${when}</div>
        <div class="muted">${escapeHtml(item.label || "")}</div>
      `;
      row.addEventListener("click", ()=>{
        if (!confirm(`Restore snapshot v${item.v}? Your editor text will be replaced.`)) return;
        memoBody.value = item.body || "";
        memoPreview.hidden = true;
        localStorage.setItem(KEY, memoBody.value);
      });
      versionsList.appendChild(row);
    });
  }

  function wireMemo(){
    memoBody.value = loadCurrent();

    // aggressive autosave
    let t = null;
    memoBody.addEventListener("input", ()=>{
      if (t) clearTimeout(t);
      t = setTimeout(()=> saveCurrent(memoBody.value), 500);
    });
    setInterval(()=> saveCurrent(memoBody.value), 30000);
    window.addEventListener("beforeunload", ()=> saveCurrent(memoBody.value));

    // toolbar markdown buttons
    mdbar?.addEventListener("click",(e)=>{
      const b = e.target.closest("button"); if(!b || !b.dataset) return;
      if (b.id === "btnPreview") return;
      const t = memoBody;
      const val = b.dataset.md;
      const mode= b.dataset.mode || "pair";
      const s0 = t.selectionStart ?? 0, s1 = t.selectionEnd ?? 0;
      const sel = t.value.slice(s0, s1);
      let insert;
      if (mode==="wrap" && val === "[text](url)") {
        insert = `[${sel||"text"}](url)`;
      } else if (val.includes("|")) {
        const [pre, post] = val.split("|");
        insert = pre + sel + post;
      } else {
        insert = val;
      }
      t.setRangeText(insert, s0, s1, "end");
      t.focus();
      saveCurrent(t.value);
    });

    // preview toggle
    btnPreview?.addEventListener("click", async ()=>{
      if (memoPreview.hidden) {
        await renderMemoPreview();
        memoPreview.hidden = false;
      } else {
        memoPreview.hidden = true;
      }
    });

    // export/import/save draft
    btnSave?.addEventListener("click", ()=> saveCurrent(memoBody.value));

    btnSaveVersion?.addEventListener("click", ()=>{
      const body = memoBody?.value || "";
      const arr  = loadVersions(KEY);
      const next = (arr.length ? arr[arr.length-1].v + 1 : 1);
      const label = prompt("Optional label for snapshot:", "");
      arr.push({ v: next, ts: Date.now(), label: label || "", body });
      saveVersions(KEY, arr);
      renderVersions();
    });

    btnExport?.addEventListener("click", ()=>{
      const payload = { chapter: CHAPTER, para: PARA_ID, memo: memoBody.value, when: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
      const url = URL.createObjectURL(blob); const a=document.createElement("a");
      const slug = (CHAPTER.split("/").pop()||"chapter").replace(/\.html$/,"");
      a.href=url; a.download=`${slug}-${PARA_ID||"osf"}.memo.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),800);
    });

    btnExportAll?.addEventListener("click", ()=>{
      const idx = loadMemos();
      const dump = idx.map(it => ({
        meta: it,
        body: localStorage.getItem(it.key) || "",
        versions: loadVersions(it.key) || []
      }));
      const blob = new Blob([JSON.stringify(dump,null,2)],{type:"application/json"});
      const url = URL.createObjectURL(blob); const a=document.createElement("a");
      a.href=url; a.download=`research-office-drafts.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),800);
    });

    inpImportAll?.addEventListener("change", async (ev)=>{
      const f = ev.target.files?.[0]; if(!f) return;
      const text = await f.text();
      try{
        const arr = JSON.parse(text);
        const idx = loadMemos();
        arr.forEach(entry=>{
          if (entry?.meta?.key) {
            localStorage.setItem(entry.meta.key, entry.body||"");
            saveVersions(entry.meta.key, entry.versions || []);
            idx.push({ ...entry.meta, ts: Date.now() });
          }
        });
        while (idx.length > LIMIT) idx.shift();
        saveMemos(idx); renderDrafts(); renderVersions();
        alert("Drafts imported.");
      }catch(e){ alert("Invalid JSON."); }
    });

    btnDiscord?.addEventListener("click", ()=> alert("Wire to Discord submission flow when ready."));
  }

  // Init
  async function init(){
    if(!previewBox) return;
    if(!PARA_ID || !CHAPTER){ previewBox.textContent="Missing or invalid query parameters (para / chapter)."; return; }
    const n = paraNumberFrom(PARA_ID); if(n) setBadge(n);
    try{
      const {doc, usedUrl} = await loadChapterDom();
      await previewParagraph(doc, PARA_ID, usedUrl);
    }catch(e){
      previewBox.textContent = "Failed to load the chapter or paragraph preview.\n" + String(e||"");
    }
    wireMemo();
    renderDrafts();
    renderVersions();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
