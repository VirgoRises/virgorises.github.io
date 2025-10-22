// /cafes/zeta-zero-cafe/js/ro/tokens.js
import { STATE } from './state.js';
import { escapeHtml } from './util.js';
import { renderThumbs } from './viewer.js';
import { typeset } from './util.js';

// Parse and index tokens
const TOKEN_RE = /\[(mm\|)?\s*(?:p|page)(\d+)\s*=\s*([^\]]+)\]/g;

export function indexTokens(text){
  STATE.tokensByPage.clear();
  for (const m of text.matchAll(TOKEN_RE)) {
    const isInvalidated = /\[del\]\s*$/.test(text.slice(Math.max(0, m.index-6), m.index));
    if (isInvalidated) continue;
    const page = Number(m[2]);
    const rhs  = m[3].trim().replace(/^"|"$/g,'');
    const parts = rhs.split(':').map(s=>s.trim());
    let label = 'label';
    if (parts.length>=2 && /^".*"$/.test(parts[parts.length-1])) label = parts.pop().slice(1,-1);
    else if (parts.length>=3 && /^".*"$/.test(parts[2])) label = parts[2].slice(1,-1);
    const parsePair = p => p.split(',').map(v=>Number(v.trim()));
    const p1 = parsePair(parts[0] || '0,0');
    const isBox = parts.length>=2 && parts[1] && !parts[1].startsWith('"');
    const p2 = isBox ? parsePair(parts[1]) : null;
    const entry = { kind: isBox?'box':'point', p1, p2, label };
    if (!STATE.tokensByPage.has(page)) STATE.tokensByPage.set(page, []);
    STATE.tokensByPage.get(page).push(entry);
  }
  STATE.referencedPages = new Set([...STATE.tokensByPage.keys()]);
}

export function drawMarkersForPage(page){
  drawGrid(); // viewer.js exported? we duplicate grid call via event
  const c = STATE.dom.overlay, ctx=c.getContext('2d');
  const toks = STATE.tokensByPage.get(page)||[];
  const {w,h}=STATE.pageMM; const pxW=c.width/w, pxH=c.height/h;
  const toPx = ([a,b]) => (a<=1 && b<=1) ? [a*c.width, b*c.height] : [a*pxW, b*pxH];
  ctx.save(); ctx.lineWidth=2; ctx.strokeStyle='rgba(129,169,255,.95)'; ctx.fillStyle='rgba(129,169,255,.18)'; ctx.font='12px ui-monospace, monospace'; ctx.textBaseline='bottom';
  toks.forEach(t=>{
    if(t.kind==='point'){ const [x,y]=toPx(t.p1); ctx.beginPath(); ctx.arc(x,y,Math.max(c.width,c.height)*0.006,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.fillText(t.label||'label',x+6,y-4); }
    else { const [x1,y1]=toPx(t.p1), [x2,y2]=toPx(t.p2); const l=Math.min(x1,x2), t0=Math.min(y1,y2), w=Math.abs(x2-x1), h0=Math.abs(y2-y1); ctx.fillRect(l,t0,w,h0); ctx.strokeRect(l,t0,w,h0); ctx.fillText(t.label||'label', l+4, t0+h0-4); }
  });
  ctx.restore();
}

// External events from viewer tools
window.addEventListener('ro:addPoint', (ev)=>{
  const { page, x, y } = ev.detail || {};
  if (page==null) return;
  insertAtCaret(`[mm|p${page}=${x},${y}:"label"]\n`);
});
window.addEventListener('ro:addBox', (ev)=>{
  const { page, a, b } = ev.detail || {};
  if (page==null) return;
  insertAtCaret(`[mm|p${page}=${a.x},${a.y}:${b.x},${b.y}:"label"]\n`);
});
window.addEventListener('ro:insertToken', (ev)=>{
  const { token } = ev.detail || {};
  if (token) insertAtCaret(token + '\n');
});
window.addEventListener('ro:invalidatePage', (ev)=>{
  const { page } = ev.detail || {}; if (!page) return;
  const ta = STATE.dom.memoTa;
  const txt = ta.value.replace(/\[mm\|\s*(?:p|page)(\d+)\s*=[^\]]*?\]|\[\s*(?:p|page)(\d+)\s*=[^\]]*?\]/g,
    (m, p1, p2, off, whole) => { const num=Number(p1||p2); if(num!==page) return m; return m.replace(/^\[/,'[del]'); });
  if (txt!==ta.value){ ta.value=txt; onMemoChange(); }
});

function insertAtCaret(text){
  const el = STATE.dom.memoTa;
  const start = el.selectionStart ?? el.value.length;
  const end   = el.selectionEnd ?? el.value.length;
  el.value = el.value.slice(0,start) + text + el.value.slice(end);
  const pos = start + text.length; el.setSelectionRange(pos,pos); el.focus({preventScroll:true});
  onMemoChange();
}

export function onMemoChange(){
  STATE.autosave?.markDirty();
  STATE.autosave?.schedule();
  indexTokens(STATE.dom.memoTa.value);
  renderThumbs();
  window.requestAnimationFrame(()=> {
    const e = new CustomEvent('ro:redrawMarkers', { detail: { page: STATE.activePage }});
    window.dispatchEvent(e);
  });
  // live preview
  try {
    STATE.dom.memoPrev.innerHTML = (window.marked?.parse ? window.marked.parse(STATE.dom.memoTa.value) : escapeHtml(STATE.dom.memoTa.value));
    typeset(STATE.dom.memoPrev);
    window.dispatchEvent(new CustomEvent('ro:previewPush'));
  } catch {
    STATE.dom.memoPrev.innerHTML = `<div class="warn">Preview failed to render.</div>`;
  }
}

// Expose grid redraw trigger for viewer
function drawGrid(){ const evt = new Event('ro:drawGrid'); window.dispatchEvent(evt); }
