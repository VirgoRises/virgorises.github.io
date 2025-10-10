(function () {
    const $ = (sel, el = document) => el.querySelector(sel);
    const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
    const state = { docId: 'Old_main', defaultMap: null, overrides: null, activeChapter: '', filter: '', sortKey: 'anchor', sortAsc: true, dirty: false, page: 1, pageSize: 200 };
    const els = { dirtyBadge: $('#dirtyBadge'), exportBtn: $('#exportBtn'), defaultFile: $('#defaultFile'), overridesFile: $('#overridesFile'), docId: $('#docId'), clearLocal: $('#clearLocal'), chapterSelect: $('#chapterSelect'), filterInput: $('#filterInput'), sortKey: $('#sortKey'), sortDir: $('#sortDir'), rowCount: $('#rowCount'), pageLabel: $('#pageLabel'), prevPage: $('#prevPage'), nextPage: $('#nextPage'), pageSize: $('#pageSize'), manualAnchor: $('#manualAnchor'), manualPage: $('#manualPage'), quickAdd: $('#quickAdd'), rows: $('#rows'), snippet: $('#snippet') };
    const lcKey = () => `override_manager:${state.docId || 'default'}`;
    function loadLocal() { const raw = localStorage.getItem(lcKey()); if (raw) { try { state.overrides = JSON.parse(raw); } catch { } } }
    function saveLocal() { if (state.overrides) { localStorage.setItem(lcKey(), JSON.stringify(state.overrides)); } }
    function readFileAsJson(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => { try { res(JSON.parse(String(r.result))); } catch (e) { rej(e); } }; r.onerror = rej; r.readAsText(file); }); }
    function downloadJson(name, data) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    function mergeOverrides(a, b) { if (!a) return b || null; if (!b) return a; const out = { ...a, chapters: { ...(a.chapters || {}) } }; for (const [ch, chB] of Object.entries(b.chapters || {})) { const chA = a.chapters?.[ch] || { items: {} }; out.chapters[ch] = { items: { ...(chA.items || {}) } }; for (const [id, itemB] of Object.entries(chB.items || {})) { out.chapters[ch].items[id] = { ...(chA.items?.[id] || {}), ...itemB }; } } return out; }
    function chaptersList() { const set = new Set(); if (state.defaultMap?.chapters) Object.keys(state.defaultMap.chapters).forEach(c => set.add(c)); if (state.overrides?.chapters) Object.keys(state.overrides.chapters).forEach(c => set.add(c)); return Array.from(set).sort(); }
    function ensureChapter(ch) { if (!state.overrides) state.overrides = { version: 1, docId: state.docId, updatedAt: nowIso(), chapters: {} }; if (!state.overrides.chapters[ch]) state.overrides.chapters[ch] = { items: {} }; }
    function updateItem(ch, anchor, patch) { ensureChapter(ch); const items = state.overrides.chapters[ch].items; const existing = items[anchor] || {}; items[anchor] = { ...existing, ...patch, lastUpdated: nowIso() }; state.overrides.updatedAt = nowIso(); state.dirty = true; saveLocal(); renderDirty(); }
    function removeItem(ch, anchor) { if (!state.overrides?.chapters?.[ch]?.items?.[anchor]) return; delete state.overrides.chapters[ch].items[anchor]; state.overrides.updatedAt = nowIso(); state.dirty = true; saveLocal(); renderDirty(); renderRows(); }
    function nowIso() { return new Date().toISOString(); }
    function renderDirty() { els.dirtyBadge.textContent = state.dirty ? 'Unsaved changes' : 'All changes saved locally'; els.dirtyBadge.className = 'pill ' + (state.dirty ? 'ok' : 'success'); }
    function renderChapters() { const list = chaptersList(); els.chapterSelect.innerHTML = list.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join(''); if (!state.activeChapter && list.length) state.activeChapter = list[0]; if (list.length && !list.includes(state.activeChapter)) state.activeChapter = list[0]; els.chapterSelect.value = state.activeChapter || ''; }
    function getRows() { if (!state.activeChapter) return []; const base = state.defaultMap?.chapters?.[state.activeChapter]?.items || {}; const ov = state.overrides?.chapters?.[state.activeChapter]?.items || {}; const ids = new Set([...Object.keys(base), ...Object.keys(ov)]); let rows = Array.from(ids).map(id => { const d = base[id] || null; const o = ov[id] || null; return { anchor: id, detectedPage: d?.page ?? null, detectedType: d?.type ?? null, overridePage: o?.page ?? null, partition: o?.partition ?? '', type: o?.type ?? (d?.type || 'paragraph'), note: o?.note ?? '', user: o?.user ?? '', lastUpdated: o?.lastUpdated ?? null }; }); const f = state.filter.trim().toLowerCase(); if (f) rows = rows.filter(r => `${r.anchor} ${r.type} ${r.partition} ${r.note}`.toLowerCase().includes(f)); const sorters = { anchor: (a, b) => a.anchor.localeCompare(b.anchor), type: (a, b) => (a.type || '').localeCompare(b.type || ''), detectedPage: (a, b) => (a.detectedPage ?? Infinity) - (b.detectedPage ?? Infinity), overridePage: (a, b) => (a.overridePage ?? Infinity) - (b.overridePage ?? Infinity), lastUpdated: (a, b) => new Date(a.lastUpdated || 0) - new Date(b.lastUpdated || 0), }; const cmp = sorters[state.sortKey] || sorters.anchor; rows.sort((a, b) => state.sortAsc ? cmp(a, b) : cmp(b, a)); return rows; }
    function renderRows() { const rows = getRows(); els.rowCount.textContent = rows.length; const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize)); if (state.page > totalPages) state.page = totalPages; els.pageLabel.textContent = `${state.page} / ${totalPages}`; const start = (state.page - 1) * state.pageSize; const end = start + state.pageSize; const pageRows = rows.slice(start, end); els.rows.innerHTML = pageRows.map(r => RowHTML(r)).join(''); }
    function RowHTML(r) {
        const det = r.detectedPage != null ? `<span class="tag">p.${r.detectedPage}</span>` : '<span class="muted">—</span>'; return `
<tr data-anchor="${escapeHtml(r.anchor)}">
<td class=\"mono\">${escapeHtml(r.anchor)}</td>
<td>
<select class=\"inp-type\">${['paragraph', 'figure', 'table', 'equation', 'other'].map(t => `<option ${t === r.type ? 'selected' : ''}>${t}</option>`).join('')}</select>
</td>
<td>${det}</td>
<td><input class=\"inp-page w-28\" type=\"text\" value=\"${r.overridePage == null ? '' : String(r.overridePage)}\" placeholder=\"(empty to clear)\"/></td>
<td><input class=\"inp-part w-28\" type=\"text\" value=\"${escapeAttr(r.partition)}\" placeholder=\"a / b / c\"/></td>
<td><input class=\"inp-note w-40\" type=\"text\" value=\"${escapeAttr(r.note)}\" placeholder=\"clarify figure corner cases\"/></td>
<td><input class=\"inp-user w-28\" type=\"text\" value=\"${escapeAttr(r.user)}\" placeholder=\"owner\"/></td>
<td class=\"right\">
<button class=\"btn tiny secondary act-save\">Save</button>
<button class=\"btn tiny secondary danger act-del\">Delete</button>
</td>
</tr>`;
    }
    function escapeHtml(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
    function escapeAttr(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c])); }
    function renderSnippet() {
        const code = `// Example retrieval function used in your cafe routes:
function getSourcePage(chapterId, anchorId, defaultMap, overrides) {
const o = overrides?.chapters?.[chapterId]?.items?.[anchorId];
if (o?.page != null) return o; // {page, partition?, type?, note?}
const d = defaultMap?.chapters?.[chapterId]?.items?.[anchorId];
return d ? { page: d.page, type: d.type || 'paragraph' } : null;
}`; els.snippet.textContent = code;
    }
    // Events
    els.defaultFile.addEventListener('change', async (e) => { const f = e.target.files?.[0]; if (!f) return; try { state.defaultMap = await readFileAsJson(f); if (state.defaultMap?.docId) { state.docId = state.defaultMap.docId; els.docId.value = state.docId; } renderChapters(); renderRows(); } catch (err) { alert('Failed to read baseline map JSON: ' + err.message); } });
    els.overridesFile.addEventListener('change', async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const json = await readFileAsJson(f); state.overrides = mergeOverrides(state.overrides, json); state.dirty = true; saveLocal(); renderDirty(); renderChapters(); renderRows(); } catch (err) { alert('Failed to read overrides JSON: ' + err.message); } });
    els.docId.addEventListener('input', () => { state.docId = els.docId.value.trim() || 'Old_main'; state.overrides = null; loadLocal(); renderChapters(); renderRows(); renderDirty(); });
    els.clearLocal.addEventListener('click', () => { if (!confirm('Clear local overrides for this document?')) return; localStorage.removeItem(lcKey()); state.overrides = null; state.dirty = false; renderDirty(); renderRows(); });
    els.chapterSelect.addEventListener('change', () => { state.activeChapter = els.chapterSelect.value; state.page = 1; renderRows(); });
    els.filterInput.addEventListener('input', () => { state.filter = els.filterInput.value; state.page = 1; renderRows(); });
    els.sortKey.addEventListener('change', () => { state.sortKey = els.sortKey.value; renderRows(); });
    els.sortDir.addEventListener('click', () => { state.sortAsc = !state.sortAsc; els.sortDir.textContent = state.sortAsc ? 'Asc' : 'Desc'; renderRows(); });
    els.pageSize.addEventListener('change', () => { state.pageSize = +els.pageSize.value; state.page = 1; renderRows(); });
    els.prevPage.addEventListener('click', () => { if (state.page > 1) { state.page--; renderRows(); } });
    els.nextPage.addEventListener('click', () => { state.page++; renderRows(); });
    els.quickAdd.addEventListener('click', () => { if (!state.activeChapter) { alert('Select a chapter first'); return; } const anchor = els.manualAnchor.value.trim(); const pageStr = els.manualPage.value.trim(); if (!anchor) { alert('Anchor id is required'); return; } if (!pageStr) { alert('Page is required'); return; } const page = Number(pageStr); if (!Number.isFinite(page)) { alert('Page must be a number'); return; } updateItem(state.activeChapter, anchor, { page, type: 'paragraph', user: 'owner' }); els.manualAnchor.value = ''; els.manualPage.value = ''; renderRows(); });
    els.rows.addEventListener('click', (e) => {
        const tr = e.target.closest('tr'); if (!tr) return; const anchor = tr.dataset.anchor; if (e.target.matches('.act-save')) { const type = $('select.inp-type', tr).value; const pageRaw = $('input.inp-page', tr).value.trim(); const partition = $('input.inp-part', tr).value.trim(); const note = $('input.inp-note', tr).value.trim(); const user = $('input.inp-user', tr).value.trim(); const page = pageRaw === '' ? null : Number(pageRaw); if (pageRaw !== '' && !Number.isFinite(page)) { alert('Override page must be a number'); return; } updateItem(state.activeChapter, anchor, { page, type, partition, note, user }); }
        if (e.target.matches('.act-del')) { if (confirm(`Remove override for ${anchor}?`)) removeItem(state.activeChapter, anchor); }
    });
    els.exportBtn.addEventListener('click', () => { if (!state.overrides) { alert('No overrides to export yet.'); return; } downloadJson(`${state.docId}.overrides.json`, state.overrides); state.dirty = false; renderDirty(); });
    function init() { loadLocal(); renderChapters(); renderRows(); renderSnippet(); renderDirty(); }
    init();
})();