// /cafes/zeta-zero-cafe/js/ro/preview-popout.js
import { STATE } from './state.js';

let previewWin = null;
let previewDlg = null;

function buildHTML(baseHref){
  const CSS = `
    :root{color-scheme: dark} *{box-sizing:border-box} html,body{height:100%}
    body{margin:0;font:14px/1.55 system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;background:#0B1117;color:#E6EDF3}
    header{position:sticky;top:0;padding:10px 14px;background:#0F141A;border-bottom:1px solid #1f2a36;display:flex;justify-content:space-between;align-items:center}
    #container{padding:16px;max-width:980px;margin:0 auto}
    h1{font-size:28px;line-height:1.25;margin:16px 0 6px} h2{font-size:22px;margin:14px 0 6px} h3{font-size:18px;margin:12px 0 6px}
    p{margin:8px 0} img,video,canvas,svg{display:block;max-width:100%;height:auto}
    table{width:100%;border-collapse:collapse;margin:10px 0} th,td{border:1px solid #273341;padding:6px 8px;vertical-align:top}
    pre{background:#0F141A;border:1px solid #1f2a36;padding:12px;border-radius:8px;overflow:auto}
    code,pre,tt,kbd,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:12.5px} pre code{white-space:pre}
    blockquote{margin:10px 0;padding-left:12px;border-left:3px solid #243142;color:#c7d1da}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:12px;opacity:.75}
  `;
  const mjScript = document.getElementById('mathjax-script');
  const mjPath   = mjScript ? mjScript.getAttribute('src') : '/js/vendor/MathJax/tex-mml-chtml.js';
  const mjCfgEl  = document.getElementById('mathjax-config');
  const mjCfg    = mjCfgEl ? mjCfgEl.textContent : 'window.MathJax = { tex: { inlineMath: [[\'$\',\'$\'], [\'\\\\(\',\'\\\\)\']] } }';

  return `<!doctype html><html><head><meta charset="utf-8"/>
<base href="${baseHref}"><title>Live Preview</title><style>${CSS}</style>
<script id="mathjax-config">${mjCfg}</script><script src="${mjPath}"></script></head>
<body><header><strong>Live Preview</strong><span class="mono" id="stamp"></span></header>
<div id="container"></div>
<script>
 function typeset(c){ try{ MathJax.typesetClear?.([c]); MathJax.texReset?.(); }catch(_){} return (MathJax.typesetPromise?MathJax.typesetPromise([c]):MathJax.typeset([c])); }
 window.addEventListener('message', async (ev)=>{ const d=ev.data||{}; if(d.kind!=='ro_preview') return; const el=document.getElementById('container'); el.innerHTML=d.html; document.getElementById('stamp').textContent=new Date(d.ts).toLocaleTimeString(); await typeset(el); });
</script></body></html>`;
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

function openPreview(ev){
  if (ev && ev.shiftKey) { openDialog(); return; }
  const baseHref = (STATE._chapterUrlResolved || location.href).replace(/\/[^/]*$/,'/');
  let w=null; try { w=window.open('about:blank','ro_live_preview','width=760,height=920'); } catch{}
  if (!w){
    try{ const html=buildHTML(baseHref); const blob=new Blob([html],{type:'text/html'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.target='ro_live_preview'; a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove(); w=window.open('','ro_live_preview'); }catch{}
    if (!w){ openDialog(); return; }
  }
  if (w.document && !w.document.body.childElementCount){ w.document.open(); w.document.write(buildHTML(baseHref)); w.document.close(); }
  previewWin = w; push();
}

function openDialog(){
  if (!previewDlg){
    previewDlg = document.createElement('dialog');
    previewDlg.id='roLivePreviewDlg'; previewDlg.style.cssText='width:min(1000px,calc(100vw - 48px)); max-height:90vh; padding:0; border:none; border-radius:12px; overflow:hidden; background:#0B1117; color:#E6EDF3;';
    previewDlg.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:#0F141A; border-bottom:1px solid #1f2a36">
        <strong>Live Preview</strong>
        <div style="display:flex; gap:8px; align-items:center">
          <button id="ro-dlg-popout" class="btn btn-sm">Open as window</button>
          <button id="ro-dlg-close"  class="btn btn-sm">Close</button>
        </div>
      </div>
      <div id="ro-dlg-container" style="padding:16px; overflow:auto; max-height: calc(90vh - 48px)"></div>`;
    document.body.appendChild(previewDlg);
    previewDlg.querySelector('#ro-dlg-close').addEventListener('click', ()=>previewDlg.close());
    previewDlg.querySelector('#ro-dlg-popout').addEventListener('click', ()=>{ previewDlg.close(); openPreview(); });
  }
  if (!previewDlg.open) previewDlg.showModal();
  push();
}

function push(){
  const payload = { kind:'ro_preview', html: STATE.dom.memoPrev.innerHTML, ts: Date.now() };
  try { if (previewWin && !previewWin.closed) previewWin.postMessage(payload, '*'); } catch{}
  if (previewDlg && previewDlg.open){
    const c=previewDlg.querySelector('#ro-dlg-container'); if (c){ c.innerHTML = STATE.dom.memoPrev.innerHTML; try { MathJax?.typesetClear?.([c]); MathJax?.texReset?.(); (MathJax?.typesetPromise ? MathJax.typesetPromise([c]) : MathJax?.typeset?.([c])); }catch{} }
  }
}

// Keep pop-out / modal in sync
window.addEventListener('ro:previewPush', push);
