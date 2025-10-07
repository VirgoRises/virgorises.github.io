/*!
  osf.bundle.js — anchors, § label row, copy, discuss popover
  - Numbers <pre class="osf"> blocks per page and ensures ids (osf-1, osf-2, …)
  - Adds a compact header with §N + icons
  - Copy paragraph link (with optional snippetTemplate)
  - Discuss / Research opens the Research Office with proper params
  - Smooth-scroll + highlight when visiting #osf-N deep links
  - No external dependencies; CSS classes are prefixed osf-*
*/

(function () {
  "use strict";

  // ---------------- config ----------------
  const CFG = Object.assign({
    SCROLL_OFFSET: 80,
    HILITE_MS: 6000,
    squareUrl: "",              // public entry (free)
    discordChannelUrl: "",      // web channel link (optional)
    discordAppUrl: "",          // app deeplink (optional; members only)
    inviteUrl: "",              // Patreon / support (optional)
    snippetTemplate: null       // function(absUrl, n) => string
  }, (window.OSF_CONFIG || {}));

  // -------------- tiny utils --------------
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const on = (el, e, h) => el && el.addEventListener(e, h);

  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch {}
      ta.remove();
      return true;
    }
  };

  const toast = (msg) => {
    let t = document.getElementById('osf-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'osf-toast';
      t.className = 'osf-toast';
      // inline minimal style so it works even without site CSS
      Object.assign(t.style, {
        position: 'fixed', right: '16px', bottom: '14px',
        background: '#0b111a', color: '#e7edf3',
        border: '1px solid rgba(255,255,255,.16)',
        padding: '8px 10px', borderRadius: '10px',
        zIndex: 99999, opacity: '0', transform: 'translateY(8px)',
        transition: 'opacity .15s, transform .15s'
      });
      document.body.appendChild(t);
    }
    t.textContent = msg || 'Done';
    t.style.opacity = '1';
    t.style.transform = 'translateY(0)';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
    }, 1200);
  };

  // compute cafe slug and chapter-relative path from URL
  function getPathParts() {
    // e.g. /cafes/<slug>/notebook/chapter-1-the-basel-problem.html
    const parts = location.pathname.split('/').filter(Boolean);
    const i = parts.indexOf('cafes');
    const slug = i >= 0 ? parts[i + 1] : '';
    const chapterRel = i >= 0 ? parts.slice(i + 2).join('/') : location.pathname.replace(/^\/+/, '');
    return { slug, chapterRel };
  }

  const absParaUrl = (id) => location.origin + location.pathname + '#' + encodeURIComponent(id);
  const snippetFor = (n, id) => {
    const url = absParaUrl(id);
    try {
      if (typeof CFG.snippetTemplate === 'function') {
        return CFG.snippetTemplate(url, n);
      }
    } catch {}
    return url;
  };

  const isMember = () => localStorage.getItem('osf_member') === '1';
  const setMember = (v) => localStorage.setItem('osf_member', v ? '1' : '0');

  // -------------- UI builders --------------
  function makeIconButton(title, svg) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'osf-ic';
    b.title = title;
    b.innerHTML = svg;
    // minimal inline so icons show even if CSS missing
    Object.assign(b.style, {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '22px', height: '22px', borderRadius: '6px',
      border: '1px solid rgba(255,255,255,.08)', background: '#0f141a',
      opacity: '.5', cursor: 'pointer'
    });
    b.addEventListener('mouseenter', () => b.style.opacity = '1');
    b.addEventListener('mouseleave', () => b.style.opacity = '.5');
    return b;
  }

  const ICON = {
    link: `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M3.9 12a4.1 4.1 0 014.1-4.1h3v2h-3a2.1 2.1 0 000 4.2h3v2h-3A4.1 4.1 0 013.9 12zm12-4.1h-3v2h3a2.1 2.1 0 010 4.2h-3v2h3a4.1 4.1 0 000-8.2z"></path><path d="M8 13h8v-2H8v2z"></path></svg>`,
    pen:  `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm18.71-11.04a1.003 1.003 0 000-1.42l-2.5-2.5a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.99-1.66z"/></svg>`
  };

  function addHead(pre, n) {
    // wrap block
    const wrap = document.createElement('div');
    wrap.className = 'osf-block';
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.alignItems = 'flex-start';
    wrap.style.gap = '.45rem';

    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);

    // header row
    const head = document.createElement('div');
    head.className = 'osf-head';
    head.style.display = 'flex';
    head.style.alignItems = 'center';
    head.style.gap = '.6rem';
    head.style.margin = '.45rem 0 .35rem 0';

    const label = document.createElement('div');
    label.className = 'osf-label';
    label.style.fontWeight = '700';
    const a = document.createElement('a');
    a.href = '#' + pre.id;
    a.textContent = `§ ${n}`;
    a.style.color = 'inherit';
    a.style.textDecoration = 'none';
    label.appendChild(a);

    const icons = document.createElement('div'); icons.className = 'osf-icons';
    const btnCopy = makeIconButton('Copy paragraph link', ICON.link);
    const btnMore = makeIconButton('Discuss / research', ICON.pen);
    icons.append(btnCopy, btnMore);
    head.append(label, icons);
    wrap.insertBefore(head, pre);

    on(btnCopy, 'click', async (ev) => {
      ev.preventDefault();
      const ok = await copyText(snippetFor(n, pre.id));
      toast(ok ? 'Copied paragraph link' : 'Copy failed');
    });

    on(btnMore, 'click', (ev) => {
      ev.preventDefault();
      showPopover(pre, n, btnMore);
    });
  }

  // -------------- popover ------------------
  function showPopover(pre, n, anchorBtn) {
    let pop = document.getElementById('osf-pop');
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'osf-pop';
      pop.className = 'osf-pop';
      // minimal inline style (works with or without site CSS)
      Object.assign(pop.style, {
        position: 'absolute', zIndex: 1200, background: '#121720',
        border: '1px solid rgba(255,255,255,.12)', borderRadius: '12px',
        boxShadow: '0 12px 24px rgba(0,0,0,.4)', width: '320px', padding: '10px',
      });
      document.body.appendChild(pop);
    }

    const { slug, chapterRel } = getPathParts();
    const researchUrl =
      `/cafes/${slug}/research_office.html` +
      `?para=${encodeURIComponent(pre.id)}` +
      `&chapter=${encodeURIComponent(chapterRel)}` +
      `&return=${encodeURIComponent(location.pathname + "#" + pre.id)}`;

    const member = isMember();

    // clear + rebuild content
    pop.innerHTML = '';
    const h = document.createElement('h3');
    h.textContent = `Discuss § ${n}`;
    h.style.margin = '0 0 8px 2px';
    h.style.fontSize = '.95rem'; h.style.opacity = '.9';
    pop.appendChild(h);

    const addBtn = (label, handler, show = true) => {
      if (!show) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'osf-btn';
      Object.assign(b.style, {
        display: 'block', width: '100%', textAlign: 'left',
        padding: '9px 10px', margin: '6px 0',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,.12)',
        background: '#0f141a', color: '#e7edf3', cursor: 'pointer'
      });
      b.textContent = label;
      on(b, 'click', handler);
      pop.appendChild(b);
    };

    // main actions
    addBtn('Draft RFC memo', () => {
      copyText(snippetFor(n, pre.id));
      location.href = researchUrl;
    }, true);

    addBtn('Enter The Square (free)', () => {
      if (CFG.squareUrl) window.open(CFG.squareUrl, '_blank', 'noopener');
    }, !!CFG.squareUrl);

    addBtn('Open in Discord app', () => {
      if (CFG.discordAppUrl) {
        copyText(snippetFor(n, pre.id));
        location.href = CFG.discordAppUrl;
      }
    }, member && !!CFG.discordAppUrl);

    addBtn('Copy paragraph link', async () => {
      const ok = await copyText(snippetFor(n, pre.id));
      toast(ok ? 'Copied paragraph link' : 'Copy failed');
    }, true);

    addBtn('Support on Patreon (optional)', () => {
      if (CFG.inviteUrl) window.open(CFG.inviteUrl, '_blank', 'noopener');
    }, !!CFG.inviteUrl);

    addBtn(member ? "I'm a member ✓" : "I'm a member", () => {
      setMember(!member);
      // re-open to refresh visibility
      showPopover(pre, n, anchorBtn);
    }, true);

    const foot = document.createElement('div');
    foot.textContent = 'Open chat for everyone — no payment required.';
    foot.style.fontSize = '.85rem'; foot.style.opacity = '.75'; foot.style.marginTop = '6px';
    pop.appendChild(foot);

    // place near icon
    const r = anchorBtn.getBoundingClientRect();
    let top = window.scrollY + r.bottom + 8;
    let left = window.scrollX + r.left - 12;
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
    pop.style.maxWidth = 'min(92vw, 340px)';
    pop.style.display = 'block';

    const pr = pop.getBoundingClientRect();
    if (pr.right > window.innerWidth - 8) {
      left = window.scrollX + (window.innerWidth - pr.width - 8);
      pop.style.left = `${left}px`;
    }

    // close on outside / Escape
    const closer = (ev) => {
      if (ev.type === 'keydown' && ev.key !== 'Escape') return;
      if (ev.type === 'click' && pop.contains(ev.target)) return;
      pop.style.display = 'none';
      document.removeEventListener('click', closer, true);
      document.removeEventListener('keydown', closer, true);
    };
    setTimeout(() => {
      document.addEventListener('click', closer, true);
      document.addEventListener('keydown', closer, true);
    }, 0);
  }

  // -------------- build anchors -------------
  function build() {
    const pres = $$('pre.osf');
    let n = 0;
    pres.forEach((pre) => {
      // ignore empty paragraphs
      if (!pre.textContent || !pre.textContent.trim()) return;
      n += 1;
      if (!pre.id) pre.id = `osf-${n}`;
      addHead(pre, n);
    });
  }

  // -------------- deep link behavior --------
  function byHash() {
    const raw = location.hash || '';
    if (!raw) return;
    const id = decodeURIComponent(raw.slice(1));
    const el = document.getElementById(id);
    if (!el) return;

    const y = el.getBoundingClientRect().top + window.scrollY - (CFG.SCROLL_OFFSET || 0);
    window.scrollTo({ top: y, behavior: 'smooth' });

    // highlight
    el.classList.add('osf-active');
    clearTimeout(byHash._t);
    byHash._t = setTimeout(() => el.classList.remove('osf-active'), CFG.HILITE_MS || 6000);
  }

  // -------------- boot ----------------------
  document.addEventListener('DOMContentLoaded', () => {
    build();
    byHash();
  });
  window.addEventListener('hashchange', byHash);

})();
