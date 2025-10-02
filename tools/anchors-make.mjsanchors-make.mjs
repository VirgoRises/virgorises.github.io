// Node 18+  (npm i cheerio glob)
import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { load } from "cheerio";
import crypto from "crypto";

const PATTERNS = [
  "zeta-zero-cafe/notebook/Chapter*.html",
  "notebook/Chapter*.html",
  "**/notebook/Chapter*.html"
];
const OUT_DIR = "data/anchors";
await fs.mkdir(OUT_DIR, { recursive: true });

const files = Array.from(new Set((await Promise.all(PATTERNS.map(p => glob(p)))).flat())).sort();

function chapterNoFromFilename(f) {
  const name = path.basename(f);
  const m = name.match(/Chapter\s+(\d+)/i);
  return m ? Number(m[1]) : null;
}

for (const file of files) {
  const html = await fs.readFile(file, "utf8");
  const $ = load(html);
  const pres = $("pre.osf");
  const chapter = chapterNoFromFilename(file) ?? "X";
  const outPath = path.join(OUT_DIR, `chapter-${chapter}.json`);

  // Reuse existing mapping if present
  let mapping = null;
  try { mapping = JSON.parse(await fs.readFile(outPath, "utf8")); } catch {}
  const out = { title: $('title').text().trim(), chapter, paragraphs: [] };

  for (let i = 0; i < pres.length; i++) {
    const prior = mapping?.paragraphs?.[i];
    if (prior?.uuid) {
      out.paragraphs.push({ uuid: prior.uuid, label: `§ ${i+1}` });
    } else {
      // new uuid: short, readable, but globally unique enough
      const rand = crypto.randomBytes(3).toString("hex"); // 6 hex chars
      out.paragraphs.push({ uuid: `c${chapter}-${String(i+1).padStart(3,"0")}-${rand}`, label: `§ ${i+1}` });
    }
  }

  await fs.writeFile(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log("wrote", outPath, `(${pres.length} paragraphs)`);
}
