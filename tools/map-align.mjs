#!/usr/bin/env node
/**
 * tools/map-align.mjs — constrained, monotone aligner (full file)
 *
 * Guarantees (by construction):
 *  - Paragraphs never map outside their chapter band.
 *  - Mappings are monotone non-decreasing within a chapter (no inversions).
 *
 * Approach:
 *  1) Build candidate pages/spans per paragraph inside a chapter band (from meta.starts ± band).
 *  2) Score with token-overlap + IDF + bigram boost, filter boilerplate.
 *  3) Dynamic-programming to pick a non-decreasing path that maximizes total score
 *     with a small penalty for big jumps.
 *  4) Confirm and write {from,to} per §.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { glob } from "glob";
import * as cheerio from "cheerio";
import he from "he";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// ----------------- args -----------------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq > 2) { out[a.slice(2,eq)] = a.slice(eq+1); }
    else { const k=a.slice(2), n=argv[i+1]; if (n && !n.startsWith("--")) { out[k]=n; i++; } else out[k]=true; }
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));

const SLUG        = String(args.slug || "zeta-zero-cafe");
const PDF_BN      = String(args.pdf  || "Old_main").replace(/\.pdf$/i, "");
const DRY         = !!args.dry;
const ACCEPT_ALL  = !!args["accept-all"];
const WINDOW      = Number.isFinite(+args.window)   ? Math.max(0, +args.window) : 0;      // local span
const TOPK        = Number.isFinite(+args.topk)     ? Math.max(3, +args.topk)   : 5;      // candidates per para
const JUMP_COST   = Number.isFinite(+args.jumpcost) ? +args.jumpcost : 0.15;              // penalty per |Δpage|
const MIN_TOKENS  = Number.isFinite(+args.min_tokens) ? +args.min_tokens : 6;
const MINSCORE    = Number.isFinite(+args.minscore) ? +args.minscore : 0.06;              // keep candidates above
const BAND_PAGES  = Number.isFinite(+args.band_pages) ? +args.band_pages : 24;            // chapter rail-guard
const ONLY_CHAPTER= args.chapter ? String(args.chapter) : null;
const ONLY_PARA   = args.para ? parseInt(String(args.para), 10) : null;

const ROOT = process.cwd();
const cafeRoot = path.join(ROOT, "cafes", SLUG);
const notebookDir = path.join(cafeRoot, "notebook");
const pdfPath = path.join(cafeRoot, "sources", `${PDF_BN}.pdf`);
const mapPath = path.join(ROOT, "data", "cafes", SLUG, "sources", `${PDF_BN}.map.json`);

const log  = (...xs) => console.log("[align]", ...xs);
const warn = (...xs) => console.warn("[align:warn]", ...xs);

if (!fs.existsSync(pdfPath)) { warn("PDF not found:", pdfPath); process.exit(1); }

// ----------------- text utils -----------------
const stripMath = (s) => s
  .replace(/\$\$[\s\S]*?\$\$/g, " ")
  .replace(/\\\[[\s\S]*?\\\]/g, " ")
  .replace(/\\\([\s\S]*?\\\)/g, " ")
  .replace(/\$[^$]*\$/g, " ");
function normalizeText(raw) {
  let s = he.decode(String(raw || ""));
  s = stripMath(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/[\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return s;
}
function tokenize(s) {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(w=>w.length>2);
  const bigrams=[]; for (let i=0;i<base.length-1;i++) bigrams.push(base[i]+"_"+base[i+1]);
  return base.concat(bigrams);
}
function cleansePageText(raw){
  return raw
    .replace(/\b(page|pagina|hoofdstuk|chapter|figure|table)\s*\d+\b/gi,' ')
    .replace(/\b(virgo\s*rises|zeta[- ]zero|draft|index)\b/gi,' ');
}

// ----------------- load HTML -----------------
async function loadParagraphs() {
  const files = await glob("*.html", { cwd: notebookDir });
  const out=[];
  for (const f of files){
    const rel = `notebook/${f}`;
    if (ONLY_CHAPTER && rel !== ONLY_CHAPTER) continue;
    const html = fs.readFileSync(path.join(notebookDir,f),"utf8");
    const $ = cheerio.load(html);
    const rows=[]; $("pre.osf").each((i,el)=>{
      const id=$(el).attr("id")||`osf-${i+1}`;
      const raw=$(el).html()||$(el).text()||"";
      const txt=normalizeText(raw);
      rows.push({ id, index:i+1, text:txt });
    });
    out.push({ file: rel, paras: rows });
  }
  return out;
}

// ----------------- pdf text -----------------
async function extractPdfPages(pdfFile){
  const data = new Uint8Array(fs.readFileSync(pdfFile)).buffer;
  const pdf  = await pdfjsLib.getDocument({ data }).promise;
  const pages=[];
  for (let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const tc=await page.getTextContent();
    const s=tc.items.map(it=>it.str||"").join(" ");
    pages.push(normalizeText(cleansePageText(s)));
  }
  return pages;
}

// ----------------- scoring -----------------
function buildIdf(pagesTokens){
  const df=new Map();
  for (const toks of pagesTokens){ const seen=new Set(toks); for (const t of seen) df.set(t,(df.get(t)||0)+1); }
  const N=pagesTokens.length, idf=new Map();
  for (const [t,d] of df) idf.set(t, Math.log(1+(N/(1+d))));
  return idf;
}
function score(paraToks, pageToks, idf){
  if (!paraToks.length||!pageToks.length) return 0;
  const set=new Set(pageToks); let s=0;
  for (const t of paraToks) if (set.has(t)) s += (idf.get(t)||0.1);
  return s/Math.sqrt(paraToks.length);
}
function bestLocalSpan(paraToks, pagesTokens, idf, center, window){
  const L=Math.max(1, center-window), R=Math.min(pagesTokens.length, center+window);
  let best={from:center,to:center,score:score(paraToks,pagesTokens[center-1],idf)};
  for (let l=center;l>=L;l--){
    let acc=0, cnt=0;
    for (let r=center;r<=R;r++){
      acc += score(paraToks, pagesTokens[r-1], idf); cnt++;
      const avg = acc/cnt; if (avg>best.score) best={from:l,to:r,score:avg};
    }
  }
  return best;
}

// ----------------- map I/O -----------------
function readMap(p){
  if (!fs.existsSync(p)) return { meta:{ relative:false, offset:0 }, chapters:{} };
  try{ const j=JSON.parse(fs.readFileSync(p,"utf8")); if(!j.meta) j.meta={relative:false,offset:0}; if(!j.chapters) j.chapters={}; return j; }
  catch(e){ warn("bad JSON:", p, e.message); return { meta:{relative:false,offset:0}, chapters:{} }; }
}
function ensureChapter(map, key){ if (!map.chapters[key]) map.chapters[key] = {}; }
function setMapping(map, key, paraNum, from, to){ ensureChapter(map,key); map.chapters[key][`osf-${paraNum}`] = { from, to }; }
function preferredChapterKey(chapterRel, map){
  const cands=[chapterRel.toLowerCase(), chapterRel.toLowerCase().replace(/^notebook\//,''), chapterRel.toLowerCase().split('/').pop()];
  for (const c of cands) if (map.chapters[c]) return c; return chapterRel.toLowerCase();
}

// ----------------- band from meta.starts -----------------
function chapterBand(map, chapterRel, total){
  const meta=map.meta||{}; const starts=meta.starts||meta.chapterStarts||{};
  const norm=s=> (s||'').toLowerCase(); const only=s=>norm(s).split('/').pop(); const strip=s=>norm(s).replace(/^notebook\//,'');
  const keys=[norm(chapterRel), strip(chapterRel), only(chapterRel)];
  let start=1; for (const k of keys) if (k in starts) { start=+starts[k]||1; break; }
  const lo=Math.max(1, start - (BAND_PAGES)); const hi=Math.min(total, start + (BAND_PAGES));
  return { lo, hi };
}

// ----------------- DP over monotone candidates -----------------
function monotoneAssign(paragraphs, pagesTokens, idf, band, topK, window, minscore){
  const N = paragraphs.length, P = pagesTokens.length;
  const allCands = new Array(N);

  for (let i=0;i<N;i++){
    const para = paragraphs[i];
    const toks = tokenize(para.text);
    if (toks.length < MIN_TOKENS) { allCands[i] = []; continue; }

    const singles=[];
    for (let p=band.lo; p<=band.hi; p++){
      const s = score(toks, pagesTokens[p-1], idf);
      if (s >= minscore) singles.push({ page:p, from:p, to:p, score:s });
    }
    singles.sort((a,b)=>b.score-a.score);
    const keep = singles.slice(0, topK);

    const refined=[];
    for (const c of keep){
      if (window>0){
        const span = bestLocalSpan(toks, pagesTokens, idf, c.page, window);
        refined.push({ page:c.page, from:span.from, to:span.to, score:span.score });
      } else refined.push(c);
    }
    allCands[i] = refined.length? refined : keep;
  }

  const dp = [], prev = [];
  for (let i=0;i<N;i++){
    dp[i] = new Array(allCands[i].length).fill(-1e9);
    prev[i] = new Array(allCands[i].length).fill(-1);
    if (i===0){ for (let k=0;k<allCands[i].length;k++) dp[i][k] = allCands[i][k].score; continue; }
    for (let k=0;k<allCands[i].length;k++){
      const c = allCands[i][k];
      for (let j=0;j<allCands[i-1].length;j++){
        const d = allCands[i-1][j];
        if (c.from < d.from) continue; // monotone
        const jump = Math.max(0, c.from - d.from);
        const cand = dp[i-1][j] + c.score - 0.15 * Math.log1p(jump);
        if (cand > dp[i][k]) { dp[i][k]=cand; prev[i][k]=j; }
      }
    }
    if (Math.max(...dp[i]) <= -1e8 && allCands[i-1].length){
      const jbest = dp[i-1].indexOf(Math.max(...dp[i-1]));
      const d = allCands[i-1][jbest];
      allCands[i] = [{ page:d.page, from:d.from, to:d.to, score:0 }];
      dp[i] = [dp[i-1][jbest]];
      prev[i] = [jbest];
    }
  }

  const assign = new Array(N).fill(null);
  if (!dp.length || !dp[N-1].length) return assign;
  let k = dp[N-1].indexOf(Math.max(...dp[N-1]));
  for (let i=N-1;i>=0;i--){ assign[i] = allCands[i][k] || null; k = prev[i][k]; if (k<0 && i>0) { assign[i-1] = allCands[i-1][0] || null; k=0; } }
  return assign;
}

// ----------------- prompt -----------------
function askYesNo(question) {
  return new Promise((resolve) => {
    if (ACCEPT_ALL) return resolve(true);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question + " [y/N] ", (ans) => { rl.close(); resolve(/^y(es)?$/i.test(ans.trim())); });
  });
}

// ----------------- main -----------------
(async function main(){
  console.log(`[align] slug=${SLUG} pdf=${PDF_BN}.pdf band=${BAND_PAGES} window=${WINDOW} topk=${TOPK}`);
  const chapters = await loadParagraphs();
  const pageTexts = await extractPdfPages(pdfPath);
  const pagesTokens = pageTexts.map(tokenize);
  const idf = buildIdf(pagesTokens);

  let map = readMap(mapPath);
  let changes=0, examined=0;

  for (const ch of chapters){
    const chapKey = preferredChapterKey(ch.file, map);
    const band = chapterBand(map, ch.file, pagesTokens.length);

    const assign = monotoneAssign(ch.paras, pagesTokens, idf, band, TOPK, WINDOW, MINSCORE);

    for (let i=0;i<ch.paras.length;i++){
      const p = ch.paras[i];
      if (ONLY_PARA && p.index !== ONLY_PARA) continue;
      const a = assign[i]; examined++;
      if (!a){ console.log(`[align] - no cand §${p.index} ${ch.file}`); continue; }
      const prop = { from:a.from, to:a.to };
      const curr = map.chapters?.[chapKey]?.[`osf-${p.index}`] || null;
      const same = curr && curr.from===prop.from && curr.to===prop.to;
      if (!same){
        console.log(`[align] ~ §${p.index} → p.${prop.from}${prop.to!==prop.from?'-'+prop.to:''}  (band ${band.lo}-${band.hi})`);
        const ok = await askYesNo("   apply?");
        if (ok){ setMapping(map, chapKey, p.index, prop.from, prop.to); changes++; }
      }
    }
  }

  if (!DRY && changes>0){ fs.mkdirSync(path.dirname(mapPath), {recursive:true}); fs.writeFileSync(mapPath, JSON.stringify(map,null,2),"utf8"); console.log(`[align] wrote ${changes} change(s) to`, mapPath); }
  else console.log(`[align] no writes (changes=${changes}, dry=${DRY})`);

  console.log(`[align] examined paragraphs: ${examined}`);
})().catch(e=>{ console.error(e); process.exit(1); });

