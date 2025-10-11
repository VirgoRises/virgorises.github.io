// Research Office — PDF canvas backdrop + metric grid/markers (mm / cm)
// - Overlay anchored to canvas/img with ResizeObserver
// - Metric-only: grid in true physical units (mm or cm) from PDF page size
// - Always snap-to-grid (no toggle). UI simplified.
// - Crosshair on hover. Marker clicks/creates copy & insert token into memo.
//
// initResearchOfficeGrid({
//   para, chapter,
//   fromPage,                                  // 1-based PDF page
//   pdfUrl: "/cafes/zeta-zero-cafe/sources/Old_main.pdf",
//   initialZoom: "fit",                        // "fit" | number
// })

export function initResearchOfficeGrid(opts = {}) {
  const {
    para = "osf-1",
    chapter = "",
    fromPage = 0,
    pdfUrl = "",
    initialZoom = "fit",
  } = opts;

  const stage = document.getElementById("ro-stage");
  const img   = document.getElementById("ro-page");
  const memo  = document.getElementById("memoBody");
  if (!stage || !img) return;

  // ---------- Backdrop + overlay ----------
  let canvas = stage.querySelector("#ro-page-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "ro-page-canvas";
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    canvas.style.display = "none";
    stage.appendChild(canvas);
  }
  const ctx = canvas.getContext("2d");

  const overlay = ensureOverlay(stage);
  const svg = overlay.querySelector("svg");

  // Backdrop geometry (backing pixel units)
  const BACK = { el: null, cssW: 0, cssH: 0, pxW: 1000, pxH: 1414 };
  let ro = null;

  function syncOverlayToBackdrop() {
    if (!BACK.el) return;
    BACK.cssW = BACK.el.clientWidth  || 1;
    BACK.cssH = BACK.el.clientHeight || 1;

    const sr = stage.getBoundingClientRect();
    const br = BACK.el.getBoundingClientRect();
    overlay.style.position = "absolute";
    overlay.style.left   = (br.left - sr.left) + "px";
    overlay.style.top    = (br.top  - sr.top)  + "px";
    overlay.style.width  = BACK.cssW + "px";
    overlay.style.height = BACK.cssH + "px";

    setSvgViewBox(BACK.pxW, BACK.pxH);
  }

  function observeBackdrop(el) {
    if (ro) ro.disconnect();
    ro = new ResizeObserver(() => {
      syncOverlayToBackdrop();
      redrawAll();
    });
    ro.observe(el);
  }

  // ---------- Toolbar (simplified) ----------
  ensureToolbar(stage);
  const zoomOutBtn = byId("ro-zoom-out");
  const zoomFitBtn = byId("ro-zoom-fit");
  const zoomInBtn  = byId("ro-zoom-in");

  let unitWrap = document.getElementById("ro-units-wrap");
  if (!unitWrap) {
    unitWrap = document.createElement("span");
    unitWrap.id = "ro-units-wrap";
    unitWrap.style.marginLeft = "8px";
    unitWrap.innerHTML = `Units: <select id="ro-units"><option value="mm" selected>mm</option><option value="cm">cm</option></select>`;
    document.querySelector(".ro-toolbar")?.appendChild(unitWrap);
  }
  const unitsSel = byId("ro-units");

  // ---------- State ----------
  let pdf = null, pdfPage = null, pageViewport = null;
  let zoomMode = initialZoom;
  const DPR = Math.max(1, window.devicePixelRatio || 1);

  // Metric page size (true physical dimensions)
  let pageMM = { w: 210, h: 297 };   // overwritten from PDF points
  let mmPerPxX = 0.21, mmPerPxY = 0.21; // computed from pageMM / BACK.px
  let units = "mm";                    // 'mm' | 'cm'
  const MM_PER_CM = 10;

  // Grid / markers
  let mode = "point";
  let draftBox = null;
  const storeKey = `ro:${chapter}:${para}`;
  let markers = loadLocal(storeKey) || [];

  // Crosshair
  let crossX = null, crossY = null;

  // ---------- Backdrop load (PDF only; image fallback shows warning banner) ----------
  (async () => {
    if (pdfUrl && fromPage > 0) {
      img.style.display = "none"; canvas.style.display = "";
      await ensurePdfJs();
      pdf = await window.pdfjsLib.getDocument(pdfUrl).promise;
      pdfPage = await pdf.getPage(fromPage);

      // PDF points → mm (1 pt = 1/72 in; 25.4 mm per inch)
      if (Array.isArray(pdfPage.view) && pdfPage.view.length === 4) {
        const wPt = pdfPage.view[2] - pdfPage.view[0];
        const hPt = pdfPage.view[3] - pdfPage.view[1];
        pageMM.w = wPt * 25.4 / 72;
        pageMM.h = hPt * 25.4 / 72;
      }

      pageViewport = pdfPage.getViewport({ scale: 1 });
      await renderPdfAtCurrentZoom();   // sets BACK + mmPerPx
      observeBackdrop(canvas);
      redrawAll();
      return;
    }

    // If no PDF, show the image (if any) but warn that metric is unavailable
    const warn = document.createElement("div");
    warn.className = "ro-toast";
    warn.textContent = "Metric grid requires a PDF page. Using image fallback without physical scale.";
    document.body.appendChild(warn); setTimeout(()=>warn.remove(), 2500);

    img.style.display = ""; canvas.style.display = "none";
    img.onload = () => {
      BACK.el  = img;
      BACK.pxW = img.naturalWidth  || 1000;
      BACK.pxH = img.naturalHeight || 1414;
      syncOverlayToBackdrop();
      observeBackdrop(img);
      // No true metric possible; draw nothing to avoid false precision
      svg.innerHTML = ""; // clear
    };
  })();

  // ---------- PDF rendering (responsive) ----------
  async function renderPdfAtCurrentZoom() {
    if (!pdfPage || !pageViewport) return;
    const stageW = stage.clientWidth || 800;

    let cssWidth;
    if (zoomMode === "fit") cssWidth = stageW;
    else cssWidth = Math.max(100, pageViewport.width * (typeof zoomMode === "number" ? zoomMode : 1));

    const pixelWidth  = Math.round(cssWidth * DPR);
    const scale = pixelWidth / pageViewport.width;
    const vp = pdfPage.getViewport({ scale });

    canvas.width  = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    canvas.style.width  = Math.round(canvas.width  / DPR) + "px";
    canvas.style.height = Math.round(canvas.height / DPR) + "px";

    BACK.el  = canvas;
    BACK.pxW = canvas.width;
    BACK.pxH = canvas.height;

    // compute mm per backing pixel
    mmPerPxX = pageMM.w / Math.max(1, BACK.pxW);
    mmPerPxY = pageMM.h / Math.max(1, BACK.pxH);

    syncOverlayToBackdrop();
    await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise;
  }

  // Window resize → re-render PDF and re-sync overlay
  (function observeResize(){
    let raf = null;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(async () => {
        await renderPdfAtCurrentZoom();
        syncOverlayToBackdrop();
        redrawAll();
      });
    };
    window.addEventListener("resize", onResize);
  })();

  // ---------- Overlay helpers ----------
  function ensureOverlay(host){
    let ov = host.querySelector(".ro-overlay");
    if (!ov) {
      ov = document.createElement("div");
      ov.className = "ro-overlay";
      ov.innerHTML = `<svg preserveAspectRatio="none"></svg>`;
      host.appendChild(ov);
    }
    return ov;
  }
  function setSvgViewBox(w, h){
    const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.width = "100%";
    svg.style.height = "100%";
  }

  function ensureToolbar(host){
    if (document.querySelector(".ro-toolbar")) return;
    const tb = document.createElement("div");
    tb.className = "ro-toolbar";
    tb.innerHTML = `
      <button id="ro-mode-point">Point</button>
      <button id="ro-mode-box">Box</button>
      <span style="margin-left:8px">Zoom:
        <button id="ro-zoom-out">−</button>
        <button id="ro-zoom-fit">Fit</button>
        <button id="ro-zoom-in">+</button>
      </span>
      <button id="ro-clear" style="margin-left:8px">Clear (local)</button>
      <button id="ro-export">Export JSON</button>
      <input id="ro-token" type="text" readonly placeholder="click marker to copy reference">
    `;
    host.insertAdjacentElement("beforebegin", tb);
  }

  // ---------- Metric grid, rulers, crosshair & markers ----------
  function redrawAll(){
    drawGridAndRulers();
    renderMarkers();
    ensureCrosshair();
  }

  function drawGridAndRulers(){
    svg.querySelector(".ro-grid")?.remove();
    const g = mk("g",{class:"ro-grid"});

    units = (unitsSel?.value === "cm") ? "cm" : "mm";
    const stepMM = (units === "cm") ? MM_PER_CM : 1;          // line every 1 cm / 1 mm
    const labelEveryMM = (units === "cm") ? MM_PER_CM : 10;   // label every 1 cm / 10 mm

    const toPxX = (mm) => mm / mmPerPxX;
    const toPxY = (mm) => mm / mmPerPxY;

    // grid lines + labels (top & left act as rulers)
    for (let mm = stepMM; mm < pageMM.w; mm += stepMM) {
      const x = toPxX(mm);
      const thick = (Math.round(mm) % MM_PER_CM === 0);
      g.appendChild(mk("line",{x1:x,y1:0,x2:x,y2:BACK.pxH, "stroke-width": thick ? 1.6 : 1}));
      if (mm % labelEveryMM === 0) {
        const label = (units === "cm") ? (mm / MM_PER_CM) : mm;
        g.appendChild(mk("text",{x, y:14, "text-anchor":"middle", class:"label"}, String(label)));
      }
    }
    for (let mm = stepMM; mm < pageMM.h; mm += stepMM) {
      const y = toPxY(mm);
      const thick = (Math.round(mm) % MM_PER_CM === 0);
      g.appendChild(mk("line",{x1:0,y1:y,x2:BACK.pxW,y2:y, "stroke-width": thick ? 1.6 : 1}));
      if (mm % labelEveryMM === 0) {
        const label = (units === "cm") ? (mm / MM_PER_CM) : mm;
        g.appendChild(mk("text",{x:14, y, "text-anchor":"middle", class:"label"}, String(label)));
      }
    }

    svg.appendChild(g);
  }

  function renderMarkers(){
    svg.querySelector(".ro-markers")?.remove();
    const g = mk("g",{class:"ro-markers"});

    markers.forEach((m)=>{
      if (m.kind === "point") {
        const wrap = mk("g",{class:"ro-marker"});
        wrap.appendChild(mk("circle",{cx:m.x*BACK.pxW, cy:m.y*BACK.pxH}));
        wrap.addEventListener("click", ()=>{
          const token = metricToken(m.x, m.y);
          commitToken(token);
        });
        g.appendChild(wrap);
      } else {
        const x=Math.min(m.x0,m.x1)*BACK.pxW, y=Math.min(m.y0,m.y1)*BACK.pxH;
        const w=Math.abs(m.x1-m.x0)*BACK.pxW,  h=Math.abs(m.y1-m.y0)*BACK.pxH;
        const wrap = mk("g",{class:"ro-marker"});
        wrap.appendChild(mk("rect",{x,y,width:w,height:h}));
        wrap.addEventListener("click", ()=>{
          const cx=(m.x0+m.x1)/2, cy=(m.y0+m.y1)/2;
          const token = metricToken(cx, cy) + " • box";
          commitToken(token);
        });
        g.appendChild(wrap);
      }
    });

    svg.appendChild(g);
  }

  // Crosshair (SVG lines following pointer)
  function ensureCrosshair(){
    if (!crossX) {
      crossX = mk("line",{x1:0,y1:0,x2:BACK.pxW,y2:0, class:"ro-cross"});
      crossY = mk("line",{x1:0,y1:0,x2:0,y2:BACK.pxH, class:"ro-cross"});
      svg.appendChild(crossX); svg.appendChild(crossY);
      svg.style.cursor = "crosshair";
    }
  }
  svg.addEventListener("mouseleave", ()=>{ if (crossX){ crossX.setAttribute("opacity","0"); crossY.setAttribute("opacity","0"); }});
  svg.addEventListener("mouseenter", ()=>{ if (crossX){ crossX.setAttribute("opacity","1"); crossY.setAttribute("opacity","1"); }});
  svg.addEventListener("mousemove",(e)=>{
    if (!crossX) return;
    const p = percentPos(e);
    const x = p.x*BACK.pxW, y = p.y*BACK.pxH;
    crossX.setAttribute("x1","0");       crossX.setAttribute("y1", y);
    crossX.setAttribute("x2", String(BACK.pxW)); crossX.setAttribute("y2", y);
    crossY.setAttribute("x1", x);  crossY.setAttribute("y1","0");
    crossY.setAttribute("x2", x);  crossY.setAttribute("y2", String(BACK.pxH));
  });

  // ---------- Interactions (always snap to metric) ----------
  svg.addEventListener("mousedown",(e)=>{
    let p = forceSnapMetric(percentPos(e));
    if (mode === "point") {
      markers.push({ kind:"point", x:p.x, y:p.y });
      saveLocal(storeKey, markers); renderMarkers();
      commitToken(metricToken(p.x, p.y));
    } else {
      draftBox = { x0:p.x, y0:p.y, x1:p.x, y1:p.y };
    }
  });
  svg.addEventListener("mousemove",(e)=>{
    if (mode!=="box" || !draftBox) return;
    let p = forceSnapMetric(percentPos(e));
    draftBox.x1 = p.x; draftBox.y1 = p.y;
  });
  svg.addEventListener("mouseup",(e)=>{
    if (mode!=="box" || !draftBox) return;
    let p = forceSnapMetric(percentPos(e));
    draftBox.x1 = p.x; draftBox.y1 = p.y;
    markers.push({ kind:"box", ...draftBox }); draftBox = null;
    saveLocal(storeKey, markers); renderMarkers();
    const m = markers.at(-1); const cx=(m.x0+m.x1)/2, cy=(m.y0+m.y1)/2;
    commitToken(metricToken(cx, cy) + " • box");
  });

  byId("ro-mode-point").onclick = ()=>{ mode="point"; };
  byId("ro-mode-box").onclick   = ()=>{ mode="box";   };
  byId("ro-clear").onclick      = ()=>{ if(confirm("Clear local markers?")){ markers=[]; saveLocal(storeKey, markers); renderMarkers(); } };
  byId("ro-export").onclick     = ()=>{
    const payload = { docId:"Old_main", chapter, anchor: para, markers, units };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`${para}.markers.json`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  unitsSel?.addEventListener('change', () => { redrawAll(); });

  zoomOutBtn.onclick = async ()=>{ zoomMode = coerceZoom(zoomMode, -0.15); await renderPdfAtCurrentZoom(); syncOverlayToBackdrop(); redrawAll(); };
  zoomInBtn.onclick  = async ()=>{ zoomMode = coerceZoom(zoomMode, +0.15); await renderPdfAtCurrentZoom(); syncOverlayToBackdrop(); redrawAll(); };
  zoomFitBtn.onclick = async ()=>{ zoomMode = "fit";                     await renderPdfAtCurrentZoom(); syncOverlayToBackdrop(); redrawAll(); };

  // ---------- Metric snapping & tokens ----------
  function forceSnapMetric(p){ // p in [0..1] normalized
    const stepMM = (unitsSel?.value === "cm") ? MM_PER_CM : 1;
    const mmX = p.x * pageMM.w, mmY = p.y * pageMM.h;
    const sx = Math.round(mmX / stepMM) * stepMM;
    const sy = Math.round(mmY / stepMM) * stepMM;
    return { x: sx / pageMM.w, y: sy / pageMM.h };
  }

  function metricToken(nx, ny){
    const mmX = nx * pageMM.w;
    const mmY = ny * pageMM.h;
    const labelU = (unitsSel?.value === "cm") ? "cm" : "mm";
    const toUnit = (vmm) => (labelU === "cm") ? (vmm/10) : vmm;
    const fmt = (v) => Number.isInteger(v) ? String(v) : v.toFixed(1);
    return `x=${fmt(toUnit(mmX))}${labelU}, y=${fmt(toUnit(mmY))}${labelU}`;
  }

  function commitToken(token){
    setToken(`${para} • ${token}`);
    // insert into memo at caret
    if (!memo) return;
    const t = memo;
    const selStart = t.selectionStart ?? t.value.length;
    const selEnd   = t.selectionEnd   ?? t.value.length;
    const before = t.value.slice(0, selStart);
    const after  = t.value.slice(selEnd);
    const insert = (before && !/\s$/.test(before) ? " " : "") + token + (after && !/^\s/.test(after) ? " " : "");
    t.value = before + insert + after;
    // move caret to end of inserted token
    const pos = (before + insert).length;
    t.setSelectionRange(pos, pos);
    t.focus();
  }

  // ---------- tiny utils ----------
  function byId(id){ return document.getElementById(id); }
  function percentPos(evt){
    const r = svg.getBoundingClientRect();
    const x = (evt.clientX - r.left) / r.width;
    const y = (evt.clientY - r.top)  / r.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }
  function mk(name, attrs, text){
    const n = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function setToken(s){
    const i = byId("ro-token"); if (!i) return;
    i.value = s; i.select(); document.execCommand("copy");
    const t=document.createElement("div"); t.className="ro-toast"; t.textContent="Copied: "+s;
    document.body.appendChild(t); setTimeout(()=>t.remove(),1200);
  }
  function saveLocal(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  function loadLocal(key){ try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }
  function coerceZoom(current, delta){
    if (current === "fit") return Math.max(0.3, 1 + delta);
    return Math.max(0.3, (typeof current === "number" ? current : 1) + delta);
  }
}

// --------- PDF.js loader ----------
async function ensurePdfJs(){
  if (window.pdfjsLib) return;
  await loadScript("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js");
  if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  }
}
function loadScript(src){
  return new Promise((res, rej)=>{
    const s=document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("Failed "+src));
    document.head.appendChild(s);
  });
}


