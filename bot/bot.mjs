// bot/bot.mjs
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import simpleGit from 'simple-git';

// ---------- config ----------
const {
    DISCORD_TOKEN,
    GUILD_ID,
    ROLE_RPOH_ID,
    ROLE_EDITOR_ID,
    DATA_DIR = process.cwd(),
    GIT_COMMIT = '0',
    GIT_AUTHOR_NAME = 'osf-bot',
    GIT_AUTHOR_EMAIL = 'bot@example.com',
} = process.env;

const git = simpleGit({ baseDir: DATA_DIR });

const PROPOSALS_DIR = path.join(DATA_DIR, 'data', 'proposals');
const RFC_DIR = path.join(PROPOSALS_DIR, 'rfc');
const MOTIV_DIR = path.join(PROPOSALS_DIR, 'motivations');
const USERS_DIR = path.join(DATA_DIR, 'data', 'users');

async function ensureDirs() {
    await fs.mkdir(RFC_DIR, { recursive: true });
    await fs.mkdir(MOTIV_DIR, { recursive: true });
    await fs.mkdir(USERS_DIR, { recursive: true });
}

// ---------- utils ----------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function nowISO() { return new Date().toISOString(); }

function messageLink(guildId, channelId, messageId) {
    return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

function parseArgs(line) {
    // naive arg parser supporting --key "quoted value"
    const re = /--([a-zA-Z0-9_-]+)\s+"([^"]*)"|--([a-zA-Z0-9_-]+)\s+(\S+)|"([^"]+)"|(\S+)/g;
    const args = [];
    const flags = {};
    let m;
    while ((m = re.exec(line))) {
        if (m[1]) flags[m[1]] = m[2];
        else if (m[3]) flags[m[3]] = m[4];
        else if (m[5]) args.push(m[5]);
        else if (m[6]) args.push(m[6]);
    }
    return { args, flags };
}

async function readJSON(file, fallback = null) {
    try { return JSON.parse(await fs.readFile(file, 'utf8')); }
    catch { return fallback; }
}

async function writeJSON(file, data) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function appendNDJSON(file, obj) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, JSON.stringify(obj) + '\n', 'utf8');
}

// optional: auto commit file changes
async function maybeCommit(message, files = []) {
    if (GIT_COMMIT !== '1') return;
    try {
        await git.addConfig('user.name', GIT_AUTHOR_NAME);
        await git.addConfig('user.email', GIT_AUTHOR_EMAIL);
        await git.add(files);
        await git.commit(message);
    } catch (e) {
        console.error('git commit failed:', e.message);
    }
}

// role checks
function hasRole(member, idOrName) {
    if (!member) return false;
    if (idOrName?.match(/^\d+$/)) {
        return member.roles.cache.has(idOrName);
    }
    // name fallback
    return member.roles.cache.some(r => r.name.toLowerCase() === String(idOrName).toLowerCase());
}

function isRPOH(member) {
    return hasRole(member, ROLE_RPOH_ID) || hasRole(member, 'real-part-one-half');
}
function isEditor(member) {
    return hasRole(member, ROLE_EDITOR_ID) || hasRole(member, 'editor');
}

// ---------- core: compile one RFC (tallies & optional ready) ----------
async function compileRFC(prfcId) {
    const rfcFile = path.join(RFC_DIR, `${prfcId}.json`);
    const ndjson = path.join(MOTIV_DIR, `${prfcId}.ndjson`);

    const rfc = await readJSON(rfcFile);
    if (!rfc) throw new Error(`RFC ${prfcId} not found`);

    const lines = (await readJSONLines(ndjson));
    const events = lines.map(j => JSON.parse(j));

    // last vote per user
    const lastVote = new Map();
    for (const e of events) {
        if (!['underwrite', 'dissent', 'retract'].includes(e.action)) continue;
        lastVote.set(e.user_id, e); // later lines overwrite (append-only)
    }

    let under = 0, diss = 0;
    for (const [_, e] of lastVote) {
        if (e.action === 'underwrite') under++;
        else if (e.action === 'dissent') diss++;
    }

    rfc.tallies = { underwrite: under, dissent: diss };

    // derive readiness (does not change status unless you want it to)
    const quorum = rfc.voting?.quorum ?? 0;
    const reachedQuorum = (under + diss) >= quorum;
    const noDissent = diss === 0;
    rfc.ready_candidate = !!(reachedQuorum && noDissent);

    await writeJSON(rfcFile, rfc);
    await maybeCommit(`compile: tallies ${prfcId}`, [path.relative(DATA_DIR, rfcFile)]);
    return rfc;
}

async function readJSONLines(file) {
    try {
        const t = await fs.readFile(file, 'utf8');
        return t.split('\n').filter(Boolean);
    } catch { return []; }
}

// ---------- badges compiler (runs when RFC is closed) ----------
async function awardBadges(prfcId) {
    const rfcFile = path.join(RFC_DIR, `${prfcId}.json`);
    const ndjson = path.join(MOTIV_DIR, `${prfcId}.ndjson`);
    const rfc = await readJSON(rfcFile);
    if (!rfc || rfc.status !== 'closed' || !rfc.decision) return;

    const events = (await readJSONLines(ndjson)).map(j => JSON.parse(j));
    // chronological
    events.sort((a, b) => new Date(a.at) - new Date(b.at));

    // map last vote per user + when they made their correct call
    const lastVote = new Map();
    const firstCorrectTime = new Map();
    const decisionVote = (rfc.decision === 'accepted') ? 'underwrite' : 'dissent';

    // Map from msg link -> author (to credit persuader)
    const msgAuthor = new Map();
    for (const e of events) {
        if (e.msg && e.user_id) msgAuthor.set(e.msg, e.user_id);
    }

    // track persuader credits: voter -> ref_user
    const persuaders = new Map(); // ref_user_id -> Set(voter_user_id)
    for (const e of events) {
        if (['underwrite', 'dissent', 'retract'].includes(e.action)) {
            lastVote.set(e.user_id, e);
            if (e.action === decisionVote && !firstCorrectTime.has(e.user_id)) {
                firstCorrectTime.set(e.user_id, new Date(e.at));
            }
            // credit referenced motivation author (if any)
            const refUser = e.ref_user_id || (e.ref && msgAuthor.get(e.ref));
            if (refUser && refUser !== e.user_id) {
                if (!persuaders.has(refUser)) persuaders.set(refUser, new Set());
                persuaders.get(refUser).add(e.user_id);
            }
        }
    }

    const closedAt = new Date(rfc.closed_at || Date.now());
    const EARLY_MS = 48 * 3600 * 1000;

    // update users
    const changedFiles = new Set();

    // RPOH aligned + early-call
    for (const [userId, vote] of lastVote) {
        const ok = vote.action === decisionVote;
        if (!ok) continue;
        const userFile = path.join(USERS_DIR, `${userId.replace('discord:', '')}.json`);
        const user = (await readJSON(userFile)) || { user_id: userId, roles: [], points: 0, badges: [], history: {} };
        user.history.voted = (user.history.voted || 0) + 1;
        user.history.aligned = (user.history.aligned || 0) + 1;

        // points & badge counts
        user.points = (user.points || 0) + 1;
        pushBadge(user, 'aligned');

        // early call?
        const t = firstCorrectTime.get(userId);
        if (t && (closedAt - t) >= EARLY_MS) {
            pushBadge(user, 'early-call');
            user.points += 0.5;
        }

        await writeJSON(userFile, user);
        changedFiles.add(path.relative(DATA_DIR, userFile));
    }

    // NTZ persuader
    for (const [refUserId, voterSet] of persuaders) {
        const userFile = path.join(USERS_DIR, `${refUserId.replace('discord:', '')}.json`);
        const user = (await readJSON(userFile)) || { user_id: refUserId, roles: [], points: 0, badges: [], history: {} };
        user.history.persuaded = (user.history.persuaded || 0) + voterSet.size;
        user.points = (user.points || 0) + 0.25 * voterSet.size;
        for (let i = 0; i < voterSet.size; i++) pushBadge(user, 'persuader');
        await writeJSON(userFile, user);
        changedFiles.add(path.relative(DATA_DIR, userFile));
    }

    if (changedFiles.size) {
        await maybeCommit(`badges: ${prfcId}`, [...changedFiles]);
    }
}

function pushBadge(user, slug) {
    user.badges = user.badges || [];
    user.badges.push(slug); // keep simple; you can aggregate to levels later
}

// ---------- command handlers ----------
async function handleVote(message, argsLine) {
    const { args, flags } = parseArgs(argsLine);
    const [prfcId, action] = args;
    if (!/^PRFC-\d+$/i.test(prfcId) || !['underwrite', 'dissent', 'retract'].includes(String(action).toLowerCase())) {
        return message.reply('Usage: `!rfcvote PRFC-0001 underwrite|dissent|retract [--why "text"] [--ref <message link>]`');
    }
    const member = await message.guild.members.fetch(message.author.id);
    if (!isRPOH(member)) return message.reply('Only **real-part-one-half** members can vote.');

    const motivation = flags.why || '';
    let ref = flags.ref || null;
    let ref_user_id = null;

    // if replying, extract the referenced message
    if (!ref && message.reference?.messageId) {
        ref = messageLink(message.guildId, message.channelId, message.reference.messageId);
        try {
            const replied = await message.channel.messages.fetch(message.reference.messageId);
            ref_user_id = `discord:${replied.author.id}`;
        } catch { }
    }

    const ev = {
        at: nowISO(),
        prfc_id: prfcId,
        user_id: `discord:${message.author.id}`,
        role: 'rpoH',
        action: action.toLowerCase(),
        motivation,
        ref: ref || null,
        ref_user_id,
        msg: messageLink(message.guildId, message.channelId, message.id)
    };

    const ndFile = path.join(MOTIV_DIR, `${prfcId}.ndjson`);
    await appendNDJSON(ndFile, ev);
    await maybeCommit(`vote: ${prfcId} ${action} by ${message.author.id}`, [path.relative(DATA_DIR, ndFile)]);

    await compileRFC(prfcId);

    return message.react('✅');
}

async function handleMotivation(message, argsLine) {
    const { args, flags } = parseArgs(argsLine);
    const [prfcId] = args;
    if (!/^PRFC-\d+$/i.test(prfcId)) {
        return message.reply('Usage: `!rfcmot PRFC-0001 --why "text" [--ref <message link>]`');
    }
    const motivation = flags.why || '';
    let ref = flags.ref || null;

    if (!ref && message.reference?.messageId) {
        ref = messageLink(message.guildId, message.channelId, message.reference.messageId);
    }

    const member = await message.guild.members.fetch(message.author.id);
    const role = isRPOH(member) ? 'rpoH' : 'ntz';

    const ev = {
        at: nowISO(),
        prfc_id: prfcId,
        user_id: `discord:${message.author.id}`,
        role,
        action: 'motivate',
        motivation,
        ref: ref || null,
        msg: messageLink(message.guildId, message.channelId, message.id)
    };

    const ndFile = path.join(MOTIV_DIR, `${prfcId}.ndjson`);
    await appendNDJSON(ndFile, ev);
    await maybeCommit(`motivate: ${prfcId} by ${message.author.id}`, [path.relative(DATA_DIR, ndFile)]);
    return message.react('✍️');
}

async function handleClose(message, argsLine) {
    const { args, flags } = parseArgs(argsLine);
    const [prfcId, decision] = args;
    if (!/^PRFC-\d+$/i.test(prfcId) || !['accepted', 'rejected'].includes(String(decision).toLowerCase())) {
        return message.reply('Usage: `!rfcclose PRFC-0001 accepted|rejected [--note "text"]`');
    }
    const member = await message.guild.members.fetch(message.author.id);
    if (!isEditor(member)) return message.reply('Only **editors** can close an RFC.');

    const rfcFile = path.join(RFC_DIR, `${prfcId}.json`);
    const rfc = await readJSON(rfcFile);
    if (!rfc) return message.reply(`RFC ${prfcId} not found.`);

    rfc.status = 'closed';
    rfc.decision = decision.toLowerCase();
    rfc.closed_at = nowISO();
    rfc.closure_note = flags.note || '';

    await writeJSON(rfcFile, rfc);
    await maybeCommit(`close: ${prfcId} -> ${rfc.decision}`, [path.relative(DATA_DIR, rfcFile)]);

    // compile tallies, then award badges
    await compileRFC(prfcId);
    await awardBadges(prfcId);

    return message.react(rfc.decision === 'accepted' ? '🟢' : '🔴');
}

// ---------- boot ----------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.once('clientReady', async () => {
    console.log(`[bot] logged in as ${client.user.tag}`);
    await ensureDirs();
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild || (GUILD_ID && message.guild.id !== GUILD_ID)) return;

    const content = message.content.trim();
    if (!content.startsWith('!')) return;

    const [cmd, ...rest] = content.split(/\s+/);
    const argsLine = content.slice(cmd.length).trim();
    if (cmd === '!ping') {
        console.log('[bot] ping from', message.author.tag, 'in', message.channel?.name);
        await message.react('🏓').catch(e => console.error('react err', e.code, e.message));
        await message.reply('pong').catch(e => console.error('reply err', e.code, e.message));
        return;
    }

    try {
        if (cmd === '!rfcvote') return await handleVote(message, argsLine);
        if (cmd === '!rfcmot') return await handleMotivation(message, argsLine);
        if (cmd === '!rfcclose') return await handleClose(message, argsLine);
    } catch (e) {
        console.error(e);
        return message.reply('Error processing command.');
    }
});

client.login(DISCORD_TOKEN);
