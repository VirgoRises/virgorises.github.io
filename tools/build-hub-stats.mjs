// tools/build-hub-stats.mjs
import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const OUT  = path.join(ROOT, "out");

const CAFES_FILE = path.join(DATA, "cafes.json");
const NOW = new Date();
const DAY_MS = 24 * 3600 * 1000;

async function safeJSON(p, fb=null) {
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return fb; }
}
async function exists(p) { try { await fs.stat(p); return true; } catch { return false; } }
async function listFiles(dir) {
  try { return (await fs.readdir(dir)).map(f => path.join(dir, f)); }
  catch { return []; }
}

async function parseNDJSON(file) {
  let txt = "";
  try { txt = await fs.readFile(file, "utf8"); }
  catch { return []; }
  const out = [];
  const lines = txt.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    try { out.push(JSON.parse(l)); }
    catch { /* skip bad */ }
  }
  return out;
}

async function lastEventForPRFC(slug, prfcId) {
  const nd = path.join(DATA, slug, "proposals", "motivations", `${prfcId}.ndjson`);
  const evs = await parseNDJSON(nd);
  if (!evs.length) return null;
  return evs[evs.length - 1];
}

async function countEvents24h(slug) {
  const motivDir = path.join(DATA, slug, "proposals", "motivations");
  const files = await listFiles(motivDir);
  let n = 0;
  for (const f of files) {
    const evs = await parseNDJSON(f);
    for (const ev of evs) {
      if (ev.at && (NOW - new Date(ev.at)) <= DAY_MS) n++;
    }
  }
  return n;
}

async function build() {
  const cafes = (await safeJSON(CAFES_FILE, { cafes: [] })).cafes || [];
  const hub = { generated_at: NOW.toISOString(), cafes: [] };
  const latestItems = [];

  for (const cafe of cafes) {
    const slug = cafe.slug;
    const rfcDir = path.join(DATA, slug, "proposals", "rfc");
    const files = (await listFiles(rfcDir)).filter(f => f.endsWith(".json"));

    let active=0, ready=0, closed=0, under=0, diss=0;
    let lastAct = null;
    let hottest = null; // {prfc_id, paragraph_uuid, title, updated_at}

    for (const f of files) {
      const r = await safeJSON(f);
      if (!r?.prfc_id) continue;

      if (r.tallies) { under += r.tallies.underwrite || 0; diss += r.tallies.dissent || 0; }
      if (r.status === "active") active++;
      else if (r.status === "ready") ready++;
      else if (r.status === "closed") closed++;

      // updated at = last event or closed_at or created_at
      let updatedAt = r.created_at ? new Date(r.created_at) : null;
      const lastEv = await lastEventForPRFC(slug, r.prfc_id);
      if (lastEv?.at) updatedAt = new Date(lastEv.at);
      if (!updatedAt && r.closed_at) updatedAt = new Date(r.closed_at);

      const updatedISO = updatedAt ? updatedAt.toISOString() : (r.created_at || null);

      // enqueue into global latest list (now with paragraph_uuid!)
      latestItems.push({
        prfc_id: r.prfc_id,
        slug,
        cafe_title: cafe.title || slug,
        title: r.title || r.prfc_id,
        status: r.status || "active",
        created_at: r.created_at || null,
        updated_at: updatedISO,
        paragraph_uuid: r.paragraph_uuid || null,
        tallies: r.tallies || { underwrite: 0, dissent: 0 }
      });

      // track hottest for this café
      if (updatedAt && (!hottest || updatedAt > new Date(hottest.updated_at))) {
        hottest = {
          prfc_id: r.prfc_id,
          paragraph_uuid: r.paragraph_uuid || null,
          title: r.title || r.prfc_id,
          updated_at: updatedISO
        };
      }

      if (updatedAt && (!lastAct || updatedAt > lastAct)) lastAct = updatedAt;
    }

    const momentum = await countEvents24h(slug);

    hub.cafes.push({
      slug,
      title: cafe.title || slug,
      basePath: cafe.basePath || `/cafes/${slug}`,
      description: cafe.description || "",
      tags: cafe.tags || [],
      totals: {
        proposals: files.length,
        active, ready, closed,
        underwrites: under, dissents: diss
      },
      last_activity: lastAct ? lastAct.toISOString() : null,
      momentum_24h: momentum,
      hottest: hottest // may be null
    });
  }

  // sort latest by updated_at desc, take top 12
  latestItems.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
  const latest = { generated_at: NOW.toISOString(), items: latestItems.slice(0, 12) };

  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, "hub_stats.json"), JSON.stringify(hub, null, 2));
  await fs.writeFile(path.join(OUT, "latest_rfcs.json"), JSON.stringify(latest, null, 2));

  console.log(`Built out/hub_stats.json and out/latest_rfcs.json for ${hub.cafes.length} café(s).`);
}

build().catch(e => { console.error(e); process.exit(1); });
