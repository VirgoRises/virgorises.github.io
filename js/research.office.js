// /js/research.office.js
import { $ } from '/js/ro/util.js';
import { initParams, initDom, STATE, setBadge, setBackLink } from '/js/ro/state.js';
import { loadChapterDom, resolvePrimaryPage, previewParagraph } from '/js/ro/resolver.js';
import { bootViewer, setActivePage, renderThumbs } from '/js/ro/viewer.js';
import { indexTokens, onMemoChange } from '/js/ro/tokens.js';
import { bootAutosave, renderHistoryUI, setStatus } from '/js/ro/autosave.js';
import { bootDrafts, renderDraftList, persistDraftDraftlist } from '/js/ro/drafts.js';
import { ensurePopPreviewButton } from '/js/ro/preview-popout.js';

function findDraftsHead(){
  return document.querySelector('#drafts .head')
      || document.querySelector('[data-panel="drafts"] .head')
      || document.querySelector('.tabcontent#drafts .head')
      || null;
}
function findHistoryHead(){
  return document.querySelector('#history .head')
      || document.querySelector('[data-panel="history"] .head')
      || document.querySelector('.tabcontent#history .head')
      || null;
}
function findActivePanelHead(){
  // generic helper used on tab switches
  const active = document.querySelector('.tabcontent.active');
  if (!active) return null;
  return active.querySelector('.head');
}

async function init() {
  initParams();
  initDom();
  setBackLink();
  setBadge((() => { const m = String(STATE.params.paraId||'').match(/osf-(\d+)/); return m ? Number(m[1]) : null; })());

  bootViewer();
  bootAutosave();
  bootDrafts();

  try {
    const doc = await loadChapterDom();
    STATE.chapterDoc = doc;
    const res = await resolvePrimaryPage(doc);
    STATE.primaryPage = res.chosen;
    setStatus(res);

    await previewParagraph(doc);

    // NOTE: keep this harmless call (no target → no button in Preview)
    ensurePopPreviewButton();

    // Build initial token index and page state
    indexTokens(STATE.dom.memoTa.value);
    renderThumbs();
    setActivePage(STATE.primaryPage, 'resolver');

    // Wire memo change
    STATE.dom.memoTa.addEventListener('input', onMemoChange);

    // Initial preview render (so both previews show immediately)
    onMemoChange();

    // Drafts
    renderDraftList();
    // Inject Pop-out button into the Drafts tab header
    ensurePopPreviewButton(findDraftsHead());

    $('#saveDraft')?.addEventListener('click', () => {
      persistDraftDraftlist();
      const b = $('#saveDraft'); b?.classList.add('ok'); setTimeout(()=>b?.classList.remove('ok'), 800);
      // Drafts list may re-render; re-attach button
      ensurePopPreviewButton(findDraftsHead());
    });

    // History
    renderHistoryUI();
    // Inject Pop-out button into the History tab header
    ensurePopPreviewButton(findHistoryHead());

    // Re-attach on tab switches (DOM may change)
    document.querySelectorAll('.tab .tablinks')?.forEach(btn => {
      btn.addEventListener('click', () => {
        // Give the panel a tick to render, then try current active header;
        // also explicitly hit drafts/history heads in case they just became active.
        setTimeout(() => {
          const head = findActivePanelHead();
          if (head) ensurePopPreviewButton(head);
          ensurePopPreviewButton(findDraftsHead());
          ensurePopPreviewButton(findHistoryHead());
        }, 0);
      });
    });

  } catch (err) {
    console.error('[RO] init failed:', err);
    STATE.dom.previewBox.innerHTML =
      `<div class="warn">Failed to load the chapter or paragraph preview.<br><span class="mono" style="opacity:.8">${String(err?.message||err)}</span></div>`;
    setStatus('Resolver failed.');
  }
}

// Accept “Use this version” from Pop-out → replace memo text and re-render
window.addEventListener('message', (ev) => {
  const d = ev.data || {};
  if (d.kind === 'ro_set_memo' && typeof d.body === 'string') {
    STATE.dom.memoTa.value = d.body;
    onMemoChange();
  }
});

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
