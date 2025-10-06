// js/memo.compose.js — RFC memo composer (popup) — cafe-aware, figure/table clean, selectable math
(function(){
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  function cafeSlugFromPath() {
    const m = location.pathname.match(/^\/cafes\/([^\/]+)/);
    return m ? m[1] : "zeta-zero-cafe";
  }
  function whereLabel() {
    const p = decodeURIComponent(location.pathname);
    const t = document.title || "";
    const m1 = t.match(/Chapter\s+(\d+)/i) || p.match(/Chapter\s+(\d+)/i);
    if (m1) return `Chapter ${m1[1]}`;
    if (/whiteboard/i.test(p) || /whiteboard/i.test(t)) return "Whiteboard";
    return "Notebook";
  }
  function styleOnce(){
    if ($('#memo-style')) return;
    const s = document.createElement('style');
    s.id = 'memo-style';
    s.textContent = `
      .memo-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:saturate(1.3) blur(1px);z-index:2147483646;display:flex;align-items:center;justify-content:center}
      .memo-modal{width:min(1100px,96vw);max-height:94vh;overflow:auto;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:var(--card,#101017);color:var(--fg,#f0f0f0);box-shadow:0 10px 40px rgba(0,0,0,.45)}
      .memo-head{display:flex;align-items:center;justify-content:space-between;padding:.8rem 1rem;border-bottom:1px solid rgba(255,255,255,.08)}
      .memo-head h3{margin:0;font-size:1.05rem;opacity:.95}
      .memo-x{border:0;background:transparent;color:inherit;font-size:1.6rem;line-height:1;cursor:pointer}
      .memo-body{display:grid;grid-template-columns: 1.2fr 1fr;gap:1rem;padding:1rem}
      @media (max-width: 980px){ .memo-body{grid-template-columns: 1fr} }
      .memo-left{display:flex;flex-direction:column;gap:.8rem}
      .memo-section{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:.6rem;padding:.6rem}
      .memo-kicker{font-size:.82rem;opacity:.85;margin-bottom:.35rem}
      .memo-kicker strong{font-weight:700}
      #memo-paragraph{padding:.5rem;border:1px dashed rgba(255,255,255,.12);border-radius:.5rem;max-height:40vh;overflow:auto}
      .memo-grid{display:grid;grid-template-columns: repeat(2, minmax(0,1fr)); gap:.35rem}
      .memo-item{display:flex;align-items:center;gap:.5rem;padding:.35rem;border:1px solid rgba(255,255,255,.1);border-radius:.45rem;background:rgba(255,255,255,.03)}
      .memo-item input{margin:0}
      .memo-item a{ color:inherit; text-decoration:underline; }
      .memo-item a:hover{ text-decoration:none; }
      .memo-label{display:block;font-size:.9rem;margin:.2rem 0}
      #memo-text{width:100%;font:inherit;background:#0c0c14;color:#e6e6f3;border:1px solid rgba(255,255,255,.12);border-radius:.6rem;padding:.6rem}
      .memo-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin:.6rem 0}
      .btn{border:1px solid rgba(255,255,255,.2);background:transparent;color:inherit;border-radius:.45rem;padding:.35rem .7rem;cursor:pointer}
      .btn.primary{background:rgba(80,160,255,.18);border-color:rgba(80,160,255,.4)}
      .memo-note{font-size:.8rem;opacity:.8}
      .memo-none{opacity:.75;font-size:.85rem}
      /* make MathJax selectable in the preview */
      #memo-paragraph mjx-container, #memo-paragraph .MathJax { -webkit-user-select:text; user-select:text; }
    `;
    document.head.appendChild(s);
  }
  function makeOverlay(title) {
    const wrap = document.createElement("div");
    wrap.className = "memo-overlay";
    wrap.innerHTML = `
      <div class="memo-modal" role="dialog" aria-label="Draft RFC memo">
        <header class="memo-head">
          <h3>${title}</h3>
          <button class="memo-x" aria-label="Close">×</button>
        </header>
        <div class="memo-body">
          <aside class="memo-left">
            <div class="memo-section">
              <div class="memo-kicker">Paragraph — <strong id="memo-paraNo">§ ?</strong></div>
              <div id="memo-paragraph"></div>
            </div>
            <div class="memo-section">
              <div class="memo-kicker">Figures</div>
              <div id="memo-figs" class="memo-grid"></div>
              <div id="memo-figs-none" class="memo-none" style="display:none">No figures found. Add <code>id="fig-…"</code> to a figure to reference it.</div>
            </div>
            <div class="memo-section">
              <div class="memo-kicker">Tables</div>
              <div id="memo-tbls" class="memo-grid"></div>
              <div id="memo-tbls-none" class="memo-none" style="display:none">No tables found. Add <code>id="tbl-…"</code> to a table to reference it.</div>
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
            <p class="memo-note">Tip: LaTeX is selectable in the preview. For exact TeX, right-click a formula → MathJax → “TeX Commands → Copy to Clipboard”.</p>
          </section>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    return wrap;
  }
  function checkboxItem(id, label, href){
    const el = document.createElement('label');
    el.className = 'memo-item';
    el.innerHTML = `<input type="checkbox" data-id="${id}"/><span>${label}</span>${href?` <a href="${href}" target="_blank" rel="noopener">open</a>`:''}`;
    return el;
  }

  // -------- paragraph helpers --------
  function paragraphNumber(pre) {
    // Try id="osf-<n>"
    const id = pre?.id || "";
    const m = id.match(/osf-(\d+)/i);
    if (m) return Number(m[1]);
    // Try sibling header ('.osf-head .osf-label' text '§ N')
    const head = pre?.previousElementSibling;
    const label = head?.querySelector('.osf-label')?.textContent || "";
    const m2 = label.match(/§\s*(\d+)/);
    return m2 ? Number(m2[1]) : null;
  }

  // -------- refs discovery (figures ≠ tables) --------
  function gatherReferences(basePath){
    const figs = [];
    // true "figures" = figure with id AND not a wrapper of a table
    $$("figure[id]").forEach(fig=>{
      const hasTbl = !!fig.querySelector("table");
      if (hasTbl) return; // these will surface as tables
      const id = fig.id;
      let label = fig.querySelector('figcaption')?.textContent?.trim();
      if (!label) { label = id; }
      figs.push({ id, label, href: `${basePath}/notebook/#${id}` });
    });

    const tbls = [];
    // tables by their own id
    $$("table[id]").forEach(t=>{
      const id = t.id;
      let label = t.closest('figure')?.querySelector('figcaption')?.textContent?.trim()
               || t.getAttribute('aria-label') || id;
      tbls.push({ id, label, href: `${basePath}/notebook/#${id}` });
    });

    // de-dup (by id)
    const uniq = (arr) => {
      const seen = new Set(); const out = [];
      for (const x of arr){ if (!seen.has(x.id)){ seen.add(x.id); out.push(x); } }
      return out;
    };
    return { figs: uniq(figs), tbls: uniq(tbls) };
  }

  function exportJSON(obj, fname){
    const b = new Blob([JSON.stringify(obj, null, 2)], {type:"application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = fname;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=> URL.revokeObjectURL(a.href), 5000);
  }
  const draftKey = (uuid)=> `osf:memo:${uuid||"unknown"}`;

  function open(uuid, pre){
    styleOnce();

    const cafe = cafeSlugFromPath();
    const where = whereLabel();
    const title = `Draft RFC memo — [${cafe}] [${where}]`;
    const overlay = makeOverlay(title);

    // fill paragraph
    const para = pre || (uuid ? document.getElementById(uuid) : null) || $$("pre.osf")[0] || null;
    const n = paragraphNumber(para) || "?";
    $("#memo-paraNo").textContent = `§ ${n}`;
    const host = $("#memo-paragraph");
    if (para) host.innerHTML = para.outerHTML;
    else host.innerHTML = `<div class="memo-none">Paragraph not found. (UUID: ${uuid || "?"})</div>`;

    // refs
    const basePath = location.pathname.split('/notebook/')[0] || `/cafes/${cafe}`;
    const { figs, tbls } = gatherReferences(basePath);
    const figsHost = $('#memo-figs'), tblsHost = $('#memo-tbls');
    const figsNone = $('#memo-figs-none'), tblsNone = $('#memo-tbls-none');

    if (figs.length) { figs.forEach(f => figsHost.appendChild(checkboxItem(f.id, f.label, f.href))); figsNone.style.display="none"; }
    else figsNone.style.display = "";

    if (tbls.length) { tbls.forEach(t => tblsHost.appendChild(checkboxItem(t.id, t.label, t.href))); tblsNone.style.display="none"; }
    else tblsNone.style.display = "";

    // restore draft
    const saved = localStorage.getItem(draftKey(uuid));
    if (saved) {
      try {
        const j = JSON.parse(saved);
        $('#memo-text').value = j.memo_md || '';
        j.figures?.forEach(id => { const c = figsHost.querySelector(`input[data-id="${id}"]`); if (c) c.checked = true; });
        j.tables ?.forEach(id => { const c = tblsHost.querySelector(`input[data-id="${id}"]`); if (c) c.checked = true; });
      } catch {}
    }

    // wire buttons
    $('.memo-x').onclick = () => overlay.remove();
    $('#memo-save').onclick = () => {
      const memo = collect();
      localStorage.setItem(draftKey(uuid), JSON.stringify(memo));
      alert("Draft saved in this browser.");
    };
    $('#memo-export').onclick = () => {
      const memo = collect();
      const fname = `${cafe}-${uuid||"paragraph"}-memo.json`;
      exportJSON(memo, fname);
    };
    $('#memo-submit').onclick = () => {
      const fname = `${cafe}-${uuid||"paragraph"}-memo.json`;
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
        where: where,
        chapter_url: location.pathname,
        paragraph_uuid: uuid || para?.id || null,
        paragraph_num: (typeof n === "number" ? n : null),
        figures, tables, labels: [],
        memo_md: $('#memo-text').value || "",
        user_id: null, role: null, source_msg: null
      };
    }
  }

  // expose
  window.OSF = window.OSF || {};
  window.OSF.Memo = { open };
})();
