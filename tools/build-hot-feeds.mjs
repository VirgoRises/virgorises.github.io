// tools/build-hot-feeds.mjs
// Builds per-café "hot" JSON AND a tabloid Markdown digest.
// Output:
//   out/hot/<slug>.json
//   out/hot/<slug>.md
//
// Optional env:
//   SITE_BASE=https://virgorises.github.io

import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const OUT  = path.join(ROOT, "out");
const CAFES_FILE = path.join(DATA, "cafes.json");
const SITE_BASE = process.env.SITE_BASE || "https://virgorises.github.io";

const NOW = new Date();
const DAY = 24 * 3600 * 1000;
const WEEK = 7 * DAY;

const safeJSON = async (p, fb=null) => { try { return JSON.parse(await fs.readFile(p,"utf8")); } catch { return fb; } };
const list = async (d) => { try { return (await fs.readdir(d)).map(f => path.join(d,f)); } catch { return []; } };

async function parseNDJSON(file) {
  let txt = "";
  try { txt = await fs.readFile(file, "utf8"); } catch { return []; }
  const out = [];
  const lines = txt.split("\n");
  for (let i=0;i<lines.length;i++){
    const l = lines[i].trim();
    if(!l) continue;
    try { out.push(JSON.parse(l)); } catch {}
  }
  return out;
}

function inWindow(ts, winMs){ return ts && (NOW - new Date(ts)) <= winMs; }
function excerpt(s, n=160){ s = (s || "").replace(/\s+/g," ").trim(); return s.length>n ? s.slice(0,n-1)+"…" : s; }
function maskUser(u){ if(!u) return "anon"; const id = String(u).replace(/^discord:/,""); return "u#"+id.slice(-4); }
// "spicy" = activity + controversy (bounded-ish, playful)
function spicyIndex(ev24, dissentShare){
  const base = Math.min(10, Math.sqrt(ev24) * 3.0);
  const spice = Math.min(5, (dissentShare||0) * 10);
  return Math.round((base + spice)*10)/10;
}
function fmt(n){ return (n ?? 0).toLocaleString?.() ?? String(n ?? 0); }
function isoLocal(ts){ return ts ? new Date(ts).toLocaleString() : "—"; }

function makeHotURL(basePath){ return `${SITE_BASE}${basePath}/hot.html`; }
function makeNoteURL(basePath, uuid){ return `${SITE_BASE}${basePath}/notebook/${uuid ? "#"+uuid : ""}`; }

async function buildCafe(slug, meta){
  const basePath = meta.basePath || `/cafes/${slug}`;
  const rfcDir   = path.join(DATA, slug, "proposals", "rfc");
  const motivDir = path.join(DATA, slug, "proposals", "motivations");

  const rfcFiles = (await list(rfcDir)).filter(f => f.endsWith(".json"));

  const topEntries = [];
  const recentEvents = [];
  let total24=0, total7=0;

  for (const f of rfcFiles){
    const r = await safeJSON(f);
    if (!r?.prfc_id) continue;

    const nd = path.join(motivDir, `${r.prfc_id}.ndjson`);
    const evs = await parseNDJSON(nd);

    let ev24=0, ev7=0, u24=0, d24=0, m24=0;
    let lastEvt = null;

    for (const e of evs){
      if (e.at) {
        if (inWindow(e.at, WEEK)) ev7++;
        if (inWindow(e.at, DAY))  {
          ev24++;
          if (e.action === "underwrite") u24++;
          else if (e.action === "dissent") d24++;
          else if (e.action === "motivate") m24++;
        }
        if (!lastEvt || new Date(e.at) > new Date(lastEvt.at)) lastEvt = e;
      }
      // capture recent feed (72h)
      if (inWindow(e.at, 3*DAY)) {
        recentEvents.push({
          at: e.at, prfc_id: r.prfc_id, action: e.action,
          role: e.role || null,
          user: maskUser(e.user_id),
          ref_user: maskUser(e.ref_user_id),
          motivation: excerpt(e.motivation, 180),
          link: e.msg || null,
          paragraph_uuid: r.paragraph_uuid || null,
          title: r.title || r.prfc_id
        });
      }
    }
    total24 += ev24; total7 += ev7;

    const dissentShare = (u24 + d24) ? (d24 / (u24 + d24)) : 0;
    const spicy = spicyIndex(ev24, dissentShare);

    topEntries.push({
      prfc_id: r.prfc_id,
      title: r.title || r.prfc_id,
      paragraph_uuid: r.paragraph_uuid || null,
      status: r.status || "active",
      tallies: r.tallies || { underwrite: 0, dissent: 0 },
      updated_at: lastEvt?.at || r.closed_at || r.created_at || null,
      counts: { ev_24h: ev24, ev_7d: ev7, under_24h: u24, dissent_24h: d24, motivate_24h: m24 },
      dissent_share_24h: dissentShare,
      spicy_index: spicy,
      deep_link: r.paragraph_uuid ? `${basePath}/notebook/#${r.paragraph_uuid}` : `${basePath}/notebook/`
    });
  }

  // Rank hottest RFCs by events 24h, then spicy index, then recency
  topEntries.sort((a,b)=>{
    if (b.counts.ev_24h !== a.counts.ev_24h) return b.counts.ev_24h - a.counts.ev_24h;
    if (b.spicy_index !== a.spicy_index)   return b.spicy_index - a.spicy_index;
    return new Date(b.updated_at||0) - new Date(a.updated_at||0);
  });

  // Sort recent events by time desc and cap
  recentEvents.sort((a,b)=> new Date(b.at) - new Date(a.at));
  const recentCap = recentEvents.slice(0, 120);

  // Build JSON output
  const out = {
    generated_at: NOW.toISOString(),
    slug, title: meta.title || slug,
    basePath,
    description: meta.description || "",
    totals: {
      events_24h: total24, events_7d: total7,
      top_spicy_index: topEntries[0]?.spicy_index || 0
    },
    top_prfcs: topEntries.slice(0, 12),
    recent_feed: recentCap
  };

  const outDir = path.join(OUT, "hot");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, `${slug}.json`), JSON.stringify(out, null, 2));

  // Build Markdown digest
  await fs.writeFile(path.join(outDir, `${slug}.md`), makeDigestMarkdown(out));

  return out;
}

function makeDigestMarkdown(out){
  const title = out.title || out.slug;
  const hotURL = makeHotURL(out.basePath);
  const gen = isoLocal(out.generated_at);
  const t24 = out.totals?.events_24h || 0;
  const t7  = out.totals?.events_7d  || 0;
  const topSpicy = (out.totals?.top_spicy_index || 0).toFixed(1);

  const top = out.top_prfcs || [];
  const top3 = top.slice(0,3);

  const topLines = top3.map((x,i)=>{
    const mark = i===0 ? "🔥 #1" : (i===1 ? "🔥 #2" : "🔥 #3");
    const ducks = (x.dissent_share_24h>0.5 && x.counts.ev_24h>=3)
      ? ` ⚠️ Duck & cover (${Math.round(x.dissent_share_24h*100)}% dissent)`
      : "";
    const deep = makeNoteURL(out.basePath, x.paragraph_uuid);
    return `- ${mark} **${x.prfc_id} — ${mdEscape(x.title)}** · ${x.counts.ev_24h} ev/24h · spicy ${x.spicy_index.toFixed(1)} · [open](${deep})${ducks}`;
  }).join("\n");

  const table = [
    "| # | RFC | 24h | ✅ | ❌ | ✍️ | spicy | status | updated |",
    "|--:|:----|----:|---:|---:|---:|-----:|:------:|:--------|",
    ...top.slice(0,12).map((x,i)=> {
      return `| ${i+1} | **${x.prfc_id}** — ${mdEscape(x.title)} | ${x.counts.ev_24h} | ${x.counts.under_24h} | ${x.counts.dissent_24h} | ${x.counts.motivate_24h} | ${x.spicy_index.toFixed(1)} | ${x.status} | ${isoLocal(x.updated_at)} |`;
    })
  ].join("\n");

  const feed = (out.recent_feed||[]).slice(0,30).map(ev=>{
    const icon = ev.action==='underwrite'?'✅': ev.action==='dissent'?'❌': ev.action==='retract'?'↩️':'✍️';
    const deep = makeNoteURL(out.basePath, ev.paragraph_uuid);
    const msg  = ev.link ? ` · [msg](${ev.link})` : "";
    const mot  = ev.motivation ? ` — ${mdEscape(ev.motivation)}` : "";
    return `- ${isoLocal(ev.at)} · ${icon} **${ev.prfc_id}** — ${mdEscape(ev.title)} (${ev.user}${ev.ref_user ? ` ↦ ${ev.ref_user}`:""}) · [open](${deep})${msg}${mot}`;
  }).join("\n");

  // Social snippets
  const top1 = top[0];
  const topLink = top1 ? makeNoteURL(out.basePath, top1.paragraph_uuid) : hotURL;

  const tweet = makeTweet({
    cafe: title,
    t24, top1, topSpicy,
    hotURL, topLink
  });

  const longPost = `**${title} — Hot Feed (${gen})**\n\n` +
    `24h activity: **${t24}** · 7d: **${t7}** · Top spicy: **${topSpicy}** 🔥\n\n` +
    (topLines ? `Top movers:\n${topLines}\n\n` : "") +
    `Open the live feed → ${hotURL}\n\n` +
    `#OpenScience #PeerReview #math #Virgorises`;

  return `# ${title} — Hot Feed\n\n` +
`Generated: ${gen}\n\n` +
`**24h events:** ${t24} · **7d:** ${t7} · **Top spicy:** ${topSpicy} 🔥\n\n` +
`## Top RFCs (last 24h)\n\n${table}\n\n` +
`## Recent activity (72h)\n\n${feed || "_No recent events._"}\n\n` +
`---\n\n` +
`## Social snippets\n\n` +
`**Tweet (≤280 chars):**\n\n` +
`\`\`\`\n${tweet}\n\`\`\`\n\n` +
`**Post (longer):**\n\n` +
`${longPost}\n`;
}

function mdEscape(s){
  return (s||"").replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

function makeTweet({ cafe, t24, top1, topSpicy, hotURL, topLink }){
  // Keep it snappy and under 280 with room for a t.co short link.
  // Twitter counts links as ~23 chars; we keep headroom.
  const head = `${cafe} hot feed`;
  const topLine = top1
    ? ` Top: ${top1.prfc_id} (${top1.counts.ev_24h} ev/24h, spicy ${top1.spicy_index.toFixed(1)}).`
    : ``;
  const tags = ` #OpenScience #PeerReview #Virgorises`;
  // Prefer hottest deep link; fall back to hot page
  const link = top1 ? topLink : hotURL;
  let msg = `${head} 🔥 ${t24} events/24h (top spicy ${topSpicy}).${topLine} ${link}${tags}`;
  if (msg.length > 275) {
    // trim café name or drop one tag if needed
    msg = `${cafe} hot feed 🔥 ${t24} events/24h.${topLine} ${link} #OpenScience #PeerReview`;
  }
  return msg;
}

async function main(){
  const cafes = (await safeJSON(CAFES_FILE, { cafes: [] })).cafes || [];
  if (!cafes.length) { console.log("No cafés in data/cafes.json"); return; }
  for (const c of cafes){
    const out = await buildCafe(c.slug, c);
    console.log(`hot feed: out/hot/${c.slug}.{json,md} (24h=${out.totals.events_24h}, top spicy=${out.totals.top_spicy_index})`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
