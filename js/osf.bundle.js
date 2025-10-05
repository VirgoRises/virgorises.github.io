/* osf.bundle.js — stable anchors + copy + smooth scroll + small "propose" popover */

(function () {
  "use strict";

  // ---------- config ----------
  const DEFAULTS = {
    SCROLL_OFFSET: 80,
    HILITE_MS: 6000,

    // Where anchors JSON lives; we auto-detect from /cafes/<slug> path,
    // then try both /data/anchors and /anchors at cafe + root.
    basePath: null,

    // marketing / join page for non-members:
    squareUrl: "/join-the-square.html",

    // Discord channel for members (set real URLs per page):
    discordChannelUrl: "",       // https://discord.com/channels/<guild>/<channel>
    discordAppUrl: "",           // discord://-/channels/<guild>/<channel>

    // optional: Patreon or landing page shown in popover
    inviteUrl: "",

    // disable/enable any future analytics (we do nothing if false)
    analytics: false
  };

  const CFG = Object.assign({}, DEFAULTS, (window.OSF_CONFIG || {}));

  // ---------- tiny logger (first call only) ----------
  let _logged = false;
  const log = (...a) => { if (!_logged) { _logged = true; console.log("[osf]", ...a); } };

  // ---------- minimal styles (only once) ----------
  function ensureStyles() {
    if (document.getElementById("osf-inline-style")) return;
    const css = `
.osf-head { display:flex; align-items:center; gap:.45rem; margin: .5rem 0 0.25rem 0; }
.osf-label{ color: inherit; text-decoration:none; font-weight:600; }
.osf-copy, .osf-more { 
  appearance:none; border:0; background:transparent; 
  cursor:pointer; font-size: .95rem; line-height:1; padding:.15rem .3rem;
  border-radius:.4rem; opacity:.6; transition: opacity .12s ease-in-out, background-color .12s;
}
.osf-copy:hover, .osf-more:hover { opacity:1; background: rgba(255,255,255,.08); }
.osf-block { margin: 0 0 .25rem 0; display:block; }

.osf-pop { position: absolute; z-index: 9999; min-width: 280px;
  background: #111; color:#eee; border-radius:.6rem; 
  border:1px solid rgba(255,255,255,.12); box-shadow: 0 10px 30px rgba(0,0,0,.4); 
  padding:.75rem; }
.osf-pop h4 { margin:.1rem .1rem .6rem; font-size:.95rem; font-weight:700; opacity:.9; }
.osf-pop .btn { display:block; width:100%; text-align:left;
  background:#1f2937; color:#e5e7eb; border:1px solid rgba(255,255,255,.12);
  border-radius:.5rem; padding:.5rem .6rem; margin:.35rem 0; cursor:pointer; }
.osf-pop .btn:hover { background:#273244; }
.osf-pop small { display:block; margin-top:.45rem; opacity:.7; }

.osf-highlight { outline: 3px solid rgba(255, 193, 7, .9); outline-offset:2px; 
  animation: osfPulse 1.2s ease-in-out 0s 3 both; }
@keyframes osfPulse { 
  0%,100% { box-shadow: 0 0 0 rgba(255,193,7,.5); } 
  50%     { box-shadow: 0 0 10px rgba(255,193,7,.75); } 
}
.osf-toast { position:fixed; left:1rem; bottom:1rem; z-index:10000;
  background:#0f172a; color:#e5e7eb; padding:.6rem .8rem; border-radius:.5rem;
  border:1px solid rgba(255,255,255,.12); box-shadow:0 10px 20px rgba(0,0,0,.4);
  transform: translateY(6px); opacity:0; transition: all .16s ease; pointer-events:none; }
.osf-toast.show { transform: translateY(0); opacity:1; }
`;
    const style = document.createElement("style");
    style.id = "osf-inline-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------- utils ----------
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const on = (el, ev, fn, opts) => el.addEventListener(ev, fn, opts || false);

  function cafeBase() {
    const m = location.pathname.match(/^\/cafes\/[^/]+/);
    return m ? m[0] : "";
  }

  function copy(txt) {
    try {
      return navigator.clipboard.writeText(txt).then(()=>showToast("Copied paragraph link"));
    } catch {
      const ta = document.createElement("textarea");
      ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); showToast("Copied paragraph link"); }
      finally { ta.remove(); }
    }
  }

  let toastTimer = 0;
  function showToast(msg) {
    let el = qs(".osf-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "osf-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1600);
  }

  function smoothScrollTo(y) {
    try { window.scrollTo({ top: y, behavior: "smooth" }); }
    catch { window.scrollTo(0, y); }
  }

  function chapterNumber() {
    const h = qs("h1, h2");
    if (!h) return null;
    const m = (h.textContent || "").match(/Chapter\s+(\d+)/i);
    return m ? +m[1] : null;
  }

  // ---------- anchors loading (resilient) ----------
  async function fetchAnchors() {
    const ch = chapterNumber();
    if (!ch) return { map: {}, order: [] };

    const base = cafeBase();
    const urls = [];
    if (base) {
      urls.push(`${base}/data/anchors/chapter-${ch}.json`);
      urls.push(`${base}/anchors/chapter-${ch}.json`);
    }
    urls.push(`/data/anchors/chapter-${ch}.json`);
    urls.push(`/anchors/chapter-${ch}.json`);

    for (const url of urls) {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (r.ok) return await r.json();
      } catch {}
    }
    console.warn("[osf] anchors JSON not found; using sequential ids");
    return { map: {}, order: [] };
  }

  // ---------- script loader + memo tool ----------
  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const norm = s => (s || "").replace(/\?.*$/, "");
      const want = norm(src);

      const existing = Array.from(document.scripts)
        .find(s => norm(s.src).endsWith(want));

      if (existing) {
        if (window.OSF_MEMO && typeof OSF_MEMO.open === "function") return resolve();

        let done = false;
        const ok = () => { if (!done) { done = true; resolve(); } };
        const fail = () => { if (!done) { done = true; reject(new Error("load error")); } };

        existing.addEventListener("load", ok, { once: true });
        existing.addEventListener("error", fail, { once: true });

        setTimeout(() => {
          if (window.OSF_MEMO && typeof OSF_MEMO.open === "function") ok();
          else fail();
        }, 1200);
        return;
      }

      const s = document.createElement("script");
      s.defer = true;
      s.src = src + (src.includes("?") ? "" : `?v=${Date.now()}`);
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("load error"));
      document.head.appendChild(s);
    });
  }

  async function ensureMemo() {
    if (window.OSF_MEMO && typeof OSF_MEMO.open === "function") return true;

    const base = cafeBase();
    const candidates = [
      "/js/memo.compose.js",
      base ? `${base}/js/memo.compose.js` : null
    ].filter(Boolean);

    for (const src of candidates) {
      try {
        await loadScriptOnce(src);
        const ok = await new Promise(res => {
          const t0 = performance.now();
          (function tick() {
            if (window.OSF_MEMO && typeof OSF_MEMO.open === "function") return res(true);
            if (performance.now() - t0 > 2500) return res(false);
            setTimeout(tick, 40);
          })();
        });
        if (ok) return true;
      } catch {}
    }
    return false;
  }

  // ---------- paragraph decoration ----------
  function decorateParagraphs() {
    const pres = qsa("pre.osf");
    let n = 0;
    pres.forEach(pre => {
      if (!pre.id) pre.id = `osf-${++n}`;
      else ++n;

      pre.dataset.osfNum = String(n);
      pre.dataset.osfUuid = pre.id;

      // head already present?
      if (pre.previousElementSibling && pre.previousElementSibling.classList?.contains("osf-head")) return;

      const head = document.createElement("div");
      head.className = "osf-head";

      const a = document.createElement("a");
      a.className = "osf-label";
      a.href = `#${pre.id}`;
      a.textContent = `§ ${n}`;
      head.appendChild(a);

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "osf-copy";
      copyBtn.title = "Copy paragraph link";
      copyBtn.textContent = "🔗";
      head.appendChild(copyBtn);

      const moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "osf-more";
      moreBtn.title = "Discuss";
      moreBtn.textContent = "✎";
      head.appendChild(moreBtn);

      pre.parentNode.insertBefore(head, pre);
    });
  }

  // ---------- popover placement & content ----------
  let _openPop = null;
  function placePopover(pop, btn) {
    if (_openPop && _openPop !== pop) { _openPop.remove(); _openPop = null; }
    document.body.appendChild(pop);

    const r = btn.getBoundingClientRect();
    const top = window.scrollY + r.bottom + 6;
    const left = Math.min(window.scrollX + r.left, window.scrollX + (document.documentElement.clientWidth - pop.offsetWidth - 10));
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;

    _openPop = pop;
  }

  function discussPopover(pre, uuid, paraNum) {
    const isMember = localStorage.getItem("osf:isMember") === "1";

    const pop = document.createElement("div");
    pop.className = "osf-pop";

    const mk = (cls, label) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn " + cls;
      b.textContent = label;
      return b;
    };

    const h = document.createElement("h4");
    h.textContent = `Discuss § ${paraNum}`;
    pop.appendChild(h);

    const bMemo  = mk("osf-btn-memo", "Draft RFC memo");
    const bEnter = mk("osf-btn-enter", "Enter The Square (free)");
    const bApp   = mk("osf-btn-app",   "Open in Discord app");
    const bCopy  = mk("osf-btn-copy",  "Copy paragraph link");
    const bPatr  = mk("osf-btn-patreon", "Support on Patreon (optional)");
    const bMem   = mk("osf-btn-member", isMember ? "I'm a member ✓" : "I'm a member");

    if (!isMember || !(CFG.discordAppUrl || CFG.discordChannelUrl)) bApp.style.display = "none";
    if (!CFG.inviteUrl) bPatr.style.display = "none";

    [bMemo, bEnter, bApp, bCopy, ...(CFG.inviteUrl ? [bPatr] : []), bMem].forEach(b => pop.appendChild(b));

    const foot = document.createElement("small");
    foot.textContent = "Open chat for everyone — no payment required.";
    pop.appendChild(foot);

    const link = `${location.origin}${location.pathname}#${uuid}`;

    bMemo.onclick = async () => {
      const ok = await ensureMemo();
      if (!ok) return showToast("Memo tool unavailable");
      try { OSF_MEMO.open({ uuid, pre, para: paraNum }); }
      catch (e) { console.warn("memo.open failed", e); showToast("Memo tool error"); }
    };

    bEnter.onclick = () => {
      copy(link);
      const url = CFG.discordChannelUrl || CFG.squareUrl || link;
      window.open(url, "_blank", "noopener");
    };

    bApp.onclick = () => {
      if (!isMember) return;
      const t = CFG.discordAppUrl || CFG.discordChannelUrl;
      if (!t) return;
      copy(link);
      const deep = t.startsWith("http") ? t.replace(/^https?:/,"discord:") : t;
      window.open(deep, "_blank", "noopener");
    };

    bCopy.onclick = () => copy(link);
    bPatr.onclick = () => { if (CFG.inviteUrl) window.open(CFG.inviteUrl, "_blank", "noopener"); };

    bMem.onclick = () => {
      const next = (localStorage.getItem("osf:isMember") === "1") ? "0" : "1";
      localStorage.setItem("osf:isMember", next);
      bMem.textContent = next === "1" ? "I'm a member ✓" : "I'm a member";
      bApp.style.display = (next === "1" && (CFG.discordAppUrl || CFG.discordChannelUrl)) ? "" : "none";
    };

    // place beside the pen button if present
    const head = pre.previousElementSibling?.classList?.contains("osf-head") ? pre.previousElementSibling : null;
    const pen = head ? head.querySelector(".osf-more") : null;
    placePopover(pop, pen || pre);
  }

  // ---------- global click handlers (delegation) ----------
  function wireGlobalClicks() {
    // outside-click to close
    on(document, "click", (e) => {
      if (!_openPop) return;
      if (e.target.closest(".osf-pop")) return;
      if (e.target.closest(".osf-more")) return;
      _openPop.remove(); _openPop = null;
    });

    // copy link
    on(document, "click", (e) => {
      const btn = e.target.closest(".osf-copy");
      if (!btn) return;
      const pre = btn.closest(".osf-head")?.nextElementSibling;
      if (!pre || !pre.matches("pre.osf")) return;
      const link = `${location.origin}${location.pathname}#${pre.id}`;
      copy(link);
    });

    // pen → popover
    on(document, "click", (e) => {
      const btn = e.target.closest(".osf-more");
      if (!btn) return;
      e.preventDefault();
      const pre = btn.closest(".osf-head")?.nextElementSibling;
      if (!pre || !pre.matches("pre.osf")) return;
      const uuid = pre.dataset.osfUuid || pre.id;
      const para = Number(pre.dataset.osfNum || "0") || 0;
      discussPopover(pre, uuid, para);
    });

    // Esc to close
    on(document, "keydown", (e) => {
      if (e.key === "Escape" && _openPop) { _openPop.remove(); _openPop = null; }
    });
  }

  // ---------- deep-link highlight ----------
  function highlightFromHash() {
    const id = (location.hash || "").slice(1);
    if (!id) return;
    const pre = qs(`#${CSS.escape(id)}`);
    if (!pre) return;
    const y = pre.getBoundingClientRect().top + window.scrollY - CFG.SCROLL_OFFSET;
    smoothScrollTo(y);
    pre.classList.add("osf-highlight");
    setTimeout(() => pre.classList.remove("osf-highlight"), CFG.HILITE_MS);
  }

  // ---------- init ----------
  async function init() {
    ensureStyles();
    try { await fetchAnchors(); } catch {}
    decorateParagraphs();
    wireGlobalClicks();
    highlightFromHash();
    on(window, "hashchange", highlightFromHash);
    log("anchors ready");
  }

  if (document.readyState === "loading") {
    on(document, "DOMContentLoaded", init);
  } else {
    init();
  }
})();
