// /js/ro/preview-popout.js
import { STATE } from '/js/ro/state.js';
import { getHistory } from '/js/ro/autosave.js';
import { getAllDrafts } from '/js/ro/drafts.js';

let previewWin = null;
let previewDlg = null;

function buildHTML(baseHref) {
  const CSS = `
    :root{color-scheme: dark} *{box-sizing:border-box} html,body{height:100%}
    body{margin:0;font:14px/1.55 system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;background:#0B1117;color:#E6EDF3}
    header{position:sticky;top:0;padding:10px 14px;background:#0F141A;border-bottom:1px solid #1f2a36;display:flex;justify-content:space-between;align-items:center;z-index:10}
    #wrap{display:grid;grid-template-columns:280px 1fr;min-height:100%;min-width:0}
    #side{border-right:1px solid #1f2a36;background:#0F141A;min-height:0;display:flex;flex-direction:column;min-width:0}
    #tabs{display:flex;gap:6px;padding:8px;border-bottom:1px solid #1f2a36}
    #tabs button{all:unset;padding:6px 10px;border-radius:8px;border:1px solid #273341;cursor:pointer}
    #tabs button.active{background:#182231}
    #lists{flex:1;overflow:auto;padding:8px;min-width:0}
    .item{padding:8px;border:1px solid #1f2a36;border-radius:8px;margin:6px 0}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:12px;opacity:.9}
    #container{padding:16px;max-width:980px;margin:0 auto;min-width:0}
    h1{font-size:28px;line-height:1.25;margin:16px 0 6px} h2{font-size:22px;margin:14px 0 6px} h3{font-size:18px;margin:12px 0 6px}
    p{margin:8px 0} img,video,canvas,svg{display:block;max-width:100%;height:auto}
    table{width:100%;border-collapse:collapse;margin:10px 0} th,td{border:1px solid #273341;padding:6px 8px;vertical-align:top}
    pre{background:#0F141A;border:1px solid #1f2a36;padding:12px;border-radius:8px;overflow:auto}
    code,pre,tt,kbd,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:12.5px} pre code{white-space:pre}
  `;

  // Use the canonical MathJax config + core that chapters use
  const mjConfigPath = '/cafes/zeta-zero-cafe/notebook/math/mathconfig.js';

  // multiple fallbacks for the MathJax core (CDN → CDNJS → UNPKG)
  // keep order; first one usually succeeds, others are safety nets
  const MJ_SOURCES = [
    'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js',
    'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js',
    'https://unpkg.com/mathjax@3/es5/tex-mml-chtml.js'
  ];

  return `<!doctype html><html><head><meta charset="utf-8"/>
<base href="${baseHref}">
<title>Live Preview</title>
<style>${CSS}</style>

<!-- 1) Your canonical MathJax config -->
<script src="${mjConfigPath}"></script>

<!-- 2) Robust loader: try multiple CDNs until one works -->
<script>
(function(){
  const srcs = ${JSON.stringify(MJ_SOURCES)};
  function load(i){
    if(i >= srcs.length){ console.error('[RO] MathJax failed to load from all sources'); return; }
    var s = document.createElement('script');
    s.defer = true; s.src = srcs[i];
    s.onload = function(){ /* ok */ };
    s.onerror = function(){ console.warn('[RO] MathJax failed:', srcs[i]); load(i+1); };
    document.head.appendChild(s);
  }
  load(0);
})();
</script>
</head>
<body>
  <header><strong>Live Preview</strong><span class="mono" id="stamp"></span></header>
  <div id="wrap">
    <aside id="side">
      <div id="tabs">
        <button id="tab-current" class="active">Current</button>
        <button id="tab-autosaves">Autosaves</button>
        <button id="tab-drafts">Drafts</button>
      </div>
      <div id="lists"></div>
    </aside>
    <main id="container"></main>
  </div>
  <script>
    const $ = (s,el=document)=>el.querySelector(s);
    const lists = $('#lists'), container = $('#container'), stamp = $('#stamp');
    const tabs = { current: $('#tab-current'), autosaves: $('#tab-autosaves'), drafts: $('#tab-drafts') };

    async function typesetReady(){
  // wait until MathJax is fully initialised (config + core)
  for (let i = 0; i < 60; i++) {                   // up to ~6s
    if (window.MathJax?.startup?.promise) break;
    await new Promise(r => setTimeout(r, 100));
  }
  try { await window.MathJax?.startup?.promise; } catch(_) {}
}

async function typeset(c){
  if (!c || !window.MathJax) return;
  await typesetReady();
  try {
    window.MathJax.typesetClear?.([c]);
    window.MathJax.texReset?.();
    if (window.MathJax.typesetPromise) {
      await window.MathJax.typesetPromise([c]);
    } else {
      window.MathJax.typeset?.([c]);   // optional if present
    }
  } catch(_) {}
}


    let PAYLOAD = null;

    function setTab(name){
      Object.values(tabs).forEach(b=>b.classList.remove('active'));
      tabs[name].classList.add('active');
      renderList(name);
    }

    function renderList(name){
      lists.innerHTML = '';
      if (!PAYLOAD) return;

      if (name === 'current') {
        const d=document.createElement('div');
        d.className='item';
        d.innerHTML = '<div class="mono">Current memo</div><div class="mono" style="opacity:.7">Live preview stays in sync as you type.</div>';
        const btn=document.createElement('button'); btn.textContent='Use this version'; btn.className='btn btn-sm'; btn.style='margin-top:6px';
        btn.addEventListener('click', ()=> parent.postMessage({kind:'ro_set_memo', body: PAYLOAD.currentBodyPlain}, '*'));
        d.appendChild(btn);
        lists.appendChild(d);
        container.innerHTML = PAYLOAD.html;
        typeset(container);
        stamp.textContent = new Date(PAYLOAD.ts).toLocaleTimeString();
      }

      if (name === 'autosaves') {
        if (!PAYLOAD.history?.length) {
          lists.innerHTML = '<div class="item mono">No autosaves.</div>';
        } else {
          PAYLOAD.history.forEach((h, idx) => {
            const row=document.createElement('div'); row.className='item';
            row.innerHTML = \`
              <div class="mono">\${new Date(h.ts).toLocaleString()}</div>
              <div class="mono" style="opacity:.8">\${(h.body||'').slice(0,140)}\${(h.body||'').length>140?'…':''}</div>
              <div style="display:flex;gap:6px;margin-top:8px">
                <button class="btn btn-sm" data-act="preview" data-i="\${idx}">Preview</button>
                <button class="btn btn-sm" data-act="use" data-i="\${idx}">Use this version</button>
              </div>\`;
            lists.appendChild(row);
          });
          lists.addEventListener('click', async (ev)=>{
            const t=ev.target; if (!(t instanceof HTMLElement)) return;
            const i = Number(t.dataset.i); if (Number.isNaN(i)) return;
            const h = PAYLOAD.history[i];
            if (t.dataset.act==='preview'){ container.innerHTML = h.html; await typeset(container); stamp.textContent = new Date(h.ts).toLocaleTimeString(); }
            if (t.dataset.act==='use'){ parent.postMessage({kind:'ro_set_memo', body: h.body}, '*'); }
          }, { once:true });
        }
      }

      if (name === 'drafts') {
        if (!PAYLOAD.drafts?.length) {
          lists.innerHTML = '<div class="item mono">No drafts stored in this browser.</div>';
        } else {
          PAYLOAD.drafts.forEach((d, idx) => {
            const row=document.createElement('div'); row.className='item';
            const meta = d.isCurrent ? 'current paragraph' : \`chapter: \${d.chapter} • para: \${d.paraId}\`;
            row.innerHTML = \`
              <div class="mono">\${new Date(d.ts).toLocaleString()} — <span style="opacity:.8">\${meta}</span></div>
              <div class="mono" style="opacity:.8">\${(d.body||'').slice(0,140)}\${(d.body||'').length>140?'…':''}</div>
              <div style="display:flex;gap:6px;margin-top:8px">
                <button class="btn btn-sm" data-act="preview" data-i="\${idx}">Preview</button>
                <button class="btn btn-sm" data-act="use" data-i="\${idx}" \${d.isCurrent?'':'disabled'}>Use here</button>
                <button class="btn btn-sm" data-act="open" data-i="\${idx}">Open draft</button>
              </div>\`;
            lists.appendChild(row);
          });
          lists.addEventListener('click', async (ev)=>{
            const t=ev.target; if (!(t instanceof HTMLElement)) return;
            const i = Number(t.dataset.i); if (Number.isNaN(i)) return;
            const d = PAYLOAD.drafts[i];
            if (t.dataset.act==='preview'){ container.innerHTML = d.html; await typeset(container); stamp.textContent = new Date(d.ts).toLocaleTimeString(); }
            if (t.dataset.act==='use'){ parent.postMessage({kind:'ro_set_memo', body: d.body}, '*'); }
            if (t.dataset.act==='open'){ parent.location.href = \`\${location.origin}\${location.pathname}?chapter=\${encodeURIComponent(d.chapter)}&para=\${encodeURIComponent(d.paraId)}\`; }
          }, { once:true });
        }
      }
    }

    window.addEventListener('message', async (ev) => {
      const d = ev.data || {}; if (d.kind !== 'ro_preview') return;
      PAYLOAD = d;
      // Show current on first load
      setTab('current');
    });

    tabs.current.addEventListener('click', ()=>setTab('current'));
    tabs.autosaves.addEventListener('click', ()=>setTab('autosaves'));
    tabs.drafts.addEventListener('click', ()=>setTab('drafts'));
  </script>
</body></html>`;
}

export function ensurePopPreviewButton() {
  const head = STATE.dom.memoPrev?.previousElementSibling?.classList.contains('head')
    ? STATE.dom.memoPrev.previousElementSibling
    : STATE.dom.memoPrev?.parentElement?.previousElementSibling?.classList.contains('head')
      ? STATE.dom.memoPrev.parentElement.previousElementSibling
      : null;

  const addBtn = (target) => {
    if (target.querySelector('#popPreviewBtn')) return;
    const btn = document.createElement('button'); btn.id = 'popPreviewBtn'; btn.className = 'btn btn-sm'; btn.textContent = 'Pop-out Preview';
    btn.style.marginLeft = '8px'; btn.title = 'Click: window · Shift+Click: in-page modal';
    btn.addEventListener('click', openPreview); target.appendChild(btn);
  };
  if (head) addBtn(head);
  else {
    if (!document.getElementById('popPreviewBtn')) {
      const btn = document.createElement('button'); btn.id = 'popPreviewBtn'; btn.className = 'btn btn-sm'; btn.textContent = 'Pop-out Preview';
      btn.style.cssText = 'position:sticky; left:100%; transform:translateX(-100%); margin:-8px 0 8px 0;'; btn.title = 'Click: window · Shift+Click: modal';
      btn.addEventListener('click', openPreview); STATE.dom.memoPrev?.parentElement?.insertBefore(btn, STATE.dom.memoPrev);
    }
  }
}

function buildPayload() {
  const hist = (getHistory() || []).slice(0, 20).map(s => ({
    ts: s.ts,
    body: s.body,
    html: window.marked?.parse ? window.marked.parse(s.body) : `<pre>${(s.body || '').replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))}</pre>`
  }));
  const draftsRaw = (getAllDrafts() || []).slice(0, 50);
  const drafts = draftsRaw.map(d => ({
    ts: d.ts, chapter: d.chapter, paraId: d.paraId,
    isCurrent: d.chapter === STATE.params.chapter && d.paraId === STATE.params.paraId,
    body: d.body,
    html: window.marked?.parse ? window.marked.parse(d.body || '') : `<pre>${(d.body || '').replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))}</pre>`
  }));
  return {
    kind: 'ro_preview',
    ts: Date.now(),
    html: STATE.dom.memoPrev.innerHTML,
    currentBodyPlain: STATE.dom.memoTa.value,
    history: hist,
    drafts: drafts,
    meta: { chapter: STATE.params.chapter, paraId: STATE.params.paraId }
  };
}

function openPreview(ev) {
  if (ev && ev.shiftKey) { openDialog(); return; }
  const baseHref = (STATE._chapterUrlResolved || location.href).replace(/\/[^/]*$/, '/');
  let w = null; try { w = window.open('about:blank', 'ro_live_preview', 'width=920,height=980'); } catch { }
  if (!w) {
    try {
      const html = buildHTML(baseHref); const blob = new Blob([html], { type: 'text/html' }); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.target = 'ro_live_preview'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
      w = window.open('', 'ro_live_preview');
    } catch { }
    if (!w) { openDialog(); return; }
  }
  if (w.document && !w.document.body.childElementCount) { w.document.open(); w.document.write(buildHTML(baseHref)); w.document.close(); }
  previewWin = w; push();
}

function openDialog() {
  if (!previewDlg) {
    const baseHref = (STATE._chapterUrlResolved || location.href).replace(/\/[^/]*$/, '/');
    previewDlg = document.createElement('dialog');
    previewDlg.id = 'roLivePreviewDlg'; previewDlg.style.cssText = 'width:min(1100px,calc(100vw - 48px)); max-height:90vh; padding:0; border:none; border-radius:12px; overflow:hidden; background:#0B1117; color:#E6EDF3;';
    previewDlg.innerHTML = buildHTML(baseHref);
    document.body.appendChild(previewDlg);
  }
  if (!previewDlg.open) previewDlg.showModal();
  push();
}

function push() {
  const payload = buildPayload();
  try { if (previewWin && !previewWin.closed) previewWin.postMessage(payload, '*'); } catch { }
  if (previewDlg && previewDlg.open) {
    // same-document HTML; simulate the pop-out message handler by dispatching to window
    window.dispatchEvent(new MessageEvent('message', { data: payload }));
    // Also update the dialog’s stamp if present
    const stamp = previewDlg.querySelector('#stamp');
    if (stamp) stamp.textContent = new Date(payload.ts).toLocaleTimeString();
    const container = previewDlg.querySelector('#container');
    if (container) container.innerHTML = payload.html;
    // MathJax is already loaded on the main page; typeset directly
    try {
      MathJax?.typesetClear?.([container]); MathJax?.texReset?.();
      (MathJax?.typesetPromise ? MathJax.typesetPromise([container]) : MathJax?.typeset?.([container]));
    } catch { }
  }
}

window.addEventListener('ro:previewPush', push);
