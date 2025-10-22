// /cafes/zeta-zero-cafe/js/ro/autosave.js
import { STATE } from './state.js';

const now = () => Date.now();
const fmt = ts => new Date(ts).toLocaleTimeString();

export function bootAutosave(){
  const AS_KEY = `ro:autosave:${STATE.params.chapter}|${STATE.params.paraId}`;
  const AH_KEY = `${AS_KEY}:history`;
  const AC_KEY = `${AS_KEY}:caret`;

  let tSave=null, undoTimer=null;

  function setStatus(txt){
    const dot = navigator.onLine ? '🟢' : '⚪';
    const c = document.getElementById('memoStatus') || (()=>{ const x=document.createElement('div'); x.id='memoStatus'; x.className='mono muted'; x.style.cssText='display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:6px;font-size:12px;opacity:.9'; STATE.dom.memoTa.parentElement.insertBefore(x,STATE.dom.memoTa); return x; })();
    c.innerHTML = `<span>${dot}</span><span>${txt}</span>`;
    if (!c.querySelector('#histBtn')) {
      const b=document.createElement('button'); b.id='histBtn'; b.className='btn btn-sm'; b.textContent='History'; b.style.marginLeft='8px';
      b.addEventListener('click', renderHistoryUI);
      c.appendChild(b);
    }
  }

  function saveNow(force=false){
    try{
      const payload = { ts: now(), chapter:STATE.params.chapter, paraId:STATE.params.paraId, body:STATE.dom.memoTa.value };
      const last = JSON.parse(localStorage.getItem(AS_KEY) || 'null');
      const changed = force || !last || last.body !== payload.body;
      if (changed){
        localStorage.setItem(AS_KEY, JSON.stringify(payload));
        sessionStorage.setItem(AS_KEY, JSON.stringify(payload));
        // history ring
        const arr = JSON.parse(localStorage.getItem(AH_KEY) || '[]'); arr.unshift({ts:payload.ts, body:payload.body}); localStorage.setItem(AH_KEY, JSON.stringify(arr.slice(0,10)));
        setStatus(`Saved ✓ ${fmt(payload.ts)}`);
      } else setStatus(`Saved ✓ ${fmt(last.ts)}`);
      // caret
      try {
        const pos = { start: STATE.dom.memoTa.selectionStart||0, end: STATE.dom.memoTa.selectionEnd||0, ts: now() };
        localStorage.setItem(AC_KEY, JSON.stringify(pos));
      }catch(_){}
    }catch{ setStatus('Save error'); }
  }

  function schedule(){ clearTimeout(tSave); tSave=setTimeout(()=>saveNow(false), 400); }
  function markDirty(){ setStatus('Saving…'); }

  // restore on boot
  try{
    const raw = localStorage.getItem(AS_KEY) || sessionStorage.getItem(AS_KEY);
    if (raw){
      const saved = JSON.parse(raw);
      if ((STATE.dom.memoTa.value.trim()==='') && (saved.body?.trim())){
        const prev = STATE.dom.memoTa.value; STATE.dom.memoTa.value = saved.body;
        // first render happens in caller via onMemoChange
        setStatus(`Restored ✓ ${new Date(saved.ts).toLocaleTimeString()}`);
        // caret
        try{
          const c = JSON.parse(localStorage.getItem(AC_KEY) || 'null');
          if (c){ const len=STATE.dom.memoTa.value.length; const s=Math.min(c.start||0,len), e=Math.min(c.end||s,len); STATE.dom.memoTa.setSelectionRange(s,e); }
        }catch(_){}
      } else setStatus('Ready');
    } else setStatus('Ready');
  }catch{ setStatus('Autosave unavailable'); }

  window.addEventListener('beforeunload', () => saveNow(true));
  window.addEventListener('online',  () => setStatus('Online'));
  window.addEventListener('offline', () => setStatus('Offline (local saves only)'));

  // expose in STATE
  STATE.autosave = { schedule, markDirty };
  STATE.saveCaret = () => {
    try{
      const pos = { start: STATE.dom.memoTa.selectionStart||0, end: STATE.dom.memoTa.selectionEnd||0, ts: now() };
      localStorage.setItem(AC_KEY, JSON.stringify(pos));
    }catch(_){}
  };

  // history UI
  function renderHistoryUI(){
    let pane = document.getElementById('historyList');
    if (!pane) {
      const wrap=document.createElement('div'); wrap.id='histWrap'; wrap.style.cssText='display:block; margin-top:6px;';
      const list=document.createElement('div'); list.id='historyList'; list.className='list'; list.style.cssText='max-height:180px; overflow:auto;';
      wrap.appendChild(list); STATE.dom.memoTa.parentElement.appendChild(wrap);
    }
    pane = document.getElementById('historyList');
    const arr = JSON.parse(localStorage.getItem(AH_KEY) || '[]');
    pane.innerHTML='';
    if(!arr.length){ pane.innerHTML='<div class="muted">No snapshots yet.</div>'; return; }
    arr.forEach(s=>{
      const row=document.createElement('div'); row.className='item'; row.style.alignItems='center';
      row.innerHTML=`<div class="mono muted">${new Date(s.ts).toLocaleString()}</div>`;
      const btn=document.createElement('button'); btn.className='btn btn-sm'; btn.textContent='Restore';
      btn.addEventListener('click', ()=>{
        const prev = STATE.dom.memoTa.value; STATE.dom.memoTa.value=s.body; window.dispatchEvent(new CustomEvent('ro:memoChanged')); // for downstream
        setStatus(`Restored · ${fmt(s.ts)}`);
        const undo=document.createElement('button'); undo.className='btn btn-sm'; undo.textContent='Undo restore';
        const bar=document.getElementById('memoStatus'); bar?.appendChild(undo);
        if (undoTimer) clearTimeout(undoTimer);
        undo.addEventListener('click', ()=>{ STATE.dom.memoTa.value=prev; window.dispatchEvent(new CustomEvent('ro:memoChanged')); undo.remove(); });
        undoTimer=setTimeout(()=>undo.remove(), 60000);
      });
      row.appendChild(btn); pane.appendChild(row);
    });
  }
  // expose for entry
  STATE.renderHistoryUI = renderHistoryUI;
}

export const restoreCaret = ()=>{};
export const setStatus = (txt)=>{ const bar=document.getElementById('memoStatus'); if (bar) bar.innerHTML = `<span>${navigator.onLine?'🟢':'⚪'}</span><span>${txt}</span>`; };
export function renderHistoryUI(){ STATE.renderHistoryUI?.(); }
