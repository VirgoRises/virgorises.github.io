// snippets-modal.js
let refs = null;
function q(id){ return document.getElementById(id); }

export function initSnippetsModal() {
  if (refs) return;
  refs = {
    mask: q('snipMask'),
    box:  q('snipModal'),
    title:q('modalTitle'),
    input:q('Title'),
    body: q('Body'),
    info: q('splitInfo'),
    tools:q('modalTools'),
    save: q('btnSave'),
    split:q('btnSplit'),
    cancel:q('btnCancel'),
    close:q('btnClose'),
  };

  refs.cancel.addEventListener('click', close);
  refs.close.addEventListener('click', close);

  refs.body.addEventListener('input', () => {
    const n = (refs.body.value.match(/\[split\]/g)||[]).length;
    refs.info.textContent = `[split] markers: ${n}`;
  });
}

export function openSnippetModal({ snippet, onSave, onSplit, onMergePrev, onMergeNext, onDuplicate, onDelete }) {
  initSnippetsModal();
  refs.current = { snippet, onSave, onSplit, onMergePrev, onMergeNext, onDuplicate, onDelete };
  refs.title.textContent = `Edit — ${snippet.type||'Block'}`;
  refs.input.value = snippet.title || '';
  refs.body.value  = snippet.body  || '';
  refs.info.textContent = `[split] markers: ${(refs.body.value.match(/\[split\]/g)||[]).length}`;

  refs.tools.onclick = (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    const ins = b.dataset.insert;
    const act = b.dataset.modalAct;

    if (ins) {
      const map = {
        header:  `chapter: [notebook/] chapter-N.html · para: osf-X · primary: P · author: @discord\n`,
        discord: `status: [Active|Dormant|Retracted] · votes: --[#dissent] ++[#concur] · rank: r of n\n`,
        logic:   `Premise 1:\nPremise 2:\nConclusion:\n`,
        inline:  `\\( a^2 + b^2 = c^2 \\)`,
        block:   `\\[ r_q=\\forall n\\,\\sqrt{\\tfrac{n}{n+1}} \\to \\{ \\sqrt{\\tfrac{1}{2}},\\sqrt{\\tfrac{2}{3}},\\dots \\} \\]`,
        figure:  `<div style="--x:.4;--y:0;width:100%;aspect-ratio:1/1;position:relative;overflow:hidden;border-radius:4px;">
  <img src="https://virgorises.github.io/cafes/zeta-zero-cafe/notebook/figures/Figure_5.3_Triangular_numbers_-_chord_density.PNG"
       alt="" style="position:absolute;display:block;width:280%;height:280%;left:calc(-1*var(--x)*10%);top:calc(-1*var(--y)*10%);" />
</div>`,
        mm:      `[mm|p12=10,15:40,35:"label"]`
      };
      const str = map[ins] || '';
      if (str) insertAtCaret(refs.body, str);
      return;
    }

    if (act) {
      if (act === 'merge-prev' && onMergePrev) onMergePrev();
      if (act === 'merge-next' && onMergeNext) onMergeNext();
      if (act === 'dup'        && onDuplicate) onDuplicate();
      if (act === 'del'        && onDelete)    onDelete(refs.body.value); /* pass current text */
    }
  };

  refs.split.onclick = () => {
    const txt = String(refs.body.value||'');
    if (!txt.includes('[split]')) {
      alert('Insert [split] at the position where you want to split the contents.');
      return;
    }
    const parts = txt.split('[split]');
    const left  = parts.shift();
    const right = parts.join('[split]');
    onSplit && onSplit(left, right);
  };

  refs.save.onclick = () => {
    onSave && onSave({ title: refs.input.value, body: refs.body.value });
  };

  refs.mask.classList.remove('hidden');
  refs.box.classList.remove('hidden');
  refs.body.focus();
}

function close(){
  if (!refs) return;
  refs.mask.classList.add('hidden');
  refs.box.classList.add('hidden');
  refs.current = null;
}

function insertAtCaret(el, text) {
  const [start, end] = [el.selectionStart ?? 0, el.selectionEnd ?? 0];
  const val = el.value;
  el.value = val.slice(0, start) + text + val.slice(end);
  const pos = start + text.length;
  el.setSelectionRange(pos, pos);
  el.focus();
}


