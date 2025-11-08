// /js/ro/autosave.js
import { STATE } from './state.js';

const now = () => Date.now();
const fmtTime = ts => new Date(ts).toLocaleTimeString();
const fmtFull = ts => new Date(ts).toLocaleString();
const HISTORY_LENGTH = 10;

let AS_KEY = ''; // latest snapshot (per chapter|para)
let AH_KEY = ''; // ring buffer (history)
let AC_KEY = ''; // caret position

export function bootAutosave() {
  // keys are namespaced per chapter|para
  AS_KEY = `ro:autosave:${STATE.params.chapter}|${STATE.params.paraId}`;
  AH_KEY = `${AS_KEY}:history`;
  AC_KEY = `${AS_KEY}:caret`;

  let saveTimer = null;

  // restore-on-boot (non-destructive)
  try {
    const raw = localStorage.getItem(AS_KEY) || sessionStorage.getItem(AS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if ((STATE.dom.memoTa.value.trim() === '') && (saved.body?.trim())) {
        STATE.dom.memoTa.value = saved.body;
        setStatus(`Restored ✓ ${fmtTime(saved.ts)}`);
        try {
          const c = JSON.parse(localStorage.getItem(AC_KEY) || 'null');
          if (c) {
            const len = STATE.dom.memoTa.value.length;
            const s = Math.min(c.start || 0, len);
            const e = Math.min(c.end || s, len);
            STATE.dom.memoTa.setSelectionRange(s, e);
          }
        } catch {}
      } else {
        setStatus('Ready');
      }
    } else {
      setStatus('Ready');
    }
  } catch {
    setStatus('Autosave unavailable');
  }

  // wire memo change → schedule save
  STATE.dom.memoTa.addEventListener('input', () => {
    setStatus('Saving…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow(false), 400);
  });

  // caret tracking
  STATE.dom.memoTa.addEventListener('keyup', saveCaret, { passive: true });
  STATE.dom.memoTa.addEventListener('click', saveCaret, { passive: true });

  // lifecycle & connectivity
  window.addEventListener('beforeunload', () => saveNow(true));
  window.addEventListener('online',  () => setStatus('Online'));
  window.addEventListener('offline', () => setStatus('Offline (local saves only)'));

  // initial paint of history in the History tab
  renderHistoryUI();
}

function saveCaret() {
  try {
    const pos = {
      start: STATE.dom.memoTa.selectionStart || 0,
      end:   STATE.dom.memoTa.selectionEnd   || 0,
      ts:    now()
    };
    localStorage.setItem(AC_KEY, JSON.stringify(pos));
  } catch {}
}

function saveNow(force = false) {
  try {
    const payload = {
      ts: now(),
      chapter: STATE.params.chapter,
      paraId:  STATE.params.paraId,
      body:    STATE.dom.memoTa.value
    };

    const last = JSON.parse(localStorage.getItem(AS_KEY) || 'null');
    const changed = force || !last || last.body !== payload.body;

    if (changed) {
      // latest snapshot
      localStorage.setItem(AS_KEY, JSON.stringify(payload));
      sessionStorage.setItem(AS_KEY, JSON.stringify(payload));

      // ring buffer (10)
      const arr = JSON.parse(localStorage.getItem(AH_KEY) || '[]');
      arr.unshift({ ts: payload.ts, body: payload.body });
      localStorage.setItem(AH_KEY, JSON.stringify(arr.slice(0, HISTORY_LENGTH)));

      setStatus(`Saved ✓ ${fmtTime(payload.ts)}`);
      renderHistoryUI(); // refresh History tab
    } else {
      setStatus(`Saved ✓ ${last ? fmtTime(last.ts) : fmtTime(payload.ts)}`);
    }

    // persist caret as well
    saveCaret();
  } catch {
    setStatus('Save error');
  }
}

export function setStatus(txt) {
  const bar = document.getElementById('memoStatus'); // now lives in the History tab
  if (bar) {
    bar.innerHTML = `<span>${navigator.onLine ? '🟢' : '⚪'}</span><span>${txt}</span>`;
  }
}

// expose current history array (last 10)
export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(AH_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Render the ring buffer into the History tab.
 * Expects:
 *   <div id="history" ...>
 *     <div id="memoStatus" ...></div>
 *     <details id="histToggle" open>
 *       <div id="histList" class="history-list"></div>
 *     </details>
 *   </div>
 */
export function renderHistoryUI() {
  const list = document.getElementById('histList');
  if (!list) return; // History tab not visible/available yet

  const arr = getHistory();
  list.innerHTML = '';

  if (!arr.length) {
    list.innerHTML = '<div class="muted">No snapshots yet.</div>';
    return;
  }

  arr.forEach(snap => {
    const row = document.createElement('div');
    row.className = 'item';
    row.style.cssText = 'display:flex;align-items:center;gap:8px;justify-content:space-between;padding:4px 0';

    const when = document.createElement('div');
    when.className = 'mono muted';
    when.textContent = fmtFull(snap.ts);

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '6px';

    const btnPreview = document.createElement('button');
    btnPreview.className = 'btn btn-sm';
    btnPreview.textContent = 'Preview';
    btnPreview.addEventListener('click', () => {
      // lightweight preview in a modal-like window
      const w = window.open('', '_blank', 'width=720,height=600');
      if (w) {
        const safe = (snap.body || '').replace(/</g, '&lt;');
        w.document.write(`<pre style="white-space:pre-wrap;word-break:break-word;padding:12px;margin:0;background:#0f141a;color:#e6edf3">${safe}</pre>`);
        w.document.close();
      }
    });

    const btnRestore = document.createElement('button');
    btnRestore.className = 'btn btn-sm';
    btnRestore.textContent = 'Restore';
    btnRestore.addEventListener('click', () => {
      STATE.dom.memoTa.value = snap.body || '';
      // let the rest of the app know the memo changed
      window.dispatchEvent(new CustomEvent('ro:memoChanged'));
      setStatus(`Restored · ${fmtTime(snap.ts)}`);
      // take an immediate snapshot so caret/status/hist are coherent
      saveNow(true);
    });

    actions.appendChild(btnPreview);
    actions.appendChild(btnRestore);

    row.appendChild(when);
    row.appendChild(actions);
    list.appendChild(row);
  });
}
