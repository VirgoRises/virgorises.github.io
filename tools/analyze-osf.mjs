// tools/analyze-osf.mjs
// Usage: node tools/analyze-osf.mjs
import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import cheerio from "cheerio";

function sentenceSplit(txt) {
  // crude but robust-ish: split on .?! followed by space + capital/(\ or digit
  return txt
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9(\\])/)
    .filter(s => s.trim().length);
}

function metricsFor(text) {
  const t = text.replace(/\s+/g, " ").trim();
  const chars = t.length;
  const words = (t.match(/\S+/g) || []).length;
  const sentences = sentenceSplit(t);
  const sCount = sentences.length || 1;
  const avgSentence = words / sCount;

  // math density (LaTeX-ish)
  const mInline = (t.match(/\$[^$]+\$/g) || []).length + (t.match(/\\\([^)]*\\\)/g) || []).length;
  const mBlock  = (t.match(/\\\[[\s\S]*?\\\]/g) || []).length;
  const commas = (t.match(/,/g) || []).length;
  const semicolons = (t.match(/;/g) || []).length;
  const lines = (text.match(/\n/g) || []).length + 1;

  // a simple density score (turn the dials if needed)
  let score = 0;
  if (chars > 900) score++;
  if (avgSentence > 28) score++;
  if (mInline + mBlock > 3) score++;
  if (commas / sCount > 2) score++;
  if (semicolons > 0) score++;
  if (lines > 10) score++;

  // heuristics to recommend a split
  const recommend =
    score >= 2 ||
    chars > 1200 ||
    sCount > 5 ||
    (mBlock > 0 && chars > 700);

  // suggest a split index near half, but aligned to sentence boundaries
  let splitAfterSentence = null;
  if (recommend && sCount >= 2) {
    const targetChars = chars / 2;
    let cum = 0;
    for (let i = 0; i < sCount - 1; i++) {
      cum += sentences[i].length + 1;
      if (cum >= targetChars) { splitAfterSentence = i + 1; break; }
    }
    // gentle bias: avoid splitting “inside math”
    if (splitAfterSentence !== null) {
      const left = sentences.slice(0, splitAfterSentence).join(" ");
      const openMath = (left.match(/\$/g) || []).length % 2 !== 0;
      if (openMath) splitAfterSentence++; // move split right if we cut inside $...$
      if (splitAfterSentence >= sCount) splitAfterSentence = sCount - 1;
      if (splitAfterSentence < 1) splitAfterSentence = 1;
    }
  }

  return {
    chars, words, sentences: sCount, avgSentence: +avgSentence.toFixed(1),
    mathInline: mInline, mathBlock: mBlock, commas, semicolons, lines,
    densityScore: score, recommendSplit: recommend, splitAfterSentence
  };
}

function brief(t, n=120) {
  const s = t.replace(/\s+/g, " ").trim();
  return s.length <= n ? s : s.slice(0, n-1) + "…";
}

const OUT_DIR = "out";
await fs.mkdir(OUT_DIR, { recursive: true });

const files = await glob("notebook/Chapter*.html");
const rows = [];
for (const file of files) {
  const html = await fs.readFile(file, "utf8");
  const $ = cheerio.load(html);
  const pres = $("pre.osf");
  let idx = 0;
  pres.each((_, el) => {
    idx += 1;
    const text = $(el).text();
    const m = metricsFor(text);
    rows.push({
      file, paragraphIndex: idx, snippet: brief(text),
      ...m
    });
  });
}

// write JSON and CSV
await fs.writeFile(path.join(OUT_DIR, "osf_analysis.json"), JSON.stringify(rows, null, 2), "utf8");

const headers = Object.keys(rows[0] || {file:1, paragraphIndex:1});
const csv = [
  headers.join(","),
  ...rows.map(r => headers.map(h => {
    const v = r[h];
    if (v === undefined || v === null) return "";
    const s = String(v).replace(/"/g,'""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  }).join(","))
].join("\n");
await fs.writeFile(path.join(OUT_DIR, "osf_analysis.csv"), csv, "utf8");

// Also emit a short “action list” for you
const actions = rows
  .filter(r => r.recommendSplit)
  .map(r => ({
    file: r.file,
    paragraphIndex: r.paragraphIndex,
    reason: `density=${r.densityScore}, chars=${r.chars}, sentences=${r.sentences}, mathInline=${r.mathInline}, mathBlock=${r.mathBlock}`,
    splitAfterSentence: r.splitAfterSentence,
    snippet: r.snippet
  }));
await fs.writeFile(path.join(OUT_DIR, "osf_split_suggestions.json"), JSON.stringify(actions, null, 2), "utf8");

console.log(`Analyzed ${files.length} chapter files. Suggestions: ${actions.length}. See out/osf_split_suggestions.json`);
