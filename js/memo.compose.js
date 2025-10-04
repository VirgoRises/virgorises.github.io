// js/memo.compose.js — minimal RFC memo composer (popup)
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  function cafeSlugFromPath() {
    // /cafes/<slug>/notebook/...
    const m = location.pathname.match(/^\/cafes\/([^\/]+)/);
    return m ? m[1] : "zeta-zero-cafe";
  }
  function chapterNoFromTitleOrPath() {
    const t = document.title || "";
    const p = decodeURIComponent(location.pathname);
    const m = t.match(/Chapter\s+(\d+)/i) || p.match(/Chapter\s+(\d+)/i);
    return m ? Number(m[1]) : null;
  }
  function makeOverlay() {
    const wrap = document.createElement("div");
    wrap.className = "memo-overlay";
    wrap.innerHTML = `
      <div class="memo-modal" role="dialog" aria-label="Draft RFC memo">
        <header class="memo-head">
          <h3>Draft RFC memo</h3>
          <button class="memo-x" aria-label="Close">×</button>
        </header>
        <div class="memo-body">
          <aside class="memo-left">
            <div class="memo-section">
              <div class="memo-kicker">Paragraph</div>
              <div id="memo-paragraph"></div>
            </div>
            <div class="memo-section">
              <div class="memo-kicker">Figures</div>
              <div id="memo-figs" class="memo-grid"></div>
            </div>
            <div class="memo-section">
              <div class="memo-kicker">Tables</div>
              <div id="memo-tbls" class="memo-grid"></div>
            </div>
          </aside>
          <section class="memo-right">
            <label class="memo-label">Memo to self (Markdown/LaTeX)</label>
            <textarea id="memo-text" rows="14" placeholder="State the issue, desired change, and rationale..."></textarea>
            <div class="memo-actions">
              <button id="memo-save" class="btn">Save draft (browser)</button>
              <button id="memo-export" class="btn primary">Export JSON</button>
              <button id="memo-submit" class="btn">Submit via Discord</button>
            </div>
            <p class="memo-note">Tip: Draft, step away, revise, then submit. RFCs are processes, not chats.</p>
          </section>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    return wrap;
  }

  function styleOnce(){
    if ($('#memo-style')) return;
    const s = document.createElement('style');
    s.id = 'memo-style';
    s.textContent = `
      .memo-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:saturate(1.3) blur(1px);z-index:2147483646;display:flex;align-items:center;justify-content:center}
      .memo-modal{width:min(1100px,96vw);max-height:94vh;overflow:auto;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:var(--card,#101017);color:var(--fg,#f0f0f0);box-shadow:0 10px 40px rgba(0,0,0,.45)}
      .memo-head{display:flex;align-items:center;justify-content:space-between;padding:.8rem 1rem;border-bottom:1px solid rgba(255,255,255,.08)}
      .memo-x{border:0;background:transparent;color:inherit;font-size:1.6rem;line-height:1;cursor:pointer}
      .memo-body{display:grid;grid-template-columns: 1.2fr 1fr;gap:1rem;padding:1rem}
      @media (max-width: 980px){ .memo-body{grid-template-columns: 1fr} }
      .memo-left{display:flex;flex-direction:column;gap:.8rem}
      .memo-section{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:.6rem;padding:.6rem}
      .memo-kicker{font-size:.8rem;opacity:.8;margin-bottom:.25rem}
      #memo-paragraph{padding:.5rem;border:1px dashed rgba(255,255,255,.12);border-radius:.5rem;max-height:40vh;overflow:auto}
      .memo-grid{display:grid;grid-template-columns: repeat(2, minmax(0,1fr)); gap:.35rem}
      .memo-item{display:flex;align-items:center;gap:.5rem;padding:.35rem;border:1px solid rgba(255,255,255,.1);border-radius:.45rem;background:rgba(255,255,255,.03)}
      .memo-item input{margin:0}
      .memo-label{display:block;font-size:.9rem;margin:.2rem 0}
      #memo-text{width:100%;font:inherit;background:#0c0c14;color:#e6e6f3;border:1px solid rgba(255,255,255,.12);border-radius:.6rem;padding:.6rem}
      .memo-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin:.6rem 0}
      .btn{border:1px solid rgba(255,255,255,.2);background:transparent;color:inherit;border-radius:.45rem;padding:.35rem .7rem;cursor:pointer}
      .btn.primary{background:rgba(80,160,255,.18);border-color:rgba(80,160,255,.4)}
      .memo-note{font-size:.8rem;opacity:.8}
    `;
    document.head.appendChild(s);
  }

  function checkboxItem(id, label, href){
    const el = document.createElement('label');
    el.className = 'memo-item';
    el.innerHTML = `<input type="checkbox" data-id="${id}"/><span>${label}</span>${href?`<a href="${href}" target="_blank">open</a>`:''}`;
    return el;
  }

  function gatherFigures(basePath){
    // figures with id; tables with id or figure wrappers
    const figs = [];
    $$('figure[id]').forEach(f=>{
      const id = f.id;
      const cap = f.querySelector('figcaption')?.textContent?.trim() || id;
      figs.push({ id, label: cap, href: `${basePath}/notebook/#${id}` });
    });
    const tbls = [];
    $$('table[id], figure.card table[id]').forEach(t=>{
      const id = t.id;
      const caption = t.closest('figure')?.querySelector('figcaption')?.textContent?.trim() || id;
      tbls.push({ id, label: caption, href: `${basePath}/notebook/#${id}` });
    });
    return { figs, tbls };
  }

  function exportJSON(obj, fname){
    const b = new Blob([JSON.stringify(obj, null, 2)], {type:"application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = fname;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=> URL.revokeObjectURL(a.href), 5000);
  }

  function loadDraftKey(uuid){
    return `osf:memo:${uuid}`;
  }

  function open(uuid){
    styleOnce();
    const overlay = makeOverlay();

    const cafe = cafeSlugFromPath();
    const chapterNo = chapterNoFromTitleOrPath();
    const basePath = location.pathname.split('/notebook/')[0] || `/cafes/${cafe}`;

    // left: live paragraph preview
    const para = document.getElementById(uuid);
    $('#memo-paragraph').innerHTML = para ? para.outerHTML : `<em>Paragraph not found.</em>`;

    // figure/table pickers
    const { figs, tbls } = gatherFigures(basePath);
    const figsHost = $('#memo-figs');
    const tblsHost = $('#memo-tbls');
    figs.forEach(f => figsHost.appendChild(checkboxItem(f.id, f.label, f.href)));
    tbls.forEach(t => tblsHost.appendChild(checkboxItem(t.id, t.label, t.href)));

    // restore draft if any
    const saved = localStorage.getItem(loadDraftKey(uuid));
    if (saved) {
      try {
        const j = JSON.parse(saved);
        $('#memo-text').value = j.memo_md || '';
        // tick saved selections
        j.figures?.forEach(id => { const c = figsHost.querySelector(`input[data-id="${id}"]`); if (c) c.checked = true; });
        j.tables?.forEach(id => { const c = tblsHost.querySelector(`input[data-id="${id}"]`); if (c) c.checked = true; });
      } catch {}
    }

    // buttons
    $('.memo-x').onclick = () => overlay.remove();
    $('#memo-save').onclick = () => {
      const memo = collect();
      localStorage.setItem(loadDraftKey(uuid), JSON.stringify(memo));
      alert("Draft saved in this browser.");
    };
    $('#memo-export').onclick = () => {
      const memo = collect();
      const fname = `${cafe}-${uuid}-memo.json`;
      exportJSON(memo, fname);
    };
    $('#memo-submit').onclick = () => {
      const fname = `${cafe}-${uuid}-memo.json`;
      alert([
        "Submit your memo:\n",
        "1) Click Export JSON to save the file.",
        "2) In Discord, go to #rfc-inbox and post the file with",
        "   the command:  !rfcdraft submit",
        "",
        `Suggested filename: ${fname}`
      ].join("\n"));
    };

    function collect(){
      const figures = $$('#memo-figs input:checked').map(x => x.dataset.id);
      const tables  = $$('#memo-tbls input:checked').map(x => x.dataset.id);
      return {
        memo_id: "TEMP",
        status: "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cafe_slug: cafe,
        chapter_no: chapterNo,
        chapter_url: location.pathname,
        paragraph_uuid: uuid,
        figures, tables, labels: [],
        memo_md: $('#memo-text').value || "",
        user_id: null, role: null, source_msg: null
      };
    }
  }

  window.OSF = window.OSF || {};
  window.OSF.Memo = { open };
})();
