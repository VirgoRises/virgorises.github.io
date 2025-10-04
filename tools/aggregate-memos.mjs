// tools/aggregate-memos.mjs
// Aggregate private RFC memo activity into anonymized focus metrics.
//
// Scans:   data/<slug>/proposals/rfc/memos/*.json
// Emits:   out/memos_focus.json
//
// Notes:
// - We never store authors here (privacy).
// - We count one memo per (paragraph/figure/table) per day.
// - Status 'withdrawn' is ignored. Everything else is counted.
// - WINDOW_DAYS controls the "top_7d" time window.

import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const OUT  = path.join(ROOT, "out");
const WINDOW_DAYS = 7;

// ---------- helpers ----------
const safeReadJSON = async (p) => {
  try { return JSON.parse(await fs.readFile(p, "utf8")); }
  catch { return null; }
};
const list = async (d) => {
  try { return (await fs.readdir(d)).map(f => path.join(d, f)); }
  catch { return []; }
};
const ymd = (d) => {
  const dt = (d instanceof Date) ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const withinDays = (ts, n) => {
  const t = new Date(ts).getTime();
  return !isNaN(t) && (t >= daysAgo(n).getTime());
};

// push count into nested map: map[key][date] = count
function bump(map, key, dateStr) {
  if (!key) return;
  if (!map[key]) map[key] = Object.create(null);
  map[key][dateStr] = (map[key][dateStr] || 0) + 1;
}

function finalizeSeries(mapObj) {
  // Convert { key: { 'YYYY-MM-DD': n, ... } } to arrays sorted by date
  const out = {};
  for (const [key, byDate] of Object.entries(mapObj)) {
    const rows = Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0])) // chronological
      .map(([t, count]) => ({ t, count }));
    out[key] = rows;
  }
  return out;
}

function sumLastNDays(seriesObj, n) {
  // seriesObj: { key: [{t,count}, ...] }
  const lim = ymd(daysAgo(n - 1)); // inclusive boundary
  const sums = [];
  for (const [key, rows] of Object.entries(seriesObj)) {
    let s = 0;
    for (const r of rows) if (r.t >= lim) s += r.count;
    if (s > 0) sums.push({ key, count: s });
  }
  sums.sort((a,b)=> b.count - a.count || a.key.localeCompare(b.key));
  return sums;
}

// ---------- main ----------
async function main() {
  const cafes = await list(DATA);
  const nowISO = new Date().toISOString();

  // Per-café maps
  const byCafe = {}; // slug -> { by_paragraph: Map, by_figure: Map, by_table: Map }

  // Walk data/<slug>/proposals/rfc/memos/*.json
  for (const candidate of cafes) {
    const slug = path.basename(candidate);
    const memosDir = path.join(DATA, slug, "proposals", "rfc", "memos");
    const files = (await list(memosDir)).filter(f => f.endsWith(".json"));
    if (!files.length) continue;

    const acc = {
      by_paragraph: Object.create(null),
      by_figure:    Object.create(null),
      by_table:     Object.create(null),
    };

    for (const f of files) {
      const memo = await safeReadJSON(f);
      if (!memo) continue;

      // Skip withdrawn
      if (String(memo.status || "").toLowerCase() === "withdrawn") continue;

      // Use created_at (fallback updated_at)
      const stamp = memo.created_at || memo.updated_at;
      if (!stamp) continue;

      const day = ymd(stamp);

      // Count only once per memo (i.e., memo is a unit of intent)
      bump(acc.by_paragraph, memo.paragraph_uuid, day);

      // Figures / tables are arrays; tick each referenced element
      if (Array.isArray(memo.figures)) memo.figures.forEach(id => bump(acc.by_figure, id, day));
      if (Array.isArray(memo.tables))  memo.tables.forEach(id  => bump(acc.by_table,  id, day));
    }

    byCafe[slug] = {
      by_paragraph: finalizeSeries(acc.by_paragraph),
      by_figure:    finalizeSeries(acc.by_figure),
      by_table:     finalizeSeries(acc.by_table),
    };
  }

  // Build per-café top-7d + a global top-7d for paragraphs
  const cafesOut = {};
  const globalCounter = []; // collect {slug, key, count} for paragraphs

  for (const [slug, series] of Object.entries(byCafe)) {
    const top7_par = sumLastNDays(series.by_paragraph, WINDOW_DAYS);
    const top7_fig = sumLastNDays(series.by_figure, WINDOW_DAYS);
    const top7_tbl = sumLastNDays(series.by_table, WINDOW_DAYS);

    cafesOut[slug] = {
      by_paragraph: series.by_paragraph,
      by_figure:    series.by_figure,
      by_table:     series.by_table,
      top_7d_paragraphs: top7_par.map(x => ({ paragraph_uuid: x.key, count: x.count })),
      top_7d_figures:    top7_fig.map(x => ({ figure_id:     x.key, count: x.count })),
      top_7d_tables:     top7_tbl.map(x => ({ table_id:     x.key, count: x.count })),
    };

    // add to global
    top7_par.forEach(x => globalCounter.push({ slug, paragraph_uuid: x.key, count: x.count }));
  }

  // global top paragraphs last 7d
  globalCounter.sort((a,b)=> b.count - a.count || (a.slug+a.paragraph_uuid).localeCompare(b.slug+b.paragraph_uuid));
  const globalTop = globalCounter.slice(0, 50); // cap

  // Write
  await fs.mkdir(OUT, { recursive: true });
  const outObj = {
    generated_at: nowISO,
    window_days: WINDOW_DAYS,
    cafes: cafesOut,
    global_top_7d_paragraphs: globalTop
  };
  await fs.writeFile(path.join(OUT, "memos_focus.json"), JSON.stringify(outObj, null, 2), "utf8");
  console.log(`wrote out/memos_focus.json (cafés=${Object.keys(cafesOut).length})`);
}

main().catch(err => { console.error(err); process.exit(1); });
