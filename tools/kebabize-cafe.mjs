#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { glob } from "glob";

/** Usage:
 *  node tools/kebabize-cafe.mjs --slug zeta-zero-cafe [--apply]
 *
 *  - Renames cafes/<slug>/notebook/*.html to lower-kebab-case.
 *  - Rewrites links in all HTML/JS/CSS/JSON/MD files under cafes/<slug>.
 *  - Dry-run by default; use --apply to actually change files.
 */

const args = new Map(process.argv.slice(2).flatMap(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [[m[1], m[2] ?? true]] : [];
}));

const SLUG = args.get("slug");
const APPLY = !!args.get("apply");
if (!SLUG) {
  console.error("❌ Missing --slug <cafe-slug>");
  process.exit(1);
}

const cafeRoot = path.resolve(`cafes/${SLUG}`);
const nbDir = path.join(cafeRoot, "notebook");
const extsToRewrite = ["html","htm","js","mjs","css","json","md"];
const isGitRepo = spawnSync("git", ["rev-parse","--is-inside-work-tree"], {stdio:"pipe"}).status === 0;

function slugifyFile(fn) {
  const { name, ext } = path.parse(fn);
  // replace & with 'and' to be nice
  let s = name.normalize("NFKD")
    .replace(/&/g, " and ")
    .replace(/[\s_+]+/g, "-")        // spaces/underscores -> dash
    .replace(/[^a-zA-Z0-9-]/g, "-")  // strip punctuation
    .replace(/-+/g, "-")             // collapse
    .replace(/^-|-$/g, "")           // trim
    .toLowerCase();
  if (s.length === 0) s = "page";
  return `${s}${ext.toLowerCase()}`;
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

function gitMv(oldP, newP) {
  const res = spawnSync("git", ["mv", oldP, newP], {stdio:"pipe"});
  return res.status === 0;
}

async function safeRename(oldP, newP) {
  // Case-only change: hop via a temp name so FS notices
  const sameDir = path.dirname(oldP);
  const tmp = path.join(sameDir, `.tmp-kebab-${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(newP)}`);
  if (isGitRepo) {
    if (path.basename(oldP).toLowerCase() === path.basename(newP).toLowerCase() &&
        path.basename(oldP) !== path.basename(newP)) {
      if (!gitMv(oldP, tmp)) { await fs.rename(oldP, tmp); }
      if (!gitMv(tmp, newP)) { await fs.rename(tmp, newP); }
    } else {
      if (!gitMv(oldP, newP)) { await fs.rename(oldP, newP); }
    }
  } else {
    if (path.basename(oldP).toLowerCase() === path.basename(newP).toLowerCase() &&
        path.basename(oldP) !== path.basename(newP)) {
      await fs.rename(oldP, tmp);
      await fs.rename(tmp, newP);
    } else {
      await fs.rename(oldP, newP);
    }
  }
}

function encodeSpacesOnly(s) { return s.replace(/ /g, "%20"); }

/** Create a mapping of old->new names, ensuring uniqueness */
async function computeMapping() {
  const files = await glob("*.html", { cwd: nbDir, dot:false, nodir:true });
  const mapping = new Map();
  const used = new Set();

  for (const f of files) {
    const newNameBase = slugifyFile(f);
    let newName = newNameBase;
    let i = 2;
    while (used.has(newName) || (newName !== f && await fileExists(path.join(nbDir, newName)))) {
      const { name, ext } = path.parse(newNameBase);
      newName = `${name}-${i++}${ext}`;
    }
    used.add(newName);
    if (newName !== f) mapping.set(f, newName);
  }
  return mapping;
}

async function rewriteLinks(mapping) {
  const targets = await glob(`**/*.{${extsToRewrite.join(",")}}`, {
    cwd: cafeRoot, dot:false, nodir:true
  });

  let touched = 0;
  for (const rel of targets) {
    const abs = path.join(cafeRoot, rel);
    let txt = await fs.readFile(abs, "utf8");
    const before = txt;

    for (const [oldName, newName] of mapping.entries()) {
      // We only rewrite links to /notebook/<file>
      const oldRel = `/notebook/${oldName}`;
      const newRel = `/notebook/${newName}`;

      // Replace plain, and %20-encoded variants
      const variants = [
        oldRel,
        oldRel.replaceAll(" ", "%20"),
        oldRel.replaceAll(" ", "+"),
        encodeURI(oldRel), // full encode (safe)
      ];

      for (const v of variants) {
        const re = new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
        txt = txt.replace(re, newRel);
      }
    }

    if (txt !== before) {
      touched++;
      if (APPLY) await fs.writeFile(abs, txt, "utf8");
    }
  }
  return touched;
}

(async () => {
  console.log(`\nCafé: ${SLUG}`);
  console.log(`Notebook dir: ${nbDir}`);
  const mapping = await computeMapping();

  if (mapping.size === 0) {
    console.log("✓ Nothing to rename (already kebab-case).");
    process.exit(0);
  }

  console.log("\nPlanned renames:");
  for (const [o, n] of mapping) console.log(`  ${o}  ->  ${n}`);

  if (!APPLY) {
    console.log(`\n(dry-run) To apply: node tools/kebabize-cafe.mjs --slug ${SLUG} --apply\n`);
    process.exit(0);
  }

  // do renames
  for (const [o, n] of mapping) {
    const oldP = path.join(nbDir, o);
    const newP = path.join(nbDir, n);
    await safeRename(oldP, newP);
  }
  console.log("✓ Renamed files.");

  const rew = await rewriteLinks(mapping);
  console.log(`✓ Rewrote links in ${rew} files under cafes/${SLUG}`);

  console.log("\nNext steps:");
  console.log(`  • Regenerate anchors for this café:`);
  console.log(`      node tools/anchors-make.mjs --slug ${SLUG}`);
  console.log(`  • Commit & push:\n      git add -A && git commit -m "chore(${SLUG}): kebab-case filenames" && git push`);
})();
