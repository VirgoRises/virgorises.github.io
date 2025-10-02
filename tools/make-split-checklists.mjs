// tools/make-split-checklists.mjs
// Usage: node tools/make-split-checklists.mjs
import fs from "fs/promises";
import path from "path";

const IN = "out/osf_split_suggestions.json";
const OUT_DIR = "out/checklists";

function shortName(file) {
  // e.g. "zeta-zero-cafe/notebook/Chapter 4 The triangular numbers.html"
  const base = path.basename(file).replace(/\.html$/i, "");
  return base;
}

const data = JSON.parse(await fs.readFile(IN, "utf8"));
const byFile = new Map();
for (const r of data) {
  if (!byFile.has(r.file)) byFile.set(r.file, []);
  byFile.get(r.file).push(r);
}
await fs.mkdir(OUT_DIR, { recursive: true });

for (const [file, rows] of byFile) {
  rows.sort((a, b) => {
    // sort by densityScore desc, then chars desc, then paragraphIndex asc
    return (b.densityScore - a.densityScore)
        || (b.chars - a.chars)
        || (a.paragraphIndex - b.paragraphIndex);
  });
  const title = shortName(file);
  const outPath = path.join(OUT_DIR, `${title}.md`);
  const lines = [];
  lines.push(`# ${title} — Split Checklist`);
  lines.push("");
  lines.push(`Source: \`${file}\``);
  lines.push("");
  lines.push("> Run analyzer again after each batch:\n> `node tools/analyze-osf.mjs`");
  lines.push("");
  for (const r of rows) {
    const cmd = `node tools/apply-split.mjs --file "${file}" --index ${r.paragraphIndex}` +
                (r.splitAfterSentence ? ` --sentence ${r.splitAfterSentence}` : ``);
    lines.push(`## § candidate — index ${r.paragraphIndex}`);
    lines.push(`- reason: ${r.reason}`);
    if (r.splitAfterSentence) lines.push(`- suggested split **after sentence**: ${r.splitAfterSentence}`);
    lines.push(`- snippet: ${r.snippet}`);
    lines.push("");
    lines.push(`**Dry-run:**\n\`\`\`bash\n${cmd}\n\`\`\``);
    lines.push(`**Write:** add \`--write\` (auto-backup enabled)\n`);
  }
  await fs.writeFile(outPath, lines.join("\n"), "utf8");
  console.log("Wrote", outPath);
}
console.log("Done. Open the files in out/checklists/");
