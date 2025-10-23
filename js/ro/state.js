// /js/ro/state.js
import { $, escapeHtml } from './util.js';

export const STATE = {
  params: null,
  cafeBase: '',
  chapterSlug: '',
  chapterFile: '',
  chapterDoc: null,
  _chapterUrlResolved: null,
  primaryPage: null,
  activePage: null,
  referencedPages: new Set(),
  tokensByPage: new Map(),
  scale: 1, tx: 0, ty: 0,
  dragging: false, dragStart: {x:0,y:0},
  tool: 'pan', boxStart: null,
  pageMM: { w:210, h:297, standard:'A4' },
  dom: {},
  autosave: null,
  saveCaret: null,
  renderHistoryUI: null,
};

export function initParams(){
  const params = new URLSearchParams(location.search);
  STATE.params = {
    paraId: params.get('para') || '',
    chapter: decodeURIComponent(params.get('chapter')||''),
    rodebug: params.get('rodebug') === '1',
    retUrl: decodeURIComponent(params.get('return')||'')
  };
  window.RO_DEBUG = STATE.params.rodebug;
  const pathParts = location.pathname.split('/').filter(Boolean);
  const cafeSlug = pathParts[1] || 'zeta-zero-cafe';
  STATE.cafeBase = `/cafes/${cafeSlug}`;
  STATE.chapterFile = STATE.params.chapter.split('/').pop() || '';
  STATE.chapterSlug = STATE.chapterFile.replace(/\.html$/,'');
}

export function initDom(){
  STATE.dom = {
    backBtn:     $('#backLink'),
    numBadge:    $('#paraNum'),
    chapNameEl:  $('#chapName'),
    cafeNameEl:  $('#cafeName'),
    previewBox:  $('#paraPreview'),
    figsList:    $('#figList'),
    tblList:     $('#tblList'),
    copyBtn:     $('#copyLink'),
    statusLine:  $('#roStatus'),
    thumbsWrap:  $('#pageChips'),
    viewer:      $('#viewer'),
    stage:       $('#stage'),
    pageImg:     $('#pageImg'),
    overlay:     $('#overlay'),
    toolPanBtn:  $('#toolPan'),
    toolPointBtn:$('#toolPoint'),
    toolBoxBtn:  $('#toolBox'),
    zoomSlider:  $('#zoomSlider'),
    zoomRead:    $('#zoomRead'),
    zoomFitBtn:  $('#zoomFit'),
    zoom100Btn:  $('#zoom100'),
    btnPrev:     $('#pagePrev'),
    btnPrimary:  $('#pagePrimary'),
    btnNext:     $('#pageNext'),
    btnAddRef:   $('#pageAddRef'),
    memoTa:      $('#memoBody'),
    memoPrev:    $('#memoPreview'),
    memoList:    $('#memoList'),
  };
  STATE.dom.chapNameEl.textContent = STATE.chapterFile.replace(/\.html$/,'');
  const pathParts = location.pathname.split('/').filter(Boolean);
  STATE.dom.cafeNameEl.textContent = pathParts[1] || 'zeta-zero-cafe';
}

export function setBackLink(){
  const href = STATE.params.retUrl || `${STATE.cafeBase}/${STATE.params.chapter}`;
  STATE.dom.backBtn?.addEventListener('click', e => { e.preventDefault(); location.href = href; });
}

export function setBadge(n){
  if (!STATE.dom.numBadge) return;
  STATE.dom.numBadge.textContent = n!=null ? `#${n}` : '#';
  STATE.dom.numBadge.title = n!=null ? `Paragraph ${n}` : '';
}

export function statusTags(o){
  const bits = [
    `chapter: ${escapeHtml(STATE.params.chapter)}`,
    `para: ${escapeHtml(STATE.params.paraId)}`,
    `primary: ${o?.chosen ?? '?'}`,
    (o?.inHtml? `html=${o.inHtml}`:''),
    (o?.fromManifest? `manifest=${o.fromManifest}`:'')
  ].filter(Boolean);
  STATE.dom.statusLine.innerHTML = bits.map(b=>`<span class="tag">${b}</span>`).join(' ');
}
