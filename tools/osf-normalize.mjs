#!/usr/bin/env node
/**
 * tools/osf-normalize.mjs
 *
 * Usage:
 *   node tools/osf-normalize.mjs zeta-zero-cafe
 *
 * Outputs (inside cafes/<slug>/):
 *   - notebook/<chapter>.manifest.json
 *   - index.json
 *
 * Notes:
 * - If you have (or later add) a csv/json mapping osf-id -> pdf page,
 *   you can merge that here (see TODO).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node tools/osf-normalize.mjs <cafe-slug>");
  process.exit(1);
}

const cafeDir = path.resolve(__dirname, "..", "cafes", slug);
const notebookDir = path.join(cafeDir, "notebook");
const pdfRelative = "sources/Old_main.pdf"; // single source of truth (immutable)

async function* walk(dir) {
  for (const d of await fs.readdir(dir, { withFileTypes: true })) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else yield entry;
  }
}

function extractTitle(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
            html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function extractOsfIds(html) {
  // tolerant: any id="osf-123" OR data-anchor etc.
  const ids = new Set();
  const idRe = /id\s*=\s*"(osf-\d+)"/gi;
  const dataRe = /data-(?:source-)?anchor\s*=\s*"(osf-\d+)"/gi;
  for (const re of [idRe, dataRe]) {
    let m;
    while ((m = re.exec(html))) ids.add(m[1]);
  }
  return [...ids];
}

async function buildChapterManifest(chapterPathRel) {
  const abs = path.join(cafeDir, chapterPathRel);
  const html = await fs.readFile(abs, "utf8");
  const title = extractTitle(html);
  const ids = extractOsfIds(html);

  // TODO: if you have a page map (e.g., JSON keyed by osf-id), merge here.
  const paras = ids.map(id => ({ id, page: null, hash: null, offset: null }));

  const manifest = {
    slug,
    chapter: chapterPathRel.replace(/\\/g, "/"),
    pdf: pdfRelative,
    title,
    paras,
    figures: [],
    tables: []
  };

  const outFile = abs + ".manifest.json";
  await fs.writeFile(outFile, JSON.stringify(manifest, null, 2), "utf8");
  return { path: chapterPathRel.replace(/\\/g, "/"), title, paras: ids };
}

(async () => {
  const chapters = [];
  for await (const file of walk(notebookDir)) {
    if (!file.endsWith(".html")) continue;
    const rel = path.relative(cafeDir, file);
    const data = await buildChapterManifest(rel);
    chapters.push(data);
  }

  const index = {
    slug,
    pdf: pdfRelative,
    chapters
  };

  const indexFile = path.join(cafeDir, "index.json");
  await fs.writeFile(indexFile, JSON.stringify(index, null, 2), "utf8");
  console.log(`Wrote ${chapters.length} manifests and index.json for ${slug}.`);
})();
