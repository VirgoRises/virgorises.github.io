// Research Office — PDF backdrop + metric grid + markers (mm/cm)
// Stable baseline with toolbar, snap-to-grid, zoom, memo tokens, crosshair
// Feb 2025

export function initResearchOfficeGrid(opts = {}) {
  const {
    para = "osf-1",
    chapter = "",
    fromPage = 0,
    pdfUrl = "/cafes/zeta-zero-cafe/sources/Old_main.pdf",
    initialZoom = "fit",
  } = opts;

  // --- DOM anchors ---
  const stage = document.getElementById("ro-stage");
  const img = document.getElementById("ro-page");
  const memo = document.getElementById("memoBody");
  if (!stage || !img) return;

  if (getComputedStyle(stage).position === "static") {
    stage.style.position = "relative";
  }

  // --- Backdrop canvas (PDF target) ---
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

  // --- SVG overlay (grid/markers live here) ---
  const overlay = ensureOverlay(stage);           // <div class="ro-overlay"><svg/></div>
  const svg = overlay.querySelector("svg");
  svg.style.pointerEvents = "auto";

  // Geometry for backdrop (pixel units)
  const BACK = { el: null, cssW: 0, cssH: 0, pxW: 1000, pxH: 1414 };
  let ro = null;                                  // ResizeObserver

  function syncOverlayToBackdrop() {
    if (!BACK.el) return;
    BACK.cssW = BACK.el.clientWidth || 1;
    BACK.cssH = BACK.el.clientHeight || 1;

    const sr = stage.getBoundingClientRect();
    const br = BACK.el.getBoundingClientRect();

    overlay.style.position = "absolute";
    overlay.style.left = (br.left - sr.left) + "px";
    overlay.style.top = (br.top - sr.top) + "px";
    overlay.style.width = BACK.cssW + "px";
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

  // --- Toolbar + wiring ---
  ensureToolbar(stage);
  const btnPoint = byId("ro-mode-point");
  const btnBox = byId("ro-mode-box");
  const zoomOut = byId("ro-zoom-out");
  const zoomFit = byId("ro-zoom-fit");
  const zoomIn = byId("ro-zoom-in");
  const clearBtn = byId("ro-clear");
  const exportBtn = byId("ro-export");
  const unitsSel = byId("ro-units");

  // --- State ---
  let pdf = null, pdfPage = null, pageViewport = null;
  let zoomMode = initialZoom;
  const DPR = Math.max(1, window.devicePixelRatio || 1);

  // Physical size derived from PDF page (mm)
  let pageMM = { w: 210, h: 297 };
  let mmPerPxX = 0.21, mmPerPxY = 0.21;
  const MM_PER_CM = 10;

  let mode = "point";
  let draftBox = null;
  const storeKey = `ro:${chapter}:${para}`;
  let markers = loadLocal(storeKey) || [];

  // ---------- PDF load ----------
  (async () => {
    if (pdfUrl && fromPage > 0) {
      img.style.display = "none";
      canvas.style.display = "";

      await ensurePdfJs();
      pdf = await window.pdfjsLib.getDocument(pdfUrl).promise;
      pdfPage = await pdf.getPage(fromPage);

      // Compute true physical size (pt -> mm)
      if (Array.isArray(pdfPage.view) && pdfPage.view.length === 4) {
        const wPt = pdfPage.view[2] - pdfPage.view[0];
        const hPt = pdfPage.view[3] - pdfPage.view[1];
        pageMM.w = wPt * 25.4 / 72;
        pageMM.h = hPt * 25.4 / 72;
      }
      // Expose for HUD sidecar
      stage.dataset.pageMmW = String(pageMM.w);
      stage.dataset.pageMmH = String(pageMM.h);

      pageViewport = pdfPage.getViewport({ scale: 1 });
      await renderPdfAtCurrentZoom();             // sets BACK + mmPerPx*
      observeBackdrop(canvas);
      redrawAll();
      wirePointer();                              // once overlay is sized
      wireToolbar();
      return;
    }

    // Fallback (image), not used in your PDF flow
    img.style.display = "";
    canvas.style.display = "none";
  })();

  // ---------- Render PDF ----------
  async function renderPdfAtCurrentZoom() {
    if (!pdfPage || !pageViewport) return;

    const stageW = stage.clientWidth || 800;
    let cssWidth;
    if (zoomMode === "fit") cssWidth = stageW;
    else cssWidth = Math.max(100, pageViewport.width *
      (typeof zoomMode === "number" ? zoomMode : 1));

    const pixelWidth = Math.round(cssWidth * DPR);
    const scale = pixelWidth / pageViewport.width;
    const vp = pdfPage.getViewport({ scale });

    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    canvas.style.width = Math.round(canvas.width / DPR) + "px";
    canvas.style.height = Math.round(canvas.height / DPR) + "px";

    BACK.el = canvas;
    BACK.pxW = canvas.width;
    BACK.pxH = canvas.height;

    mmPerPxX = pageMM.w / Math.max(1, BACK.pxW);
    mmPerPxY = pageMM.h / Math.max(1, BACK.pxH);

    // keep HUD truthy
    stage.dataset.pageMmW = String(pageMM.w);
    stage.dataset.pageMmH = String(pageMM.h);

    syncOverlayToBackdrop();
    await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise;
  }

  // ---------- Redraw: grid, markers, crosshair ----------
  function redrawAll() {
    drawGridAndRulers();
    renderMarkers();
    buildCrosshair();               // on top
  }

  function drawGridAndRulers() {
    svg.querySelector(".ro-grid")?.remove();
    const g = mk("g", { class: "ro-grid" });

    const useCM = (unitsSel?.value === "cm");
    const stepMM = useCM ? MM_PER_CM : 1;
    const labelEveryMM = useCM ? MM_PER_CM : 10;

    const toPxX = (mm) => mm / mmPerPxX;
    const toPxY = (mm) => mm / mmPerPxY;

    for (let mm = stepMM; mm < pageMM.w; mm += stepMM) {
      const x = toPxX(mm);
      const thick = (Math.round(mm) % MM_PER_CM === 0);
      g.appendChild(mk("line", { x1: x, y1: 0, x2: x, y2: BACK.pxH, "stroke-width": thick ? 1.6 : 1 }));
      if (mm % labelEveryMM === 0) {
        const label = useCM ? (mm / MM_PER_CM) : mm;
        g.appendChild(mk("text", { x, y: 14, "text-anchor": "middle", class: "label" }, String(label)));
      }
    }
    for (let mm = stepMM; mm < pageMM.h; mm += stepMM) {
      const y = toPxY(mm);
      const thick = (Math.round(mm) % MM_PER_CM === 0);
      g.appendChild(mk("line", { x1: 0, y1: y, x2: BACK.pxW, y2: y, "stroke-width": thick ? 1.6 : 1 }));
      if (mm % labelEveryMM === 0) {
        const label = useCM ? (mm / MM_PER_CM) : mm;
        g.appendChild(mk("text", { x: 14, y, "text-anchor": "middle", class: "label" }, String(label)));
      }
    }
    svg.appendChild(g);
  }

  function renderMarkers() { renderMarkersWith(markers); }

  function renderMarkersWith(list) {
    svg.querySelector(".ro-markers")?.remove();
    const g = mk("g", { class: "ro-markers" });

    list.forEach((m) => {
      if (m.kind === "point") {
        const wrap = mk("g", { class: "ro-marker" + (m._memo ? " memo" : "") });
        wrap.appendChild(mk("circle", { cx: m.x * BACK.pxW, cy: m.y * BACK.pxH }));
        wrap.addEventListener("click", () => {
          const token = metricToken(m.x, m.y);
          commitToken(token);
        });
        g.appendChild(wrap);
      } else {
        const x = Math.min(m.x0, m.x1) * BACK.pxW;
        const y = Math.min(m.y0, m.y1) * BACK.pxH;
        const w = Math.abs(m.x1 - m.x0) * BACK.pxW;
        const h = Math.abs(m.y1 - m.y0) * BACK.pxH;
        const wrap = mk("g", { class: "ro-marker" + (m._memo ? " memo" : "") });
        wrap.appendChild(mk("rect", { x, y, width: w, height: h }));
        wrap.addEventListener("click", () => {
          const cx = (m.x0 + m.x1) / 2, cy = (m.y0 + m.y1) / 2;
          const token = metricToken(cx, cy) + " • box";
          commitToken(token);
        });
        g.appendChild(wrap);
      }
    });

    svg.appendChild(g);
  }

  /* Helper: make markup from clicks (point/box) */
  function mmPointMarkup(page, nx, ny) {
    const mmX = nx * pageMM.w, mmY = ny * pageMM.h;
    const fmt = (v) => Number.isInteger(v) ? String(v) : v.toFixed(1);
    return `[mm|p${page}:${fmt(mmX)},${fmt(mmY)}]`;
  }
  function mmBoxMarkup(page, x0, y0, x1, y1) {
    const mm = (nx, ny) => ({ x: nx * pageMM.w, y: ny * pageMM.h });
    const a = mm(x0, y0), b = mm(x1, y1);
    const fmt = (v) => Number.isInteger(v) ? String(v) : v.toFixed(1);
    return `[mm|p${page}:${fmt(a.x)},${fmt(a.y)}-${fmt(b.x)},${fmt(b.y)}]`;
  }


  function buildCrosshair() {
    svg.querySelectorAll(".ro-cross").forEach(n => n.remove());
    const cx = mk("line", { class: "ro-cross", x1: 0, y1: 0, x2: BACK.pxW, y2: 0 });
    const cy = mk("line", { class: "ro-cross", x1: 0, y1: 0, x2: 0, y2: BACK.pxH });
    [cx, cy].forEach(l => {
      l.setAttribute("stroke", "rgba(255,255,0,.6)");
      l.setAttribute("stroke-width", "0.8");
      l.setAttribute("vector-effect", "non-scaling-stroke");
      l.setAttribute("pointer-events", "none");
      l.setAttribute("opacity", "1");
    });
    svg.appendChild(cx); svg.appendChild(cy);
  }

  // ---------- Pointer interactions (snap always ON) ----------
  let wired = false;
  function wirePointer() {
    if (wired) return; wired = true;

    overlay.addEventListener("pointermove", (e) => {
      const p = percentPos(overlay, e);
      // Move crosshair
      const x = p.x * BACK.pxW, y = p.y * BACK.pxH;
      const lines = svg.querySelectorAll(".ro-cross");
      if (lines.length === 2) {
        lines[0].setAttribute("y1", y); lines[0].setAttribute("y2", y);
        lines[1].setAttribute("x1", x); lines[1].setAttribute("x2", x);
      }
    });

    overlay.addEventListener("pointerdown", (e) => {
      const p = forceSnapMetric(percentPos(overlay, e));
      if (mode === "point") {
        markers.push({ kind: "point", x: p.x, y: p.y });
        saveLocal(storeKey, markers);
        renderMarkers();
        // jh commitToken(metricToken(p.x, p.y));
        commitToken(metricToken(p.x, p.y));            // keep user-visible token
        insertMemoMarkup(mmPointMarkup(fromPage, p.x, p.y));  // insert [mm|…] in memo

      } else {
        draftBox = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
      }
      if (memo && !memo.__ro_wired) {
        memo.__ro_wired = true;
        memo.addEventListener("input", refreshMemoMarkers);
      }
      refreshMemoMarkers();

    });

    overlay.addEventListener("pointermove", (e) => {
      if (mode !== "box" || !draftBox) return;
      const p = forceSnapMetric(percentPos(overlay, e));
      draftBox.x1 = p.x; draftBox.y1 = p.y;
    });

    overlay.addEventListener("pointerup", (e) => {
      if (mode !== "box" || !draftBox) return;
      const p = forceSnapMetric(percentPos(overlay, e));
      draftBox.x1 = p.x; draftBox.y1 = p.y;
      markers.push({ kind: "box", ...draftBox });
      draftBox = null;
      saveLocal(storeKey, markers);
      renderMarkers();
      /*JH
      const m = markers.at(-1);
      const cx = (m.x0 + m.x1) / 2, cy = (m.y0 + m.y1) / 2;
      commitToken(metricToken(cx, cy) + " • box"); */
      const m = markers.at(-1);
      const cx = (m.x0 + m.y0) / 2, cy = (m.y0 + m.y1) / 2;
      commitToken(metricToken(cx, cy) + " • box");
      insertMemoMarkup(mmBoxMarkup(fromPage, m.x0, m.y0, m.x1, m.y1));

    });
  }

  // ---------- Toolbar wiring ----------
  function wireToolbar() {
    if (btnPoint) btnPoint.onclick = () => { mode = "point"; btnPoint.classList.add("active"); btnBox?.classList.remove("active"); };
    if (btnBox) btnBox.onclick = () => { mode = "box"; btnBox.classList.add("active"); btnPoint?.classList.remove("active"); };

    if (clearBtn) clearBtn.onclick = () => {
      if (confirm("Clear local markers?")) {
        markers = []; saveLocal(storeKey, markers); renderMarkers();
      }
    };

    if (memo && !memo.__ro_wired) {
      memo.__ro_wired = true;
      memo.addEventListener("input", refreshMemoMarkers);
    }
    refreshMemoMarkers();


    if (exportBtn) exportBtn.onclick = () => {
      const payload = { docId: "Old_main", chapter, anchor: para, markers, units: unitsSel?.value || "mm" };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${para}.markers.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 800);
    };

    if (unitsSel) unitsSel.onchange = () => { redrawAll(); };

    if (zoomOut) zoomOut.onclick = async () => { zoomMode = coerceZoom(zoomMode, -0.15); await renderPdfAtCurrentZoom(); syncOverlayToBackdrop(); redrawAll(); };
    if (zoomIn) zoomIn.onclick = async () => { zoomMode = coerceZoom(zoomMode, +0.15); await renderPdfAtCurrentZoom(); syncOverlayToBackdrop(); redrawAll(); };
    if (zoomFit) zoomFit.onclick = async () => { zoomMode = "fit"; await renderPdfAtCurrentZoom(); syncOverlayToBackdrop(); redrawAll(); };
  }

  // ---------- Metric snapping & tokens ----------
  function forceSnapMetric(p) { // p in [0..1]
    const stepMM = (unitsSel?.value === "cm") ? MM_PER_CM : 1;
    const mmX = p.x * pageMM.w, mmY = p.y * pageMM.h;
    const sx = Math.round(mmX / stepMM) * stepMM;
    const sy = Math.round(mmY / stepMM) * stepMM;
    return { x: sx / pageMM.w, y: sy / pageMM.h };
  }

  function metricToken(nx, ny) {
    const mmX = nx * pageMM.w;
    const mmY = ny * pageMM.h;
    const useCM = (unitsSel?.value === "cm");
    const unit = useCM ? "cm" : "mm";
    const toU = useCM ? (v) => v / 10 : (v) => v;
    const fmt = (v) => Number.isInteger(v) ? String(v) : v.toFixed(1);
    return `x=${fmt(toU(mmX))}${unit}, y=${fmt(toU(mmY))}${unit}`;
  }

  function commitToken(token) {
    setToken(`${para} • ${token}`);
    if (!memo) return;
    const t = memo;
    const s0 = t.selectionStart ?? t.value.length;
    const s1 = t.selectionEnd ?? t.value.length;
    const before = t.value.slice(0, s0);
    const after = t.value.slice(s1);
    const insert = (before && !/\s$/.test(before) ? " " : "") + token + (after && !/^\s/.test(after) ? " " : "");
    t.value = before + insert + after;
    const pos = (before + insert).length;
    t.setSelectionRange(pos, pos);
    t.focus();
  }
  //Insert markup into the memo (at caret)
  function insertMemoMarkup(markup) {
    if (!memo) return;
    const t = memo;
    const s0 = t.selectionStart ?? t.value.length;
    const s1 = t.selectionEnd ?? t.value.length;
    const before = t.value.slice(0, s0);
    const after = t.value.slice(s1);
    const needsL = before && !/\s$/.test(before) ? " " : "";
    const needsR = after && !/^\s/.test(after) ? " " : "";
    t.value = before + needsL + markup + needsR + after;
    const pos = (before + needsL + markup).length;
    t.setSelectionRange(pos, pos);
    t.focus();
    // trigger re-parse + re-render
    refreshMemoMarkers();
  }

  // Render memo-derived markers for the current page
  function markersFromMemoForPage(pageNum) {
    if (!memo) return [];
    const all = parseMemoMarkers(memo.value);
    // convert mm -> normalized [0..1]
    const norm = [];
    for (const m of all) {
      if (m.page !== pageNum) continue;
      if (m.kind === "point-mm") {
        norm.push({ kind: "point", x: m.x / pageMM.w, y: m.y / pageMM.h, _memo: true });
      } else {
        norm.push({
          kind: "box",
          x0: (Math.min(m.x1, m.x2)) / pageMM.w,
          y0: (Math.min(m.y1, m.y2)) / pageMM.h,
          x1: (Math.max(m.x1, m.x2)) / pageMM.w,
          y1: (Math.max(m.y1, m.y2)) / pageMM.h,
          _memo: true
        });
      }
    }
    return norm;
  }

  function refreshMemoMarkers() {
    // merge local markers (stored) + memo markers for this page
    const pageNum = typeof fromPage === "number" ? fromPage : 0;
    const memoMs = markersFromMemoForPage(pageNum);
    // Keep local markers first, then memo markers (memo ones get class hint in render)
    renderMarkersWith([...markers, ...memoMs]);
  }


  // ---------- Utilities ----------
  function byId(id) { return document.getElementById(id); }

  function ensureToolbar(stage) {
    if (stage.querySelector(".ro-toolbar")) return;
    const bar = document.createElement("div");
    bar.className = "ro-toolbar";
    bar.innerHTML = `
      <button id="ro-mode-point">Point</button>
      <button id="ro-mode-box">Box</button>
      <span>Zoom:</span>
      <button id="ro-zoom-out">–</button>
      <button id="ro-zoom-fit">Fit</button>
      <button id="ro-zoom-in">+</button>
      <button id="ro-clear">Clear (local)</button>
      <button id="ro-export">Export JSON</button>
      <input id="ro-token" type="text" readonly placeholder="click marker to copy reference">
      <span style="margin-left:auto">Units:
        <select id="ro-units"><option value="mm">mm</option><option value="cm">cm</option></select>
      </span>
    `;
    stage.parentElement?.insertBefore(bar, stage);
  }

  function ensureOverlay(host) {
    let ov = host.querySelector(".ro-overlay");
    if (!ov) {
      ov = document.createElement("div");
      ov.className = "ro-overlay";
      ov.innerHTML = `<svg preserveAspectRatio="none"></svg>`;
      host.appendChild(ov);
    }
    return ov;
  }

  function setSvgViewBox(w, h) {
    const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.width = "100%";
    svg.style.height = "100%";
  }

  function mk(name, attrs, text) {
    const n = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function percentPos(el, evt) {
    const r = el.getBoundingClientRect();
    const x = (evt.clientX - r.left) / r.width;
    const y = (evt.clientY - r.top) / r.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }

  function setToken(s) {
    const i = byId("ro-token"); if (!i) return;
    i.value = s; i.select(); document.execCommand("copy");
    const t = document.createElement("div"); t.className = "ro-toast"; t.textContent = "Copied: " + s;
    document.body.appendChild(t); setTimeout(() => t.remove(), 1200);
  }

  function loadLocal(key) { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }
  function saveLocal(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function coerceZoom(current, delta) {
    if (current === "fit") return Math.max(0.3, 1 + delta);
    return Math.max(0.3, (typeof current === "number" ? current : 1) + delta);
  }
}

// ----- Marker markup: [mm|p75:97.5,141.5] or [mm|p75:97.5,141.5-136.6,147.5]
function parseMemoMarkers(text) {
  const rx = /\[mm\|p(?<p>\d+):(?<x1>\d+(?:\.\d+)?)(?<u1>cm|mm)?,(?<y1>\d+(?:\.\d+)?)(?<u2>cm|mm)?(?:-(?<x2>\d+(?:\.\d+)?)(?<u3>cm|mm)?,(?<y2>\d+(?:\.\d+)?)(?<u4>cm|mm)?)?\]/gi;
  const toMM = (v, u) => u === 'cm' ? (parseFloat(v) * 10) : parseFloat(v);
  const found = [];
  for (const m of text.matchAll(rx)) {
    const p = parseInt(m.groups.p, 10);
    const x1 = toMM(m.groups.x1, m.groups.u1);
    const y1 = toMM(m.groups.y1, m.groups.u2);
    if (m.groups.x2 != null && m.groups.y2 != null) {
      const x2 = toMM(m.groups.x2, m.groups.u3);
      const y2 = toMM(m.groups.y2, m.groups.u4);
      found.push({ page: p, kind: "box-mm", x1, y1, x2, y2 });
    } else {
      found.push({ page: p, kind: "point-mm", x: x1, y: y1 });
    }
  }
  return found;
}


// --------- PDF.js loader ----------
async function ensurePdfJs() {
  if (window.pdfjsLib) return;
  await loadScript("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js");
  if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  }
}
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("Failed " + src));
    document.head.appendChild(s);
  });
}
