/* osf.bundle.js — anchors + copy + smooth scroll + popover (Research + Source + SourceMap, flexible) */
(function () {
  "use strict";

  // ---------- tiny helpers ----------
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const on = (el, type, fn) => el.addEventListener(type, fn, { passive: true });
  const esc = encodeURIComponent;

  // ---------- config ----------
  const DEFAULTS = {
    SCROLL_OFFSET: 80,
    HILITE_MS: 6000,
    squareUrl: "/zeta-zero-cafe/join-the-square.html",
    discordChannelUrl: "",
    discordAppUrl: "",
    inviteUrl: "",
    defaultSourcePdf: "Old_main",
    snippetTemplate: (url, n) => `§${n} — ${url}`,
  };
  const CFG = Object.assign({}, DEFAULTS, (window.OSF_CONFIG || {}));

  // ---------- baseline styles (kept tiny) ----------
  function ensureStyles() {
    if (document.getElementById("osf-inline-style")) return;
    const css = `
      .osf-head{display:inline-flex;gap:.5rem;align-items:center}
      .osf-label{color:inherit;text-decoration:none;font-weight:600}
      .osf-block{margin:1rem 0 .25rem;display:flex;flex-direction:column;gap:.5rem}
      .osf-ico{display:inline-flex;align-items:center;justify-content:center;
               width:26px;height:26px;border:0;border-radius:6px;cursor:pointer;
               background:transparent;color:#c9d1d9;opacity:.6;transition:.15s}
      .osf-ico:hover{opacity:1;background:rgba(255,255,255,.06)}
      .osf-pop{position:absolute;z-index:9999;pointer-events:auto}
      .osf-pop *{pointer-events:auto}
      .osf-hot{outline:3px solid #f5a623;border-radius:.5rem}
    `;
    const s = document.createElement("style");
    s.id = "osf-inline-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---------- paths ----------
  const cafeRoot = () => location.pathname.split("/").slice(0, 3).join("/");
  const osfSlug  = () => (location.pathname.match(/^\/cafes\/([^/]+)\//) || [,""])[1];
  const chapterRel = () => location.pathname.split("/").slice(3).join("/"); // "notebook/…html"

  // ---------- optional anchors preload (harmless if missing) ----------
  async function fetchAnchors() {
    const parts = location.pathname.split("/").filter(Boolean);
    const slug = parts[1] || "zeta-zero-cafe";
    const base = (parts.slice(-1)[0] || "").replace(/\.html$/i,"");
    const url  = `/data/cafes/${slug}/anchors/${base}.json`;
    try {
      const r = await fetch(url, { cache:"no-store" });
      if (!r.ok) return { paragraphs:[] };
      return await r.json();
    } catch { return { paragraphs:[] }; }
  }

  // ---------- source map (flexible) ----------
  let __MAP = null;
  const norm = s => (s||"").replace(/\\/g,"/").replace(/^\/+|\/+$/g,"").toLowerCase();
  const onlyFile = s => norm(s).split("/").slice(-1)[0];
  const dropNotebook = s => norm(s).replace(/^notebook\//,"");

  async function loadMap(baseNameNoExt) {
    if (__MAP) return __MAP;
    const slug = osfSlug();
    const base = baseNameNoExt || (CFG.defaultSourcePdf || "Old_main");
    const paths = [
      `/data/cafes/${slug}/sources/${base}.map.json`,
      `/data/sources/${base}.map.json`,
      `/sources/${base}.map.json`
    ];
    for (const p of paths) {
      try {
        const r = await fetch(p, { cache:"no-store" });
        if (!r.ok) continue;
        __MAP = await r.json();
        return __MAP;
      } catch {}
    }
    __MAP = { pdf: (base + ".pdf"), chapters:{} };
    return __MAP;
  }

  function getPageFromEntry(entry) {
    if (!entry) return undefined;
    const cand = [entry.from, entry.pdf_from, entry.page, entry.start, entry.p];
    for (const v of cand) { const n = parseInt(v,10); if (Number.isFinite(n) && n>0) return n; }
    return undefined;
  }

  function findMapHit(map, chapRel, paraNum) {
    // chapter object candidates
    const keys = [ norm(chapRel), dropNotebook(chapRel), onlyFile(chapRel) ];
    const chObj = map?.chapters && ( map.chapters[keys[0]] || map.chapters[keys[1]] || map.chapters[keys[2]] );
    if (!chObj) return null;

    // paragraph key candidates
    const pKeys = [ String(paraNum), `osf-${paraNum}` ];
    const entry = chObj[pKeys[0]] || chObj[pKeys[1]];
    if (!entry) return null;

    const from = getPageFromEntry(entry);
    const to = (() => {
      const v = entry.to ?? entry.pdf_to ?? entry.end;
      const n = parseInt(v,10);
      return Number.isFinite(n) && n>0 ? n : undefined;
    })();

    return (from ? { from, to } : null);
  }

  async function openSourceForParagraph(paraNum) {
    const chap = chapterRel();
    const map  = await loadMap(CFG.defaultSourcePdf || "Old_main");
    const hit  = findMapHit(map, chap, paraNum);

    const pdfName = (map.pdf || (CFG.defaultSourcePdf + ".pdf") || "Old_main.pdf").replace(/\.pdf$/i,"");
    const params = new URLSearchParams({
      pdf: pdfName,
      para: `osf-${paraNum}`,
      chapter: chap,
      return: location.pathname + `#osf-${paraNum}`
    });
    if (hit?.from) params.set("from", String(hit.from));
    if (hit?.to)   params.set("to",   String(hit.to));

    window.location.href = `${cafeRoot()}/source.html?${params.toString()}`;
  }

  // ---------- hash focus ----------
  function focusFromHash() {
    const id = (location.hash || "").slice(1);
    const pre = id && document.getElementById(id);
    if (!pre) return;
    const y = pre.getBoundingClientRect().top + window.scrollY - (CFG.SCROLL_OFFSET || 80);
    window.scrollTo({ top: y, behavior: "smooth" });
    pre.classList.add("osf-hot");
    setTimeout(() => pre.classList.remove("osf-hot"), CFG.HILITE_MS);
  }
  window.addEventListener("hashchange", focusFromHash);
  window.addEventListener("load", () => setTimeout(focusFromHash, 0));

  // ---------- SVGs ----------
  const ICON_LINK = "🔗";
  const ICON_PEN  = "✎";
  const ICON_DOC  = `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="currentColor"
        d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2
           2 0 0 0 2-2V8l-6-6zm0 2.5L17.5 8H14V4.5zM8 11h8v2H8v-2zm0
           4h8v2H8v-2z"/>
    </svg>`;

  // ---------- popover ----------
  function buildPopover(wrap, uuid, paraNum) {
    const pop = document.createElement("div");
    pop.className = "osf-pop card";
    pop.innerHTML = `
      <div class="card-body" style="min-width:22rem;">
        <div class="h6 mb-2">Discuss § ${paraNum}</div>
        <button class="btn w-100 mb-2" data-osf="memo">Draft RFC memo</button>
        <button class="btn w-100 mb-2" data-osf="enter">Enter The Square (free)</button>
        <button class="btn w-100 mb-2" data-osf="open-app">Open in Discord app</button>
        <button class="btn w-100 mb-2" data-osf="copy">Copy paragraph link</button>
        <button class="btn w-100 mb-2" data-osf="source">Open source (PDF)</button>
        <button class="btn w-100 mb-2" data-osf="support">Support on Patreon (optional)</button>
        <button class="btn w-100" data-osf="member">I’m a member</button>
        <div class="text-muted mt-2" style="font-size:.85rem">Open chat for everyone — no payment required.</div>
      </div>
    `;

    const link = `${location.origin}${location.pathname}#${uuid}`;

    $('[data-osf="copy"]', pop).onclick = () => {
      navigator.clipboard.writeText(link).then(() => toast("Copied paragraph link"));
    };

    $('[data-osf="enter"]', pop).onclick = () => {
      const url = CFG.discordChannelUrl || CFG.squareUrl;
      const snippet = (CFG.snippetTemplate || DEFAULTS.snippetTemplate)(link, paraNum);
      navigator.clipboard.writeText(snippet).catch(() => {});
      window.open(url, "_blank");
    };

    const appBtn = $('[data-osf="open-app"]', pop);
    if (!CFG.discordAppUrl) appBtn.style.display = "none";
    appBtn.onclick = () => {
      const snippet = (CFG.snippetTemplate || DEFAULTS.snippetTemplate)(link, paraNum);
      navigator.clipboard.writeText(snippet).catch(() => {});
      window.location.href = CFG.discordAppUrl;
    };

    const supBtn = $('[data-osf="support"]', pop);
    if (!CFG.inviteUrl) supBtn.style.display = "none";
    supBtn.onclick = () => window.open(CFG.inviteUrl, "_blank");

    $('[data-osf="member"]', pop).onclick = (e) => {
      e.currentTarget.classList.toggle("active");
      const on = e.currentTarget.classList.contains("active");
      e.currentTarget.textContent = on ? "I’m a member ✓" : "I’m a member";
      appBtn.style.display = on && CFG.discordAppUrl ? "" : "none";
      supBtn.style.display = on ? "none" : (CFG.inviteUrl ? "" : "none");
    };

    $('[data-osf="memo"]', pop).onclick = () => {
      const url =
        `${cafeRoot()}/research_office.html?` +
        `para=${esc(uuid)}&chapter=${esc(chapterRel())}&return=${esc(location.pathname + "#" + uuid)}`;
      window.location.href = url;
    };

    $('[data-osf="source"]', pop).onclick = () => openSourceForParagraph(paraNum);

    // position
    document.body.appendChild(pop);
    const head = $(".osf-head", wrap);
    const rect = head.getBoundingClientRect();
    pop.style.left = `${Math.round(rect.left)}px`;
    pop.style.top  = `${Math.round(rect.bottom + window.scrollY + 6)}px`;

    const closer = (ev) => {
      if (!pop.contains(ev.target)) {
        pop.remove();
        document.removeEventListener("mousedown", closer, true);
      }
    };
    document.addEventListener("mousedown", closer, true);
  }

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    let t = document.getElementById("osf-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "osf-toast";
      t.style.cssText =
        "position:fixed;left:1rem;bottom:1rem;background:#222;color:#fff;padding:.6rem .8rem;border-radius:.5rem;opacity:0;transform:translateY(6px);transition:all .15s ease;z-index:99999";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = "1";
    t.style.transform = "translateY(0)";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateY(6px)";
    }, 1600);
  }

  // ---------- init ----------
  async function init() {
    ensureStyles();
    await fetchAnchors();

    const pres = $$("pre.osf");
    pres.forEach((pre, i) => {
      if (!pre.id) pre.id = `osf-${i + 1}`;
      const uuid = pre.id;
      const paraNum = i + 1;

      const head  = document.createElement("div");
      head.className = "osf-head";

      const label = document.createElement("a");
      label.className = "osf-label";
      label.href = `#${uuid}`;
      label.textContent = `§ ${paraNum}`;

      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "osf-ico osf-copy";
      copy.title = "Copy link";
      copy.textContent = "🔗";

      const srcBtn = document.createElement("button");
      srcBtn.type = "button";
      srcBtn.className = "osf-ico osf-src";
      srcBtn.title = "Open source (PDF)";
      srcBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path fill="currentColor"
            d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2
               2 0 0 0 2-2V8l-6-6zm0 2.5L17.5 8H14V4.5zM8 11h8v2H8v-2zm0
               4h8v2H8v-2z"/>
        </svg>`;

      const more = document.createElement("button");
      more.type = "button";
      more.className = "osf-ico osf-more";
      more.title = "Discuss / Research";
      more.textContent = "✎";

      head.appendChild(label);
      head.appendChild(copy);
      head.appendChild(srcBtn);
      head.appendChild(more);

      const wrap = document.createElement("div");
      wrap.className = "osf-block";
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(head);
      wrap.appendChild(pre);

      copy.onclick = () => {
        const url = `${location.origin}${location.pathname}#${uuid}`;
        navigator.clipboard.writeText(url).then(() => toast("Copied paragraph link"));
      };
      srcBtn.onclick  = () => openSourceForParagraph(paraNum);
      more.onclick    = () => buildPopover(wrap, uuid, paraNum);
    });

    focusFromHash();
  }

  if (document.readyState !== "loading") init();
  else on(document, "DOMContentLoaded", init);
})();
