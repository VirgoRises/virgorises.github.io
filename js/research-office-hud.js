// Research Office HUD — non-invasive sidecar (mm/cm readout; overlay glow)
// Depends on: #ro-stage (positioned), .ro-overlay present, #ro-units select.
// Does NOT build a crosshair (grid owns it).

(function attachHudSidecar(){
  const MAX_WAIT_MS = 8000, TICK_MS = 80;
  const start = Date.now();

  function wait() {
    if (Date.now() - start > MAX_WAIT_MS) return;
    const stage   = document.getElementById("ro-stage");
    const overlay = stage?.querySelector(".ro-overlay");
    const units   = document.getElementById("ro-units");
    if (!stage || !overlay || !units) return void setTimeout(wait, TICK_MS);
    try { wire(stage, overlay, units); } catch(_) {}
  }
  wait();

  function wire(stage, overlay, unitsSel){
    if (getComputedStyle(stage).position === "static") {
      stage.style.position = "relative";
    }
    const hud = ensureHud(stage);

    overlay.addEventListener("mouseenter", ()=>{
      overlay.classList.add("ro-hover");
      hud.classList.add("show");
    });
    overlay.addEventListener("mouseleave", ()=>{
      overlay.classList.remove("ro-hover");
      hud.classList.remove("show");
    });

    overlay.addEventListener("pointermove",(e)=>{
      const r = overlay.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const ny = Math.max(0, Math.min(1, (e.clientY - r.top)  / r.height));
      updateHud(hud, nx, ny, stage.dataset, unitsSel.value);
    });

    unitsSel.addEventListener("change", ()=>{
      // force refresh on unit switch while hovering
      hud.classList.toggle("show", true);
    });
  }

  function ensureHud(stage){
    let hud = stage.querySelector(".ro-hud");
    if (!hud) {
      hud = document.createElement("div");
      hud.className = "ro-hud";
      hud.textContent = "x=–  y=–";
      stage.appendChild(hud);
    }
    return hud;
  }

  function updateHud(hud, nx, ny, ds, units){
    const w = Number(ds.pageMmW || 0), h = Number(ds.pageMmH || 0);
    if (!w || !h) { hud.textContent = "x=–  y=–"; return; }
    const mmX = nx * w, mmY = ny * h;
    const useCM = units === "cm";
    const unit  = useCM ? "cm" : "mm";
    const toU   = useCM ? (v)=>v/10 : (v)=>v;
    const fmt   = (v)=> Number.isInteger(v) ? String(v) : v.toFixed(1);
    hud.textContent = `x=${fmt(toU(mmX))}${unit}  y=${fmt(toU(mmY))}${unit}`;
  }
})();
