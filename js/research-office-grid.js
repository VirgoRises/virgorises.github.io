// Research Office — grid overlay (thumb) that treats the memo as the single source of truth.
(function () {

  // Regex for tokens: [mm|pNN= x,y ] and [mm|pNN= x,y : x2,y2 ]
  const MM_RE = /\[mm\|p(\d+)=([0-9.]+),([0-9.]+)(?::([0-9.]+),([0-9.]+))?\]/gi;

  // Public hook the memo can call when its text changes.
  window.roRefreshFromMemo = function roRefreshFromMemo() {
    if (typeof window.__ro_grid_refresh === 'function') window.__ro_grid_refresh();
  };

  window.initResearchOfficeGrid = function initResearchOfficeGrid(opts) {
    const state = {
      fromPage: opts.fromPage || 1,
      pageMM:   opts.pageMM   || { w: 210, h: 297 },   // A4 default
      thumbsBase: opts.thumbsBase || '',
      zoom: 1,
      pagePx: { w: 0, h: 0 },
      tool: 'point',
    };

    // --- Elements
    const stage = document.getElementById('ro-stage');
    const inner = document.getElementById('ro-inner');
    const img   = document.getElementById('ro-page');
    const svg   = document.getElementById('ro-svg');

    const btnPoint   = document.getElementById('toolPoint');
    const btnBox     = document.getElementById('toolBox');
    const btnZoomOut = document.getElementById('zoomOut');
    const btnZoomFit = document.getElementById('zoomFit');
    const btnZoomIn  = document.getElementById('zoomIn');
    const unitsSel   = document.getElementById('unitsSel');
    const tokenOut   = document.getElementById('token');
    const exportBtn  = document.getElementById('exportJson');

    // Robust memo textarea (source of truth)
    const memoEl =
      document.getElementById('memo') ||
      document.getElementById('memoText') ||
      document.querySelector('.ro-memo textarea') ||
      document.querySelector('textarea[name="memo"]') ||
      document.querySelector('textarea');

    // Helpers
    const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
    const fmt = v => (Math.round(v*10)/10).toFixed(1);

    function g(tag, attrs) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
      return el;
    }
    function mm2x(mm) { return mm * (state.pagePx.w / state.pageMM.w); }
    function mm2y(mm) { return mm * (state.pagePx.h / state.pageMM.h); }

    function clearSVG() { while (svg.firstChild) svg.removeChild(svg.firstChild); }

    function drawGrid() {
      const W = state.pagePx.w, H = state.pagePx.h;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('width',  W);
      svg.setAttribute('height', H);
      clearSVG();

      const light = '#5d6a7a33';
      const strong= '#8aa4c255';
      for (let mm=0; mm<=state.pageMM.w; mm+=1) {
        const x = mm2x(mm);
        svg.appendChild(g('line',{x1:x,y1:0,x2:x,y2:H,stroke:(mm%10)?light:strong,'stroke-width':(mm%10)?1:1.25}));
        if (mm%10===0) svg.appendChild(g('text',{x:x+3,y:12,fill:'#9fb2c9','font-size':11,'font-family':'ui-monospace,monospace'})).textContent = mm;
      }
      for (let mm=0; mm<=state.pageMM.h; mm+=1) {
        const y = mm2y(mm);
        svg.appendChild(g('line',{x1:0,y1:y,x2:W,y2:y,stroke:(mm%10)?light:strong,'stroke-width':(mm%10)?1:1.25}));
        if (mm%10===0) svg.appendChild(g('text',{x:3,y:y-3,fill:'#9fb2c9','font-size':11,'font-family':'ui-monospace,monospace'})).textContent = mm;
      }
    }

    // Parse memo -> markers for THIS page only
    function parseMemo() {
      const list = [];
      if (!memoEl) return list;
      const text = memoEl.value || '';
      MM_RE.lastIndex = 0;
      let m;
      while ((m = MM_RE.exec(text))) {
        const p  = Number(m[1]||0);
        if (p !== Number(state.fromPage)) continue;
        const x1 = Number(m[2]), y1 = Number(m[3]);
        const x2 = m[4] ? Number(m[4]) : null;
        const y2 = m[5] ? Number(m[5]) : null;
        list.push(x2==null ? {t:'p', mm:[x1,y1]} : {t:'b', mm:[x1,y1,x2,y2]});
      }
      return list;
    }

    // Re-render markers from memo (single source of truth)
    function renderMarkersFromMemo() {
      // Strip old .mark nodes
      [...svg.querySelectorAll('.mark')].forEach(n=>n.remove());
      const marks = parseMemo();
      for (const m of marks) {
        if (m.t==='p') {
          const [x,y] = m.mm;
          svg.appendChild(g('circle',{cx:mm2x(x), cy:mm2y(y), r:4, fill:'#f5c84b', opacity:.95, class:'mark'}));
        } else {
          const [x1,y1,x2,y2] = m.mm;
          const x=mm2x(x1), y=mm2y(y1), w=mm2x(x2)-mm2x(x1), h=mm2y(y2)-mm2y(y1);
          svg.appendChild(g('rect',{x,y,width:w,height:h,fill:'#f5c84b55',stroke:'#f5c84b','stroke-width':1.5, class:'mark'}));
        }
      }
    }

    // Memo → grid sync on each input
    if (memoEl) memoEl.addEventListener('input', renderMarkersFromMemo);
    // Allow external trigger: window.roRefreshFromMemo()
    window.__ro_grid_refresh = renderMarkersFromMemo;

    // Emit token helpers
    function insertIntoMemo(snippet) {
      if (typeof window.insertMemoMarkup === 'function') {
        window.insertMemoMarkup(snippet);
      } else if (memoEl) {
        const s = memoEl.selectionStart ?? memoEl.value.length;
        const e = memoEl.selectionEnd   ?? memoEl.value.length;
        memoEl.value = memoEl.value.slice(0, s) + snippet + '\n' + memoEl.value.slice(e);
        const pos = s + snippet.length + 1;
        memoEl.setSelectionRange(pos,pos);
        memoEl.dispatchEvent(new Event('input',{bubbles:true}));
      }
    }

    // Click handling
    function clientToMM(e) {
      const r = svg.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top)  / r.height;
      return [ nx * state.pageMM.w, ny * state.pageMM.h ];
    }
    const tokenPoint = ([x,y]) => `[mm|p${state.fromPage}=${fmt(x)},${fmt(y)}]`;
    const tokenBox   = (a,b) => {
      const mm = [ Math.min(a[0],b[0]), Math.min(a[1],b[1]), Math.max(a[0],b[0]), Math.max(a[1],b[1]) ];
      return `[mm|p${state.fromPage}=${fmt(mm[0])},${fmt(mm[1])}:${fmt(mm[2])},${fmt(mm[3])}]`;
    };

    let dragA = null;
    svg.addEventListener('mousedown', (e)=>{
      const mm = clientToMM(e);
      if (state.tool==='point') {
        insertIntoMemo(tokenPoint(mm));
      } else {
        dragA = mm;
      }
    });
    window.addEventListener('mouseup', (e)=>{
      if (state.tool==='box' && dragA) {
        insertIntoMemo(tokenBox(dragA, clientToMM(e)));
      }
      dragA = null;
    });

    // Toolbar
    btnPoint   && btnPoint.addEventListener('click', ()=> state.tool='point');
    btnBox     && btnBox  .addEventListener('click', ()=> state.tool='box');
    btnZoomOut && btnZoomOut.addEventListener('click', ()=> { state.zoom = clamp(state.zoom*0.9, 0.25, 8); inner.style.transform=`scale(${state.zoom})`; recompute(); });
    btnZoomIn  && btnZoomIn .addEventListener('click', ()=> { state.zoom = clamp(state.zoom*1.1, 0.25, 8); inner.style.transform=`scale(${state.zoom})`; recompute(); });
    btnZoomFit && btnZoomFit.addEventListener('click', ()=> { doZoomFit(); });

    exportBtn && exportBtn.addEventListener('click', ()=>{
      // export just copies the tokens for this page from the memo
      const tokens = (memoEl?.value.match(new RegExp(`\\[mm\\|p${state.fromPage}=[^\\]]+\\]`,'g')))||[];
      const blob = new Blob([tokens.join('\n')+'\n'], {type:'text/plain'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `markers-p${state.fromPage}.txt`; a.click();
      URL.revokeObjectURL(a.href);
    });

    function recompute() {
      const W = img.clientWidth, H = img.clientHeight;
      state.pagePx = { w: W, h: H };
      drawGrid();
      renderMarkersFromMemo();
    }

    function doZoomFit() {
      // fit width of inner (page) into the stage
      const vis = stage.clientWidth - 16;
      const w  = img.naturalWidth;
      if (w) {
        state.zoom = clamp(vis / w, 0.25, 8);
        inner.style.transform = `scale(${state.zoom})`;
        stage.scrollLeft = 0; stage.scrollTop = 0;
        recompute();
      }
    }

    // Load correct thumbnail; switch to landscape pageMM if needed
    function setThumb() {
      const n = String(state.fromPage).padStart(3,'0');
      img.src = `${opts.thumbsBase || ''}/page-${n}.jpg`;
    }

    img.addEventListener('load', ()=>{
      const landscape = img.naturalWidth > img.naturalHeight;
      state.pageMM = landscape ? { w: 297, h: 210 } : { w: 210, h: 297 };
      // base scale = 1 with natural size
      img.style.width = `${img.naturalWidth}px`;
      inner.style.transform = `scale(1)`;
      state.zoom = 1;
      doZoomFit();
    });

    setThumb();
    // Expose a refresh for memo→grid sync
    window.__ro_grid_refresh = renderMarkersFromMemo;
  };
})();
