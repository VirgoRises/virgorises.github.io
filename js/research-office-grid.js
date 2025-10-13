/* research-office-grid.js
   Overlay grid + rulers + crosshair + memo-driven markers
   — labels every cm; 3mm font for ruler labels
   — clears layers on redraw (no stacking)
   — point/box tools insert memo markup: [mm|pN:x,y] or [mm|pN:x1,y1:x2,y2]
   — export JSON reads from memo for the current page only
*/
(function () {
  // ------------- tiny utils -------------
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const create = (ns, tag) => document.createElementNS(ns, tag);
  const SVGNS = 'http://www.w3.org/2000/svg';

  // ------------- state -------------
  const S = {
    stage: null,          // #ro-stage
    page: null,           // #ro-page (IMG or CANVAS)
    svg: null,            // overlay SVG
    gridLayer: null,      // <g id="grid-layer">
    markLayer: null,      // <g id="mark-layer">
    crossLayer: null,     // <g id="crosshair-layer">
    hud: null,            // HUD text element for x,y
    mmW: 0, mmH: 0,       // physical page size in mm (viewBox units)
    unitsSel: null,       // <select> (mm|cm)
    tool: 'point',        // 'point' | 'box'
    drag: null,           // for box tool: {start:{mmx,mmy}, ghost: <rect>}
    memo: null,           // textarea for memo
  };

  // --------- boot / find toolbar controls ----------
  function hookToolbar() {
    // Units selector: use the first <select> in the toolbar row
    S.unitsSel = S.unitsSel || $('#ro-main select, .row select, .toolbar select');
    if (!S.unitsSel) {
      // create a units select if missing (mm default)
      const wrap = S.stage.closest('.card, .row, body') || document.body;
      const bar = wrap.querySelector('.toolbar') || wrap.querySelector('.row') || wrap;
      const sel = document.createElement('select'); sel.innerHTML = `<option>mm</option><option>cm</option>`;
      sel.style.marginLeft = '8px';
      bar.appendChild(sel);
      S.unitsSel = sel;
    }

    // Tool buttons by label
    const btn = label => $(`button:contains("${label}")`) || $$('button').find(b => b.textContent.trim() === label);

    const bPoint = $$('button').find(b => b.textContent.trim().toLowerCase() === 'point');
    const bBox   = $$('button').find(b => b.textContent.trim().toLowerCase() === 'box');
    const bFit   = $$('button').find(b => b.textContent.trim().toLowerCase() === 'fit');
    const bZoomMinus = $$('button').find(b => b.textContent.trim() === '−' || b.textContent.trim() === '-');
    const bZoomPlus  = $$('button').find(b => b.textContent.trim() === '+');
    const bExport = $$('button').find(b => /export\s*json/i.test(b.textContent));

    if (bPoint) bPoint.addEventListener('click', () => S.tool = 'point');
    if (bBox)   bBox.addEventListener('click',   () => S.tool = 'box');
    if (bFit)   bFit.addEventListener('click',   fitToStage);
    if (bZoomMinus) bZoomMinus.addEventListener('click', () => zoomBy(0.9));
    if (bZoomPlus)  bZoomPlus.addEventListener('click',  () => zoomBy(1.1));
    if (bExport)    bExport.addEventListener('click',    exportJSON);

    if (S.unitsSel) S.unitsSel.addEventListener('change', redrawAll);

    // Memo textarea (Markdown + LaTeX)
    S.memo = $('#memo') || $('textarea[name="memo"]') || $('.memo textarea') || $('textarea');
    if (S.memo) S.memo.addEventListener('input', renderMarkersFromMemo);
  }

  // ------------- set up overlay -------------
  function ensureOverlay() {
    if (S.svg) return;
    const svg = create(SVGNS, 'svg');
    svg.id = 'ro-overlay';
    svg.style.position = 'absolute';
    svg.style.left = '0'; svg.style.top = '0';
    svg.style.width = '100%'; svg.style.height = '100%';
    svg.style.pointerEvents = 'none'; // tools enable selectively

    const grid = create(SVGNS, 'g'); grid.id = 'grid-layer';
    const mark = create(SVGNS, 'g'); mark.id = 'mark-layer';
    const cross = create(SVGNS, 'g'); cross.id = 'crosshair-layer';

    svg.appendChild(grid);
    svg.appendChild(mark);
    svg.appendChild(cross);

    // HUD
    const hud = document.createElement('div');
    hud.id = 'ro-hud';
    hud.style.position='absolute';
    hud.style.left='8px';
    hud.style.bottom='6px';
    hud.style.font='12px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
    hud.style.color='var(--muted, #9aa4b2)';
    hud.textContent='x=— y=—';

    S.stage.style.position = 'relative';
    S.stage.appendChild(svg);
    S.stage.appendChild(hud);

    S.svg = svg; S.gridLayer = grid; S.markLayer = mark; S.crossLayer = cross; S.hud = hud;

    // pointer handling (enable only when needed)
    svg.style.pointerEvents = 'auto';
    svg.addEventListener('mousemove', onMove);
    svg.addEventListener('mouseleave', () => updateHUD(null));
    svg.addEventListener('click', onClick);
    svg.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
  }

  // ------------- page metrics -------------
  function pxPerMM() {
    // 96 dpi → 3.7795 px/mm (browser CSS pixel)
    return 3.7795275591;
  }

  function refreshMetrics() {
    // Prefer physical mm from data attributes if present (set by your PDF renderer)
    const mmw = Number(S.page?.dataset?.pageMmW) || 0;
    const mmh = Number(S.page?.dataset?.pageMmH) || 0;

    if (mmw > 0 && mmh > 0) {
      S.mmW = mmw; S.mmH = mmh;
    } else {
      // Fallback from CSS pixels
      const rect = S.page.getBoundingClientRect();
      const mmx = rect.width  / pxPerMM();
      const mmy = rect.height / pxPerMM();
      S.mmW = Math.max(10, Math.round(mmx));
      S.mmH = Math.max(10, Math.round(mmy));
    }
    if (S.svg) S.svg.setAttribute('viewBox', `0 0 ${S.mmW} ${S.mmH}`);
  }

  // ------------- grid + rulers (3mm font, labels each cm) -------------
  function drawGridAndRulers() {
    if (!S.svg) return;
    S.gridLayer.innerHTML = '';

    const W = S.mmW, H = S.mmH;
    const mmStep = 1;
    const mid = 5, major = 10;

    const mkLine = (x1,y1,x2,y2, cls) => {
      const l = create(SVGNS,'line');
      l.setAttribute('x1',x1); l.setAttribute('y1',y1);
      l.setAttribute('x2',x2); l.setAttribute('y2',y2);
      l.setAttribute('class', cls);
      S.gridLayer.appendChild(l);
    };
    const mkText = (x,y,txt) => {
      const t = create(SVGNS,'text');
      t.setAttribute('x',x); t.setAttribute('y',y);
      t.setAttribute('class','ruler-label');
      t.setAttribute('font-size','3'); // 3mm
      t.textContent = txt;
      S.gridLayer.appendChild(t);
    };

    // verticals
    for (let x=0; x<=W; x+=mmStep) {
      const mod10 = (x % major) === 0, mod5 = (x % mid) === 0;
      mkLine(x, 0, x, H, mod10 ? 'grid major' : mod5 ? 'grid mid' : 'grid minor');
      if (mod10) mkText(x+1.5, 4, String(x));
    }
    // horizontals
    for (let y=0; y<=H; y+=mmStep) {
      const mod10 = (y % major) === 0, mod5 = (y % mid) === 0;
      mkLine(0, y, W, y, mod10 ? 'grid major' : mod5 ? 'grid mid' : 'grid minor');
      if (mod10) mkText(1.5, y-1, String(y));
    }
  }

  // ------------- crosshair + HUD -------------
  function ensureCrosshair() {
    S.crossLayer.innerHTML = '';
    const vx = create(SVGNS,'line'); vx.setAttribute('class','cross');
    const vy = create(SVGNS,'line'); vy.setAttribute('class','cross');
    S.crossLayer.appendChild(vx); S.crossLayer.appendChild(vy);
  }

  function updateCrosshair(p) {
    const [vx, vy] = S.crossLayer.children;
    if (!p) { vx.setAttribute('opacity','0'); vy.setAttribute('opacity','0'); return; }
    vx.setAttribute('opacity','1'); vy.setAttribute('opacity','1');
    vx.setAttribute('x1',0);  vx.setAttribute('y1',p.y);
    vx.setAttribute('x2',S.mmW); vx.setAttribute('y2',p.y);
    vy.setAttribute('x1',p.x); vy.setAttribute('y1',0);
    vy.setAttribute('x2',p.x); vy.setAttribute('y2',S.mmH);
  }

  function updateHUD(p) {
    if (!S.hud) return;
    if (!p) { S.hud.textContent = 'x=— y=—'; return; }
    const unit = (S.unitsSel?.value || 'mm');
    const f = v => unit === 'cm' ? (v/10).toFixed(1) : v.toFixed(1);
    S.hud.textContent = `x=${f(p.x)}${unit}  y=${f(p.y)}${unit}`;
  }

  // ------------- pointer helpers -------------
  function clientToMM(evt) {
    const r = S.svg.getBoundingClientRect();
    const px = Math.max(0, Math.min(r.width,  evt.clientX - r.left));
    const py = Math.max(0, Math.min(r.height, evt.clientY - r.top));
    const mmx = px / r.width  * S.mmW;
    const mmy = py / r.height * S.mmH;
    // snap to mm always; tokens will respect unit on write
    return { x: Math.round(mmx), y: Math.round(mmy) };
  }

  function onMove(e) {
    const p = clientToMM(e);
    updateCrosshair(p);
    updateHUD(p);
    if (S.drag && S.tool === 'box') {
      const {start, ghost} = S.drag;
      const x = Math.min(start.mmx, p.x), y = Math.min(start.mmy, p.y);
      const w = Math.abs(start.mmx - p.x), h = Math.abs(start.mmy - p.y);
      ghost.setAttribute('x',x); ghost.setAttribute('y',y);
      ghost.setAttribute('width',w); ghost.setAttribute('height',h);
    }
  }

  function onClick(e) {
    if (S.tool !== 'point') return;
    const p = clientToMM(e);
    insertTokenPoint(p.x, p.y);
  }

  function onDown(e) {
    if (S.tool !== 'box') return;
    const p = clientToMM(e);
    const rect = create(SVGNS,'rect');
    rect.setAttribute('class','marker ghost');
    rect.setAttribute('x',p.x); rect.setAttribute('y',p.y);
    rect.setAttribute('width',0); rect.setAttribute('height',0);
    S.markLayer.appendChild(rect);
    S.drag = { start:{mmx:p.x,mmy:p.y}, ghost:rect };
  }

  function onUp(e) {
    if (!S.drag) return;
    const p = clientToMM(e);
    const {start, ghost} = S.drag;
    S.drag = null;
    // commit box
    const x1 = start.mmx, y1 = start.mmy, x2 = p.x, y2 = p.y;
    ghost.remove();
    insertTokenBox(x1,y1,x2,y2);
  }

  // ------------- memo tokens -------------
  function pageFromQuery() {
    const q = new URLSearchParams(location.search);
    const n = Number(q.get('from') || q.get('page') || '0');
    return Math.max(1, n);
  }

  function currentUnitLabel() { return (S.unitsSel?.value || 'mm'); }
  function fmtUnit(v) {
    return currentUnitLabel() === 'cm' ? +(v/10).toFixed(1) : +v.toFixed(1);
  }

  function insertAtCaret(txt) {
    if (!S.memo) return;
    const t=S.memo, s=t.selectionStart??t.value.length, e=t.selectionEnd??t.value.length;
    const before=t.value.slice(0,s), after=t.value.slice(e);
    t.value = before + txt + after;
    const pos = (before + txt).length;
    t.setSelectionRange(pos,pos);
    t.focus();
    t.dispatchEvent(new Event('input')); // keep autosave/preview flows happy
  }

  function insertTokenPoint(mmx,mmy) {
    const p = pageFromQuery();
    const x = fmtUnit(mmx), y=fmtUnit(mmy);
    const u = currentUnitLabel();
    insertAtCaret(`[${u}|p${p}:${x},${y}] `);
  }

  function insertTokenBox(x1,y1,x2,y2) {
    const p = pageFromQuery();
    const u = currentUnitLabel();
    const f = v => fmtUnit(v);
    insertAtCaret(`[${u}|p${p}:${f(x1)},${f(y1)}:${f(x2)},${f(y2)}] `);
  }

  // parse tokens from memo
  function parseTokensForPage() {
    if (!S.memo) return [];
    const u = currentUnitLabel();
    const raw = S.memo.value;
    const p = pageFromQuery();
    // [mm|p75:x,y] or [mm|p75:x1,y1:x2,y2] ; cm allowed as well
    const re = /\[(mm|cm)\|p(\d+):(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)(?::(\d+(?:\.\d+)?),(\d+(?:\.\d+)?))?\]/g;
    const out = [];
    let m;
    while ((m = re.exec(raw))) {
      const unit = m[1]; const page = +m[2];
      if (page !== p) continue;
      const x1=+m[3], y1=+m[4];
      const x2= m[5]!=null ? +m[5] : null;
      const y2= m[6]!=null ? +m[6] : null;
      const toMM = v => unit === 'cm' ? v*10 : v;
      out.push({
        type: (x2==null ? 'point' : 'box'),
        x1: toMM(x1), y1: toMM(y1),
        x2: x2==null? null : toMM(x2),
        y2: y2==null? null : toMM(y2),
        unit
      });
    }
    return out;
  }

  function renderMarkersFromMemo() {
    if (!S.markLayer) return;
    S.markLayer.innerHTML = '';
    const marks = parseTokensForPage();
    for (const m of marks) {
      if (m.type === 'point') {
        const c = create(SVGNS,'circle');
        c.setAttribute('class','marker point');
        c.setAttribute('cx',m.x1); c.setAttribute('cy',m.y1);
        c.setAttribute('r', 2.5);
        S.markLayer.appendChild(c);
      } else {
        const r = create(SVGNS,'rect');
        r.setAttribute('class','marker box');
        const x = Math.min(m.x1,m.x2), y=Math.min(m.y1,m.y2);
        const w = Math.abs(m.x1-m.x2), h=Math.abs(m.y1-m.y2);
        r.setAttribute('x',x); r.setAttribute('y',y);
        r.setAttribute('width',w); r.setAttribute('height',h);
        S.markLayer.appendChild(r);
      }
    }
  }

  // ------------- export JSON (from memo for current page) -------------
  function exportJSON() {
    const page = pageFromQuery();
    const marks = parseTokensForPage().map(m => (
      m.type==='point'
        ? { type:'point', x:mm(m.x1), y:mm(m.y1) }
        : { type:'box', x1:mm(m.x1), y1:mm(m.y1), x2:mm(m.x2), y2:mm(m.y2) }
    ));
    const blob = new Blob([JSON.stringify({ page, marks }, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `markers-p${page}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    function mm(v){ return +(+v).toFixed(1); }
  }

  // ------------- zoom/fit -------------
  function fitToStage() {
    if (!S.page) return;
    // CSS fit = page 100% width
    S.page.style.width = '100%';
    S.page.style.height = 'auto';
    refreshMetrics();
    redrawAll();
  }
  function zoomBy(f) {
    if (!S.page) return;
    const w = S.page.getBoundingClientRect().width;
    S.page.style.width = (w * f) + 'px';
    S.page.style.height = 'auto';
    refreshMetrics();
    redrawAll();
  }

  // ------------- redraw -------------
  function redrawAll() {
    refreshMetrics();
    drawGridAndRulers();
    ensureCrosshair();
    renderMarkersFromMemo();
  }

  // ------------- init -------------
  async function init() {
    S.stage = document.getElementById('ro-stage');
    S.page  = document.getElementById('ro-page');
    if (!S.stage || !S.page) return;

    hookToolbar();
    ensureOverlay();
    fitToStage(); // sets metrics + redraw
  }

  // expose for external boot
  window.ROGrid = window.ROGrid || {};
  window.ROGrid.init = init;
})();
