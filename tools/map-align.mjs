// tools/map-align.mjs
// Paragraph → PDF page alignment with monotone DP and early-page bias.
// Deps: npm i pdfjs-dist@3.11.174 cheerio he
//
// Example:
// node tools/map-align.mjs \
//   --slug zeta-zero-cafe \
//   --pdf Old_main \
//   --chapter "notebook/chapter-1-the-basel-problem.html" \
//   --reset-chapter \
//   --band_pages=24 --min_tokens=10 --minscore=0.15 --accept-all \
//   --dp --quote_len=120 --max_span=2 --lambda_dup=0.05 --lambda_jump=0.15 \
//   --left_bias=0.02 --near_tie=0.96

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

import * as cheerio from 'cheerio';
import he from 'he';

// PDF.js (CommonJS to keep GlobalWorkerOptions happy)
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

/* ---------------- CLI (supports --k=v and --k v; dash/underscore aliases) ---------------- */
function parseArgs(argv){ const out={}; for(let i=0;i<argv.length;i++){ const t=argv[i]; if(!t.startsWith('--')) continue; const eq=t.indexOf('='); let k,v;
  if(eq>2){ k=t.slice(2,eq); v=t.slice(eq+1); } else { k=t.slice(2); const n=argv[i+1]; if(n && !n.startsWith('-')){ v=n; i++; } else v=true; } out[k]=v; }
  return out; }
const rawArgs = parseArgs(process.argv.slice(2));
const a=(name,def=null)=>{ const c=[name,name.replaceAll('_','-'),name.replaceAll('-','_')]; for(const k of c) if(rawArgs[k]!==undefined) return rawArgs[k]; return def; };
const aInt=(n,d)=>{ const v=a(n,d); if(v===true||v==null) return d; const x=Number(v); return Number.isFinite(x)?x:d; };
const aFloat=(n,d)=>{ const v=a(n,d); if(v===true||v==null) return d; const x=Number(v); return Number.isFinite(x)?x:d; };

/* ---------------- Required ---------------- */
const slug = a('slug');
const pdfBase = String(a('pdf','Old_main')).replace(/\.pdf$/i,'');
const chapterRel = a('chapter');
if(!slug || !chapterRel){ console.error('Usage: --slug <slug> --pdf <name> --chapter "notebook/...html"'); process.exit(1); }

/* ---------------- Options ---------------- */
const bandPages    = Math.max(6, aInt('band_pages', 24));
const minTokens    = Math.max(1, aInt('min_tokens', 10));
const minscore     = aFloat('minscore', 0.15);
const quoteLen     = Math.max(40, aInt('quote_len', 120));
const maxSpan      = Math.max(1, aInt('max_span', 2));
const lambdaDup    = aFloat('lambda_dup', 0.05);
const lambdaJump   = aFloat('lambda_jump', 0.15);
const resetChapter = !!a('reset_chapter', a('reset-chapter', false));
const acceptAll    = !!a('accept_all', a('accept-all', false));
// New: global early-page preference
const leftBias     = aFloat('left_bias', 0.02); // penalize moving forward, favors earlier page on ties
const nearTie      = aFloat('near_tie', 0.96);  // 96% of best counts as tie → pick earliest

/* ---------------- Paths ---------------- */
const repoRoot      = process.cwd();
const pdfPath       = path.join(repoRoot, 'cafes', slug, 'sources', `${pdfBase}.pdf`);
const chapterPath   = path.join(repoRoot, 'cafes', slug, chapterRel);
const outDir        = path.join(repoRoot, 'data', 'cafes', slug, 'sources');
const mapPath       = path.join(outDir, `${pdfBase}.map.json`);
const textCacheDir  = path.join(repoRoot, 'out', 'pdf');
const pageTextCache = path.join(textCacheDir, `${pdfBase}.pages.json`);
await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(textCacheDir, { recursive: true });

/* ---------------- Utils ---------------- */
const nowISO = new Date().toISOString();
const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
const normalizeSpaces = s => s.replace(/\s+/g,' ').replace(/\u00ad/g,'').trim();
const stripSoft = s => s.replace(/[\u00AD\u200B]/g,'');
const tokenize = s => normalizeSpaces(s.toLowerCase()).replace(/(\p{P}|\p{S})/gu,' ').split(/\s+/).filter(w=>w && !/^\d+$/.test(w));
const charNgrams = (s,n=3)=>{ const t=normalizeSpaces(s.toLowerCase()).replace(/\s+/g,' '); const r=new Set(); for(let i=0;i<=t.length-n;i++) r.add(t.slice(i,i+n)); return r; };
const jaccard = (A,B)=>{ if(!A.size && !B.size) return 1; let inter=0; for(const x of A) if(B.has(x)) inter++; return inter/(A.size+B.size-inter||1); };
const cosineSim=(a,b)=>{ let dot=0,na=0,nb=0; const keys=new Set([...Object.keys(a),...Object.keys(b)]); for(const k of keys){ const va=a[k]||0, vb=b[k]||0; dot+=va*vb; na+=va*va; nb+=vb*vb; } return (na&&nb)? dot/Math.sqrt(na*nb):0; };

/* ---------------- Extract chapter paragraphs ---------------- */
const chapterHtml = await fs.readFile(chapterPath, 'utf8');
const $ = cheerio.load(chapterHtml);
const paras=[];
$('pre.osf[id^="osf-"]').each((_,el)=>{
  const id = $(el).attr('id') || '';
  const text = normalizeSpaces(he.decode($(el).text()||''));
  const toks = tokenize(text);
  if(toks.length>=minTokens || acceptAll) paras.push({ id, text, quote: stripSoft(text).slice(0,quoteLen) });
});
if(paras.length===0){ console.error('No <pre.osf> paragraphs found (or below min_tokens).'); process.exit(2); }

/* ---------------- Load / extract PDF page texts ---------------- */
async function extractPdfPages(){
  const buf = await fs.readFile(pdfPath);
  const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const doc = await pdfjsLib.getDocument({ data, isEvalSupported:false, disableFontFace:true }).promise;
  const pages=[];
  for(let p=1;p<=doc.numPages;p++){
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const s = normalizeSpaces(tc.items.map(it=>it.str||'').join(' '));
    pages.push({ page:p, text:s }); page.cleanup && page.cleanup();
  }
  doc.cleanup && doc.cleanup();
  return { hash: sha256(buf), pages };
}
let pageData;
if(fssync.existsSync(pageTextCache)){ try{ pageData = JSON.parse(await fs.readFile(pageTextCache,'utf8')); }catch{} }
if(!pageData || !Array.isArray(pageData.pages)){ pageData = await extractPdfPages(); await fs.writeFile(pageTextCache, JSON.stringify(pageData,null,2)); }

/* ---------------- Build features ---------------- */
const pageTexts = pageData.pages.map(p=>p.text);
const pageTokens = pageTexts.map(tokenize);
const df = Object.create(null);
for(const toks of pageTokens){ const seen=new Set(); for(const t of toks){ if(!seen.has(t)){ df[t]=(df[t]||0)+1; seen.add(t); } } }
const Npages = pageTokens.length;
const idf = Object.create(null);
for(const [t,dfv] of Object.entries(df)) idf[t]=Math.log((Npages+1)/(dfv+0.5));
const tfidf = tokens => { const tf=Object.create(null); for(const t of tokens) tf[t]=(tf[t]||0)+1; const v=Object.create(null); for(const [t,c] of Object.entries(tf)) v[t]=(1+Math.log(c))*(idf[t]||0); return v; };
const pageVecs = pageTokens.map(tfidf);
const page3g  = pageTexts.map(t=>charNgrams(t,3));
const paraTokens = paras.map(p=>tokenize(p.text));
const paraVecs   = paraTokens.map(tfidf);
const para3g     = paras.map(p=>charNgrams(p.text,3));
const scoreParaPage = (i,j)=> 0.6*cosineSim(paraVecs[i],pageVecs[j]) + 0.4*jaccard(para3g[i],page3g[j]);

/* ---------------- Coarse chapter start ---------------- */
function guessStartPage(k=3){ const K=Math.min(k,paras.length); const sums=new Array(Npages).fill(0);
  for(let i=0;i<K;i++) for(let j=0;j<Npages;j++) sums[j]+=scoreParaPage(i,j);
  let best=-1,bi=0; for(let j=0;j<Npages;j++) if(sums[j]>best){best=sums[j];bi=j;} return bi+1; }
const lo = guessStartPage();
const hi = Math.min(Npages, lo + bandPages - 1);

/* ---------------- DP monotone with early-page preference ---------------- */
const M=paras.length, W=hi-lo+1;
const scores = Array.from({length:M},()=>Array(W).fill(0));
for(let i=0;i<M;i++) for(let j=0;j<W;j++) scores[i][j] = scoreParaPage(i,(lo-1)+j);

const dp   = Array.from({length:M},()=>Array(W).fill(-1e9));
const prev = Array.from({length:M},()=>Array(W).fill(-1));
for(let j=0;j<W;j++) dp[0][j] = scores[0][j];
for(let i=1;i<M;i++){
  for(let j=0;j<W;j++){
    let best=-1e9,arg=-1;
    for(let k=0;k<=j;k++){
      const pen  = (j===k ? lambdaDup : lambdaJump*Math.max(0,j-k-1));
      const bias = leftBias * (j - k); // prefer earlier pages on near ties
      const val  = dp[i-1][k] + scores[i][j] - pen - bias;
      if(val>best){ best=val; arg=k; }
    }
    dp[i][j]=best; prev[i][j]=arg;
  }
}
let endJ=0,best=-1e9; for(let j=0;j<W;j++) if(dp[M-1][j]>best){best=dp[M-1][j]; endJ=j;}
const route = new Array(M).fill(0); route[M-1]=endJ; for(let i=M-1;i>=1;i--) route[i-1]=prev[i][route[i]];

/* --- earliest-tie nudge per paragraph --- */
for(let i=0;i<M;i++){
  const jstar = route[i];
  let bestS = scores[i][jstar], bestJ = jstar;
  for(let jj=0; jj<=jstar; jj++){
    if(scores[i][jj] >= nearTie * bestS){ bestS = scores[i][jj]; bestJ = jj; break; }
  }
  route[i] = bestJ;
}

/* ---------------- Build spans ---------------- */
const mappings=[];
for(let i=0;i<M;i++){
  const j0=route[i], p1=lo+j0;
  let p2=p1;
  if(maxSpan>1 && p1<hi){
    const s1=scores[i][j0], s2=scores[i][j0+1] ?? -1;
    if(s2 >= Math.max(minscore, 0.85*s1)) p2=p1+1;
  }
  mappings.push({from:p1,to:p2});
}

/* ---------------- Read existing, migrate if needed, and write ---------------- */
let existing = {};
if (fssync.existsSync(mapPath)) {
  try { existing = JSON.parse(await fs.readFile(mapPath,'utf8')); } catch {}
}
if (!existing.meta) existing.meta = { relative:false, offset:0, offsets:{}, starts:{} };

// MIGRATION: hoist "chapters" wrapper to top level if present
if (existing.chapters && typeof existing.chapters === 'object') {
  for (const [ch, block] of Object.entries(existing.chapters)) {
    if (!existing[ch]) existing[ch] = block;
  }
  delete existing.chapters;
}
if (!existing.meta.starts) existing.meta.starts = {};
if (resetChapter) delete existing[chapterRel];

// Write chapter at TOP-LEVEL (viewer reads map[chapter])
const chapterMap = existing[chapterRel] || {};
for (let i=0;i<M;i++){
  const id = paras[i].id || `osf-${String(i+1).padStart(3,'0')}`;
  chapterMap[id] = { from: mappings[i].from, to: mappings[i].to, quote: paras[i].quote, boxes: [] };
}
existing[chapterRel] = chapterMap;
// Mirror to "chapters" for future tools (optional)
existing.chapters = existing.chapters || {};
existing.chapters[chapterRel] = chapterMap;

// starts
existing.meta.starts[chapterRel] = lo;

// meta
const pdfBuf = await fs.readFile(pdfPath);
existing.meta.built_at = nowISO;
existing.meta.pdf = `${pdfBase}.pdf`;
existing.meta.hash = `sha256:${sha256(pdfBuf)}`;

// write
await fs.writeFile(mapPath, JSON.stringify(existing, null, 2));
console.log(`✔ wrote ${path.relative(repoRoot, mapPath)} with ${paras.length} paragraphs`);
console.log(`  band: pages ${lo}..${hi}, chapter start = ${lo}`);
