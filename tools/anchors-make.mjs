// tools/anchors-make.mjs
// Create /data/cafes/<slug>/anchors/chapter-*.json from normalized HTML,
// and ensure <pre.osf id="osf-N"> is present (already done by normalizer).
import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import * as cheerio from "cheerio";

const ROOT = process.cwd();
function arg(name, def=null){ const i = process.argv.indexOf(name); return i>-1 ? (process.argv[i+1]??true) : def; }
const SLUG = arg("--slug", "zeta-zero-cafe");
const BASE = path.join(ROOT, "cafes", SLUG, "notebook");
const OUT  = path.join(ROOT, "data", "cafes", SLUG, "anchors");

function chapterKeyFromName(f){
  // "Chapter 4 The triangular numbers.html" -> chapter-4
  const name = path.basename(f);
  const m = name.match(/Chapter\s+(\d+)/i);
  if (m) return `chapter-${m[1]}`;
  // fallback: wb or other pages -> strip extension
  return path.basename(f, ".html").toLowerCase().replace(/\s+/g,"-");
}

async function main(){
  const files = await glob(path.join(BASE, "*.html"));
  await fs.mkdir(OUT, { recursive:true });

  for (const file of files){
    const html = await fs.readFile(file, "utf8");
    const $ = cheerio.load(html);
    const ids = $("pre.osf[id]").map((_,el)=>$(el).attr("id")).get();
    const key = chapterKeyFromName(file);
    const outFile = path.join(OUT, `${key}.json`);
    await fs.writeFile(outFile, JSON.stringify({ ids }, null, 2), "utf8");
    console.log(`wrote ${path.relative(ROOT, outFile)} (${ids.length} paragraphs)`);
  }
}
main().catch(e=>{ console.error(e); process.exit(1); });
