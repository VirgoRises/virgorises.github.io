#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";

/**
 * Usage:
 *   node tools/links-kebab-fix.mjs --slug zeta-zero-cafe [--apply]
 *
 * Only rewrites links; does NOT rename files.
 * Dry-run by default.
 */

const args = new Map(
  process.argv.slice(2).flatMap(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [[m[1], m[2] ?? true]] : [];
  })
);

const SLUG = args.get("slug");
const APPLY = !!args.get("apply");
if (!SLUG) {
  console.error("❌ Missing --slug <cafe-slug>");
  process.exit(1);
}

const cafeRoot = path.resolve(`cafes/${SLUG}`);
const nbDir = path.join(cafeRoot, "notebook");
const anchorsDir = path.join(cafeRoot, "data", "anchors");

// --- helpers -------------------------------------------------

const safeDecode = (s) => {
  try { return decodeURIComponent(s); } catch { return s; }
};

const normalizeKey = (filename) => {
  // keep base name without extension
  const base = path.basename(filename).replace(/\.[^.]+$/, "");
  return base
    .toLowerCase()
    .replace(/[%+]/g, " ")          // %20 or '+' as spaces
    .replace(/[\s_\-]+/g, " ")      // treat -, _, spaces as separators
    .replace(/[^a-z0-9 ]/g, "")     // drop punctuation
    .replace(/\s+/g, "");           // collapse to key
};

async function buildMap(dir, wantedExt) {
  const files = await glob(`*.${wantedExt}`, { cwd: dir, dot: false, nodir: true });
  const map = new Map();
  for (const f of files) {
    const key = normalizeKey(f);
    map.set(key, f); // canonical on disk
  }
  return map;
}

// Escape for regex composition
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// --- build canonical maps from what exists on disk ------------

const notebookMap = await buildMap(nbDir, "html");  // key -> kebab.html
const anchorsMap  = await buildMap(anchorsDir, "json");

if (notebookMap.size === 0) {
  console.error(`❌ No notebook HTML files found in ${nbDir}`);
  process.exit(1);
}

// --- rewrite pass --------------------------------------------

const extsToRewrite = ["html","htm","js","mjs","css","json","md"];
const targets = await glob(`**/*.{${extsToRewrite.join(",")}}`, {
  cwd: cafeRoot, dot: false, nodir: true
});

// Patterns we will match:
//   1) /notebook/<file>.html
//   2) /cafes/<slug>/notebook/<file>.html
//   with optional ?query and #hash tails.
//   Same idea for data/anchors/*.json

const notebookRe = new RegExp(
  `(\\/?(?:cafes\\/${reEsc(SLUG)}\\/)?notebook\\/)([A-Za-z0-9._%+\\- ]+\\.html)((?:\\?[^\\s"'#)]*)?(?:#[^\\s"'\\)]*)?)?`,
  "g"
);

const anchorsRe = new RegExp(
  `(\\/?(?:cafes\\/${reEsc(SLUG)}\\/)?data\\/anchors\\/)([A-Za-z0-9._%+\\- ]+\\.json)`,
  "g"
);

let filesChanged = 0, linksFixed = 0;
for (const rel of targets) {
  const abs = path.join(cafeRoot, rel);
  let txt = await fs.readFile(abs, "utf8");
  const before = txt;

  // notebook/*.html links
  txt = txt.replace(notebookRe, (_m, prefix, fname, tail = "") => {
    const decoded = safeDecode(fname);
    const key = normalizeKey(decoded);
    const canonical = notebookMap.get(key);
    if (!canonical) return _m; // unknown, leave as-is

    if (decoded === canonical) return _m; // already good

    linksFixed++;
    return `${prefix}${canonical}${tail}`;
  });

  // data/anchors/*.json links
  txt = txt.replace(anchorsRe, (_m, prefix, fname) => {
    if (anchorsMap.size === 0) return _m;
    const decoded = safeDecode(fname);
    const key = normalizeKey(decoded);
    const canonical = anchorsMap.get(key);
    if (!canonical) return _m;

    if (decoded === canonical) return _m;

    linksFixed++;
    return `${prefix}${canonical}`;
  });

  if (txt !== before) {
    filesChanged++;
    if (APPLY) await fs.writeFile(abs, txt, "utf8");
  }
}

// --- report ---------------------------------------------------

if (!APPLY) {
  console.log(`\n(dry-run) Would fix ${linksFixed} links across ${filesChanged} files.`);
  console.log(`To apply: node tools/links-kebab-fix.mjs --slug ${SLUG} --apply\n`);
} else {
  console.log(`\n✓ Fixed ${linksFixed} links across ${filesChanged} files under cafes/${SLUG}\n`);
  console.log("Tip: commit & push:\n  git add -A && git commit -m \"fix(links): kebab-case notebook/anchors\" && git push\n");
}
