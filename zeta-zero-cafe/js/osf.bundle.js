// osf.bundle.js — stable anchors + copy link + smooth scroll/highlight
(function () {
  "use strict";

  const SCROLL_OFFSET = 80;
  const HILITE_MS = 6000;
  const log = (...a) => console.log("[osf]", ...a);

  function ensureStyles() {
    if (document.getElementById("osf-inline-style")) return;
    const css = `
      .osf-block { margin: 1em 0 .25em 0; display:flex; align-items:center; gap:.5rem; }
      .osf-label { color: inherit; text-decoration:none; font-weight:600; }
      .osf-label:hover { text-decoration: underline; }
      .osf-copy { border:0; background:transparent; font:inherit; line-height:1; cursor:pointer; opacity:.75; }
      .osf-copy:hover { opacity:1; }
      .osf-highlight { outline: 3px solid rgba(255,193,7,.9); outline-offset: 2px;
                       animation: osfPulse 1.2s ease-in-out 0s 3; }
      @keyframes osfPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,193,7,.5);}
                            50% { box-shadow: 0 0 6px 0 rgba(255,193,7,.2);} }
      .osf-toast { position:fixed; bottom:1rem; left:50%; transform:translateX(-50%);
                   background:#000; color:#fff; padding:.4rem .6rem; border-radius:.5rem;
                   font-size:.85rem; opacity:0; pointer-events:none; transition:opacity .2s; }
      .osf-toast.show { opacity:.9; }
    `.trim();
    const s = document.createElement("style");
    s.id = "osf-inline-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function detectChapter() {
    const t = document.title || "";
    const p = decodeURIComponent(location.pathname);
    const m = t.match(/Chapter\s+(\d+)/i) || p.match(/Chapter\s+(\d+)/i);
    return m ? Number(m[1]) : null;
  }

  // Base path = everything before "/notebook/"
  function detectBasePath() {
    const p = location.pathname;
    const cut = p.toLowerCase().indexOf("/notebook/");
    if (cut > 0) return p.slice(0, cut);
    const parts = p.split("/").filter(Boolean);
    return parts.length ? "/" + parts[0] : "";
  }

  async function fetchAnchors(basePath, chapterNo) {
    if (!chapterNo) return null;
    const url = `${basePath}/data/anchors/chapter-${chapterNo}.json`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      log("anchors JSON not available:", e.message);
      return null;
    }
  }

  function scrollAndHighlight(el) {
    $$(".osf-highlight").forEach(n => n.classList.remove("osf-highlight"));
    const y = Math.max(window.pageYOffset + el.getBoundingClientRect().top - SCROLL_OFFSET, 0);
    window.scrollTo({ top: y, behavior: "smooth" });
    el.classList.add("osf-highlight");
    setTimeout(() => el.classList.remove("osf-highlight"), HILITE_MS);
  }

  function resolveHashTarget(hash) {
    if (!hash) return null;
    if (hash.startsWith("#osf-")) {
      const n = Number(hash.slice(5));
      const pre = document.querySelectorAll("pre.osf")[n-1];
      return pre || document.getElementById(hash.slice(1));
    }
    return document.getElementById(hash.slice(1));
  }

  async function init() {
    ensureStyles();

    const ch = detectChapter();
    const base = detectBasePath() || "";
    const mapping = await fetchAnchors(base, ch);

    const pres = $$(".card pre.osf, pre.osf");
    log(`found ${pres.length} <pre.osf> (chapter=${ch ?? "?"}, base="${base}")`);
    if (!pres.length) return;

    pres.forEach((pre, i) => {
      const uuid = mapping?.paragraphs?.[i]?.uuid || `osf-${i+1}`;
      const labelText = mapping?.paragraphs?.[i]?.label || `§ ${i+1}`;

      pre.id = uuid;

      const legacy = document.createElement("span");
      legacy.id = `osf-${i+1}`;
      legacy.style.position = "relative";
      legacy.style.top = "-1px";
      pre.parentNode.insertBefore(legacy, pre);

const wrap = document.createElement("div");
wrap.className = "osf-block";

const head = document.createElement("div");   // NEW
head.className = "osf-head";

const a = document.createElement("a");
a.className = "osf-label";
a.href = `#${uuid}`;
a.textContent = labelText;

const copy = document.createElement("button");
copy.className = "osf-copy";
copy.type = "button";
//copy.title = "Copy link";
copy.setAttribute("aria-label", `Copy link to ${labelText}`);
copy.title = "Copy link";copy.textContent = "🔗";

head.appendChild(a);        // label + icon in one row
head.appendChild(copy);

pre.parentNode.insertBefore(wrap, pre);
wrap.appendChild(head);     // row on top
wrap.appendChild(pre);      // paragraph below


      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        history.replaceState(null, "", `#${uuid}`);
        scrollAndHighlight(pre);
      });
      copy.addEventListener("click", async (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const url = new URL(`#${uuid}`, location.href).toString();
        try { await navigator.clipboard?.writeText(url); } catch {}
        let toast = document.querySelector(".osf-toast");
        if (!toast) {
          toast = document.createElement("div");
          toast.className = "osf-toast";
          document.body.appendChild(toast);
        }
        toast.textContent = "Link copied";
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 1200);
      });
    });

    if (location.hash) {
      const t = resolveHashTarget(location.hash);
      if (t) scrollAndHighlight(t);
    }
    window.addEventListener("hashchange", () => {
      const t = resolveHashTarget(location.hash);
      if (t) scrollAndHighlight(t);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }
})();
