// /js/ro/snippets-modal.js
import { TPL } from '/js/ro/snippets-templates.js';

const $ = (s, r=document)=>r.querySelector(s);
let HANDLERS = {};
let CURRENT = null;

export function setEditorHandlers(h){ HANDLERS = h; }
export function isEditorOpen(){ return !!$('#snipModal.show'); }

export function openEditorFor(sn){
  CURRENT = structuredClone(sn);
  const modal = $('#snipModal'); modal.classList.add('show');

  $('#editorTitle').value = CURRENT.title||'';
  $('#editorBody').value = CURRENT.body||'';
  updateSplitCount();

  // toolbar inserts
  $('#insHeader').onclick = ()=>insert(TPL.headerInfo());
  $('#insDiscord').onclick = ()=>insert(TPL.discordStats());
  $('#insLogic').onclick = ()=>insert(TPL.logicSkeleton());
  $('#insInline').onclick = ()=>insert(TPL.inlineMath());
  $('#insBlock').onclick = ()=>insert(TPL.blockMath());
  $('#insFigure').onclick = ()=>insert(TPL.figCropTable());
  $('#insMM').onclick = ()=>HANDLERS.onInsertMM?.();

  $('#btnMergePrev').onclick = ()=>HANDLERS.onMergePrev?.(CURRENT);
  $('#btnMergeNext').onclick = ()=>HANDLERS.onMergeNext?.(CURRENT);
  $('#btnDup').onclick = ()=>HANDLERS.onDuplicate?.(CURRENT);
  $('#btnDel').onclick = ()=>{
    if ((CURRENT.body||'').trim().length>0){
      alert('Delete is only allowed when the snippet body is empty. Clear it first.'); return;
    }
    HANDLERS.onDelete?.(CURRENT); closeEditor();
  };

  $('#btnSave').onclick = doSave;
  $('#btnSplit').onclick = doSplit;
  $('#btnCancel').onclick = closeEditor;

  $('#editorBody').oninput = updateSplitCount;

  // esc, ctrl+s, ctrl+shift+s
  modal.onkeydown = (e)=>{
    if (e.key==='Escape'){ e.preventDefault(); closeEditor(); }
    if (e.key==='s' && (e.ctrlKey||e.metaKey)){
      e.preventDefault();
      if (e.shiftKey) doSplit(); else doSave();
    }
  };

  $('#editorBody').focus();
}
export function closeEditor(){
  const modal = $('#snipModal');
  modal.classList.remove('show');
  CURRENT = null;
}

function insert(text){
  const ta = $('#editorBody');
  const st = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
  ta.value = v.slice(0,st)+text+v.slice(en);
  ta.selectionStart = ta.selectionEnd = st + text.length;
  ta.dispatchEvent(new Event('input',{bubbles:true}));
  ta.focus();
}

function doSave(){
  CURRENT.title = $('#editorTitle').value.trim();
  CURRENT.body = $('#editorBody').value;
  HANDLERS.onSave?.(CURRENT);
  closeEditor();
}
function doSplit(){
  const raw = $('#editorBody').value;
  const parts = raw.split(/\[split\]/i);
  if (parts.length<2){ alert('Insert [split] where you want to split.'); return; }
  // save left into current, create right as same-type neighbor
  CURRENT.body = parts[0].trim();
  HANDLERS.onSave?.(CURRENT);
  HANDLERS.onDuplicate?.(CURRENT);
  // duplicate handler puts a copy after; update copy body:
  setTimeout(()=>{
    const ta = $('#editorBody'); if (!ta) return;
    ta.value = parts.slice(1).join('[split]').trim();
    updateSplitCount();
  },0);
}
function updateSplitCount(){
  const c = ($('#editorBody').value.match(/\[split\]/gi)||[]).length;
  $('#splitCount').textContent = c;
}

export function getEditorValue(){ return {title:$('#editorTitle').value, body:$('#editorBody').value}; }
export function setEditorValue(t,b){ $('#editorTitle').value=t; $('#editorBody').value=b; }

