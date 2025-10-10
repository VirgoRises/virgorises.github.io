// /js/overrides-manager.js — override/map dual-schema support (page OR from/to)
(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const state = {
    docId: "Old_main",
    defaultMap: null,
    overrides: null,
    activeChapter: "",
    filter: "",
    sortKey: "anchor",
    sortAsc: true,
    dirty: false,
    page: 1,
    pageSize: 200,
  };

  const els = {
    dirtyBadge: $("#dirtyBadge"),
    exportBtn: $("#exportBtn"),
    defaultFile: $("#defaultFile"),
    overridesFile: $("#overridesFile"),
    docId: $("#docId"),
    clearLocal: $("#clearLocal"),
    chapterSelect: $("#chapterSelect"),
    filterInput: $("#filterInput"),
    sortKey: $("#sortKey"),
    sortDir: $("#sortDir"),
    rowCount: $("#rowCount"),
    pageLabel: $("#pageLabel"),
    prevPage: $("#prevPage"),
    nextPage: $("#nextPage"),
    pageSize: $("#pageSize"),
    manualAnchor: $("#manualAnchor"),
    manualPage: $("#manualPage"),
    quickAdd: $("#quickAdd"),
    rows: $("#rows"),
    snippet: $("#snippet"),
  };

  // ---------- Persistence ----------
  const lcKey = () => `override_manager:${state.docId || "default"}`;
  function loadLocal() {
    const raw = localStorage.getItem(lcKey());
    if (raw) {
      try {
        state.overrides = JSON.parse(raw);
      } catch {}
    }
  }
  function saveLocal() {
    if (state.overrides) {
      localStorage.setItem(lcKey(), JSON.stringify(state.overrides));
    }
  }

  // ---------- IO ----------
  function readFileAsJson(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        try {
          res(JSON.parse(String(r.result)));
        } catch (e) {
          rej(e);
        }
      };
      r.onerror = rej;
      r.readAsText(file);
    });
  }
  function downloadJson(name, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- Schema helpers ----------
  // Return the anchor->record object for a chapter from a map/overrides root.
  function getChapterItems(root, chapter) {
    if (!root?.chapters) return {};
    const blk = root.chapters[chapter];
    if (!blk) return {};
    // Support either {chapters:{chapter:{items:{...}}}} or {chapters:{chapter:{...}}}
    return blk.items || blk;
  }

  // Build set of chapter names from both map + overrides.
  function chaptersList() {
    const set = new Set();
    if (state.defaultMap?.chapters)
      Object.keys(state.defaultMap.chapters).forEach((c) => set.add(c));
    if (state.overrides?.chapters)
      Object.keys(state.overrides.chapters).forEach((c) => set.add(c));
    return Array.from(set).sort();
  }

  function ensureChapter(ch) {
    if (!state.overrides)
      state.overrides = {
        version: 1,
        docId: state.docId,
        updatedAt: nowIso(),
        chapters: {},
      };
    if (!state.overrides.chapters[ch])
      state.overrides.chapters[ch] = { items: {} };
  }

  function nowIso() {
    return new Date().toISOString();
  }

  // Normalize records to {from,to,type,partition,note,user,lastUpdated}
  function normRec(rec) {
    if (!rec) return null;
    const out = {
      type: rec.type,
      partition: rec.partition,
      note: rec.note,
      user: rec.user,
      lastUpdated: rec.lastUpdated,
    };
    if (typeof rec.page === "number") {
      out.from = rec.page;
      out.to = rec.page;
      return out;
    }
    if (typeof rec.from === "number" && typeof rec.to === "number") {
      out.from = rec.from;
      out.to = rec.to;
      return out;
    }
    return null;
  }

  function displayRange(rec) {
    if (!rec) return "—";
    if (typeof rec.from === "number" && typeof rec.to === "number") {
      return rec.from === rec.to ? `p.${rec.from}` : `p.${rec.from}–${rec.to}`;
    }
    return "—";
  }

  // ---------- Update / Remove ----------
  function updateItem(ch, anchor, patch) {
    ensureChapter(ch);
    const items = state.overrides.chapters[ch].items;
    const existing = items[anchor] || {};
    const next = { ...existing, ...patch, lastUpdated: nowIso() };
    items[anchor] = next;
    state.overrides.updatedAt = nowIso();
    state.dirty = true;
    saveLocal();
    renderDirty();
  }

  function removeItem(ch, anchor) {
    if (!state.overrides?.chapters?.[ch]?.items?.[anchor]) return;
    delete state.overrides.chapters[ch].items[anchor];
    state.overrides.updatedAt = nowIso();
    state.dirty = true;
    saveLocal();
    renderDirty();
    renderRows();
  }

  // ---------- Render ----------
  function renderDirty() {
    els.dirtyBadge.textContent = state.dirty
      ? "Unsaved changes"
      : "All changes saved locally";
    els.dirtyBadge.className = "pill " + (state.dirty ? "ok" : "success");
  }

  function renderChapters() {
    const list = chaptersList();
    els.chapterSelect.innerHTML = list
      .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
      .join("");
    if (!state.activeChapter && list.length) state.activeChapter = list[0];
    if (list.length && !list.includes(state.activeChapter))
      state.activeChapter = list[0];
    els.chapterSelect.value = state.activeChapter || "";
  }

  function getRows() {
    if (!state.activeChapter) return [];
    const baseRaw = getChapterItems(state.defaultMap, state.activeChapter);
    const ovRaw = getChapterItems(state.overrides, state.activeChapter);

    const ids = new Set([...Object.keys(baseRaw), ...Object.keys(ovRaw)]);
    let rows = Array.from(ids).map((id) => {
      const dRec = normRec(baseRaw[id]);
      const oRec = normRec(ovRaw[id] || state.overrides?.chapters?.[state.activeChapter]?.items?.[id]);
      // type fallback: override.type || detected?.type || 'paragraph'
      const type = (ovRaw[id]?.type || baseRaw[id]?.type || "paragraph");
      return {
        anchor: id,
        detected: dRec, // {from,to}
        override: oRec, // {from,to}
        type,
        partition: (ovRaw[id]?.partition || ""),
        note: (ovRaw[id]?.note || ""),
        user: (ovRaw[id]?.user || ""),
        lastUpdated: (ovRaw[id]?.lastUpdated || null),
      };
    });

    const f = state.filter.trim().toLowerCase();
    if (f)
      rows = rows.filter((r) =>
        `${r.anchor} ${r.type} ${r.partition} ${r.note}`
          .toLowerCase()
          .includes(f)
      );

    const sorters = {
      anchor: (a, b) => a.anchor.localeCompare(b.anchor),
      type: (a, b) => (a.type || "").localeCompare(b.type || ""),
      detectedPage: (a, b) =>
        (a.detected?.from ?? Infinity) - (b.detected?.from ?? Infinity),
      overridePage: (a, b) =>
        (a.override?.from ?? Infinity) - (b.override?.from ?? Infinity),
      lastUpdated: (a, b) =>
        new Date(a.lastUpdated || 0) - new Date(b.lastUpdated || 0),
    };
    const cmp = sorters[state.sortKey] || sorters.anchor;
    rows.sort((a, b) => (state.sortAsc ? cmp(a, b) : cmp(b, a)));
    return rows;
  }

  function renderRows() {
    const rows = getRows();
    els.rowCount.textContent = rows.length;

    const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    els.pageLabel.textContent = `${state.page} / ${totalPages}`;

    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageRows = rows.slice(start, end);

    els.rows.innerHTML = pageRows.map((r) => RowHTML(r)).join("");
  }

  function RowHTML(r) {
    const det = `<span class="tag">${displayRange(r.detected)}</span>`;
    const overrideText = r.override
      ? r.override.from === r.override.to
        ? String(r.override.from)
        : `${r.override.from}-${r.override.to}`
      : "";

    return `
<tr data-anchor="${escapeHtml(r.anchor)}">
  <td class="mono">${escapeHtml(r.anchor)}</td>
  <td>
    <select class="inp-type">
      ${["paragraph", "figure", "table", "equation", "other"]
        .map((t) => `<option ${t === r.type ? "selected" : ""}>${t}</option>`)
        .join("")}
    </select>
  </td>
  <td>${det}</td>
  <td><input class="inp-page w-28" type="text" value="${escapeAttr(
    overrideText
  )}" placeholder="8 or 8-9"/></td>
  <td><input class="inp-part w-28" type="text" value="${escapeAttr(
    r.partition || ""
  )}" placeholder="a / b / c"/></td>
  <td><input class="inp-note w-40" type="text" value="${escapeAttr(
    r.note || ""
  )}" placeholder="clarify figure corner cases"/></td>
  <td><input class="inp-user w-28" type="text" value="${escapeAttr(
    r.user || ""
  )}" placeholder="owner"/></td>
  <td class="right">
    <button class="btn tiny secondary act-save">Save</button>
    <button class="btn tiny secondary danger act-del">Delete</button>
  </td>
</tr>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }
  function escapeAttr(s) {
    return String(s).replace(/[&<>\"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function renderSnippet() {
    const code = `// Example retrieval (UI uses range-aware logic now)
function getSourceRange(chapterId, anchorId, defaultMap, overrides) {
  const c = (root) => root?.chapters?.[chapterId] && (root.chapters[chapterId].items || root.chapters[chapterId]);
  const pick = (obj) => obj?.[anchorId] ?? obj?.[\`para-\${anchorId}\`];
  const norm = (rec) => rec ? (typeof rec.page==='number' ? {from:rec.page,to:rec.page} :
                 (typeof rec.from==='number'&&typeof rec.to==='number'?{from:rec.from,to:rec.to}:null)) : null;
  const o = norm(pick(c(overrides)));
  if (o) return o;
  const d = norm(pick(c(defaultMap)));
  return d;
}`;
    els.snippet.textContent = code;
  }

  // ---------- Events ----------
  els.defaultFile.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      state.defaultMap = await readFileAsJson(f);
      if (state.defaultMap?.docId) {
        state.docId = state.defaultMap.docId;
        els.docId.value = state.docId;
      }
      renderChapters();
      renderRows();
    } catch (err) {
      alert("Failed to read baseline map JSON: " + err.message);
    }
  });

  els.overridesFile.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const json = await readFileAsJson(f);
      // merge: keep existing, overlay new (support both .items and direct)
      if (!state.overrides) {
        state.overrides = json;
      } else {
        if (!state.overrides.chapters) state.overrides.chapters = {};
        for (const [ch, blk] of Object.entries(json.chapters || {})) {
          const target = state.overrides.chapters[ch] || {};
          const srcItems = blk.items || blk;
          const tgtItems = target.items || target;
          for (const [id, it] of Object.entries(srcItems || {})) {
            (tgtItems)[id] = { ...(tgtItems[id] || {}), ...it };
          }
          // write back using .items shape to keep consistency
          state.overrides.chapters[ch] = { items: tgtItems };
        }
      }
      state.dirty = true;
      saveLocal();
      renderDirty();
      renderChapters();
      renderRows();
    } catch (err) {
      alert("Failed to read overrides JSON: " + err.message);
    }
  });

  els.docId.addEventListener("input", () => {
    state.docId = els.docId.value.trim() || "Old_main";
    state.overrides = null;
    loadLocal();
    renderChapters();
    renderRows();
    renderDirty();
  });

  els.clearLocal.addEventListener("click", () => {
    if (!confirm("Clear local overrides for this document?")) return;
    localStorage.removeItem(lcKey());
    state.overrides = null;
    state.dirty = false;
    renderDirty();
    renderRows();
  });

  els.chapterSelect.addEventListener("change", () => {
    state.activeChapter = els.chapterSelect.value;
    state.page = 1;
    renderRows();
  });

  els.filterInput.addEventListener("input", () => {
    state.filter = els.filterInput.value;
    state.page = 1;
    renderRows();
  });

  els.sortKey.addEventListener("change", () => {
    state.sortKey = els.sortKey.value;
    renderRows();
  });
  els.sortDir.addEventListener("click", () => {
    state.sortAsc = !state.sortAsc;
    els.sortDir.textContent = state.sortAsc ? "Asc" : "Desc";
    renderRows();
  });

  els.pageSize.addEventListener("change", () => {
    state.pageSize = +els.pageSize.value;
    state.page = 1;
    renderRows();
  });
  els.prevPage.addEventListener("click", () => {
    if (state.page > 1) {
      state.page--;
      renderRows();
    }
  });
  els.nextPage.addEventListener("click", () => {
    state.page++;
    renderRows();
  });

  els.quickAdd.addEventListener("click", () => {
    if (!state.activeChapter) {
      alert("Select a chapter first");
      return;
    }
    const anchor = els.manualAnchor.value.trim();
    const pageStr = els.manualPage.value.trim();
    if (!anchor) {
      alert("Anchor id is required");
      return;
    }
    if (!pageStr) {
      alert("Page or range is required");
      return;
    }
    const parsed = parseOverrideInput(pageStr);
    if (!parsed) {
      alert("Enter a page like '8' or a range like '8-9'");
      return;
    }
    ensureChapter(state.activeChapter);
    const patch =
      parsed.kind === "single"
        ? { page: parsed.value }
        : { from: parsed.a, to: parsed.b };
    updateItem(state.activeChapter, anchor, patch);
    els.manualAnchor.value = "";
    els.manualPage.value = "";
    renderRows();
  });

  els.rows.addEventListener("click", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    const anchor = tr.dataset.anchor;

    if (e.target.matches(".act-save")) {
      const type = $("select.inp-type", tr).value;
      const pageRaw = $("input.inp-page", tr).value.trim();
      const partition = $("input.inp-part", tr).value.trim();
      const note = $("input.inp-note", tr).value.trim();
      const user = $("input.inp-user", tr).value.trim();

      let patch = { type, partition, note, user };
      if (pageRaw === "") {
        // clearing override: set to empty object (will still exist until delete)
        // If you want actual removal, click Delete.
      } else {
        const parsed = parseOverrideInput(pageRaw);
        if (!parsed) {
          alert("Enter a page like '8' or a range like '8-9'");
          return;
        }
        if (parsed.kind === "single") {
          patch.page = parsed.value;
          delete patch.from;
          delete patch.to;
        } else {
          patch.from = parsed.a;
          patch.to = parsed.b;
          delete patch.page;
        }
      }
      updateItem(state.activeChapter, anchor, patch);
    }

    if (e.target.matches(".act-del")) {
      if (confirm(`Remove override for ${anchor}?`))
        removeItem(state.activeChapter, anchor);
    }
  });

  els.exportBtn.addEventListener("click", () => {
    if (!state.overrides) {
      alert("No overrides to export yet.");
      return;
    }
    downloadJson(`${state.docId}.overrides.json`, state.overrides);
    state.dirty = false;
    renderDirty();
  });

  function parseOverrideInput(s) {
    // Accept "8" or "8-9" (spaces allowed)
    const single = s.match(/^\s*(\d+)\s*$/);
    if (single) return { kind: "single", value: Number(single[1]) };
    const range = s.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b >= a)
        return { kind: "range", a, b };
    }
    return null;
    }

  function init() {
    loadLocal();
    renderChapters();
    renderRows();
    renderSnippet();
    renderDirty();
  }
  init();
})();
