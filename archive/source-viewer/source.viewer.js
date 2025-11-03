// /js/source.viewer.js
(() => {
  const $ = sel => document.querySelector(sel);

  // Parse query
  const p = new URLSearchParams(location.search);
  const slug     = location.pathname.split('/')[2]; // cafes/<slug>/...
  const pdfName  = p.get('pdf') || 'Old_main';
  const para     = p.get('para') || null;
  const ret      = decodeURIComponent(p.get('return') || '');
  const pageQ    = parseInt(p.get('page') || '0', 10);
  const yQ       = parseFloat(p.get('y') || '0');

  // Where files live
  const pdfUrl = `/cafes/${slug}/sources/${pdfName}.pdf`;
  const mapUrl = `/cafes/${slug}/sources/${pdfName.toLowerCase()}.map.json`;

  $("#backBtn").onclick = () => ret ? location.href = ret : history.back();
  $("#title").textContent = `${pdfName}.pdf`;
  $("#hint").textContent = para ? `Linked from ${para}` : '';

  // PDF.js setup
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.6.82/build/pdf.worker.min.js`;

  const eventBus = new pdfjsViewer.EventBus();
  const linkService = new pdfjsViewer.PDFLinkService({ eventBus });
  const findController = new pdfjsViewer.PDFFindController({ eventBus, linkService });

  const viewer = new pdfjsViewer.PDFViewer({
    container: document.getElementById('viewerContainer'),
    eventBus, linkService, findController,
    removePageBorders: true
  });
  linkService.setViewer(viewer);

  let map = { map: [] };
  let pdfDoc = null;

  async function loadAll() {
    try {
      const [m, pdf] = await Promise.all([
        fetch(mapUrl).then(r => r.ok ? r.json() : {map:[]}),
        pdfjsLib.getDocument({ url: pdfUrl, enableXfa: false, isEvalSupported:false, enableScripting:false }).promise
      ]);
      map = m || {map:[]};
      pdfDoc = pdf;
      viewer.setDocument(pdf);
      linkService.setDocument(pdf);
      // When first pages are ready, navigate
      eventBus.on('pagesinit', () => {
        // Prefer para→mapping; else use page/y; else do nothing
        const target = para ? map.map.find(m => m.para === para) : null;
        if (target && target.page) {
          jumpTo(target.page, target.y ?? 0.1);
        } else if (pageQ > 0) {
          jumpTo(pageQ, isNaN(yQ) ? 0.1 : yQ);
        }
      });
    } catch (e) {
      console.error('PDF load error', e);
    }
  }

  function jumpTo(pageNumber, yFrac=0.1) {
    const page = Math.max(1, Math.min(pageNumber, viewer.pagesCount || 1));
    viewer.currentPageNumber = page;
    // Wait a tick for layout, then scroll
    requestAnimationFrame(() => {
      const pageView = viewer.getPageView(page - 1);
      if (!pageView) return;
      const pageEl = pageView.div;
      const y = pageEl.offsetTop + (pageEl.clientHeight * yFrac) - (0.12 * window.innerHeight);
      document.getElementById('viewerContainer').scrollTo({ top: y, behavior: 'smooth' });
    });
  }

  // Click → report coordinates back (for a future mapping UI)
  $('#viewerContainer').addEventListener('click', e => {
    const pageEls = [...document.querySelectorAll('.page')];
    const hit = pageEls.find(el => el.contains(e.target));
    if (!hit) return;
    const rect = hit.getBoundingClientRect();
    const yFrac = (e.clientY - rect.top) / rect.height;
    // post back to opener/parent if present
    const payload = { type:'pdf-click', page: parseInt(hit.dataset.pageNumber,10), y: Math.max(0,Math.min(1,yFrac)) };
    if (window.opener) window.opener.postMessage(payload, '*');
    if (window.parent && window.parent !== window) window.parent.postMessage(payload, '*');
  });

  // Listen for paragraph jump requests
  window.addEventListener('message', evt => {
    if (!evt.data || evt.data.type !== 'jump-to-para') return;
    const t = map.map.find(m => m.para === evt.data.para);
    if (t && t.page) jumpTo(t.page, t.y ?? 0.1);
  });

  loadAll();
})();
