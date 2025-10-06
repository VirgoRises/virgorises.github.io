// tools/osf-normalize.mjs
// Normalize notebook/WB HTML for a café:
//  - ensure <pre class="osf" id="osf-N"> in order
//  - wrap stray <figure> in <pre class="osf"> blocks
//  - move figure id="tbl-..." to nested <table id="tbl-..."> (remove from figure)
//  - add ids to figures when missing (from <img alt> or figcaption)
//  - never touch commented-out markup

import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import * as cheerio from "cheerio";
import slugify from "slugify";

const ROOT = process.cwd();

function arg(name, def=null){
  const i = process.argv.indexOf(name);
  return i > -1 ? (process.argv[i+1] ?? true) : def;
}
const SLUG  = arg("--slug", "zeta-zero-cafe");
const WRITE = !!arg("--write", false);
const BASE  = path.join(ROOT, "cafes", SLUG);
const GLOBS = [
  path.join(BASE, "notebook", "*.html"),
  path.join(BASE, "whiteboard", "*.html")
];

const FIG_ID_RE = /^fig(-|$)/i;
const TBL_ID_RE = /^tbl(-|$)/i;

function uniqueId(proposed, used) {
  let id = proposed || "auto";
  id = id.replace(/\s+/g, "-").replace(/[^a-z0-9\-_.:]/gi, "").toLowerCase();
  if (!id) id = "auto";
  let k = id, n = 2;
  while (used.has(k)) { k = `${id}-${n++}`; }
  used.add(k);
  return k;
}
function idFromAltOrCaption($fig, used, fallbackPrefix="fig") {
  const alt = $fig.find("img[alt]").first().attr("alt")?.trim() || "";
  const cap = $fig.find("figcaption").first().text()?.trim() || "";
  const src = alt || cap || "";
  // try “Figure 2.01 …” -> fig-2-01
  const m = src.match(/figure\s+([0-9]+(?:\.[0-9]+)*)/i);
  if (m) {
    const num = m[1].replace(/\./g, "-");
    return uniqueId(`fig-${num}`, used);
  }
  const s = slugify(src, { lower:true, strict:true }) || "item";
  return uniqueId(`${fallbackPrefix}-${s}`, used);
}

async function processFile(file) {
  const html = await fs.readFile(file, "utf8");
  const $ = cheerio.load(html, { decodeEntities:false });

  // Track all IDs to avoid duplicates
  const used = new Set();
  $("[id]").each((_, el)=> used.add($(el).attr("id")));

// 1) Wrap stray <figure> (not already inside a pre.osf)
$("figure").each((_, el)=>{
  const fig = $(el);
  if (fig.parents("pre.osf").length) return;
  fig.wrap('<pre class="osf"></pre>');
});

// 1b) NEW: wrap stray <blockquote> (not already inside a pre.osf)
$("blockquote").each((_, el)=>{
  const q = $(el);
  if (q.parents("pre.osf").length) return;
  q.wrap('<pre class="osf"></pre>');
});

  // 2) Move figure id="tbl-..." to table id
  $("figure[id]").each((_, el)=>{
    const fig = $(el);
    const id = fig.attr("id");
    if (!TBL_ID_RE.test(id)) return;
    const tbl = fig.find("table").first();
    if (tbl.length) {
      // move id from figure to the table (keep uniqueness)
      fig.removeAttr("id");
      const newId = uniqueId(id, used);
      tbl.attr("id", newId);
    }
  });

  // 3) Ensure figures have ids (for selection)
  $("figure").each((_, el)=>{
    const fig = $(el);
    if (fig.attr("id")) return;
    const id = idFromAltOrCaption(fig, used, "fig");
    fig.attr("id", id);
  });

  // 4) Number <pre class="osf"> blocks: id="osf-N" per file (top-to-bottom)
  const pres = $("pre.osf");
  pres.each((i, el)=>{
    const pre = $(el);
    // skip commented-out blocks — not selected by cheerio anyway
    const id = `osf-${i+1}`;
    pre.attr("id", uniqueId(id, used));
  });

  // Save or preview
  if (WRITE) {
    await fs.writeFile(file, $.html(), "utf8");
    console.log(`✔ normalized ${path.relative(ROOT, file)}  (paras=${pres.length})`);
  } else {
    console.log(`→ would normalize ${path.relative(ROOT, file)}  (paras=${pres.length})`);
  }
}

async function main(){
  const files = (await Promise.all(GLOBS.map(g=>glob(g)))).flat().sort();
  if (!files.length) {
    console.warn(`No files found under ${BASE}/(notebook|whiteboard)/*.html`);
    return;
  }
  console.log(`Café: ${SLUG} — files: ${files.length}  (write=${WRITE})`);
  for (const f of files) await processFile(f);
}
main().catch(e=>{ console.error(e); process.exit(1); });
