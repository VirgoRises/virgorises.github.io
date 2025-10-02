// tools/analyze-osf.mjs
// Node 18+ (you're on v22). Requires: npm i cheerio glob
import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { load } from "cheerio";

/** -------- Config -------- */
const OUTPUT_DIR = "out";
const CHAPTER_PATTERNS = [
  "zeta-zero-cafe/notebook/Chapter*.html",
  "notebook/Chapter*.html",
  "**/notebook/Chapter*.html"
];
const IGNORE_REGEX = /(backup_clearing_runs|node_modules|_site)\//;

// Density thresholds
const T = {
  charWarn: 900,
  charHard: 1200,
  avgSentenceWarn: 28,   // words per sentence
  maxSentences: 5,
  maxLines: 10,
  maxInlineMath: 3,
  suspiciousPreChars: 5000  // treat larger as probably broken markup
};
/** ------------------------ */

function sentenceSplit(txt) {
  const t = txt.replace(/\s+/g, " ").trim();
  if (!t) return [];
  return t.split(/(?<=[.!?])\s+(?=[A-Z0-9(\\])/).filter(s => s.trim().length);
}

// Strip list/quote lines for readability scoring (not for the ignore rules)
function stripNonProse(raw) {
  const lines = raw.split(/\r?\n/);
  const kept = [];
  const listLine = /^\s*(?:[-*•]|[0-9]{1,3}[.)])\s+/;
  const quoteLine = /^\s*>\s+/;
  for (const line of lines) {
    if (quoteLine.test(line)) continue;
    if (listLine.test(line)) continue;
    kept.push(line);
  }
  return kept.join("\n");
}

// Caption-like (“Table 2.1 — …”, “Figure 3.4: …”)
function looksLikeCaption(t) {
  const s = t.trim();
  if (s.length > 240) return false;
  return /^(Table|Figure)\s+\d+(?:\.\d+)?(?:\s*[.:–—-]\s+|[ )-]|$)/i.test(s);
}

// Next real element sibling (skip text & comments)
function nextElement($, el) {
  let n = el.nextSibling;
  while (n) {
    if (n.type === "tag") return n;
    n = n.nextSibling;
  }
  return null;
}

// Whether a tag is a structural follower we want to ignore
const STRUCT_TAGS = new Set(["table","blockquote","ul","ol","figure"]);
function isStructuralTag(tag) { return STRUCT_TAGS.has(tag); }
function containsStructuralDescendant($, el) {
  return $(el).find("table,blockquote,ul,ol,figure").length > 0;
}

function metricsFor(text) {
  const raw = text ?? "";

  const core = stripNonProse(raw);
  const compact = core.replace(/\s+/g, " ").trim();
  const chars = compact.length;
  const words = (compact.match(/\S+/g) || []).length;

  const sentencesArr = sentenceSplit(core);
  const sentences = Math.max(1, sentencesArr.length);
  const avgSentence = words / sentences;

  // Math detection
  const inlineMath = (compact.match(/\$[^$]+\$/g) || []).length
                   + (compact.match(/\\\([^)]*\\\)/g) || []).length;
  const blockMath  = (raw.match(/\\\[[\s\S]*?\\\]/g) || []).length;
  const hasMath = inlineMath + blockMath > 0;

  const commas = (compact.match(/,/g) || []).length;
  const semicolons = (compact.match(/;/g) || []).length;
  const lines = (core.match(/\n/g) || []).length + 1;

  let score = 0;
  if (chars > T.charWarn) score++;
  if (avgSentence > T.avgSentenceWarn) score++;
  if (inlineMath + blockMath > T.maxInlineMath) score++;
  if (commas / sentences > 2) score++;
  if (semicolons > 0) score++;
  if (lines > T.maxLines) score++;

  const recommend =
    score >= 2 ||
    chars > T.charHard ||
    sentences > T.maxSentences ||
    (blockMath > 0 && chars > 700);

  // Suggested split point (after sentence k), avoid splitting inside $...$
  let splitAfterSentence = null;
  if (recommend && sentences >= 2) {
    const totalChars = sentencesArr.reduce((a, s) => a + s.length, 0);
    const target = totalChars / 2;
    let acc = 0;
    for (let i = 0; i < sentencesArr.length - 1; i++) {
      acc += sentencesArr[i].length;
      if (acc >= target) { splitAfterSentence = i + 1; break; }
    }
    if (splitAfterSentence === null) splitAfterSentence = 1;
    const leftText = sentencesArr.slice(0, splitAfterSentence).join(" ");
    const dollars = (leftText.match(/\$/g) || []).length;
    if (dollars % 2 !== 0) splitAfterSentence = Math.min(splitAfterSentence + 1, sentencesArr.length - 1);
  }

  const snippet = compact.length <= 160 ? compact : compact.slice(0, 159) + "…";

  return {
    chars, words, sentences, avgSentence: +avgSentence.toFixed(1),
    inlineMath, blockMath, hasMath, commas, semicolons, lines,
    densityScore: score, recommendSplit: recommend, splitAfterSentence, snippet
  };
}

function csvEscape(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  let files = (await Promise.all(CHAPTER_PATTERNS.map(p => glob(p)))).flat();
  files = Array.from(new Set(files))
    .filter(f => !IGNORE_REGEX.test(f))
    .sort();

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const rows = [];
  for (const file of files) {
    const html = await fs.readFile(file, "utf8");
    const $ = load(html);

    const pres = $("pre.osf");
    let idx = 0;
    pres.each((_, el) => {
      idx += 1;

      const text = $(el).text();

      // 1) Hard content check: does the PRE contain markup text?
      const containsMarkup = /<(table|thead|tr|\/blockquote|ol|ul)\b/i.test(text);

      // 2) Neighbor check (skip comments/whitespace)
      const next = nextElement($, el);
      const followedByStructural =
        next && (
          isStructuralTag(next.tagName) ||
          containsStructuralDescendant($, next) ||
          // common wrappers like <div class="card"> around a table/figure
          ($(next).is("div,section") && containsStructuralDescendant($, next))
        );

      // 3) Caption-like?
      const caption = looksLikeCaption(text);

      // 4) Suspicious size (probably missing </pre>)
      const brokenPre = text.length > T.suspiciousPreChars;

      // 5) Metrics (incl. math detection)
      const m = metricsFor(text);

      // 6) Ignore if: contains markup OR followed by structural OR caption OR no math OR broken
      let ignored = false;
      const reasons = [];
      if (containsMarkup) reasons.push("contains-markup");
      if (followedByStructural) reasons.push(`followed-by-structural(${next?.tagName || "?"})`);
      if (caption) reasons.push("caption/table-like");
      if (!m.hasMath) reasons.push("no-math");
      if (brokenPre) reasons.push("suspiciously-large-pre (check closing </pre>)");
      if (reasons.length) ignored = true;

      rows.push({
        file,
        paragraphIndex: idx,
        ignored,
        ignoreReason: reasons.join(", ") || null,
        brokenPre,
        ...m
      });
    });
  }

  // Write JSON
  const jsonPath = path.join(OUTPUT_DIR, "osf_analysis.json");
  await fs.writeFile(jsonPath, JSON.stringify(rows, null, 2), "utf8");

  // Write CSV
  const headers = [
    "file","paragraphIndex","ignored","ignoreReason","brokenPre",
    "chars","words","sentences","avgSentence",
    "inlineMath","blockMath","hasMath","commas","semicolons","lines",
    "densityScore","recommendSplit","splitAfterSentence","snippet"
  ];
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => csvEscape(r[h])).join(","))
  ].join("\n");
  await fs.writeFile(path.join(OUTPUT_DIR, "osf_analysis.csv"), csv, "utf8");

  // Split suggestions (exclude ignored/broken)
  const suggestions = rows
    .filter(r => !r.ignored && !r.brokenPre && r.recommendSplit)
    .map(r => ({
      file: r.file,
      paragraphIndex: r.paragraphIndex,
      reason: `density=${r.densityScore}, chars=${r.chars}, sentences=${r.sentences}, inlineMath=${r.inlineMath}, blockMath=${r.blockMath}`,
      splitAfterSentence: r.splitAfterSentence,
      snippet: r.snippet
    }));

  await fs.writeFile(
    path.join(OUTPUT_DIR, "osf_split_suggestions.json"),
    JSON.stringify(suggestions, null, 2),
    "utf8"
  );

  // Heads-up on broken <pre>
  const broken = rows.filter(r => r.brokenPre);
  if (broken.length) {
    console.warn("\n⚠️  Potentially broken <pre> blocks (missing </pre>):");
    for (const b of broken) {
      console.warn(` - ${b.file} §index ${b.paragraphIndex} (chars=${b.chars})`);
    }
  }

  console.log(`Analyzed ${files.length} chapter files. Suggestions: ${suggestions.length}. See ${path.join(OUTPUT_DIR, "osf_split_suggestions.json")}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
