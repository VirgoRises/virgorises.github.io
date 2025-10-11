// Research Office — PDF canvas backdrop + grid/markers (responsive, zoomable)
//
// initResearchOfficeGrid({
//   para, chapter,
//   fromPage,                   // 1-based PDF page
//   pdfUrl: "/cafes/zeta-zero-cafe/sources/Old_main.pdf",
//   initialZoom: "fit",         // "fit" | number
//   pageToUrl: (p)=>".../page-<p>.jpg" // optional; if provided, overrides pdfUrl
// })

export function initResearchOfficeGrid(opts = {}) {
  const {
    para = "osf-1",
    chapter = "",
    fromPage = 0,
    pageToUrl,                 // optional (p:number)=>url
    pdfUrl = "",
    initialZoom = "fit",       // "fit" | number
  } = opts;

  const stage = document.getElementById("ro-stage");
  const img   = document.getElementById("ro-page");
  if (!stage || !img) return;

  // Canvas (lazy)
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

  // Overlay SVG
  const overlay = ensureOverlay(stage);
  const svg = overlay.querySelector("svg");

  // Toolbar (create if missing / extend if present)
  const tb = ensureToolbar(stage);
  const zoomOutBtn = byId("ro-zoom-out");
  const zoomFitBtn = byId("ro-zoom-fit");
  const zoomInBtn  = byId("ro-zoom-in");

  // State
  let pdf = null, pdfPage = null, pageViewport = null;
  let zoomMode = initialZoom;            // "fit" or number
  let isImageMode = false;
  const DPR = Math.max(1, window.devicePixelRatio || 1);

  // Markers / Grid
  let mode = "point";
  let grid = { rows: 12, cols: 12 };
  let draftBox = null;
  const storeKey = `ro:${chapter}:${para}`;
  let markers = loadLocal(storeKey) || [];

  // --- Backdrop load ---
  (async () => {
    const imgUrl = (typeof pageToUrl === "function" && fromPage > 0) ? pageToUrl(fromPage) : "";
    if (imgUrl) {
      isImageMode = true;
      img.src = imgUrl; img.alt = "source page";
      img.style.display = ""; canvas.style.display = "none";
      img.onerror = () => { img.alt = `Missing image: ${imgUrl}`; };
      img.onload = () => setSvgViewBox(img.naturalWidth || 1000, img.naturalHeight || 1414);
      return afterBackdropReady();
    }

    if (pdfUrl && fromPage > 0) {
      isImageMode = false;
      img.style.display = "none"; canvas.style.display = "";
      await ensurePdfJs();
      pdf = await window.pdfjsLib.getDocument(pdfUrl).promise;
      pdfPage = await pdf.getPage(fromPage);
      pageViewport = pdfPage.getViewport({ scale: 1 });
      await renderPdfAtCurrentZoom();
      observeResize();
      return afterBackdropReady();
    }

    // Last resort: blank but sized stage so grid still usable
    img.style.display = "none"; canvas.style.display = "none";
    setSvgViewBox(1000, 1414);
    afterBackdropReady();
  })();

  function afterBackdropReady(){ drawGrid(); renderMarkers(); }

  // --- PDF rendering (responsive) ---
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
    setSvgViewBox(canvas.width, canvas.height);

    await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise;
  }

  function observeResize() {
    let raf = null;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(async () => {
        if (!isImageMode) await renderPdfAtCurrentZoom();
      });
    };
    window.addEventListener("resize", onResize);
  }

  // --- Overlay helpers ---
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
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.style.width = "100%";
    svg.style.height = "100%";
  }

  function ensureToolbar(host){
    let tb = document.querySelector(".ro-toolbar");
    if (!tb) {
      tb = document.createElement("div");
      tb.className = "ro-toolbar";
      tb.innerHTML = `
        <button id="ro-mode-point">Point</button>
        <button id="ro-mode-box">Box</button>
        <label>Grid:
          <select id="ro-grid-rows"><option>8</option><option selected>12</option><option>16</option><option>24</option></select> ×
          <select id="ro-grid-cols"><option>8</option><option selected>12</option><option>16</option><option>24</option></select>
        </label>
        <span style="margin-left:8px">Zoom:
          <button id="ro-zoom-out">−</button>
          <button id="ro-zoom-fit">Fit</button>
          <button id="ro-zoom-in">+</button>
        </span>
        <label style="margin-left:8px"><input id="ro-snap" type="checkbox"> Snap</label>
        <button id="ro-clear">Clear (local)</button>
        <button id="ro-export">Export JSON</button>
        <input id="ro-token" type="text" readonly placeholder="click marker to copy reference">
      `;
      host.insertAdjacentElement("beforebegin", tb);
    }
    return tb;
  }

  // --- Grid & markers ---
  function drawGrid(){
    svg.querySelector(".ro-grid")?.remove();
    const g = mk("g",{class:"ro-grid"});
    for (let r=1;r<grid.rows;r++) {
      const y = (r/grid.rows)*1000; g.appendChild(mk("line",{x1:0,y1:y,x2:1000,y2:y}));
    }
    for (let c=1;c<grid.cols;c++) {
      const x = (c/grid.cols)*1000; g.appendChild(mk("line",{x1:x,y1:0,x2:x,y2:1000}));
    }
    for (let c=0;c<grid.cols;c++) {
      const x=((c+0.5)/grid.cols)*1000; g.appendChild(mk("text",{x,y:16,"text-anchor":"middle",class:"label"}, String(c+1)));
    }
    for (let r=0;r<grid.rows;r++) {
      const y=((r+0.5)/grid.rows)*1000; g.appendChild(mk("text",{x:14,y,"text-anchor":"middle",class:"label"}, rowLabel(r)));
    }
    svg.appendChild(g);
  }

  function renderMarkers(){
    svg.querySelector(".ro-markers")?.remove();
    const g = mk("g",{class:"ro-markers"});
    markers.forEach((m)=>{
      if (m.kind === "point") {
        const wrap = mk("g",{class:"ro-marker"});
        wrap.appendChild(mk("circle",{cx:m.x*1000, cy:m.y*1000}));
        wrap.addEventListener("click", ()=>{
          const cell = cellLabel(toCell(m));
          setToken(`${para}@${cell} • (${m.x.toFixed(3)},${m.y.toFixed(3)})`);
        });
        g.appendChild(wrap);
      } else {
        const x=Math.min(m.x0,m.x1)*1000, y=Math.min(m.y0,m.y1)*1000;
        const w=Math.abs(m.x1-m.x0)*1000,  h=Math.abs(m.y1-m.y0)*1000;
        const wrap = mk("g",{class:"ro-marker"});
        wrap.appendChild(mk("rect",{x,y,width:w,height:h}));
        wrap.addEventListener("click", ()=>{
          const cx=(m.x0+m.x1)/2, cy=(m.y0+m.y1)/2;
          const cell = cellLabel(toCell({x:cx,y:cy}));
          setToken(`${para}@${cell} • [(${m.x0.toFixed(3)},${m.y0.toFixed(3)})–(${m.x1.toFixed(3)},${m.y1.toFixed(3)})]`);
        });
        g.appendChild(wrap);
      }
    });
    svg.appendChild(g);
  }

  // --- interactions ---
  svg.addEventListener("mousedown",(e)=>{
    let p = maybeSnap(percentPos(e));
    if (mode === "point") {
      markers.push({ kind:"point", x:p.x, y:p.y });
      saveLocal(storeKey, markers); renderMarkers();
      const cell = cellLabel(toCell(p));
      setToken(`${para}@${cell} • (${p.x.toFixed(3)},${p.y.toFixed(3)})`);
    } else {
      draftBox = { x0:p.x, y0:p.y, x1:p.x, y1:p.y };
    }
  });
  svg.addEventListener("mousemove",(e)=>{
    if (mode!=="box" || !draftBox) return;
    let p = maybeSnap(percentPos(e)); draftBox.x1 = p.x; draftBox.y1 = p.y;
  });
  svg.addEventListener("mouseup",(e)=>{
    if (mode!=="box" || !draftBox) return;
    let p = maybeSnap(percentPos(e)); draftBox.x1 = p.x; draftBox.y1 = p.y;
    markers.push({ kind:"box", ...draftBox }); draftBox = null;
    saveLocal(storeKey, markers); renderMarkers();
    const m = markers[markers.length-1], cx=(m.x0+m.x1)/2, cy=(m.y0+m.y1)/2;
    const cell = cellLabel(toCell({x:cx,y:cy}));
    setToken(`${para}@${cell} • [(${m.x0.toFixed(3)},${m.y0.toFixed(3)})–(${m.x1.toFixed(3)},${m.y1.toFixed(3)})]`);
  });

  byId("ro-mode-point").onclick = ()=>{ mode="point"; };
  byId("ro-mode-box").onclick   = ()=>{ mode="box";   };
  byId("ro-grid-rows").onchange = (e)=>{ grid.rows=+e.target.value; drawGrid(); };
  byId("ro-grid-cols").onchange = (e)=>{ grid.cols=+e.target.value; drawGrid(); };
  byId("ro-clear").onclick      = ()=>{ if(confirm("Clear local markers?")){ markers=[]; saveLocal(storeKey, markers); renderMarkers(); } };
  byId("ro-export").onclick     = ()=>{
    const payload = { docId:"Old_main", chapter, anchor: para, markers, grid };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`${para}.markers.json`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  zoomOutBtn.onclick = async ()=>{ zoomMode = coerceZoom(zoomMode, -0.15); if (!isImageMode) await renderPdfAtCurrentZoom(); };
  zoomInBtn.onclick  = async ()=>{ zoomMode = coerceZoom(zoomMode, +0.15); if (!isImageMode) await renderPdfAtCurrentZoom(); };
  zoomFitBtn.onclick = async ()=>{ zoomMode = "fit";                    if (!isImageMode) await renderPdfAtCurrentZoom(); };

  // --- tiny utils ---
  function byId(id){ return document.getElementById(id); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function rowLabel(n){ let s=""; n|=0; do{ s=String.fromCharCode(65+(n%26))+s; n=Math.floor(n/26)-1; }while(n>=0); return s; }
  function toCell({x,y}) {
    const r = Math.min(grid.rows-1, Math.floor(y * grid.rows));
    const c = Math.min(grid.cols-1, Math.floor(x * grid.cols));
    return { row:r, col:c };
  }
  function cellLabel({row,col}){ return `${rowLabel(row)}${col+1}`; }
  function percentPos(evt){
    const r = svg.getBoundingClientRect();
    const x = (evt.clientX - r.left) / r.width;
    const y = (evt.clientY - r.top)  / r.height;
    return { x: clamp(x,0,1), y: clamp(y,0,1) };
  }
  function snapOn(){ return !!byId("ro-snap")?.checked; }
  function snapXY(x,y){ const cx=(Math.floor(x*grid.cols)+0.5)/grid.cols, cy=(Math.floor(y*grid.rows)+0.5)/grid.rows; return {x:cx,y:cy}; }
  function maybeSnap(p){ return snapOn() ? snapXY(p.x, p.y) : p; }
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
