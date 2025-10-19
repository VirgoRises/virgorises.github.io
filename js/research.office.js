// /js/research.office.js — drop-in (fix: resolve chapter/manifest under /cafes/<slug>/)
(function () {
  const $ = (s, d=document)=>d.querySelector(s);
  const $$ = (s, d=document)=>Array.from(d.querySelectorAll(s));
  const on = (el, ev, fn, o)=>el&&el.addEventListener(ev, fn, o);
  const pad3 = n=>String(n).padStart(3,'0');
  const sleep = ms=>new Promise(r=>setTimeout(r,ms));
  const loadScript = (src)=>new Promise((res,rej)=>{
    const s=document.createElement('script'); s.src=src; s.async=true;
    s.onload=()=>res(); s.onerror=()=>rej(new Error('load failed:'+src));
    document.head.appendChild(s);
  });

  // exact IDs present in research_office.html
  const els = {
    stageImg: $('#ro-page'),
    paraPreview: $('#paraPreview'),
    paraNum: $('#paraNum'),
    memoTA: $('#memoBody'),
    memoPreview: $('#memoPreview'),
    btnPreview: $('#btnPreview'),
  };

  // status line under the left grid card
  const statusLine = (() => {
    const slot = document.createElement('div');
    slot.className='tiny muted';
    slot.style.fontSize='11px';
    const host = $('.col.left .card');
    if (host) host.appendChild(slot);
    return msg=>{ slot.textContent = msg; };
  })();

  // -------- URL & cafe paths
  const qs = new URLSearchParams(location.search);
  const chapterPath = qs.get('chapter') || '';              // e.g. notebook/chapter-1-....html
  const paraId = qs.get('para') || '';
  const cafeSlug = (location.pathname.match(/\/cafes\/([^/]+)/)?.[1]) || 'zeta-zero-cafe';
  const cafeBase = `/cafes/${cafeSlug}/`;                   // << base for all fetches under this cafe

  // -------- preview deps
  async function ensureMarked(){
    if (window.marked) return;
    try { await loadScript('/js/vendor/marked.min.js'); }
    catch { await loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js'); }
  }
  async function ensureMathJax(){
    if (window.MathJax?.typesetPromise) return;
    await loadScript('https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js');
    await sleep(30);
  }

  // -------- thumbs
  const thumbURL = pg => `${cafeBase}sources/thumbs/page-${pad3(pg)}.jpg`;

  // simple strip in the “Pages referenced in memo” card (primary + optional others)
  let mmStrip = $('#mmThumbs');
  if (!mmStrip) {
    const card = $$(".ro-main .card").find(c => /Pages referenced in memo/i.test(c.textContent));
    if (card) {
      mmStrip = document.createElement('div');
      mmStrip.id = 'mmThumbs';
      mmStrip.style.display='flex';
      mmStrip.style.flexWrap='wrap';
      mmStrip.style.gap='12px';
      mmStrip.style.marginTop='8px';
      card.appendChild(mmStrip);
    }
  }
  function makeChip(pg, isPrimary){
    const wrap = document.createElement('div');
    wrap.style.width='96px'; wrap.style.borderRadius='10px';
    wrap.style.padding='6px'; wrap.style.cursor='pointer';
    wrap.style.boxShadow = isPrimary ? '0 0 0 3px rgba(255,191,0,1)' : '0 0 0 1px rgba(255,255,255,.2)';
    const img = document.createElement('img');
    img.src = thumbURL(pg); img.alt='p.'+pg; img.style.width='100%'; img.loading='lazy';
    const tag = document.createElement('div');
    tag.textContent='p.'+pg; tag.className='mono'; tag.style.textAlign='center'; tag.style.fontSize='12px'; tag.style.marginTop='4px';
    wrap.appendChild(img); wrap.appendChild(tag);
    on(wrap,'click',()=>setActivePage(pg));
    return wrap;
  }
  function renderPrimaryChip(pg){
    if (!mmStrip) return;
    mmStrip.innerHTML='';
    mmStrip.appendChild(makeChip(pg, true));
  }
  function highlightPrimary(isOn){
    if (!mmStrip?.firstElementChild) return;
    mmStrip.firstElementChild.style.boxShadow = isOn ? '0 0 0 3px rgba(255,191,0,1)' : '0 0 0 1px rgba(255,255,255,.2)';
  }

  // -------- resolver (HTML → manifest → starts → default)
  const once = fn=>{ let done,p; return ()=> (done? p : (done=true, p=Promise.resolve().then(fn))); };
  const resolveOnce = once(async ()=>{
    statusLine('Resolving page…');

    // (a) probe chapter HTML (under cafe)
    if (chapterPath && paraId){
      try{
        const html = await (await fetch(cafeBase + chapterPath)).text();
        const dom = new DOMParser().parseFromString(html,'text/html');
        const pre = dom.querySelector(`pre#${CSS.escape(paraId)}.osf`);
        const pg = Number(pre?.dataset.page);
        if (Number.isFinite(pg) && pg>0){ statusLine(`Start page resolved from HTML: p.${pg}`); return pg; }
      }catch{/* ignore */}
    }

    // (b) manifest (exact hit), then starts table (both under cafe)
    try{
      const man = await (await fetch(cafeBase + chapterPath + '.manifest.json')).json();
      const hit = (man?.paras||[]).find(x=>x.id===paraId && Number.isFinite(x.page));
      if (hit){ statusLine(`Start page resolved from manifest: p.${hit.page}`); return hit.page; }
      const start = Number(man?.starts?.[chapterPath]);
      if (Number.isFinite(start)){ statusLine(`Start page from chapter start: p.${start}`); return start; }
    }catch{/* ignore */}

    statusLine('Start page defaulted to p.1');
    return 1;
  });

  // -------- viewer / active
  let primaryPage=null, activePage=null;
  async function setActivePage(pg){
    activePage = pg;
    if (els.stageImg){
      els.stageImg.src = thumbURL(pg);
      els.stageImg.dataset.page = String(pg);
    }
    highlightPrimary(pg===primaryPage);
    statusLine(`Ready • active p.${pg}`);
  }

  // -------- memo ↔ strip (only pages list; primary never tokenised)
  const reToken = /\[mm\|p(\d+)=/gi;
  function syncStripFromMemo(){
    if (!mmStrip || !els.memoTA) return;
    const txt = els.memoTA.value;
    const pages = new Set(); let m;
    while ((m=reToken.exec(txt))) {
      const p = Number(m[1]);
      if (Number.isFinite(p) && p!==primaryPage) pages.add(p);
    }
    const primaryChip = mmStrip.firstElementChild;
    mmStrip.innerHTML=''; if (primaryChip) mmStrip.appendChild(primaryChip);
    [...pages].sort((a,b)=>a-b).forEach(p=> mmStrip.appendChild(makeChip(p,false)));
  }

  // -------- preview
  async function doPreview(){
    if (!els.memoTA || !els.memoPreview) return;
    await ensureMarked();
    els.memoPreview.innerHTML = window.marked.parse(els.memoTA.value||'');
    els.memoPreview.hidden=false;
    try{ await ensureMathJax(); await window.MathJax.typesetPromise([els.memoPreview]); }catch{}
  }

  // block marker emission until resolved
  window.__ro_ReadyForMarkers = false;

  (async function boot(){
    const pg = await resolveOnce();        // ← now resolves using /cafes/<slug>/...
    primaryPage = pg;

    renderPrimaryChip(primaryPage);
    await setActivePage(primaryPage);

    await sleep(0);
    window.__ro_ReadyForMarkers = true;

    on(els.memoTA,'input',syncStripFromMemo);
    on(els.btnPreview,'click',doPreview);
    if (els.paraNum && paraId) els.paraNum.textContent = '#'+paraId;

    statusLine(`Ready • primary p.${primaryPage}`);
  })();
})();
