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

(function(){
  "use strict";

  // ---------- config ----------
  const DEFAULTS = {
    discordChannelUrl: null,
    discordAppUrl: null,
    squareUrl: "/join-the-square.html",
    inviteUrl: null,
    isMemberDefault: false,
    showMemoButton: true,
    SCROLL_OFFSET: 80,
    HILITE_MS: 6000
  };
  const CFG = Object.assign({}, DEFAULTS, (window.OSF_CONFIG || {}));

  // ---------- helpers ----------
  const $ = (sel, r=document) => r.querySelector(sel);
  const $$ = (sel, r=document) => Array.from(r.querySelectorAll(sel));

  function detectCafeSlug() {
    const m = location.pathname.match(/^\/cafes\/([^\/]+)/);
    if (m) return m[1];
    if (location.pathname.includes("/zeta-zero-cafe/")) return "zeta-zero-cafe"; // legacy
    return null;
  }
  function fullUrlWithHash(hash) {
    const u = new URL(location.href);
    u.hash = hash.startsWith("#") ? hash : `#${hash}`;
    return u.toString();
  }
  function copyToClipboard(txt) {
    try {
      navigator.clipboard.writeText(txt);
      toast("Link copied to clipboard");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast("Link copied to clipboard"); }
      finally { ta.remove(); }
    }
  }
  function scrollToEl(el) {
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - CFG.SCROLL_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
    el.classList.add("osf-highlight");
    setTimeout(()=> el.classList.remove("osf-highlight"), CFG.HILITE_MS);
  }
  function isMember() {
    const v = localStorage.getItem("osf:isMember");
    if (v === "1") return true;
    if (v === "0") return false;
    return !!CFG.isMemberDefault;
  }
  function setMemberState(val) {
    localStorage.setItem("osf:isMember", val ? "1" : "0");
  }

  // ---------- minimal CSS (injected once) ----------
  function ensureStyles(){
    if ($('#osf-inline-style')) return;
    const css = `
/* --- osf inline UI --- */
.osf-block{ margin: 1em 0; display:flex; flex-direction:column; gap:.35rem; }
.osf-head{ display:inline-flex; align-items:center; gap:.45rem; }
.osf-label{ color: inherit !important; text-decoration:none; font-weight:600; }
.osf-label:hover{ text-decoration:underline; }
.osf-copy,.osf-more{ opacity:0; transition:opacity .12s; cursor:pointer; border:0; background:transparent; color:inherit; font-size:0.95rem; }
.osf-head:hover .osf-copy,.osf-head:hover .osf-more{ opacity:1; }
.osf-copy:focus-visible,.osf-more:focus-visible{ opacity:1; outline:2px solid rgba(255,255,255,.3); outline-offset:2px; border-radius:.35rem; }
.osf-highlight{ outline:3px solid rgba(255,193,7,.9); outline-offset:2px;
  animation: osfPulse 1.2s ease-in-out 0s 3; background-image: linear-gradient(to right, rgba(255,235,150,.6), rgba(255,235,150,.1)); }
@keyframes osfPulse { 0%,100%{ box-shadow: 0 0 0 rgba(255,193,7,0.5);} 50%{ box-shadow: 0 0 6px rgba(255,193,7,0.25);} }

.osf-pop{ position:absolute; z-index:2147483645; background:var(--card,#0f1017); color:var(--fg,#e8e8f2);
  border:1px solid rgba(255,255,255,.12); border-radius:.6rem; padding:.6rem; width:min(360px, 92vw); box-shadow: 0 10px 30px rgba(0,0,0,.45); }
.osf-pop h4{ margin:.1rem 0 .4rem 0; font-size:1rem; }
.osf-pop .osf-row{ display:flex; flex-direction:column; gap:.45rem; }
.osf-pop .osf-note{ font-size:.85rem; opacity:.8; margin-top:.4rem; }
.osf-pop .osf-btn{ display:block; width:100%; text-align:left; padding:.45rem .6rem; border-radius:.45rem; border:1px solid rgba(255,255,255,.2);
  background:transparent; color:inherit; cursor:pointer; }
.osf-pop .osf-btn.primary{ background:rgba(80,160,255,.18); border-color:rgba(80,160,255,.4); }
.osf-pop .osf-btn:hover{ background:rgba(255,255,255,.07); }
.osf-pop .osf-micro{ font-size:.85rem; opacity:.9; }

.osf-toast{ position:fixed; right:12px; bottom:12px; z-index:2147483646; background:rgba(0,0,0,.85); color:#fff;
  padding:.6rem .8rem; border-radius:.6rem; transform:translateY(20px); opacity:0; transition: all .2s ease; }
.osf-toast.show{ transform:translateY(0); opacity:1; }
    `;
    const s = document.createElement("style");
    s.id = "osf-inline-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---------- toast ----------
  let toastTimer = null;
  function toast(msg) {
    let el = $('#osf-toast');
    if (!el) {
      el = document.createElement("div");
      el.id = "osf-toast";
      el.className = "osf-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> el.classList.remove("show"), 1600);
  }

  // ---------- popover ----------
  let currentPop = null;
  function closePop(){ if (currentPop){ currentPop.remove(); currentPop = null; } }

  function buildPopover(pre, uuid, n){
    closePop();
    const pop = document.createElement("div");
    pop.className = "osf-pop";
    pop.innerHTML = `
      <h4>Discuss § ${n}</h4>
      <div class="osf-row">
        <button class="osf-btn primary" id="osf-enter">Enter The Square (free)</button>
        <button class="osf-btn" id="osf-app">Open in Discord app</button>
        <button class="osf-btn" id="osf-copy">Copy paragraph link</button>
        <button class="osf-btn" id="osf-support">Support on Patreon (optional)</button>
        <button class="osf-btn" id="osf-memo">Draft RFC memo</button>
        <button class="osf-btn osf-micro" id="osf-member">I’m a member</button>
      </div>
      <div class="osf-note">Open chat for everyone — no payment required.</div>
    `;
    document.body.appendChild(pop);
    currentPop = pop;

    // visibility based on membership
    const member = isMember();
    $('#osf-app').style.display     = member && CFG.discordAppUrl ? "" : "none";
    $('#osf-support').style.display = member ? "none" : (CFG.inviteUrl ? "" : "none");

    // wire buttons
    $('#osf-enter').onclick = (e)=>{
      // Normal click -> squareUrl (free)
      // Alt-click -> open app link if available (quick shortcut)
      if (e.altKey && CFG.discordAppUrl) {
        location.href = CFG.discordAppUrl;
      } else if (CFG.squareUrl) {
        window.open(CFG.squareUrl, "_blank", "noopener");
      } else if (CFG.discordChannelUrl) {
        window.open(CFG.discordChannelUrl, "_blank", "noopener");
      } else {
        toast("No destination configured.");
      }
      closePop();
    };
    $('#osf-app').onclick = ()=>{
      if (!CFG.discordAppUrl) { toast("Discord app URL not configured"); return; }
      location.href = CFG.discordAppUrl;
      closePop();
    };
    $('#osf-copy').onclick = ()=>{
      const link = fullUrlWithHash(uuid);
      const snippet = `§${n} — ${link}`;
      copyToClipboard(snippet);
      closePop();
    };
    $('#osf-support').onclick = ()=>{
      if (CFG.inviteUrl) window.open(CFG.inviteUrl, "_blank", "noopener");
      closePop();
    };
    $('#osf-memo').onclick = ()=>{
      if (CFG.showMemoButton && window.OSF && window.OSF.Memo && typeof window.OSF.Memo.open === "function") {
        window.OSF.Memo.open(uuid, pre);
      } else {
        toast("Memo composer not available on this page.");
      }
      closePop();
    };
    $('#osf-member').onclick = ()=>{
      const now = !isMember();
      setMemberState(now);
      toast(now ? "Member mode on" : "Member mode off");
      closePop();
    };

    // position near the header (left of paragraph)
    const head = pre.previousElementSibling; // our header container
    const rect = head ? head.getBoundingClientRect() : pre.getBoundingClientRect();
    const top = rect.top + window.scrollY + (head ? head.offsetHeight + 6 : 6);
    const left = rect.left + window.scrollX + 2;
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;

    // outside click closes
    setTimeout(()=>{
      function onDoc(e){
        if (!pop.contains(e.target)) { document.removeEventListener("mousedown", onDoc); closePop(); }
      }
      document.addEventListener("mousedown", onDoc);
    }, 0);
  }

  // ---------- main enhancement ----------
  function enhance(){
    ensureStyles();

    const pres = $$("pre.osf");
    let n = 0;
    pres.forEach(pre => {
      // wrap in header + block if not yet
      const block = document.createElement("div");
      block.className = "osf-block";

      // if it already has a header, skip rebuild
      const prev = pre.previousElementSibling;
      if (prev && prev.classList && prev.classList.contains("osf-head")) {
        // already enhanced
        return;
      }

      // ensure it has an id (prefer existing)
      let uuid = pre.getAttribute("id");
      if (!uuid) {
        uuid = `osf-${pres.indexOf ? pres.indexOf(pre)+1 : ++n}`;
        pre.setAttribute("id", uuid);
      }
      n += 1;

      // header row
      const head = document.createElement("div");
      head.className = "osf-head";

      const a = document.createElement("a");
      a.className = "osf-label";
      a.href = `#${uuid}`;
      a.textContent = `§ ${n}`;
      a.addEventListener("click", (e)=>{
        e.preventDefault();
        history.replaceState(null, "", `#${uuid}`);
        scrollToEl(pre);
      });

      const copy = document.createElement("button");
      copy.className = "osf-copy";
      copy.title = "Copy link";
      copy.innerHTML = "🔗";
      copy.addEventListener("click", ()=>{
        const link = fullUrlWithHash(uuid);
        const snippet = `§${n} — ${link}`;
        copyToClipboard(snippet);
      });

      const more = document.createElement("button");
      more.className = "osf-more";
      more.title = "Discuss…";
      more.innerHTML = "✎"; // small pencil
      more.addEventListener("click", (e)=>{
        e.stopPropagation();
        buildPopover(pre, uuid, n);
      });

      head.appendChild(a);
      head.appendChild(copy);
      head.appendChild(more);

      // insert: [head][pre]
      pre.parentNode.insertBefore(block, pre);
      block.appendChild(head);
      block.appendChild(pre);
    });

    // deep link handling
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) scrollToEl(el);
    }

    // delegate label middle-click open behavior
    document.addEventListener("click", (e)=>{
      const target = e.target;
      if (target.matches(".osf-label")) { /* already handled */ }
    }, {capture:true});
  }

  // ---------- kick ----------
  document.addEventListener("DOMContentLoaded", enhance);
})();
