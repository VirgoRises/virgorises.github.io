// /cafes/zeta-zero-cafe/js/research.office.js
import { $, initParams, initDom, STATE, setBadge, setBackLink } from '/cafes/zeta-zero-cafe/js/ro/state.js';
import { loadChapterDom, resolvePrimaryPage, previewParagraph } from '/cafes/zeta-zero-cafe/js/ro/resolver.js';
import { bootViewer, setActivePage, renderThumbs } from '/cafes/zeta-zero-cafe/js/ro/viewer.js';
import { indexTokens, onMemoChange } from '/cafes/zeta-zero-cafe/js/ro/tokens.js';
import { bootAutosave, restoreCaret, setStatus, renderHistoryUI } from '/cafes/zeta-zero-cafe/js/ro/autosave.js';
import { bootDrafts, renderDraftList, persistDraftDraftlist } from '/cafes/zeta-zero-cafe/js/ro/drafts.js';
import { ensurePopPreviewButton } from '/cafes/zeta-zero-cafe/js/ro/preview-popout.js';

// …rest of the file unchanged…


async function init() {
  initParams();         // fills STATE.params etc
  initDom();            // caches DOM references
  const { chapterFile, paraNum } = STATE;
  setBackLink();
  setBadge(paraNum);

  // Boot viewer/tools + autosave + drafts manager
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
    ensurePopPreviewButton();

    indexTokens(STATE.dom.memoTa.value);
    renderThumbs();
    setActivePage(STATE.primaryPage, 'resolver');

    // Wire memo
    STATE.dom.memoTa.addEventListener('input', onMemoChange);
    // caret save (guarded inside autosave module)
    if (STATE.saveCaret) {
      STATE.dom.memoTa.addEventListener('keyup', STATE.saveCaret);
      STATE.dom.memoTa.addEventListener('click', STATE.saveCaret);
    }

    renderDraftList();
    $('#saveDraft')?.addEventListener('click', () => { persistDraftDraftlist(); $('#saveDraft')?.classList.add('ok'); setTimeout(()=>$('#saveDraft')?.classList.remove('ok'), 800); });
    $('#exportJson')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify({
        chapter: STATE.params.chapter,
        paraId: STATE.params.paraId,
        body: STATE.dom.memoTa.value,
        pages: Array.from(STATE.referencedPages),
        primary: STATE.primaryPage
      }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `memo_${STATE.chapterSlug}_${STATE.params.paraId}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    $('#submitDiscord')?.addEventListener('click', () => alert('Discord submission wiring is stubbed here.'));

    renderHistoryUI(); // show “History” affordance

  } catch (err) {
    console.error('[RO] init failed:', err);
    STATE.dom.previewBox.innerHTML = `<div class="warn">Failed to load the chapter or paragraph preview.<br><span class="mono" style="opacity:.8">${String(err?.message||err)}</span></div>`;
    setStatus('Resolver failed.');
  }
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
