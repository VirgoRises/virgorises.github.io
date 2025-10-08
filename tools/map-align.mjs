// tools/map-align.mjs
// Align notebook paragraphs to PDF pages and update data/cafes/<slug>/sources/<PDF>.map.json
// ESM-only (Node ≥ 20). No require() anywhere.

import fs from "node:fs";
import path from "node:path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"; // legacy build works in Node ESM

// ---------- tiny argv ----------
function argv() {
  const a = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < a.length; i++) {
    const t = a[i];
    if (t.startsWith("--")) {
      const k = t.slice(2);
      const v = (i + 1 < a.length && !a[i + 1].startsWith("--")) ? a[++i] : true;
      out[k] = v;
    }
  }
  return out;
}
const args = argv();

// ---------- required args ----------
if (!args.slug) {
  console.error("❌ Usage: node tools/map-align.mjs --slug <cafe> --pdf Old_main --chapter \"notebook/....html\" [options]");
  process.exit(1);
}
const PDF_BN = String(args.pdf ?? "Old_main").replace(/\.pdf$/i, "");
const CHAPTER = String(args.chapter ?? "");
if (!CHAPTER) {
  console.error("❌ Missing --chapter notebook/..html");
  process.exit(1);
}

// tuning
const WINDOW = Number(args.window ?? 2);          // ± pages around pointer
const BAND_PAGES = Number(args.band_pages ?? 24); // guard band when start unknown
const TOPK = Number(args.topk ?? 8);
const MIN_TOK = Number(args.min_tokens ?? 8);
const MINSCORE = Number(args.minscore ?? 0.12);
const ACCEPT_ALL = !!args["accept-all"];
const RESET_CHAPTER = !!args["reset-chapter"];

// paths
const MAP_FILE = path.join("data", "cafes", String(args.slug), "sources", `${PDF_BN}.map.json`);
const PDF_FILE = path.join("cafes", String(args.slug), "sources", `${PDF_BN}.pdf`);
const CHAPTER_FILE = path.join("cafes", String(args.slug), CHAPTER);

// ---------- load / init map ----------
const map = fs.existsSync(MAP_FILE)
  ? JSON.parse(fs.readFileSync(MAP_FILE, "utf8"))
  : { meta: { relative: false, offset: 0 }, starts: {}, offsets: {} };

if (!map.meta) map.meta = { relative: false, offset: 0 };
if (!map.starts) map.starts = {};
if (!map.offsets) map.offsets = {};

// optional single-chapter reset (keep meta/starts/offsets)
if (RESET_CHAPTER) {
  map[CHAPTER] = {};
  fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2));
  console.log(`[align] reset chapter block: ${CHAPTER}`);
}

// ensure chapter block exists
if (!map[CHAPTER]) map[CHAPTER] = {};

// ---------- helpers ----------
const STOP = new Set([
  "the","a","an","and","or","of","to","in","on","for","by","with","as","is","are","was","were",
  "this","that","these","those","it","its","be","from","at","into","their","there","we","our",
  "you","your","but","not","have","has","had","which","also","than","then","so","such","may",
  "can","could","would","should","will","shall","if","when","while","because","about"
]);

function normalizeText(s) {
  return String(s)
    .replace(/<[^>]+>/g, " ")      // strip tags
    .replace(/&[a-z]+;/gi, " ")    // entities
    .replace(/[^a-z0-9]+/gi, " ")
    .toLowerCase()
    .trim();
}
function toTokens(s) {
  return normalizeText(s)
    .split(/\s+/)
    .filter(t => t && !STOP.has(t));
}
function tfVector(tokens) {
  const m = new Map();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const [k, v] of a) {
    if (b.has(k)) dot += v * b.get(k);
    na += v * v;
  }
  for (const v of b.values()) nb += v * v;
  if (!na || !nb) return 0;
  return dot / Math.sqrt(na + 1e-9) / Math.sqrt(nb + 1e-9);
}

// extract all <pre class="osf">...</pre>
function extractParagraphsFromHtml(html) {
  const paras = [];
  const re = /<pre\s+class=["']osf["'][^>]*>([\s\S]*?)<\/pre>/gi;
  let m, idx = 1;
  while ((m = re.exec(html))) {
    const raw = m[1];
    const text = normalizeText(raw);
    paras.push({ n: idx++, raw, text });
  }
  return paras;
}

// ---------- read chapter HTML ----------
if (!fs.existsSync(CHAPTER_FILE)) {
  console.error(`❌ Chapter file not found: ${CHAPTER_FILE}`);
  process.exit(2);
}
const chapterHtml = fs.readFileSync(CHAPTER_FILE, "utf8");
const chapterParas = extractParagraphsFromHtml(chapterHtml);

// ---------- load PDF, cache page text + vectors ----------
if (!fs.existsSync(PDF_FILE)) {
  console.error(`❌ PDF not found: ${PDF_FILE}`);
  process.exit(2);
}

// PDF.js worker for ESM (Node ≥ 20) — NO require()
try {
  const workerSrc = await import.meta.resolve("pdfjs-dist/build/pdf.worker.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
} catch {
  // Fallback: many Node runs of pdfjs-dist legacy no-op the worker in Node context.
}

console.log(`[align] slug=${args.slug} pdf=${PDF_BN}.pdf band=${BAND_PAGES} window=${WINDOW} topk=${TOPK}`);

const loadingTask = pdfjsLib.getDocument(PDF_FILE);
const pdf = await loadingTask.promise;
const NUM_PAGES = pdf.numPages;

async function pageText(i) {
  const page = await pdf.getPage(i);
  const content = await page.getTextContent();
  const s = content.items.map(it => it.str ?? "").join(" ");
  return normalizeText(s);
}

// prepare page vectors (lazy, but cache)
const pageCache = new Map();
async function getPageVec(i) {
  if (pageCache.has(i)) return pageCache.get(i);
  const text = await pageText(i);
  const vec = tfVector(toTokens(text));
  const rec = { text, vec };
  pageCache.set(i, rec);
  return rec;
}

// ---------- compute chapter band ----------
const globalOffset = Number(map.meta.offset ?? 0);
const chapterOffset = Number((map.meta.offsets && map.meta.offsets[CHAPTER]) ?? 0);
const starts = map.starts ?? {};
const chapterStart = starts[CHAPTER] ?? null;

let bandLo = 1, bandHi = Math.min(NUM_PAGES, BAND_PAGES);
if (chapterStart != null) {
  const start = Math.max(1, Number(chapterStart) + globalOffset + chapterOffset);
  bandLo = Math.max(1, start);
  bandHi = Math.min(NUM_PAGES, start + Math.max(6, BAND_PAGES));
}

// ---------- align with monotone constraint ----------
let currentPtr = bandLo; // moving pointer within band
const accepted = [];
const outBlock = map[CHAPTER];

function fmtBand() {
  const band = (chapterStart != null) ? `(${bandLo}-${bandHi})` : `(band 1-${BAND_PAGES})`;
  return band;
}

for (const p of chapterParas) {
  const short = p.text.split(/\s+/).slice(0, 120).join(" ");
  const toks = toTokens(short);
  if (toks.length < MIN_TOK) {
    console.log(`[align] ~ §${p.n}  (too short, ${toks.length} tokens) ${fmtBand()}`);
    continue;
  }
  const qVec = tfVector(toks);

  // search window around currentPtr but clamp to chapter band
  const lo = Math.max(bandLo, currentPtr - WINDOW);
  const hi = Math.min(bandHi, currentPtr + WINDOW);

  const candidates = [];
  for (let pg = lo; pg <= hi; pg++) {
    const { vec } = await getPageVec(pg);
    const score = cosine(qVec, vec);
    candidates.push({ pg, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, TOPK).filter(x => x.score >= MINSCORE);

  if (top.length === 0) {
    console.log(`[align] ~ §${p.n}  (no hit ≥ ${MINSCORE.toFixed(2)}) ${fmtBand()}`);
    continue;
  }

  // choose best page that keeps monotone non-decreasing order
  const best = top.find(c => c.pg >= currentPtr) ?? top[0];
  const chosen = Math.max(bandLo, Math.min(bandHi, best.pg));

  const msg = `[align] ~ §${p.n} → p.${chosen}   (best=${best.pg} score ${best.score.toFixed(3)}) ${fmtBand()}`;
  if (ACCEPT_ALL) {
    outBlock[`osf-${p.n}`] = { from: chosen, to: chosen };
    console.log(msg);
    accepted.push(p.n);
  } else {
    console.log(msg + "  [dry]");
  }

  // advance pointer (rubber-band monotonic)
  currentPtr = Math.max(currentPtr, chosen);
}

// ---------- write map ----------
if (ACCEPT_ALL) {
  fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2));
  console.log(`[align] wrote ${accepted.length} change(s) to ${MAP_FILE}`);
} else {
  console.log(`[align] dry-run; nothing written. Use --accept-all to save.`);
}

console.log(`[align] examined paragraphs: ${chapterParas.length}`);
await pdf.cleanup();
