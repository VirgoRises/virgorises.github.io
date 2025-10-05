// osf.bundle.js — stable anchors + copy + smooth scroll + “propose” popover
// osf.bundle.js — stable anchors + copy + smooth scroll + “propose” popover
// Usage (in each chapter, before </body>):
//   <script>
//     window.OSF_CONFIG = {
//       discordChannelUrl: "https://discord.com/channels/1421398181098557462/1421432961726939277",
//       discordAppUrl:     "discord://-/channels/1421398181098557462/1421432961726939277",
//       squareUrl:         "https://discord.com/channels/1421398181098557462/1421477719157510249",
//       inviteUrl:         "https://www.patreon.com/c/virgorises",
//       analyticsEndpoint: null, // e.g. "/osf-analytics" (null disables)
//       // (optional) customize messages:
//       strings: {
//         nonMemberPrimary: "Enter The Square (free)",
//         nonMemberNote:    "Open chat for everyone — no payment required.",
//         joinCta:          "Support on Patreon (optional)"
//       },
//       // (optional) customize the snippet users paste in Discord
//       snippetTemplate: (label, url, id) => `${label} [id=${id}] — ${url}`
//     };
//   </script>
//   <script defer src="/js/osf.bundle.js"></script>
(function () {
  "use strict";

  // -------- Config (override per page with window.OSF_CONFIG = {...}) --------
  const DEFAULTS = {
    SCROLL_OFFSET: 80,
    HILITE_MS: 6000,
    basePath: null, // auto-detected from /notebook/ if null

    // paths/destinations
    squareUrl: "/cafes/zeta-zero-cafe/join-the-square.html",
    discordChannelUrl: "https://discord.com/channels/YOUR_SERVER_ID/YOUR_CHANNEL_ID",
    discordAppUrl: null, // e.g. "discord://-/channels/123/456"
    inviteUrl: null,

    // optional analytics (null disables)
    analyticsEndpoint: null,

    // snippet users paste in Discord (anti-spoof default includes UUID)
    snippetTemplate: (label, url, id) => `${label} [id=${id}] — ${url}`,

    // popover strings
    strings: {
      title: (label) => `Discuss ${label}`,
      memberPrimary: "Open Discord",
      nonMemberPrimary: "Enter The Square (free)",
      memberNote: "You’re marked as a member on this device.",
      nonMemberNote: "Open chat for everyone — no payment required.",
      joinCta: "Support on Patreon (optional)"
    }
  };
  const CFG = Object.assign({}, DEFAULTS, (window.OSF_CONFIG || {}));

  const log = (...a) => console.log("[osf]", ...a);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // --- privacy-light beacon (only if endpoint configured) ---
  function ping(event, data = {}) {
    try {
      if (!CFG.analyticsEndpoint) return;
      const payload = JSON.stringify({ event, t: Date.now(), ...data });
      navigator.sendBeacon?.(
        CFG.analyticsEndpoint,
        new Blob([payload], { type: "application/json" })
      );
    } catch (_) { }
  }

  // ------------------------ Styles ------------------------------------------
  function ensureStyles() {
    if (document.getElementById("osf-inline-style")) return;
    const css = `
      .osf-block{margin:1em 0 .25em 0;display:flex;flex-direction:column;align-items:flex-start;gap:.35rem}
      .osf-head{display:inline-flex;align-items:center;gap:.45rem;position:relative}
      .osf-label{color:inherit;text-decoration:none;font-weight:600}
      .osf-label:hover{text-decoration:underline}
      .osf-copy,.osf-more{border:0;background:transparent;font:inherit;line-height:1;cursor:pointer;padding:0 .15rem;opacity:0;color:inherit}
      .osf-block:hover .osf-copy,.osf-block:hover .osf-more,.osf-block:focus-within .osf-copy,.osf-block:focus-within .osf-more{opacity:1}
      .osf-ico{display:block}
      .osf-highlight{outline:3px solid rgba(255,193,7,.9);outline-offset:2px;animation:osfPulse 1.2s ease-in-out 0s 3}
      @keyframes osfPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,193,7,.5)}50%{box-shadow:0 0 6px 0 rgba(255,193,7,.2)}}
      .osf-toast{position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);background:#000;color:#fff;padding:.4rem .6rem;border-radius:.5rem;font-size:.85rem;opacity:0;pointer-events:none;transition:opacity .2s;z-index:2147483647}
      .osf-toast.show{opacity:.9}
      .osf-pop{position:absolute;top:1.6rem;left:0;min-width:220px;max-width:280px;background:var(--card,#111);color:var(--fg,#eee);border:1px solid rgba(255,255,255,.12);border-radius:.6rem;box-shadow:0 6px 24px rgba(0,0,0,.3);padding:.6rem;z-index:50;display:none}
      .osf-pop.open{display:block}
      .osf-pop h5{margin:.1rem 0 .4rem 0;font-size:.9rem;font-weight:600}
      .osf-btn{display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .55rem;border-radius:.45rem;border:1px solid rgba(255,255,255,.18);background:transparent;color:inherit;cursor:pointer;font-size:.85rem;text-decoration:none}
      .osf-btn.primary{background:rgba(80,160,255,.18);border-color:rgba(80,160,255,.45)}
      .osf-row{display:flex;gap:.4rem;flex-wrap:wrap}
      .osf-note{font-size:.75rem;opacity:.8;margin-top:.35rem}
    `.trim();
    const s = document.createElement("style");
    s.id = "osf-inline-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ------------------------ Helpers -----------------------------------------
  function detectChapter() {
    const t = document.title || "";
    const p = decodeURIComponent(location.pathname);
    const m = t.match(/Chapter\s+(\d+)/i) || p.match(/Chapter\s+(\d+)/i);
    return m ? Number(m[1]) : null;
  }
  function detectBasePath() {
    if (CFG.basePath) return CFG.basePath;
    const p = location.pathname;
    const i = p.toLowerCase().indexOf("/notebook/");
    if (i > 0) return p.slice(0, i);
    const parts = p.split("/").filter(Boolean);
    return parts.length ? "/" + parts[0] : "";
  }
  async function fetchAnchors(base, chapterNo) {
    if (!chapterNo) return null;
    const url = `${base}/data/anchors/chapter-${chapterNo}.json`;
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      log("anchors JSON not available:", e.message);
      return null;
    }
  }
  function resolveHashTarget(hash) {
    if (!hash) return null;
    if (hash.startsWith("#osf-")) {
      const n = Number(hash.slice(5));
      const pre = document.querySelectorAll("pre.osf")[n - 1];
      return pre || document.getElementById(hash.slice(1));
    }
    return document.getElementById(hash.slice(1));
  }
  function scrollAndHighlight(el) {
    $$(".osf-highlight").forEach(n => n.classList.remove("osf-highlight"));
    const y = Math.max(window.pageYOffset + el.getBoundingClientRect().top - CFG.SCROLL_OFFSET, 0);
    window.scrollTo({ top: y, behavior: "smooth" });
    el.classList.add("osf-highlight");
    setTimeout(() => el.classList.remove("osf-highlight"), CFG.HILITE_MS);
  }
  function fullLinkTo(id) { return new URL(`#${id}`, location.href).toString(); }
  function snippetOf(label, uuid) {
    const tpl = CFG.snippetTemplate || ((l, u) => `${l} — ${u}`);
    return tpl(label, fullLinkTo(uuid), uuid);
  }
  const isMember = () => localStorage.getItem("osfMember") === "1";
  const setMember = v => localStorage.setItem("osfMember", v ? "1" : "0");

  // small toast
  let toastTimer = null;
  function toast(msg) {
    let el = document.querySelector(".osf-toast");
    if (!el) { el = document.createElement("div"); el.className = "osf-toast"; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1200);
  }

  // strings helpers
  function sTitle(label) {
    const t = CFG.strings?.title;
    return typeof t === "function" ? t(label) : (t || `Discuss ${label}`);
  }
  function updatePrimaryLink(a, note) {
    if (isMember()) {
      a.textContent = CFG.strings?.memberPrimary || "Open Discord";
      a.href = CFG.discordChannelUrl;
      if (note) note.textContent = CFG.strings?.memberNote || "";
      a.removeAttribute("data-badge");
    } else {
      a.textContent = CFG.strings?.nonMemberPrimary || "Enter The Square";
      a.href = CFG.squareUrl;
      if (note) note.textContent = CFG.strings?.nonMemberNote || "";
      a.setAttribute("data-badge", "free");
    }
  }

  // ------------------------ Popover -----------------------------------------
  function buildPopover(labelText, uuid) {
    const pop = document.createElement("div");
    pop.className = "osf-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", `Options for ${labelText}`);

    const title = document.createElement("h5");
    title.textContent = sTitle(labelText);

    const row1 = document.createElement("div"); row1.className = "osf-row";
    const row2 = document.createElement("div"); row2.className = "osf-row";

    const primary = document.createElement("a");
    primary.className = "osf-btn primary";
    primary.target = "_blank"; primary.rel = "noopener";

    const snippet = snippetOf(labelText, uuid);
    // Alt-click to skip copy. First time show a hint.
    primary.addEventListener("click", (e) => {
      const href = primary.href;
      const target = primary.target || "_self";

      if (e.altKey) {
        // skip copy AND avoid the browser's Alt+Click "download" behavior
        e.preventDefault();
        window.open(href, target, "noopener");
        ping(isMember() ? "open_discord" : "enter_square", { uuid, alt: 1 });
        return;
      }

      navigator.clipboard?.writeText(snippet);
      if (!localStorage.getItem("osfAltHintShown")) {
        toast("Link copied • Alt-click to skip");
        localStorage.setItem("osfAltHintShown", "1");
      }
      ping(isMember() ? "open_discord" : "enter_square", { uuid, alt: 0 });
    });

    // optional: open in app (members only)
    let appBtn = null; // single binding used below
    if (CFG.discordAppUrl) {
      appBtn = document.createElement("a"); // <— FIX: no inner const
      appBtn.className = "osf-btn";
      appBtn.textContent = "Open in Discord app";
      appBtn.href = CFG.discordAppUrl;

      appBtn.addEventListener("click", (e) => {
        const href = appBtn.href, target = appBtn.target || "_self";
        if (e.altKey) {
          e.preventDefault();
          window.open(href, target, "noopener");
          ping("open_discord_app", { uuid, alt: 1 });
          return;
        }
        navigator.clipboard?.writeText(snippet);
        ping("open_discord_app", { uuid, alt: 0 });
      });

      row1.appendChild(appBtn);
    }

    const copyBtn = document.createElement("button");
    copyBtn.className = "osf-btn";
    copyBtn.textContent = "Copy paragraph link";
    copyBtn.addEventListener("click", async () => {
      try { await navigator.clipboard?.writeText(fullLinkTo(uuid)); toast("Link copied"); ping("copy_link", { uuid }); } catch { }
    });

    const toggle = document.createElement("button");
    toggle.className = "osf-btn";
    toggle.textContent = isMember() ? "I’m not a member" : "I’m a member";
    toggle.addEventListener("click", () => {
      setMember(!isMember());
      toggle.textContent = isMember() ? "I’m not a member" : "I’m a member";
      updatePrimaryLink(primary, note);
      refreshVisibility();
      ping("toggle_member", { to: isMember() ? 1 : 0 });
    });

    // Patreon/Join link — only for non-members
    let join = null;
    if (CFG.inviteUrl) {
      join = document.createElement("a");
      join.className = "osf-btn";
      join.textContent = CFG.strings?.joinCta || "Join server";
      join.href = CFG.inviteUrl;
      join.target = "_blank"; join.rel = "noopener";
      row2.appendChild(join);
    }
    
    // inside buildPopover(...)
    memoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // pass both uuid and the actual <pre> element for rock-solid preview
      window.OSF?.Memo?.open(uuid, pre);
    });

    // --- Draft RFC Memo button -------------------------------------------------
    const memoBtn = document.createElement("button");
    memoBtn.className = "osf-btn";
    memoBtn.textContent = "Draft RFC memo";
    memoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.OSF?.Memo?.open(uuid);
    });
    row2.appendChild(memoBtn);

    const note = document.createElement("div");
    note.className = "osf-note";

    updatePrimaryLink(primary, note);

    function refreshVisibility() {
      if (join) join.style.display = isMember() ? "none" : "";
      if (appBtn) appBtn.style.display = isMember() ? "" : "none";
    }
    refreshVisibility();

    row1.prepend(primary);
    row1.appendChild(copyBtn);
    row2.appendChild(toggle);

    pop.appendChild(title);
    pop.appendChild(row1);
    pop.appendChild(row2);
    pop.appendChild(note);
    return pop;
  }

  // --- smarter popover placement (keep on-screen) ---
  function positionPopover(pop, anchorBtn) {
    const wasClosed = !pop.classList.contains("open");
    if (wasClosed) { pop.style.visibility = "hidden"; pop.classList.add("open"); }
    const ar = anchorBtn.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = 0, top = 26; // px below the head row
    if (ar.left + pr.width > vw - 12) left = Math.max(vw - ar.left - pr.width - 12, -ar.left + 12);
    if (ar.bottom + pr.height > vh - 12) top = -(pr.height + 8);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    if (wasClosed) { pop.classList.remove("open"); pop.style.visibility = ""; }
  }

  // ------------------------ Init --------------------------------------------
  async function init() {
    ensureStyles();

    // quick manual override via URL (?member=1/0)
    const q = new URLSearchParams(location.search);
    if (q.has("member")) setMember(q.get("member") === "1");

    const ch = detectChapter();
    const base = detectBasePath();
    const map = await fetchAnchors(base, ch);

    const pres = $$(".card pre.osf, pre.osf");
    log(`found ${pres.length} <pre.osf> (chapter=${ch ?? "?"}, base="${base}")`);
    if (!pres.length) return;

    pres.forEach((pre, i) => {
      const uuid = map?.paragraphs?.[i]?.uuid || `osf-${i + 1}`;
      const labelText = map?.paragraphs?.[i]?.label || `§ ${i + 1}`;
      pre.id = uuid;

      // legacy anchor for old #osf-N links
      const legacy = document.createElement("span");
      legacy.id = `osf-${i + 1}`;
      legacy.style.position = "relative";
      legacy.style.top = "-1px";
      pre.parentNode.insertBefore(legacy, pre);

      // header row
      const wrap = document.createElement("div"); wrap.className = "osf-block";
      const head = document.createElement("div"); head.className = "osf-head";

      const a = document.createElement("a");
      a.className = "osf-label"; a.href = `#${uuid}`; a.textContent = labelText;

      const copy = document.createElement("button");
      copy.className = "osf-copy"; copy.type = "button";
      copy.title = "Copy link"; copy.setAttribute("aria-label", `Copy link to ${labelText}`);
      copy.textContent = "🔗";

      const more = document.createElement("button");
      more.className = "osf-more"; more.type = "button";
      more.title = "History / Propose edit"; more.setAttribute("aria-haspopup", "true");
      more.setAttribute("aria-expanded", "false");
      more.innerHTML = '<svg class="osf-ico" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.52l.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="currentColor"/></svg>';

      head.appendChild(a);
      head.appendChild(copy);
      head.appendChild(more);
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(head);
      wrap.appendChild(pre);

      // interactions
      a.addEventListener("click", (ev) => { ev.preventDefault(); history.replaceState(null, "", `#${uuid}`); scrollAndHighlight(pre); });
      copy.addEventListener("click", async (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        try { await navigator.clipboard?.writeText(fullLinkTo(uuid)); toast("Link copied"); ping("copy_link", { uuid }); } catch { }
      });

      // popover
      const pop = buildPopover(labelText, uuid);
      head.appendChild(pop);
      more.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const willOpen = !pop.classList.contains("open");
        $$(".osf-pop.open").forEach(p => p.classList.remove("open"));
        if (willOpen) {
          positionPopover(pop, more);
          pop.classList.add("open");
          more.setAttribute("aria-expanded", "true");
          (pop.querySelector("a,button") || pop).focus?.({ preventScroll: true });
          ping("popover_open", { uuid });
        } else {
          pop.classList.remove("open");
          more.setAttribute("aria-expanded", "false");
          ping("popover_close", { uuid });
        }
      });
      document.addEventListener("click", () => $$(".osf-pop.open").forEach(p => p.classList.remove("open")));
      // close with ESC
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") $$(".osf-pop.open").forEach(p => p.classList.remove("open"));
      });
      pop.addEventListener("click", (e) => e.stopPropagation());
    });

    // honor hash
    if (location.hash) {
      const t = resolveHashTarget(location.hash);
      if (t) scrollAndHighlight(t);
    }
    window.addEventListener("hashchange", () => {
      const t = resolveHashTarget(location.hash);
      if (t) scrollAndHighlight(t);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();

  // expose for debugging
  window.OSF = { config: CFG };
})();
