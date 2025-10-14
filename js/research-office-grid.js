(function () {
  window.initResearchOfficeGrid = function initResearchOfficeGrid(opts) {
    const state = {
      fromPage: opts.fromPage || 1,
      units: opts.units || 'mm',
      thumbsBase: opts.thumbsBase || '',
      pageMM: opts.pageMM || { w: 210, h: 297 }, // default A4 portrait
      zoom: 1,
      pagePx: { w: 0, h: 0 },
      mmPerPx: { x: 1, y: 1 },
      tool: 'point',
      markers: [],
    };

    // --- DOM
    const stage     = document.getElementById('ro-stage');
    const inner     = document.getElementById('ro-inner');
    const img       = document.getElementById('ro-page');
    const svg       = document.getElementById('ro-svg');

    const btnPoint  = document.getElementById('toolPoint');
    const btnBox    = document.getElementById('toolBox');
    const btnZoomOut= document.getElementById('zoomOut');
    const btnZoomFit= document.getElementById('zoomFit');
    const btnZoomIn = document.getElementById('zoomIn');
    const unitsSel  = document.getElementById('unitsSel');
    const tokenOut  = document.getElementById('token');
    const exportBtn = document.getElementById('exportJson');

    // ---- helpers
    const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
    const fmt = v => (Math.round(v*10)/10).toFixed(1);

    function recomputeScale() {
      const wPx = img.clientWidth;
      const hPx = img.clientHeight;
      state.pagePx = { w: wPx, h: hPx };
      state.mmPerPx.x = state.pageMM.w / wPx;
      state.mmPerPx.y = state.pageMM.h / hPx;
      drawGrid();
      redrawMarkers();
    }

    function drawGrid() {
      const W = state.pagePx.w, H = state.pagePx.h;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('width',  W);
      svg.setAttribute('height', H);
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const g = (tag, attrs) => {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k, v));
        return el;
      };

      const light = '#5d6a7a33';
      const strong= '#8aa4c255';

      const mmToPxX = mm => mm * (state.pagePx.w / state.pageMM.w);
      const mmToPxY = mm => mm * (state.pagePx.h / state.pageMM.h);

      for (let mm=0; mm<=state.pageMM.w; mm+=1) {
        const x = mmToPxX(mm);
        svg.appendChild(g('line',{x1:x,y1:0,x2:x,y2:H,stroke: (mm%10)?light:strong, 'stroke-width': (mm%10)?1:1.25}));
        if (mm%10===0) {
          const t = g('text', {x:x+3, y:12, fill:'#9fb2c9', 'font-size': 11, 'font-family':'ui-monospace,monospace'});
          t.textContent = mm;
          svg.appendChild(t);
        }
      }
      for (let mm=0; mm<=state.pageMM.h; mm+=1) {
        const y = mmToPxY(mm);
        svg.appendChild(g('line',{x1:0,y1:y,x2:W,y2:y,stroke: (mm%10)?light:strong, 'stroke-width': (mm%10)?1:1.25}));
        if (mm%10===0) {
          const t = g('text', {x:3, y:y-3, fill:'#9fb2c9', 'font-size': 11, 'font-family':'ui-monospace,monospace'});
          t.textContent = mm;
          svg.appendChild(t);
        }
      }
    }

    // zoom: scale the wrapper so image & SVG stay glued
    function applyZoom() {
      inner.style.transform = `scale(${state.zoom})`;
      recomputeScale();
    }
    function doZoomFit() {
      const visW = stage.clientWidth - 16; // padding/scrollbar fudge
      const currentDisplayed = img.clientWidth * state.zoom;
      if (currentDisplayed > 0) {
        const fitScale = clamp(visW / currentDisplayed, 0.1, 6);
        state.zoom *= fitScale;
        applyZoom();
        stage.scrollLeft = 0; stage.scrollTop = 0;
      }
    }
    function zoomDelta(d) {
      state.zoom = clamp(state.zoom * (d>0?1.1:0.9), 0.25, 8);
      applyZoom();
    }

    // coordinate helpers
    function clientToMM(e) {
      const r = svg.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top)  / r.height;
      const mmx = nx * state.pageMM.w;
      const mmy = ny * state.pageMM.h;
      return [mmx, mmy];
    }

    // markers
    function pushPoint(mm) {
      state.markers.push({t:'p', mm});
      tokenOut.textContent = `[mm|p${state.fromPage}=${fmt(mm[0])},${fmt(mm[1])}]`;
      redrawMarkers();
    }
    function pushBox(a, b) {
      const mm = [Math.min(a[0],b[0]), Math.min(a[1],b[1]), Math.max(a[0],b[0]), Math.max(a[1],b[1])];
      state.markers.push({t:'b', mm});
      tokenOut.textContent = `[mm|p${state.fromPage}=${fmt(mm[0])},${fmt(mm[1])}:${fmt(mm[2])},${fmt(mm[3])}]`;
      redrawMarkers();
    }
    function redrawMarkers() {
      [...svg.querySelectorAll('.mark')].forEach(n=>n.remove());
      const g = (tag, attrs) => {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k, v));
        el.classList.add('mark'); return el;
      };
      const mmX = mm => mm * (state.pagePx.w / state.pageMM.w);
      const mmY = mm => mm * (state.pagePx.h / state.pageMM.h);

      state.markers.forEach(m=>{
        if (m.t==='p') {
          const [xmm, ymm] = m.mm;
          svg.appendChild(g('circle', {cx:mmX(xmm), cy:mmY(ymm), r:4, fill:'#f5c84b', opacity:.9}));
        } else {
          const [x1,y1,x2,y2] = m.mm;
          const x=mmX(x1), y=mmY(y1), w=mmX(x2)-mmX(x1), h=mmY(y2)-mmY(y1);
          svg.appendChild(g('rect', {x,y,width:w,height:h,fill:'#f5c84b55', stroke:'#f5c84b'}));
        }
      });
    }

    // tool interactions
    let dragA=null;
    svg.addEventListener('mousedown', (e)=>{
      const mm = clientToMM(e);
      if (state.tool==='point') pushPoint(mm);
      else dragA = mm;
    });
    window.addEventListener('mouseup', (e)=>{
      if (state.tool==='box' && dragA) pushBox(dragA, clientToMM(e));
      dragA=null;
    });

    // toolbar wiring
    btnPoint .addEventListener('click', ()=>{ state.tool='point'; });
    btnBox   .addEventListener('click', ()=>{ state.tool='box';   });
    btnZoomFit.addEventListener('click', ()=> doZoomFit());
    btnZoomOut.addEventListener('click', ()=> zoomDelta(-1));
    btnZoomIn .addEventListener('click', ()=> zoomDelta(+1));
    unitsSel  .addEventListener('change', ()=>{ /* reserved for future UI */ });
    exportBtn .addEventListener('click', ()=>{
      const data = state.markers.map(m=>m.t==='p'
        ? `[mm|p${state.fromPage}=${fmt(m.mm[0])},${fmt(m.mm[1])}]`
        : `[mm|p${state.fromPage}=${fmt(m.mm[0])},${fmt(m.mm[1])}:${fmt(m.mm[2])},${fmt(m.mm[3])}]`
      ).join('\n');
      navigator.clipboard.writeText(data).catch(()=>{});
      tokenOut.textContent = 'copied markers to clipboard';
    });

    // load thumbnail and size everything
    function setThumbSrc() {
      const n = String(state.fromPage).padStart(3,'0');
      img.src = `${state.thumbsBase}/page-${n}.jpg`;
    }
    img.addEventListener('load', ()=>{
      const portrait = img.naturalHeight >= img.naturalWidth;
      if (!portrait) state.pageMM = { w: 297, h: 210 }; // landscape
      img.style.width = `${img.naturalWidth}px`;
      state.zoom = 1;
      applyZoom();
      doZoomFit();
    });

    setThumbSrc();
  };
})();
