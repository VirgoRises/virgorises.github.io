// tools/rfc-compile.mjs
import fs from 'fs/promises';
import path from 'path';
import simpleGit from 'simple-git';
import 'dotenv/config';

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const PROPOSALS_DIR = path.join(DATA_DIR, 'data', 'proposals');
const RFC_DIR   = path.join(PROPOSALS_DIR, 'rfc');
const MOTIV_DIR = path.join(PROPOSALS_DIR, 'motivations');
const USERS_DIR = path.join(DATA_DIR, 'data', 'users');

const git = simpleGit({ baseDir: DATA_DIR });
const GIT_COMMIT = process.env.GIT_COMMIT === '1';

async function listRFCs() {
  const files = await fs.readdir(RFC_DIR);
  return files.filter(f => f.endsWith('.json')).map(f => path.basename(f, '.json'));
}
async function readJSON(file, fb=null){ try{ return JSON.parse(await fs.readFile(file,'utf8')); } catch{ return fb; } }
async function writeJSON(file, data){ await fs.writeFile(file, JSON.stringify(data,null,2)+'\n','utf8'); }
async function readLines(file){ try{ return (await fs.readFile(file,'utf8')).split('\n').filter(Boolean);} catch{ return []; } }
function pushBadge(user, slug){ user.badges = user.badges || []; user.badges.push(slug); }

async function compileOne(prfcId) {
  const rfcFile = path.join(RFC_DIR, `${prfcId}.json`);
  const ndFile  = path.join(MOTIV_DIR, `${prfcId}.ndjson`);
  const rfc = await readJSON(rfcFile); if (!rfc) return;

  const events = (await readLines(ndFile)).map(j=>JSON.parse(j));
  events.sort((a,b)=> new Date(a.at) - new Date(b.at));

  // tallies
  const lastVote = new Map();
  for (const e of events) {
    if (!['underwrite','dissent','retract'].includes(e.action)) continue;
    lastVote.set(e.user_id, e);
  }
  let under=0, diss=0;
  for (const [_, e] of lastVote) {
    if (e.action==='underwrite') under++;
    else if (e.action==='dissent') diss++;
  }
  rfc.tallies = { underwrite: under, dissent: diss };

  const quorum = rfc.voting?.quorum ?? 0;
  rfc.ready_candidate = ((under+diss)>=quorum) && diss===0;

  await writeJSON(rfcFile, rfc);

  // badges if closed
  if (rfc.status === 'closed' && rfc.decision) {
    const decisionVote = (rfc.decision==='accepted')? 'underwrite':'dissent';
    const firstCorrect = new Map();
    const msgAuthor = new Map();
    for (const e of events) {
      if (e.msg && e.user_id) msgAuthor.set(e.msg, e.user_id);
    }
    const last = new Map();
    const persuaders = new Map();
    for (const e of events) {
      if (['underwrite','dissent','retract'].includes(e.action)) {
        last.set(e.user_id, e);
        if (e.action===decisionVote && !firstCorrect.has(e.user_id)) firstCorrect.set(e.user_id, new Date(e.at));
        const refUser = e.ref_user_id || (e.ref && msgAuthor.get(e.ref));
        if (refUser && refUser !== e.user_id) {
          if (!persuaders.has(refUser)) persuaders.set(refUser, new Set());
          persuaders.get(refUser).add(e.user_id);
        }
      }
    }
    const closedAt = new Date(rfc.closed_at || Date.now());
    const EARLY_MS = 48*3600*1000;

    const changed = new Set();

    for (const [uid, e] of last) {
      const ok = (e.action === decisionVote);
      if (!ok) continue;
      const file = path.join(USERS_DIR, `${uid.replace('discord:','')}.json`);
      const user = (await readJSON(file)) || { user_id: uid, roles:[], points:0, badges:[], history:{} };
      user.history.voted = (user.history.voted||0)+1;
      user.history.aligned = (user.history.aligned||0)+1;
      user.points = (user.points||0)+1;
      pushBadge(user, 'aligned');

      const t = firstCorrect.get(uid);
      if (t && (closedAt - t) >= EARLY_MS) {
        pushBadge(user,'early-call');
        user.points += 0.5;
      }
      await writeJSON(file, user);
      changed.add(path.relative(DATA_DIR, file));
    }

    for (const [refUid, voterSet] of persuaders) {
      const file = path.join(USERS_DIR, `${refUid.replace('discord:','')}.json`);
      const user = (await readJSON(file)) || { user_id: refUid, roles:[], points:0, badges:[], history:{} };
      user.history.persuaded = (user.history.persuaded||0) + voterSet.size;
      user.points = (user.points||0) + 0.25*voterSet.size;
      for (let i=0;i<voterSet.size;i++) pushBadge(user,'persuader');
      await writeJSON(file, user);
      changed.add(path.relative(DATA_DIR, file));
    }

    if (GIT_COMMIT==='1' && changed.size) {
      await git.add([...changed]);
      await git.commit(`compile: badges for ${prfcId}`);
    }
  }

  if (GIT_COMMIT==='1') {
    await git.add([path.relative(DATA_DIR, rfcFile)]);
    await git.commit(`compile: tallies for ${prfcId}`);
  }
}

(async function main(){
  const rfcs = await listRFCs();
  for (const id of rfcs) {
    await compileOne(id).catch(e=>console.error('compile error', id, e.message));
  }
  console.log(`Compiled ${rfcs.length} RFC(s).`);
})();
