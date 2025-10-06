/*!
  osf.bundle.js — stable anchors + clean popover + copy + smooth scroll
  Drop-in for pages that contain <pre class="osf"> paragraphs.

  Optional per-page config (define BEFORE loading this file):
  window.OSF_CONFIG = {
    SCROLL_OFFSET: 80,
    HILITE_MS: 6000,
    squareUrl: "/cafes/zeta-zero-cafe/join-the-square.html",   // “Enter The Square (free)”
    discordChannelUrl: "https://discord.com/channels/<guild>/<channel>", // web
    discordAppUrl: "discord://-/channels/<guild>/<channel>",             // desktop app
    inviteUrl: "https://www.patreon.com/c/virgorises",         // optional
    snippetTemplate: (absUrl, n) => `§${n} — ${absUrl}`        // optional clipboard snippet
  };
*/

(function () {
  "use strict";

  // ------------------------- config & utils -------------------------
  const CFG = Object.assign({
    SCROLL_OFFSET: 80,
    HILITE_MS: 6000,
    squareUrl: "",            // public entry (free)
    discordChannelUrl: "",    // web
    discordAppUrl: "",        // app (members only)
    inviteUrl: "",            // Patreon / support (optional)
    snippetTemplate: null
  }, window.OSF_CONFIG || {});

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } };
  const ensureEl = (id, tag, parent) => {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement(tag); el.id = id; (parent || document.body).appendChild(el); }
    return el;
  };
  const cafeSlug = (() => {
    // /cafes/<slug>/...
    const m = location.pathname.match(/\/cafes\/([^/]+)\//);
    return m ? m[1] : "";
  })();
  const chapterRel = (() => {
    // relative chapter path after /cafes/<slug>/
    const i = location.pathname.indexOf(`/cafes/${cafeSlug}/`);
    if (i === -1) return "";
    return location.pathname.slice(i + (`/cafes/${cafeSlug}/`).length);
  })();

  const absParaUrl = (id) => location.origin + location.pathname + "#" + encodeURIComponent(id);
  const snippet = (n, id) => {
    const url = absParaUrl(id);
    return typeof CFG.snippetTemplate === "function" ? CFG.snippetTemplate(url, n) : url;
  };
  const isMember = () => localStorage.getItem("osf:isMember") === "1";
  const setMember = (v) => localStorage.setItem("osf:isMember", v ? "1" : "0");

  // ------------------------- inline CSS -------------------------
  function ensureStyles() {
    if (document.getElementById("osf-inline-style")) return;
    const css = `
/* layout for the § label + icons */
.osf-head{display:flex;align-items:center;gap:.6rem;margin:.45rem 0 .35rem 0}
.osf-label{display:inline-block;font-weight:600;user-select:none}
.osf-label a{color:inherit;text-decoration:none}
.osf-icons{display:inline-flex;gap:.35rem}
.osf-ic{opacity:.45;transition:opacity .12s;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;border:1px solid rgba(255,255,255,.08);background:#0f141a}
.osf-ic:hover,.osf-head:hover .osf-ic{opacity:.95}
.osf-ic svg{width:14px;height:14px}

/* keep label + icons above block, left-aligned */
.osf-block{display:flex;flex-direction:column;align-items:flex-start;gap:.45rem}

/* highlight when deep-linked */
.osf-highlight{outline:3px solid rgba(255,179,71,.85);outline-offset:2px;animation:osfPulse 1.3s ease-in-out 0s 3}
@keyframes osfPulse{0%{box-shadow:0 0 0 0 rgba(255,179,71,.0)}50%{box-shadow:0 0 0 6px rgba(255,179,71,.25)}100%{box-shadow:0 0 0 0 rgba(255,179,71,.0)}}

/* popover (clean, compact) */
.osf-pop{position:absolute;z-index:9999;background:#121720;border:1px solid rgba(255,255,255,.12);border-radius:12px;box-shadow:0 12px 24px rgba(0,0,0,.4);width:320px;padding:10px}
.osf-pop h3{margin:0 0 8px 2px;font-size:.95rem;opacity:.9}
.osf-btn{display:block;width:100%;text-align:left;padding:9px 10px;margin:6px 0;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#0f141a;color:#e7edf3}
.osf-btn:hover{background:#141b24}
.osf-foot{font-size:.85rem;opacity:.75;margin-top:6px}
.osf-toast{position:fixed;right:16px;bottom:14px;background:#15202b;border:1px solid rgba(255,255,255,.16);border-radius:10px;padding:10px 12px;opacity:0;transform:translateY(8px);transition:.2s}
.osf-toast.show{opacity:1;transform:translateY(0)}
`;
    const style = document.createElement("style");
    style.id = "osf-inline-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ------------------------- icons (inline SVG) -------------------------
  const ICON = {
    link: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.9 12a4.1 4.1 0 014.1-4.1h3v2h-3a2.1 2.1 0 000 4.2h3v2h-3A4.1 4.1 0 013.9 12zm12-4.1h-3v2h3a2.1 2.1 0 010 4.2h-3v2h3a4.1 4.1 0 000-8.2z"></path><path d="M8 13h8v-2H8v2z"></path></svg>`,
    pen: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm18.71-11.04a1.003 1.003 0 000-1.42l-2.5-2.5a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.99-1.66z"/></svg>`
  };

  // ------------------------- toast -------------------------
  function showToast(msg) {
    const t = ensureEl("osf-toast", "div");
    t.className = "osf-toast";
    t.textContent = msg || "Copied";
    t.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove("show"), 1200);
  }

  // ------------------------- build § labels + icons -------------------------
  function addHead(pre, n) {
    // wrap: move <pre> under a small header row
    const wrap = document.createElement("div");
    wrap.className = "osf-block";
    pre.parentNode.insertBefore(wrap, pre);
    const head = document.createElement("div");
    head.className = "osf-head";

    const label = document.createElement("div");
    label.className = "osf-label";
    label.innerHTML = `<a href="#${pre.id}" title="Link to §${n}">§ ${n}</a>`;

    const icons = document.createElement("div");
    icons.className = "osf-icons";

    const aCopy = document.createElement("button");
    aCopy.className = "osf-ic";
    aCopy.title = "Copy paragraph link";
    aCopy.innerHTML = ICON.link;

    const aMore = document.createElement("button");
    aMore.className = "osf-ic";
    aMore.title = "Discuss / research";
    aMore.innerHTML = ICON.pen;

    icons.appendChild(aCopy);
    icons.appendChild(aMore);
    head.appendChild(label);
    head.appendChild(icons);

    wrap.appendChild(head);
    wrap.appendChild(pre);

    // copy behavior
    on(aCopy, "click", async (ev) => {
      ev.preventDefault();
      const ok = await copy(snippet(n, pre.id));
      showToast(ok ? "Copied paragraph link" : "Copy failed");
    });

    // popover
    on(aMore, "click", (ev) => {
      ev.preventDefault();
      showPopoverFor(pre, n, aMore);
    });
  }

  // ------------------------- popover -------------------------
  function showPopoverFor(pre, n, anchorBtn) {
    let pop = document.getElementById("osf-pop");
    if (!pop) {
      pop = document.createElement("div");
      pop.id = "osf-pop";
      pop.className = "osf-pop";
      document.body.appendChild(pop);
    }

    // recompute relative chapter to build research page URL
    const slug = cafeSlug;
    const rel = chapterRel;
    /*
    const researchUrl =
      `/cafes/${slug}/research_office.html` +
      `?para=${encodeURIComponent(pre.id)}` +
      `&chapter=${encodeURIComponent(rel)}` +
      `&return=${encodeURIComponent(location.pathname + "#" + pre.id)}`;
    */
    const researchUrl =
      `/cafes/${cafe}/research_office.html` +
      `?para=${encodeURIComponent(pre.id)}` +
      `&chapter=${encodeURI(location.pathname)}` +  // keeps slashes, encodes spaces
      `&return=${encodeURI(location.href)}`;

    // buttons visibility
    const member = isMember();
    const btns = [];

    const mkBtn = (label, onclick, show = true) => {
      if (!show) return null;
      const b = document.createElement("button");
      b.className = "osf-btn";
      b.textContent = label;
      on(b, "click", onclick);
      pop.appendChild(b);
      btns.push(b);
      return b;
    };

    pop.innerHTML = `<h3>Discuss § ${n}</h3>`;

    // “Draft RFC memo” → Research Office (new page)
    mkBtn("Draft RFC memo", () => {
      // also seed clipboard with snippet
      copy(snippet(n, pre.id));
      location.href = researchUrl;
    }, true);

    // Public square (free)
    mkBtn("Enter The Square (free)", () => {
      if (CFG.squareUrl) window.open(CFG.squareUrl, "_blank");
    }, !!CFG.squareUrl);

    // App (members)
    mkBtn("Open in Discord app", () => {
      if (CFG.discordAppUrl) {
        copy(snippet(n, pre.id));
        location.href = CFG.discordAppUrl;
      }
    }, member && !!CFG.discordAppUrl);

    // Copy
    mkBtn("Copy paragraph link", async () => {
      const ok = await copy(snippet(n, pre.id));
      showToast(ok ? "Copied paragraph link" : "Copy failed");
    }, true);

    // Patreon / Support (optional)
    mkBtn("Support on Patreon (optional)", () => {
      if (CFG.inviteUrl) window.open(CFG.inviteUrl, "_blank");
    }, !!CFG.inviteUrl);

    // Member toggle
    mkBtn(member ? "I'm a member ✓" : "I'm a member", () => {
      const now = !isMember();
      setMember(now);
      // re-render same popover state quickly
      showPopoverFor(pre, n, anchorBtn);
    }, true);

    // footer
    const foot = document.createElement("div");
    foot.className = "osf-foot";
    foot.textContent = "Open chat for everyone — no payment required.";
    pop.appendChild(foot);

    // place near the icon, but keep inside viewport
    const r = anchorBtn.getBoundingClientRect();
    const top = window.scrollY + r.bottom + 8;
    let left = window.scrollX + r.left - 12;
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
    pop.style.maxWidth = "min(92vw, 340px)";
    pop.style.display = "block";

    // nudge if overflowing right edge
    const pr = pop.getBoundingClientRect();
    if (pr.right > window.innerWidth - 8) {
      left = window.scrollX + (window.innerWidth - pr.width - 8);
      pop.style.left = `${left}px`;
    }

    // close on outside/Escape
    const closer = (ev) => {
      if (ev.type === "keydown" && ev.key !== "Escape") return;
      if (ev.type === "click" && pop.contains(ev.target)) return;
      pop.style.display = "none";
      document.removeEventListener("click", closer, true);
      document.removeEventListener("keydown", closer, true);
    };
    // delay so the click that opened it doesn’t immediately close it
    setTimeout(() => {
      document.addEventListener("click", closer, true);
      document.addEventListener("keydown", closer, true);
    }, 0);
  }

  // ------------------------- anchor build + numbering -------------------------
  function build() {
    ensureStyles();

    const pres = $$("pre.osf");
    let n = 0;
    pres.forEach((pre) => {
      // skip empty pre
      if (!pre.textContent || !pre.textContent.trim()) return;
      n += 1;
      const id = `osf-${n}`;
      if (!pre.id) pre.id = id;
      else if (!/^osf-\d+$/.test(pre.id)) {
        // keep author-set id but still use § numbering
      }

      addHead(pre, n);
    });
  }

  // ------------------------- deep link scroll + highlight -------------------------
  function byHash() {
    const hash = decodeURIComponent(location.hash || "").replace(/^#/, "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;

    const y = el.getBoundingClientRect().top + window.scrollY - (CFG.SCROLL_OFFSET || 0);
    window.scrollTo({ top: y, behavior: "smooth" });
    el.classList.add("osf-highlight");
    clearTimeout(byHash._t);
    byHash._t = setTimeout(() => el.classList.remove("osf-highlight"), CFG.HILITE_MS || 6000);
  }

  // ------------------------- boot -------------------------
  on(document, "DOMContentLoaded", () => {
    build();
    byHash();
  });
  on(window, "hashchange", byHash);
})();
