// /cafes/zeta-zero-cafe/js/ro/viewer.js
import { STATE } from './state.js';
import { $, pad3, clamp, log } from './util.js';
import { drawMarkersForPage } from './tokens.js';

const MIN_SCALE = 0.25, MAX_SCALE = 4;
const sliderToScale = (v) => { const vv=Number(v); return vv>=0 ? 1 + (MAX_SCALE-1)*(vv/4) : 1/(1+(MAX_SCALE-1)*((-vv)/4)); };
const scaleToSlider = (s) => s>=1 ? ((s-1)/(MAX_SCALE-1))*4 : -((1/s-1)/(MAX_SCALE-1))*4;

export function bootViewer(){
  const D = STATE.dom;

  setTool('pan');
  D.toolPanBtn?.addEventListener('click', () => setTool('pan'));
  D.toolPointBtn?.addEventListener('click', () => setTool('point'));
  D.toolBoxBtn?.addEventListener('click', () => setTool('box'));

  D.zoomSlider?.addEventListener('input', () => {
    const r = D.viewer.getBoundingClientRect();
    const cx = r.width/2, cy = r.height/2;
    const ix = (cx - STATE.tx) / STATE.scale;
    const iy = (cy - STATE.ty) / STATE.scale;
    const next = clamp(sliderToScale(D.zoomSlider.value), MIN_SCALE, MAX_SCALE);
    STATE.tx = cx - ix * next; STATE.ty = cy - iy * next; STATE.scale = next; applyTransform();
  });
  D.zoomFitBtn?.addEventListener('click', () => fitToViewer());
  D.zoom100Btn?.addEventListener('click', () => { STATE.scale=1; applyTransform(); });

  D.viewer.addEventListener('wheel', onWheel, { passive:false });
  D.viewer.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  D.btnPrev?.addEventListener('click', () => setActivePage((STATE.activePage||1)-1, 'prev'));
  D.btnNext?.addEventListener('click', () => setActivePage((STATE.activePage||1)+1, 'next'));
  D.btnPrimary?.addEventListener('click', () => setActivePage(STATE.primaryPage, 'primary'));
  D.btnAddRef?.addEventListener('click', () => {
    if (STATE.activePage==null) return;
    const e = new CustomEvent('ro:insertToken', { detail: { page: STATE.activePage, token:`[mm|p${STATE.activePage}=0,0:"label"]` }});
    window.dispatchEvent(e);
  });

  const ro = new ResizeObserver(()=>{ if (D.pageImg?.naturalWidth) fitToViewer(); });
  if (D.viewer) ro.observe(D.viewer);
  window.addEventListener('resize', ()=>{ if (D.pageImg?.naturalWidth) fitToViewer(); });
}

export function thumbUrlForPage(n){ return `${STATE.cafeBase}/sources/thumbs/page-${pad3(n)}.jpg`; }

export function setActivePage(n, src='ui'){
  if (!n || n<1) return;
  STATE.activePage = n;
  const url = thumbUrlForPage(n);
  const D = STATE.dom;
  D.pageImg.src = url; D.pageImg.alt = `Page ${n}`;
  D.pageImg.onerror = () => { D.pageImg.removeAttribute('src'); D.pageImg.alt = `Missing thumbnail for page ${n}`; };
  highlight(n); scrollToActive();
  D.pageImg.onload = () => { fitToViewer(); computePageMM(); sizeOverlay(); drawGrid(); drawMarkersForPage(n); };
  log('activePage <-', n, `(${src})`);
}

export function renderThumbs(){
  const D = STATE.dom;
  const all = new Set(STATE.referencedPages);
  if (STATE.primaryPage) all.add(STATE.primaryPage);
  const ordered = Array.from(all).sort((a,b)=>a-b);
  D.thumbsWrap.classList.add('thumbs');
  D.thumbsWrap.innerHTML='';
  ordered.forEach(n=>{
    const item = document.createElement('div');
    item.className = 'thumb' + (n===STATE.primaryPage?' primary':'');
    item.dataset.page = String(n);
    const img = document.createElement('img'); img.loading='lazy'; img.decoding='async'; img.src=thumbUrlForPage(n); img.alt=`p${n}`;
    const tag = document.createElement('span'); tag.className='thumb-tag'; tag.textContent=`p${n}`;
    const del = document.createElement('button'); del.className='thumb-x'; del.textContent='×'; del.title='Invalidate all tokens for this page';
    del.addEventListener('click', (e)=>{ e.stopPropagation(); window.dispatchEvent(new CustomEvent('ro:invalidatePage',{detail:{page:n}})); });
    item.append(img, tag, del);
    item.addEventListener('click', ()=>setActivePage(n,'thumb'));
    D.thumbsWrap.appendChild(item);
  });
  highlight(STATE.activePage ?? STATE.primaryPage);
  scrollToActive();
}

// ——— internals
function highlight(n){
  document.querySelectorAll('#pageChips .thumb').forEach(el=>el.classList.toggle('active', Number(el.dataset.page)===n));
}
function scrollToActive(){
  const parent = STATE.dom.thumbsWrap;
  const el = parent?.querySelector('.thumb.active'); if(!el) return;
  const center = el.offsetLeft + el.offsetWidth/2;
  const target = Math.max(0, center - parent.clientWidth/2);
  parent.scrollTo({ left: target, behavior:'smooth' });
}

function applyTransform(){ STATE.dom.stage.style.transform = `translate(${STATE.tx}px,${STATE.ty}px) scale(${STATE.scale})`; const t=STATE.dom.zoomRead; if(t) t.textContent=`${STATE.scale.toFixed(2)}×`; const s=STATE.dom.zoomSlider; if(s) s.value=String(scaleToSlider(STATE.scale)); }
function fitToViewer(){
  const D=STATE.dom;
  if(!D.pageImg.complete || !D.pageImg.naturalWidth){ STATE.scale=1; STATE.tx=0; STATE.ty=0; applyTransform(); return; }
  const vw=D.viewer.clientWidth, vh=D.viewer.clientHeight, iw=D.pageImg.naturalWidth, ih=D.pageImg.naturalHeight;
  const s=Math.min(vw/iw, vh/ih); STATE.scale = clamp(s, MIN_SCALE, MAX_SCALE);
  STATE.tx = (vw - iw*STATE.scale)/2; STATE.ty = (vh - ih*STATE.scale)/2; applyTransform();
}
function onWheel(ev){
  if(!(ev.ctrlKey||ev.shiftKey)) return;
  ev.preventDefault();
  const r = STATE.dom.viewer.getBoundingClientRect();
  const mx = ev.clientX - r.left, my = ev.clientY - r.top;
  const ix = (mx - STATE.tx)/STATE.scale, iy = (my - STATE.ty)/STATE.scale;
  const next = clamp(STATE.scale + (ev.deltaY<0?-0.1:0.1), MIN_SCALE, MAX_SCALE);
  STATE.tx = mx - ix*next; STATE.ty = my - iy*next; STATE.scale = next; applyTransform();
}
function setTool(name){
  STATE.tool = name;
  [STATE.dom.toolPanBtn, STATE.dom.toolPointBtn, STATE.dom.toolBoxBtn].forEach(b=>b?.classList.remove('active'));
  ({pan:STATE.dom.toolPanBtn, point:STATE.dom.toolPointBtn, box:STATE.dom.toolBoxBtn})[name]?.classList.add('active');
  STATE.dom.viewer.classList.toggle('cursor-cross', name!=='pan');
}
function toImageSpace(cx,cy){
  const r=STATE.dom.viewer.getBoundingClientRect();
  return { x:(cx-r.left-STATE.tx)/STATE.scale, y:(cy-r.top-STATE.ty)/STATE.scale };
}
function onMouseDown(ev){
  const p = toImageSpace(ev.clientX, ev.clientY);
  if(STATE.tool==='pan'){ STATE.dragging=true; STATE.dragStart={x:ev.clientX-STATE.tx,y:ev.clientY-STATE.ty}; return; }
  if(STATE.tool==='point'){
    const mm = toMM(p.x,p.y,true);
    window.dispatchEvent(new CustomEvent('ro:addPoint',{detail:{page:STATE.activePage,x:mm.x,y:mm.y}}));
    return;
  }
  if(STATE.tool==='box'){ STATE.dragging=true; STATE.boxStart=p; drawLiveBox(p.x,p.y,p.x,p.y); }
}
function onMouseMove(ev){
  if(!STATE.dragging) return;
  if(STATE.tool==='pan'){ STATE.tx = ev.clientX-STATE.dragStart.x; STATE.ty = ev.clientY-STATE.dragStart.y; applyTransform(); return; }
  if(STATE.tool==='box'){ const p=toImageSpace(ev.clientX,ev.clientY); drawLiveBox(STATE.boxStart.x,STATE.boxStart.y,p.x,p.y); }
}
function onMouseUp(ev){
  if(!STATE.dragging) return;
  if(STATE.tool==='box'){ const end=toImageSpace(ev.clientX,ev.clientY); const a=toMM(STATE.boxStart.x,STATE.boxStart.y,true), b=toMM(end.x,end.y,true); window.dispatchEvent(new CustomEvent('ro:addBox',{detail:{page:STATE.activePage,a,b}})); }
  STATE.dragging=false; STATE.boxStart=null;
}
function drawLiveBox(x1,y1,x2,y2){
  drawGrid();
  const ctx=STATE.dom.overlay.getContext('2d'); const l=Math.min(x1,x2), t=Math.min(y1,y2), w=Math.abs(x2-x1), h=Math.abs(y2-y1);
  ctx.save(); ctx.strokeStyle='rgba(129,169,255,.95)'; ctx.fillStyle='rgba(129,169,255,.18)'; ctx.lineWidth=2; ctx.fillRect(l,t,w,h); ctx.strokeRect(l,t,w,h); ctx.restore();
}
function toMM(x,y,round){
  const {w,h}=STATE.pageMM; const X=x/STATE.dom.overlay.width*w; const Y=y/STATE.dom.overlay.height*h; return {x:round?Math.round(X):X, y:round?Math.round(Y):Y};
}
function computePageMM(){
  const iw=STATE.dom.pageImg.naturalWidth, ih=STATE.dom.pageImg.naturalHeight; if(!iw||!ih){ STATE.pageMM={w:210,h:297,standard:'A4'}; return; }
  const r=ih/iw, a4=297/210, letter=279/216; const dA4=Math.abs(r-a4), dL=Math.abs(r-letter);
  STATE.pageMM = dA4<0.06 ? {w:210,h:297,standard:'A4'} : dL<0.06 ? {w:216,h:279,standard:'Letter'} : {w:210,h:Math.round(210*r),standard:'Custom'};
}
function sizeOverlay(){ const c=STATE.dom.overlay; c.width  = STATE.dom.pageImg.naturalWidth  || c.width; c.height = STATE.dom.pageImg.naturalHeight || c.height; }
function drawGrid(){
  const c=STATE.dom.overlay, ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height);
  const {w,h}=STATE.pageMM; const pxW=c.width/w, pxH=c.height/h;
  ctx.save(); ctx.lineWidth=1; ctx.strokeStyle='rgba(255,255,255,.07)';
  for(let x=5;x<w;x+=5){ const px=Math.round(x*pxW)+.5; ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,c.height); ctx.stroke(); }
  for(let y=5;y<h;y+=5){ const py=Math.round(y*pxH)+.5; ctx.beginPath(); ctx.moveTo(0,py); ctx.lineTo(c.width,py); ctx.stroke(); }
  ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.fillStyle='rgba(255,255,255,.6)'; ctx.font='12px ui-monospace, monospace'; ctx.textBaseline='top';
  for(let x=10;x<w;x+=10){ const px=Math.round(x*pxW)+.5; ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,c.height); ctx.stroke(); ctx.fillText(String(x), px+2,2); }
  for(let y=10;y<h;y+=10){ const py=Math.round(y*pxH)+.5; ctx.beginPath(); ctx.moveTo(0,py); ctx.lineTo(c.width,py); ctx.stroke(); ctx.fillText(String(y), 2, py+2); }
  ctx.strokeStyle='rgba(255,179,71,.55)'; ctx.lineWidth=2; ctx.strokeRect(.5,.5,c.width-1,c.height-1);
  ctx.restore();
}
