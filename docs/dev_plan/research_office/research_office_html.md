Research Office — right-column flow (stabilization plan)
0) Purpose

Stabilize the right column of research_office.html so it consistently:

Resolves the primary page for the selected paragraph.

Shows that page in Pages referenced in memo (with the thick orange border).

Loads the thumbnail under the grid to the same page.

Keeps markers one-way sourced from the Memo to self tokens.

Lets memo text add/remove pages ([mm|pN=…]) and keeps the strip in sync.

Renders Paragraph preview and Memo preview (Markdown + LaTeX via the same MathJax config the chapters use).

We’ll land these in small, verifiable steps with crisp signals so regressions are obvious.

1) Current symptoms (to verify we fix)

Primary chip sometimes missing or appears only after typing.

Grid sometimes loads p.1 even when resolver returns (e.g.) p.7.

Typing [mm|pN=…] does not add a chip.

Paragraph preview and Memo preview occasionally do not typeset math.

Rare “page unresolved; markers disabled” state persists.

2) Non-negotiable invariants

Single source of truth for markers: the memo textarea (#memoBody).

Primary page is never tokenized on load; it is always present as a chip.

Resolver uses (in order):
a) the paragraph’s data-page in chapter HTML,
b) the paragraph entry in chapter.html.manifest.json,
c) the starts[chapter] number in the same manifest,
d) hard default 1.
All paths are under the same cafe slug (/cafes/<slug>/…).

Thumbnails are zero-padded: /sources/thumbs/page-###.jpg.

3) UI contract (IDs we wire to)

Keep these IDs stable in research_office.html (already present):

Grid + image
#ro-stage, #ro-inner, #ro-page, #ro-svg
(Buttons: #toolPoint, #toolBox, #zoomOut, #zoomFit, #zoomIn, #unitsSel, #exportJson)

Right column
#mmThumbs (chips container)
#paraPreview (paragraph preview container)
#paraNum (shows #osf-N)
Memo: #memoBody, preview block #memoPreview, button #btnPreview

If a future testbed uses different IDs, it must conform to this contract to avoid drift.

4) Event flow (golden path)

Boot

Parse ?chapter and ?para. Derive cafeSlug from the URL (/cafes/<slug>/…).

Kick the resolver (once).

Resolver returns primaryPage

Render primary chip into #mmThumbs (bold border).

Set grid viewer active page = primaryPage and set #ro-page.src → .../page-###.jpg.

Mark system ready for markers.

Sync memo → chips

Parse [mm|pN=…] tokens from #memoBody on every input.

Chips = primary + sorted unique non-primary pages detected in memo.

Chip click → grid

Clicking any chip calls setActivePage(N) and updates the grid image.

Preview button

Ensure marked and MathJax are present.

Render memo markdown to #memoPreview, then run MathJax.typesetPromise.

Paragraph preview

(Already loaded in the page) just keep using chapter content DOM fragment so MathJax typesets with the same config.

5) Logging & status signals

A tiny status line (already present near the grid) prints:

“Resolving page… → Start page resolved from HTML/manifest/start/default → Ready • primary p.N”

“Ready • active p.N” on chip changes.

Add a debug flag ?rodebug=1 to enable console.debug() breadcrumbs for:

resolver decisions,

chip rendering,

memo→chips sync counts,

preview load events.

6) Execution plan (small, check-off tasks)
A. Resolver & primary page (blocking)

 Ensure resolver fetches under /cafes/<slug>/ for both chapter HTML and chapter.html.manifest.json.

 Use order: HTML data-page → manifest paras[].page → starts[chapter] → 1.

 After resolve: render primary chip, setActivePage(primary), show status Ready • primary p.N.

B. Grid & viewer coupling

 setActivePage(N) sets #ro-page.src (zero-padded) and updates the orange border highlight if N==primary.

 On #ro-page image load: compute orientation (A4 vs A4-landscape), set SVG viewBox, Fit width, dispatch memo→grid redraw.

 Expose window.__ro_grid_refresh and call it after every memo change.

C. Memo ↔ chips sync

 Regex: /\[mm\|p(\d+)=/gi to extract pages.

 Rebuild chips = primary + sorted unique non-primary.

 Chip click → setActivePage(N).

 (Optional later) chip “X” removes the page by inserting [del] in front of corresponding tokens instead of hard-deleting.

D. Marker emission gating

 Gate any grid-emitted tokens on window.__ro_ReadyForMarkers.

 While false → show subtle “markers disabled” note; true after setActivePage(primary) completes.

E. Markdown + LaTeX preview

 Load marked (local first → CDN) and reuse chapter MathJax config (already included in HTML).

 #btnPreview → render into #memoPreview, then MathJax.typesetPromise([#memoPreview]).

 Clear prior preview errors on each render.

F. Paths & assets

 Thumbs path = /cafes/<slug>/sources/thumbs/page-###.jpg (always zero-padded).

 If a thumb fails to load, show a chip note “missing thumbnail p.N” (no searching in test phase).

G. Remove drift / old branches (when stable)

 Keep one research.office.js (the converged build).

 If present, quarantine old helpers (research-office-thumbs.js, HUD stubs) and ensure they aren’t loaded.

7) Test checklist (manual)

For each of the 10 chapter .manifest.json files (all paras currently point to the chapter’s first page):

Open a paragraph URL → primary chip shows p.<start> and grid shows same page.

Type [mm|p<start>=x,y] → should NOT add a duplicate chip (primary is implicit).

Type [mm|p<start+1>=x,y] → chip appears; click it → grid switches; click primary → back.

Draw one point and one box on the active page → both tokens appear in the memo; markers render on grid.

Click Preview in memo card → Markdown + LaTeX typeset correctly.

Refresh the page → resolver returns the same primary; markers remain (memo-sourced).

8) Rollback & safety

The plan only touches one file (/js/research.office.js) and uses the existing HTML/IDs.

If anything breaks, restore the previous single file and we’re back to the prior state.

9) Work log (check off as we ship)

 A — Resolver uses /cafes/<slug>/… and chooses the correct start page.

 B — setActivePage() keeps grid and chips in lock-step.

 C — Memo tokens ↔ chips sync in real-time; primary never tokenized.

 D — Marker emission gated until ready.

 E — Markdown + LaTeX preview works (same MathJax config as chapters).

 F — Thumbnails zero-padded; missing thumb note shows.

 G — One canonical research.office.js; old helpers unused.

Notes on avoiding future drift

Keep /docs/ui-contract.txt up-to-date whenever an ID changes.

Testbeds must adopt the same IDs (or import the contract and assert on boot).

Prefer small, isolated changes; use the status line + ?rodebug=1 trail for fast diagnosis.