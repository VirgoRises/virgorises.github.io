// js/osf.bundle.js — stable anchors + label + copy + smooth scroll + discuss popover
// Shared across all cafés.
//
// Include once per page:
//   <script defer src="/js/osf.bundle.js"></script>
//
// Optional per-page config (override defaults):
//   <script>
//   window.OSF_CONFIG = {
//     // URLs
//     discordChannelUrl: "https://discord.com/channels/<SERVER>/<CHANNEL>",
//     discordAppUrl:     "discord://-/channels/<SERVER>/<CHANNEL>",
//     squareUrl:         "/cafes/<slug>/join-the-square.html",     // free entry page
//     inviteUrl:         "https://www.patreon.com/c/virgorises",
//
//     // Behavior
//     isMemberDefault: false,   // initial state before the user toggles "I'm a member"
//     showMemoButton:  true,    // show "Draft RFC memo" if memo.compose.js is present
//
//     // UI
//     SCROLL_OFFSET: 80,        // px; adjust if you have fixed header
//     HILITE_MS: 6000           // highlight duration
//   };
//   </script>
// osf.bundle.js — stable anchors + copy + smooth scroll + tiny popover
// shared build for all cafés (handles missing anchors gracefully)

// osf.bundle.js — stable anchors + copy + smooth scroll + discuss popover
(function () {
  "use strict";

  // ---------- config ----------
  const DEFAULTS = {
    SCROLL_OFFSET: 80,
    HILITE_MS: 6000,
    basePath: null,           // auto /cafes/<slug>
    discordChannelUrl: null,  // https://discord.com/channels/<server>/<channel>
    discordAppUrl: null,      // optional discord://
    squareUrl: null,          // public on-ramp
    inviteUrl: null           // Patreon / Join (optional)
  };
  const CFG = Object.assign({}, DEFAULTS, (window.OSF_CONFIG || {}));

  // ---------- tiny logger ----------
  let _once = false;
  function log(...a){ if(!_once){ _once = true; try{ console.log("[osf]", ...a);}catch{} } }

  // ---------- styles ----------
  function ensureStyles(){
    if (document.getElementById("osf-inline-style")) return;
    const css = `
.osf-block{ display:flex; flex-direction:column; gap:.50rem; margin:1rem 0; }
.osf-head{ display:inline-flex; align-items:center; gap:.45rem; }
.osf-label{ color:inherit; text-decoration:none; font-weight:600; }
.osf-label:hover,.osf-label:focus{ text-decoration:underline; }
.osf-copy,.osf-more{ opacity:0; transition:opacity .12s; border:none; background:transparent; cursor:pointer; }
.osf-copy{ margin-left:.4rem; font-size:.95rem; }
.osf-head:hover .osf-copy,.osf-head:hover .osf-more,.osf-copy:focus,.osf-more:focus{ opacity:1; }

.osf-more svg{ width:14px; height:14px; display:block; stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }

.osf-hilite{ outline:3px solid #ff9800; outline-offset:2px;
  animation:osfPulse 1.2s ease-in-out 0s 3;
  background-image:linear-gradient(to right, rgba(255,235,150,.6), rgba(255,235,150,.1)); }
@keyframes osfPulse{0%,100%{box-shadow:0 0 0 rgba(255,152,0,0);}50%{box-shadow:0 0 6px rgba(255,152,0,.55);}}

.osf-toast{ position:fixed; left:50%; transform:translateX(-50%) translateY(-14px);
  top:18px; background:rgba(20,20,28,.97); color:#fff; border:1px solid rgba(255,255,255,.15);
  padding:.40rem .6rem; border-radius:.6rem; box-shadow:0 10px 28px rgba(0,0,0,.35);
  opacity:0; pointer-events:none; transition:opacity .18s, transform .18s; z-index:2147483647; }
.osf-toast.show{ opacity:1; transform:translateX(-50%) translateY(0); }

.osf-pop{ position:absolute; z-index:2147483646; width:320px;
  background:rgba(17,17,24,.98); color:#eaeaf3; border:1px solid rgba(255,255,255,.12);
  border-radius:10px; padding:.6rem; box-shadow:0 10px 32px rgba(0,0,0,.5); }
.osf-pop h4{ margin:.1rem 0 .5rem; font-size:.95rem; }
.osf-pop .btn{ display:block; width:100%; text-align:left; margin:.25rem 0; padding:.45rem .55rem;
  border-radius:.45rem; border:1px solid rgba(255,255,255,.15); background:transparent; color:inherit; cursor:pointer; }
.osf-pop .btn:hover{ background: rgba(255,255,255,.06); }
.osf-pop small{ opacity:.8; display:block; margin-top:.35rem; }
`.trim();
    const s=document.createElement("style");
    s.id="osf-inline-style"; s.textContent=css; document.head.appendChild(s);
  }

  // ---------- helpers ----------
  function cafeSlug(){ const m=location.pathname.match(/^\/cafes\/([^\/]+)/); return m?m[1]:null; }
  function cafeBase(){
    if (CFG.basePath) return CFG.basePath.replace(/\/$/,'');
    const s=cafeSlug(); return s?(`/cafes/${s}`):"";
  }
  function chapterNumber(){
    const t=document.title||"";
    let m=t.match(/Chapter\s+(\d+)/i); if(m) return +m[1];
    m=decodeURIComponent(location.pathname).match(/Chapter\s+(\d+)/i); return m?+m[1]:null;
  }

  async function fetchAnchors(){
    const base=cafeBase(), ch=chapterNumber();
    if(!base || !ch) return {map:{},order:[]};
    const url=`${base}/data/anchors/chapter-${ch}.json`;
    try{
      const r=await fetch(url,{cache:"no-store"});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const j=await r.json(); return j||{map:{},order:[]};
    }catch(e){ console.warn("[osf] anchors missing/fail:", e.message); return {map:{},order:[]}; }
  }

  function idOrFallback(pre, idx, anchors){
    if (pre.id && /^osf-\d+$/.test(pre.id)) return pre.id;
    if (anchors && anchors.order && anchors.order[idx] && /^osf-\d+$/.test(anchors.order[idx])){
      pre.id = anchors.order[idx]; return pre.id;
    }
    pre.id = `osf-${idx+1}`; return pre.id;
  }

  let toastTimer=0;
  function showToast(msg){
    let el=document.getElementById("osf-toast");
    if(!el){ el=document.createElement("div"); el.id="osf-toast"; el.className="osf-toast"; document.body.appendChild(el); }
    el.textContent=msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),1600);
  }

  function copy(text){
    try{ navigator.clipboard.writeText(text); showToast("Copied paragraph link"); }
    catch{
      const ta=document.createElement("textarea"); ta.value=text; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); ta.remove(); showToast("Copied paragraph link");
    }
  }

  function smoothScrollTo(el){
    const y = el.getBoundingClientRect().top + window.pageYOffset - (CFG.SCROLL_OFFSET||80);
    window.scrollTo({top:y, behavior:"smooth"});
    el.classList.add("osf-hilite");
    setTimeout(()=>el.classList.remove("osf-hilite"), CFG.HILITE_MS||6000);
  }

  function penSVG(){
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
  }

  // ---------- dynamic loader ----------
function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const norm = s => (s || "").replace(/\?.*$/, "");
    const want = norm(src);

    // Is there already a <script> for this URL?
    const tag = Array.from(document.scripts)
      .find(s => norm(s.src).endsWith(want));

    // If the tag already exists, treat it as loaded if either:
    //  - OSF_MEMO.open is already present, or
    //  - the tag's readyState is complete/loaded (older browsers)
    if (tag) {
      if (window.OSF_MEMO && typeof OSF_MEMO.open === "function") return resolve();
      const rs = tag.readyState;
      if (rs === "complete" || rs === "loaded") return resolve();

      // Otherwise, listen for load, but add a safety timer in case
      // the load event has already fired before we attached.
      let done = false;
      const ok   = () => { if (!done) { done = true; resolve(); } };
      const fail = () => { if (!done) { done = true; reject(new Error("load error")); } };

      tag.addEventListener("load", ok, { once: true });
      tag.addEventListener("error", fail, { once: true });

      setTimeout(() => {
        if (window.OSF_MEMO && typeof OSF_MEMO.open === "function") ok();
        else fail();
      }, 1200);

      return;
    }

    // No tag yet — create one (cache-busted).
    const s = document.createElement("script");
    s.defer = true;
    s.src = src + (src.includes("?") ? "" : `?v=${Date.now()}`);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("load error"));
    document.head.appendChild(s);
  });
}
  function waitFor(fn, ms=2000){
    return new Promise(res=>{
      const t0=performance.now();
      (function tick(){
        if (fn()) return res(true);
        if (performance.now()-t0 > ms) return res(false);
        setTimeout(tick, 50);
      })();
    });
  }
async function ensureMemo() {
  // If already available, we’re done.
  if (window.OSF_MEMO && typeof OSF_MEMO.open === "function") return true;

  const base = (function () {
    const m = location.pathname.match(/^\/cafes\/([^\/]+)/);
    return m ? `/cafes/${m[1]}` : "";
  })();

  const candidates = [
    "/js/memo.compose.js",        // root (GitHub Pages)
    base ? `${base}/js/memo.compose.js` : null  // café-scoped (local dev)
  ].filter(Boolean);

  for (const src of candidates) {
    try {
      await loadScriptOnce(src);
      // Wait briefly for OSF_MEMO to attach, even if load event was missed.
      const ok = await new Promise(res => {
        const t0 = performance.now();
        (function tick() {
          if (window.OSF_MEMO && typeof OSF_MEMO.open === "function") return res(true);
          if (performance.now() - t0 > 2500) return res(false);
          setTimeout(tick, 50);
        })();
      });
      if (ok) return true;
    } catch {
      // try next candidate
    }
  }
  return false;
}
  // ---------- popover ----------
  function discussPopover(pre, uuid, paraNum){
    if (pre._osfPop) return pre._osfPop;

    const isMember = localStorage.getItem("osf:isMember")==="1";
    const pop=document.createElement("div"); pop.className="osf-pop";
    pop.innerHTML = `<h4>Discuss § ${paraNum}</h4>`;

    const mk = (id, label) => { const b=document.createElement("button"); b.className="btn"; b.id=id; b.textContent=label; return b; };

    const bMemo = mk("osf-memo", "Draft RFC memo");
    const bEnter= mk("osf-enter","Enter The Square (free)");
    const bApp  = mk("osf-open-app","Open in Discord app");
    const bCopy = mk("osf-copy2","Copy paragraph link");
    const bPatr = mk("osf-patreon","Support on Patreon (optional)");
    const bMem  = mk("osf-im-member", isMember? "I'm a member ✓" : "I'm a member");

    if (!isMember || !(CFG.discordAppUrl || CFG.discordChannelUrl)) bApp.style.display="none";
    if (!CFG.inviteUrl) bPatr.style.display="none";

    pop.appendChild(bMemo);
    pop.appendChild(bEnter);
    pop.appendChild(bApp);
    pop.appendChild(bCopy);
    if (CFG.inviteUrl) pop.appendChild(bPatr);
    pop.appendChild(bMem);

    const small=document.createElement("small");
    small.textContent="Open chat for everyone — no payment required.";
    pop.appendChild(small);

    const link = `${location.origin}${location.pathname}#${uuid}`;

    bMemo.onclick = async () => {
      const ok = await ensureMemo();
      if (ok) {
        try { OSF_MEMO.open({ uuid, pre, para: paraNum }); }
        catch(e){ console.warn("memo.open failed", e); showToast("Memo tool error"); }
      } else {
        showToast("Memo tool unavailable");
      }
    };
    bEnter.onclick = () => { copy(link); const url = CFG.discordChannelUrl || CFG.squareUrl || link; window.open(url, "_blank", "noopener"); };
    bApp.onclick   = () => { if(!isMember) return; const t = CFG.discordAppUrl || CFG.discordChannelUrl; if(t){ copy(link); window.open(t.replace(/^https?:/,"discord:"), "_blank", "noopener"); } };
    bCopy.onclick  = () => copy(link);
    bPatr.onclick  = () => { if (CFG.inviteUrl) window.open(CFG.inviteUrl, "_blank", "noopener"); };
    bMem.onclick   = () => {
      const next = (localStorage.getItem("osf:isMember")==="1") ? "0" : "1";
      localStorage.setItem("osf:isMember", next);
      showToast(next==="1" ? "Marked as member" : "Marked as guest");
      if (next==="1" && (CFG.discordAppUrl||CFG.discordChannelUrl)) bApp.style.display="";
      else bApp.style.display="none";
      bMem.textContent = next==="1" ? "I'm a member ✓" : "I'm a member";
    };

    document.body.appendChild(pop); pre._osfPop = pop; return pop;
  }
  function placePopover(pop, btn){
    const r=btn.getBoundingClientRect();
    pop.style.left = `${Math.max(12, r.left)}px`;
    pop.style.top  = `${r.bottom + 8 + window.scrollY}px`;
  }

  // ---------- header ----------
  function penSVG(){ return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`; }
  function buildHead(pre, paraNum, uuid){
    const head=document.createElement("div"); head.className="osf-head";
    const a=document.createElement("a"); a.className="osf-label"; a.href=`#${uuid}`; a.textContent=`§ ${paraNum}`;
    a.addEventListener("click",(e)=>{ e.preventDefault(); smoothScrollTo(pre); history.replaceState(null,"",`#${uuid}`); });

    const copyBtn=document.createElement("button"); copyBtn.className="osf-copy"; copyBtn.type="button"; copyBtn.title="Copy paragraph link"; copyBtn.textContent="🔗";
    copyBtn.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); copy(`${location.origin}${location.pathname}#${uuid}`); });

    const moreBtn=document.createElement("button"); moreBtn.className="osf-more"; moreBtn.type="button"; moreBtn.title="Discuss / options"; moreBtn.innerHTML=penSVG();
    moreBtn.addEventListener("click",(e)=>{
      e.preventDefault(); e.stopPropagation();
      const pop = discussPopover(pre, uuid, paraNum);
      placePopover(pop, moreBtn);
      const close=(ev)=>{ if(!pop.contains(ev.target) && ev.target!==moreBtn){ pop.remove(); pre._osfPop=null; document.removeEventListener("click", close, true); } };
      document.addEventListener("click", close, true);
    });

    head.appendChild(a); head.appendChild(copyBtn); head.appendChild(moreBtn);
    return head;
  }

  // ---------- init ----------
  async function init(){
    ensureStyles(); log("init");
    const anchors = await fetchAnchors().catch(()=>({map:{},order:[]}));
    const pres = Array.from(document.querySelectorAll("pre.osf"));
    pres.forEach((pre,i)=>{
      try{
        const uuid=idOrFallback(pre, i, anchors);
        const wrap=document.createElement("div"); wrap.className="osf-block";
        const head=buildHead(pre, i+1, uuid);
        pre.parentNode.insertBefore(wrap, pre); wrap.appendChild(head); wrap.appendChild(pre);
      }catch(e){ console.warn("osf paragraph failed:", e); }
    });
    if (location.hash){
      const id=location.hash.slice(1);
      const pre=document.getElementById(id);
      if(pre && pre.tagName==="PRE") smoothScrollTo(pre);
    }
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
