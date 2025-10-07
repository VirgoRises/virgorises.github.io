/* osf.bundle.js — anchors + copy + smooth scroll + popover (Research) */
(function () {
  "use strict";

  // ---------- tiny helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const on = (el, type, fn) => el.addEventListener(type, fn, { passive: true });
  const esc = encodeURIComponent;

  // ---------- config ----------
  const DEFAULTS = {
    SCROLL_OFFSET: 80,
    HILITE_MS: 6000,
    basePath: null, // auto
    squareUrl: "/zeta-zero-cafe/join-the-square.html",     // fallback
    discordChannelUrl: "",                                  // set per page via window.OSF_CONFIG
    discordAppUrl: "",                                      // optional (app)
    inviteUrl: "",                                          // optional (patreon/etc.)
    snippetTemplate: (url, n) => `§${n} — ${url}`
  };
  const CFG = Object.assign({}, DEFAULTS, (window.OSF_CONFIG || {}));

  // ---------- ensure minimal styles ----------
  function ensureStyles() {
    if (document.getElementById("osf-inline-style")) return;
    const css = `
      .osf-label{color:inherit;text-decoration:none;font-weight:600}
      .osf-head{display:inline-flex;gap:.45rem;align-items:center}
      .osf-copy{margin-left:.4rem}
      .osf-btn{display:inline-flex;gap:.5rem;align-items:center;cursor:pointer}
      .osf-pop{position:absolute;z-index:9999;pointer-events:auto}
      .osf-pop *{pointer-events:auto}
      .osf-block{margin:1em 0 .25em 0;display:flex;align-items:center;gap:.5rem}
      .osf-hot{outline:3px solid #f5a623;border-radius:.5rem}
      .osf-ico{opacity:.55;transition:opacity .15s ease}
      .osf-ico:hover{opacity:1}
    `;
    const s = document.createElement("style");
    s.id = "osf-inline-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---- focus/highlight a § by hash, honoring SCROLL_OFFSET
  function osfFocusFromHash() {
    const id = (location.hash || "").slice(1);
    if (!id) return;

    const pre = document.getElementById(id);
    if (!pre) return;

    // highlight
    document.querySelectorAll('.osf-active').forEach(n => n.classList.remove('osf-active'));
    pre.classList.add('osf-active');

    // scroll with offset
    const y = pre.getBoundingClientRect().top + window.scrollY - (CFG.SCROLL_OFFSET || 80);
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
  window.addEventListener('hashchange', osfFocusFromHash);
  window.addEventListener('load', () => setTimeout(osfFocusFromHash, 0));

  // ---------- anchors json loader ----------
  function anchorsUrlFromPath() {
    // /cafes/<slug>/notebook/<file>.html  -> /data/cafes/<slug>/anchors/<file>.json
    const parts = location.pathname.split("/").filter(Boolean);
    const slug = parts[1] || "zeta-zero-cafe";
    const htmlFile = parts.slice(-1)[0] || "";
    const base = htmlFile.replace(/\.html$/i, "");
    return `/data/cafes/${slug}/anchors/${base}.json`;
  }

  async function fetchAnchors() {
    const url = anchorsUrlFromPath();
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (e) {
      console.warn("[osf] anchors load failed:", url, e.message);
      return { paragraphs: [] };
    }
  }

  // ---------- popover ----------
  function buildPopover(para, uuid, paraNum) {
    // create once then reuse per paragraph
    const pop = document.createElement("div");
    pop.className = "osf-pop card";
    pop.innerHTML = `
      <div class="card-body" style="min-width: 22rem;">
        <div class="h6 mb-2">Discuss § ${paraNum}</div>
        <button class="btn w-100 mb-2" data-osf="memo">Draft RFC memo</button>
        <button class="btn w-100 mb-2" data-osf="enter">Enter The Square (free)</button>
        <button class="btn w-100 mb-2" data-osf="open-app">Open in Discord app</button>
        <button class="btn w-100 mb-2" data-osf="copy">Copy paragraph link</button>
        <button class="btn w-100 mb-2" data-osf="support">Support on Patreon (optional)</button>
        <button class="btn w-100" data-osf="member">I’m a member</button>
        <div class="text-muted mt-2" style="font-size:.85rem">Open chat for everyone — no payment required.</div>
      </div>
    `;
    // wire actions
    const link = `${location.origin}${location.pathname}#${uuid}`;

    // copy
    $('[data-osf="copy"]', pop).onclick = () => {
      navigator.clipboard.writeText(link);
      toast("Copied paragraph link");
    };

    // enter web
    $('[data-osf="enter"]', pop).onclick = () => {
      const url = CFG.discordChannelUrl || CFG.squareUrl;
      // copy snippet before sending people away
      const n = paraNum;
      const snippet = (CFG.snippetTemplate || DEFAULTS.snippetTemplate)(link, n);
      navigator.clipboard.writeText(snippet).catch(() => { });
      window.open(url, "_blank");
    };

    // open in app (hidden if no channel configured)
    const appBtn = $('[data-osf="open-app"]', pop);
    if (!CFG.discordAppUrl) appBtn.style.display = "none";
    appBtn.onclick = () => {
      const n = paraNum;
      const snippet = (CFG.snippetTemplate || DEFAULTS.snippetTemplate)(link, n);
      navigator.clipboard.writeText(snippet).catch(() => { });
      window.location.href = CFG.discordAppUrl;
    };

    // support (hidden if not provided)
    const supBtn = $('[data-osf="support"]', pop);
    if (!CFG.inviteUrl) supBtn.style.display = "none";
    supBtn.onclick = () => window.open(CFG.inviteUrl, "_blank");

    // member toggle (simple UX)
    $('[data-osf="member"]', pop).onclick = (e) => {
      e.currentTarget.classList.toggle("active");
      const on = e.currentTarget.classList.contains("active");
      e.currentTarget.textContent = on ? "I’m a member ✓" : "I’m a member";
      appBtn.style.display = on && CFG.discordAppUrl ? "" : "none";
      supBtn.style.display = on ? "none" : (CFG.inviteUrl ? "" : "none");
    };

    // research office (new page)
    $('[data-osf="memo"]', pop).onclick = () => {
      const cafeRoot = location.pathname.split("/").slice(0, 3).join("/"); // /cafes/<slug>
      const chapterRel = location.pathname.split("/").slice(3).join("/");  // notebook/...
      const url =
        `${cafeRoot}/research_office.html?` +
        `para=${esc(uuid)}&chapter=${esc(chapterRel)}&return=${esc(location.pathname + "#" + uuid)}`;
      window.location.href = url;
    };

    // position near paragraph head
    document.body.appendChild(pop);
    const head = $(".osf-head", para);
    const rect = head.getBoundingClientRect();
    pop.style.left = `${Math.round(rect.left)}px`;
    pop.style.top = `${Math.round(rect.bottom + window.scrollY + 6)}px`;

    // autoclose on outside click
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
    const data = await fetchAnchors();

    // number, label, buttons
    const pres = $$("pre.osf");
    pres.forEach((pre, i) => {
      // id like osf-5 (add if missing)
      if (!pre.id) pre.id = `osf-${i + 1}`;
      const uuid = pre.id;

      // wrap header row
      const head = document.createElement("div");
      head.className = "osf-head";
      const label = document.createElement("a");
      label.className = "osf-label";
      label.href = `#${uuid}`;
      label.textContent = `§ ${i + 1}`;
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "osf-ico osf-copy";
      copy.title = "Copy link";
      copy.innerHTML = "🔗";
      const more = document.createElement("button");
      more.type = "button";
      more.className = "osf-ico osf-more";
      more.title = "Discuss / Research";
      more.innerHTML = "✎";

      head.appendChild(label);
      head.appendChild(copy);
      head.appendChild(more);

      const wrap = document.createElement("div");
      wrap.className = "osf-block";
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(head);
      wrap.appendChild(pre);

      // clickers
      copy.onclick = () => {
        const url = `${location.origin}${location.pathname}#${uuid}`;
        navigator.clipboard.writeText(url).then(() => toast("Copied paragraph link"));
      };
      more.onclick = () => buildPopover(wrap, uuid, i + 1);
    });

    // highlight target + smooth scroll (when coming with #hash)
    const H = location.hash.replace(/^#/, "");
    if (H) {
      const el = document.getElementById(H);
      if (el && el.tagName === "PRE") {
        const y = el.getBoundingClientRect().top + window.scrollY - (CFG.SCROLL_OFFSET || 80);
        window.scrollTo({ top: y, behavior: "smooth" });
        el.classList.add("osf-hot");
        setTimeout(() => el.classList.remove("osf-hot"), CFG.HILITE_MS);
      }
    }
  }

  if (document.readyState !== "loading") init();
  else on(document, "DOMContentLoaded", init);
})();

