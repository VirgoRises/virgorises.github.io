// /js/ro/preview-popout.js
import { STATE } from './state.js';
import { getHistory } from './autosave.js';
import { getAllDrafts } from './drafts.js';

// Pop-out (window) and in-page modal (dialog)
let previewWin = null;
let previewDlg = null;

function buildHTML(baseHref){
  const CSS = `
    :root{color-scheme: dark} *{box-sizing:border-box} html,body{height:100%}
    body{margin:0;font:14px/1.55 system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;background:#0B1117;color:#E6EDF3}
    header{position:sticky;top:0;padding:10px 14px;background:#0F141A;border-bottom:1px solid #1f2a36;display:flex;justify-content:space-between;align-items:center;z-index:10}
    #wrap{display:grid;grid-template-columns:280px 1fr;min-height:100%}
    #side{border-right:1px solid #1f2a36;background:#0F141A;min-height:0;display:flex;flex-direction:column}
    #tabs{display:flex;gap:6px;padding:8px;border-bottom:1px solid #1f2a36}
    #tabs button{all:unset;padding:6px 10px;border-radius:8px;border:1px solid #273341;cursor:pointer}
    #tabs button.active{background:#182231}
    #lists{flex:1;overflow:auto;padding:8px}
    .item{padding:8px;border:1px solid #1f2a36;border-radius:8px;margin:6px 0}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:12px;opacity:.9}
    #container{padding:16px;max-width:980px;margin:0 auto}
    h1{font-size:28px;line-height:1.25;margin:16px 0 6px} h2{font-size:22px;margin:14px 0 6px} h3{font-size:18px;margin:12px 0 6px}
    p{margin:8px 0} img,video,canvas,svg{display:block;max-width:100%;height:auto}
    table{width:100%;border-collapse:collapse;margin:10px 0} th,td{border:1px solid #273341;padding:6px 8px;vertical-align:top}
    pre{background:#0F141A;border:1px solid #1f2a36;padding:12px;border-radius:8px;overflow:auto}
    code,pre,tt,kbd,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:12.5px} pre code{white-space:pre}
  `;
  const mjScript = document.getElementById('mathjax-script');
  const mjPath   = mjScript ? mjScript.getAttribute('src') : '/js/vendor/MathJax/tex-mml-chtml.js';
  const mjCfgEl  = document.getElementById('mathjax-config');
  const mjCfg    = mjCfgEl ? mjCfgEl.textContent : 'window.MathJax = { tex: { inlineMath: [[\'$\',\'$\'], [\'\\\\(\',\'\\\\)\']] } }';

  return `<!doctype html><html><head><meta charset="utf-8"/>
<base href="${baseHref}"><title>Live Preview</title><style>${CSS}</style>
<script id="mathjax-config">${mjCfg}</script><script src="${mjPath}"></script></head>
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
    function typeset(c){ try{ MathJax.typesetClear?.([c]); MathJax.texReset?.(); }catch(_){} return (MathJax.typesetPromise?MathJax.typesetPromise([c]):MathJax.typeset([c])); }
    const $ = (s,el=document)=>el.querySelector(s);
    const lists = $('#lists'), container = $('#container'), stamp = $('#stamp');
    const tabs = { current: $('#tab-current'), autosaves: $('#tab-autosaves'), drafts: $('#tab-drafts') };

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
        // show current in main
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
          lists.addEventListener('click', (ev)=>{
            const t=ev.target; if (!(t instanceof HTMLElement)) return;
            const i = Number(t.dataset.i); if (Number.isNaN(i)) return;
            const h = PAYLOAD.history[i];
            if (t.dataset.act==='preview'){ container.innerHTML = h.html; typeset(container); stamp.textContent = new Date(h.ts).toLocaleTimeString(); }
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
          lists.addEventListener('click', (ev)=>{
            const t=ev.target; if (!(t instanceof HTMLElement)) return;
            const i = Number(t.dataset.i); if (Number.isNaN(i)) return;
            const d = PAYLOAD.drafts[i];
            if (t.dataset.act==='preview'){ container.innerHTML = d.html; typeset(container); stamp.textContent = new Date(d.ts).toLocaleTimeString(); }
            if (t.dataset.act==='use'){ parent.postMessage({kind:'ro_set_memo', body: d.body}, '*'); }
            if (t.dataset.act==='open'){ parent.location.href = \`\${location.origin}\${location.pathname}?chapter=\${encodeURIComponent(d.chapter)}&para=\${encodeURIComponent(d.paraId)}\`; }
          }, { once:true });
        }
      }
    }

    // Receive payload from parent
    window.addEventListener('message', async (ev) => {
      const d = ev.data || {}; if (d.kind !== 'ro_preview') return;
      PAYLOAD = d;
      // Default tab: Current
      setTab('current');
    });

    // Wire tabs
    tabs.current.addEventListener('click', ()=>setTab('current'));
    tabs.autosaves.addEventListener('click', ()=>setTab('autosaves'));
    tabs.drafts.addEventListener('click', ()=>setTab('drafts'));
  </script>
</body></html>`;
}

export function ensurePopPreviewButton(){
  const head = STATE.dom.memoPrev?.previousElementSibling?.classList.contains('head')
    ? STATE.dom.memoPrev.previousElementSibling
    : STATE.dom.memoPrev?.parentElement?.previousElementSibling?.classList.contains('head')
      ? STATE.dom.memoPrev.parentElement.previousElementSibling
      : null;

  const addBtn = (target) => {
    if (target.querySelector('#popPreviewBtn')) return;
    const btn=document.createElement('button'); btn.id='popPreviewBtn'; btn.className='btn btn-sm'; btn.textContent='Pop-out Preview';
    btn.style.marginLeft='8px'; btn.title='Click: window · Shift+Click: in-page modal';
    btn.addEventListener('click', openPreview); target.appendChild(btn);
  };
  if (head) addBtn(head);
  else {
    if (!document.getElementById('popPreviewBtn')) {
      const btn=document.createElement('button'); btn.id='popPreviewBtn'; btn.className='btn btn-sm'; btn.textContent='Pop-out Preview';
      btn.style.cssText='position:sticky; left:100%; transform:translateX(-100%); margin:-8px 0 8px 0;'; btn.title='Click: window · Shift+Click: modal';
      btn.addEventListener('click', openPreview); STATE.dom.memoPrev?.parentElement?.insertBefore(btn, STATE.dom.memoPrev);
    }
  }
}

function buildPayload(){
  const baseHref = (STATE._chapterUrlResolved || location.href).replace(/\/[^/]*$/,'/');
  const hist = (getHistory()||[]).slice(0, 20).map(s => ({
    ts: s.ts,
    body: s.body,
    // pre-render in parent so pop-out doesn't need marked()
    html: window.marked?.parse ? window.marked.parse(s.body) : `<pre>${(s.body||'').replace(/[&<>]/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]))}</pre>`
  }));
  const draftsRaw = (getAllDrafts()||[]).slice(0, 50);
  const drafts = draftsRaw.map(d => ({
    ts: d.ts, chapter: d.chapter, paraId: d.paraId,
    isCurrent: d.chapter === STATE.params.chapter && d.paraId === STATE.params.paraId,
    body: d.body,
    html: window.marked?.parse ? window.marked.parse(d.body||'') : `<pre>${(d.body||'').replace(/[&<>]/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]))}</pre>`
  }));
  return {
    kind: 'ro_preview',
    ts: Date.now(),
    html: STATE.dom.memoPrev.innerHTML,            // current rendered HTML
    currentBodyPlain: STATE.dom.memoTa.value,      // current raw markdown
    history: hist,
    drafts: drafts,
    meta: { chapter: STATE.params.chapter, paraId: STATE.params.paraId, baseHref }
  };
}

function openPreview(ev){
  if (ev && ev.shiftKey) { openDialog(); return; }
  const baseHref = (STATE._chapterUrlResolved || location.href).replace(/\/[^/]*$/,'/');
  let w=null; try { w=window.open('about:blank','ro_live_preview','width=920,height=980'); } catch{}
  if (!w){
    try {
      const html=buildHTML(baseHref); const blob=new Blob([html],{type:'text/html'}); const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.target='ro_live_preview'; a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove();
      w=window.open('','ro_live_preview');
    } catch {}
    if (!w) { openDialog(); return; }
  }
  if (w.document && !w.document.body.childElementCount){ w.document.open(); w.document.write(buildHTML(baseHref)); w.document.close(); }
  previewWin = w; push();   // send initial
}

function openDialog(){
  if (!previewDlg){
    previewDlg = document.createElement('dialog');
    previewDlg.id='roLivePreviewDlg'; previewDlg.style.cssText='width:min(1100px,calc(100vw - 48px)); max-height:90vh; padding:0; border:none; border-radius:12px; overflow:hidden; background:#0B1117; color:#E6EDF3;';
    const baseHref = (STATE._chapterUrlResolved || location.href).replace(/\/[^/]*$/,'/');
    previewDlg.innerHTML = buildHTML(baseHref);
    document.body.appendChild(previewDlg);
  }
  if (!previewDlg.open) previewDlg.showModal();
  push();
}

// Push current preview + autosaves + drafts to pop-out/modal
function push(){
  const payload = buildPayload();
  try { if (previewWin && !previewWin.closed) previewWin.postMessage(payload, '*'); } catch {}
  if (previewDlg && previewDlg.open){
    // Re-initialize the dialog document each push
    const iframeDoc = previewDlg.querySelector('iframe')?.contentDocument;
    // Our dialog uses inline HTML; find the message receiver via dispatchEvent
    // Simpler: rebuild the content by replacing the <dialog>'s innerHTML on first open was already set,
    // so we just call the pop-out handler by simulating a message on its window (dialog is same document).
    // We'll just manually inject into the nodes:
    const lists = previewDlg.querySelector('#lists');
    if (lists) {
      // trigger the same logic by sending a real message event to window
      window.dispatchEvent(new MessageEvent('message', { data: payload }));
    }
  }
}

// Keep pop-out in sync as memo / preview updates
window.addEventListener('ro:previewPush', push);
