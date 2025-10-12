// PDF stage + metric grid + memo-driven markers (no local storage)
import "/js/pdf.min.js";

export function initResearchOfficeGrid({ para, chapter, fromPage=0, pdfUrl, initialZoom="fit" }) {
  const stage   = document.getElementById("ro-stage");
  const memo    = document.getElementById("memoBody");
  if (!stage) throw new Error("#ro-stage missing");

  // Toolbar (no destructive actions)
  const bar = document.createElement("div");
  bar.className = "ro-toolbar";
  bar.innerHTML = `
    <button id="ro-mode-point" class="btn on">Point</button>
    <button id="ro-mode-box"   class="btn">Box</button>
    <span class="sep"></span>
    <span>Zoom:</span>
    <button id="ro-zoom-out" class="btn">−</button>
    <button id="ro-zoom-fit" class="btn">Fit</button>
    <button id="ro-zoom-in"  class="btn">+</button>
    <span class="sep"></span>
    <button id="ro-export"  class="btn">Export JSON</button>
    <input  id="ro-token"   class="token" readonly placeholder="click marker to copy reference" />
    <span class="sep"></span>
    <label>Units:
      <select id="ro-units">
        <option value="mm" selected>mm</option>
        <option value="cm">cm</option>
      </select>
    </label>
  `;
  stage.parentNode.insertBefore(bar, stage);

  const btnPoint   = document.getElementById("ro-mode-point");
  const btnBox     = document.getElementById("ro-mode-box");
  const btnZoomOut = document.getElementById("ro-zoom-out");
  const btnZoomFit = document.getElementById("ro-zoom-fit");
  const btnZoomIn  = document.getElementById("ro-zoom-in");
  const btnExport  = document.getElementById("ro-export");
  const tokenSink  = document.getElementById("ro-token");
  const unitsSel   = document.getElementById("ro-units");

  const canvas  = document.createElement("canvas");
  canvas.id     = "ro-page-canvas";
  canvas.style.display = "block";
  canvas.style.width   = "100%";
  canvas.style.height  = "auto";

  const overlay = document.createElementNS("http://www.w3.org/2000/svg","svg");
  overlay.classList.add("ro-overlay");
  overlay.setAttribute("width","100%");
  overlay.setAttribute("height","100%");
  overlay.setAttribute("preserveAspectRatio","xMidYMid meet");

  const hud = document.createElement("div");
  hud.className = "ro-hud";
  hud.textContent = "x=— y=—";

  const wrap = document.createElement("div");
  wrap.className = "ro-pagewrap";
  wrap.appendChild(canvas);
  wrap.appendChild(overlay);
  wrap.appendChild(hud);
  stage.innerHTML = "";
  stage.appendChild(wrap);

  // State
  let mode = "point";
  let dragBox = null;
  let currentPage = Number(fromPage)||0;
  let pdfDoc = null;
  const BACK = { pxW:0, pxH:0 };
  let pageMM = { w:0, h:0 };

  // Utils
  const mk = (n,a={}) => { const e=document.createElementNS("http://www.w3.org/2000/svg",n); for(const[k,v]of Object.entries(a)) e.setAttribute(k,v); return e; };
  const fmt = (v)=> Number.isInteger(v)?String(v):v.toFixed(1);
  const setToken = (s)=>{ if(!tokenSink) return; tokenSink.value=s; tokenSink.select(); document.execCommand("copy"); };
  const percentPos = (ev)=>{ const r=overlay.getBoundingClientRect(); const x=(ev.clientX-r.left)/r.width; const y=(ev.clientY-r.top)/r.height; return {x:Math.max(0,Math.min(1,x)), y:Math.max(0,Math.min(1,y))}; };

  const metricToken = (nx,ny)=>{ const mmx=nx*pageMM.w, mmy=ny*pageMM.h; const u=unitsSel?.value==="cm"?"cm":"mm"; const toU=(u==="cm")?(v=>v/10):(v=>v); return `x=${fmt(toU(mmx))}${u}, y=${fmt(toU(mmy))}${u}`; };
  const mmPointMarkup = (p,nx,ny)=> `[mm|p${p}:${fmt(nx*pageMM.w)},${fmt(ny*pageMM.h)}]`;
  const mmBoxMarkup   = (p,x0,y0,x1,y1)=> {
    const a={x:Math.min(x0,x1)*pageMM.w,y:Math.min(y0,y1)*pageMM.h};
    const b={x:Math.max(x0,x1)*pageMM.w,y:Math.max(y0,y1)*pageMM.h};
    return `[mm|p${p}:${fmt(a.x)},${fmt(a.y)}-${fmt(b.x)},${fmt(b.y)}]`;
  };
  function insertMemoMarkup(markup){
    if(!memo) return;
    const t=memo, s0=t.selectionStart??t.value.length, s1=t.selectionEnd??t.value.length;
    const before=t.value.slice(0,s0), after=t.value.slice(s1);
    const l=before && !/\s$/.test(before)?" ":"", r=after && !/^\s/.test(after)?" ":"";
    t.value=before+l+markup+r+after;
    const pos=(before+l+markup).length; t.setSelectionRange(pos,pos); t.focus();
    refreshMemoMarkers();
  }
  function parseMemoMarkers(text){
    const rx=/\[mm\|p(?<p>\d+):(?<x1>\d+(?:\.\d+)?)(?<u1>cm|mm)?,(?<y1>\d+(?:\.\d+)?)(?<u2>cm|mm)?(?:-(?<x2>\d+(?:\.\d+)?)(?<u3>cm|mm)?,(?<y2>\d+(?:\.\d+)?)(?<u4>cm|mm)?)?\]/gi;
    const toMM=(v,u)=>u==='cm'?parseFloat(v)*10:parseFloat(v);
    const out=[]; for(const m of text.matchAll(rx)){ const p=parseInt(m.groups.p,10); const x1=toMM(m.groups.x1,m.groups.u1); const y1=toMM(m.groups.y1,m.groups.u2);
      if(m.groups.x2!=null&&m.groups.y2!=null){ const x2=toMM(m.groups.x2,m.groups.u3); const y2=toMM(m.groups.y2,m.groups.u4); out.push({page:p,kind:"box-mm",x1,y1,x2,y2});}
      else out.push({page:p,kind:"point-mm",x:x1,y:y1});
    } return out;
  }
  function markersFromMemoForPage(p){
    if(!memo) return []; const all=parseMemoMarkers(memo.value); const norm=[];
    for(const m of all){ if(m.page!==p) continue;
      if(m.kind==="point-mm") norm.push({kind:"point",x:m.x/pageMM.w,y:m.y/pageMM.h,_memo:true});
      else norm.push({kind:"box",x0:Math.min(m.x1,m.x2)/pageMM.w,y0:Math.min(m.y1,m.y2)/pageMM.h,x1:Math.max(m.x1,m.x2)/pageMM.w,y1:Math.max(m.y1,m.y2)/pageMM.h,_memo:true});
    } return norm;
  }

  // Grid + rulers + HUD + crosshair
  function drawGridAndRulers(){
    overlay.setAttribute("viewBox",`0 0 ${BACK.pxW} ${BACK.pxH}`); overlay.innerHTML="";
    const g=mk("g",{class:"ro-grid"}); overlay.appendChild(g);
    const pxPerMM=BACK.pxW/(pageMM.w||1); const mmStep=pxPerMM; const cmStep=pxPerMM*10;
    for(let x=0; x<=BACK.pxW+0.5; x+=mmStep){ const major=Math.round(x/cmStep)===x/cmStep; g.appendChild(mk("line",{x1:x,y1:0,x2:x,y2:BACK.pxH,class:major?"cm":"mm"})); }
    for(let y=0; y<=BACK.pxH+0.5; y+=mmStep){ const major=Math.round(y/cmStep)===y/cmStep; g.appendChild(mk("line",{x1:0,y1:y,x2:BACK.pxW,y2:y,class:major?"cm":"mm"})); }
    const top=mk("g",{class:"ruler top"}), left=mk("g",{class:"ruler left"}); overlay.appendChild(top); overlay.appendChild(left);
    const cmX=Math.floor(pageMM.w/10), cmY=Math.floor(pageMM.h/10);
    for(let i=0;i<=cmX;i++){ const x=i*10*pxPerMM; top.appendChild(mk("text",{x,y:12,class:"tick"})).textContent=String(i*10); }
    for(let i=0;i<=cmY;i++){ const y=i*10*pxPerMM; left.appendChild(mk("text",{x:12,y,class:"tick"})).textContent=String(i*10); }
    const cx=mk("line",{class:"cross v",x1:0,y1:0,x2:0,y2:BACK.pxH}); const cy=mk("line",{class:"cross h",x1:0,y1:0,x2:BACK.pxW,y2:0}); overlay.appendChild(cx); overlay.appendChild(cy);
    overlay.addEventListener("mousemove",(e)=>{ const p=percentPos(e); const x=p.x*pageMM.w,y=p.y*pageMM.h; hud.textContent=`x=${fmt(x)}mm y=${fmt(y)}mm`; cx.setAttribute("x1",p.x*BACK.pxW); cx.setAttribute("x2",p.x*BACK.pxW); cy.setAttribute("y1",p.y*BACK.pxH); cy.setAttribute("y2",p.y*BACK.pxH); });
  }

  function renderMarkers(list){
    overlay.querySelector(".ro-markers")?.remove();
    const g=mk("g",{class:"ro-markers"});
    (list||[]).forEach(m=>{
      if(m.kind==="point"){
        const el=mk("circle",{cx:m.x*BACK.pxW, cy:m.y*BACK.pxH, r:4});
        const w=mk("g",{class:"ro-marker memo"}); w.appendChild(el);
        w.addEventListener("click",()=>setToken(metricToken(m.x,m.y))); g.appendChild(w);
      }else{
        const x=Math.min(m.x0,m.x1)*BACK.pxW, y=Math.min(m.y0,m.y1)*BACK.pxH;
        const w=Math.abs(m.x1-m.x0)*BACK.pxW, h=Math.abs(m.y1-m.y0)*BACK.pxH;
        const el=mk("rect",{x,y,width:w,height:h,rx:3,ry:3});
        const W=mk("g",{class:"ro-marker memo"}); W.appendChild(el);
        W.addEventListener("click",()=>setToken(metricToken((m.x0+m.x1)/2,(m.y0+m.y1)/2)+" • box")); g.appendChild(W);
      }
    });
    overlay.appendChild(g);
  }
  const refreshMemoMarkers = ()=> renderMarkers(markersFromMemoForPage(currentPage));

  function wirePointer(){
    overlay.addEventListener("pointerdown",(e)=>{
      const p=percentPos(e);
      if(mode==="point"){
        setToken(metricToken(p.x,p.y));
        insertMemoMarkup(mmPointMarkup(currentPage,p.x,p.y));
      }else{
        dragBox={x0:p.x,y0:p.y,x1:p.x,y1:p.y};
        let ghost=overlay.querySelector(".ro-ghost");
        if(!ghost){ ghost=mk("rect",{class:"ro-ghost",x:0,y:0,width:0,height:0,rx:3,ry:3}); overlay.appendChild(ghost); }
        const upd=()=>{ const x=Math.min(dragBox.x0,dragBox.x1)*BACK.pxW, y=Math.min(dragBox.y0,dragBox.y1)*BACK.pxH;
          const w=Math.abs(dragBox.x1-dragBox.x0)*BACK.pxW, h=Math.abs(dragBox.y1-dragBox.y0)*BACK.pxH;
          ghost.setAttribute("x",x); ghost.setAttribute("y",y); ghost.setAttribute("width",w); ghost.setAttribute("height",h); };
        const onMove=(ev)=>{ const q=percentPos(ev); dragBox.x1=q.x; dragBox.y1=q.y; upd(); };
        const onUp=()=>{ overlay.removeEventListener("pointermove",onMove); overlay.removeEventListener("pointerup",onUp); overlay.querySelector(".ro-ghost")?.remove();
          setToken(metricToken((dragBox.x0+dragBox.x1)/2,(dragBox.y0+dragBox.y1)/2)+" • box");
          insertMemoMarkup(mmBoxMarkup(currentPage,dragBox.x0,dragBox.y0,dragBox.x1,dragBox.y1)); dragBox=null; };
        upd(); overlay.addEventListener("pointermove",onMove); overlay.addEventListener("pointerup",onUp,{once:true});
      }
    });
  }

  // Zoom
  btnZoomFit?.addEventListener("click",()=>{ drawGridAndRulers(); refreshMemoMarkers(); });
  btnZoomIn ?.addEventListener("click",()=>{ canvas.style.transform="scale(1.1)"; });
  btnZoomOut?.addEventListener("click",()=>{ canvas.style.transform="scale(0.9)"; });
  btnPoint  ?.addEventListener("click",()=>{ mode="point"; btnPoint.classList.add("on"); btnBox.classList.remove("on"); });
  btnBox    ?.addEventListener("click",()=>{ mode="box";   btnBox.classList.add("on");  btnPoint.classList.remove("on"); });

  btnExport?.addEventListener("click",()=>{
    const list = markersFromMemoForPage(currentPage).map(m=>{
      if(m.kind==="point") return {page:currentPage,kind:"point",x_mm:m.x*pageMM.w,y_mm:m.y*pageMM.h};
      return {page:currentPage,kind:"box",x1_mm:m.x0*pageMM.w,y1_mm:m.y0*pageMM.h,x2_mm:m.x1*pageMM.w,y2_mm:m.y1*pageMM.h};
    });
    const blob=new Blob([JSON.stringify(list,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download=`markers-p${currentPage}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),800);
  });

  // PDF load
  (async ()=>{
    try{
      if(!pdfUrl||!fromPage) return;
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsLib.GlobalWorkerOptions.workerSrc ||
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
      const doc = await pdfjsLib.getDocument(pdfUrl).promise; pdfDoc=doc;
      currentPage = Math.max(1, Math.min(fromPage, doc.numPages));
      const page = await doc.getPage(currentPage);
      const vp1  = page.getViewport({scale:1});
      pageMM = { w: (vp1.width/72)*25.4, h: (vp1.height/72)*25.4 };
      stage.dataset.pageMmW = String(pageMM.w);
      stage.dataset.pageMmH = String(pageMM.h);

      const cssW = stage.clientWidth || 800;
      const scale = (initialZoom==="fit") ? (cssW/vp1.width) : (Number(initialZoom)||1);
      const vp   = page.getViewport({scale});
      canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
      BACK.pxW = canvas.width; BACK.pxH = canvas.height;

      const ctx = canvas.getContext("2d");
      await page.render({canvasContext:ctx, viewport:vp}).promise;

      drawGridAndRulers();
      wirePointer();
      if(memo && !memo.__wired){ memo.__wired=true; memo.addEventListener("input",refreshMemoMarkers); }
      refreshMemoMarkers();
    }catch(e){ console.error("[grid] PDF load failed", e); }
  })();
}
