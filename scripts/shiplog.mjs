#!/usr/bin/env node
/**
 * Rewrites the block between the SHIPLOG markers in README.md from real GitHub
 * activity. Releases first — a release is a stronger claim than a commit — then
 * pushes, capped per repo so the log shows range instead of one repo's changelog.
 *
 *   GITHUB_TOKEN=… node scripts/shiplog.mjs
 *
 * The public events feed redacts commit payloads, so push rows are hydrated from
 * the commits API using each event's head SHA. A row that cannot be hydrated is
 * dropped rather than described vaguely — this file never invents a line.
 *
 * Runs unauthenticated too, at 60 requests/hour. If GitHub says no, the existing
 * block is left exactly as it is: a stale ship log is fine, a blank one is not.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const README = join(root, 'README.md');
const USER = process.env.PROFILE_USER ?? 'harshsaver';
const ROWS = Number(process.env.SHIPLOG_ROWS ?? 6);
const CAP = Number(process.env.SHIPLOG_REPO_CAP ?? 2);

const START = '<!-- SHIPLOG:START — maintained by Apollo. Do not hand-edit. -->';
const END = '<!-- SHIPLOG:END -->';

const headers = {
  accept: 'application/vnd.github+json',
  'user-agent': `${USER}-profile-operation`,
  ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub returned ${res.status} on ${path}`);
  return res.json();
}

const NOISE = /^(merge|bump|wip|fixup|revert)\b/i;

/** Strip the conventional-commit prefix; the subject is the news, not the type. */
const subjectOf = (message) =>
  message.split('\n')[0].replace(/^(\w+)(\([^)]*\))?!?:\s*/, '').trim();

/** A candidate row, or null for event types that are not evidence of shipping. */
function candidate(e) {
  const full = e.repo?.name;
  if (!full) return null;
  const repo = full.split('/')[1];
  const day = e.created_at.slice(0, 10);

  if (e.type === 'ReleaseEvent' && e.payload?.action === 'published') {
    const tag = e.payload.release?.tag_name ?? '';
    const name = e.payload.release?.name ?? '';
    // "v1.0.42" and "October 1.0.42" are the same fact stated twice. Keep the
    // release name only when it says something the tag does not.
    const digits = (s) => s.replace(/[^\d]/g, '');
    const informative = name && digits(name) !== digits(tag) && !name.includes(tag);
    return { day, repo, weight: 2, text: informative ? `\`${tag}\` — ${name}` : `\`${tag}\` released` };
  }

  if (e.type === 'PushEvent' && e.payload?.head) {
    // Text arrives during hydration — the feed does not carry commit messages.
    return { day, repo, weight: 1, full, sha: e.payload.head };
  }

  return null;
}

/** Pick rows with a per-repo cap, then backfill past the cap only if short. */
function select(events, want) {
  const seen = new Set();
  const perRepo = new Map();
  const rows = [];

  for (const pass of [1, 2]) {
    for (const e of events) {
      if (rows.length >= want) break;
      const c = candidate(e);
      if (!c) continue;
      const key = `${c.repo}@${c.day}`;
      if (seen.has(key)) continue;
      if (pass === 1 && (perRepo.get(c.repo) ?? 0) >= CAP) continue;
      seen.add(key);
      perRepo.set(c.repo, (perRepo.get(c.repo) ?? 0) + 1);
      rows.push(c);
    }
    if (rows.length >= want) break;
  }
  return rows;
}

/** Resolve push rows to real commit subjects. Unresolvable rows are dropped. */
async function hydrate(rows) {
  const out = await Promise.all(rows.map(async (r) => {
    if (r.text) return r;
    try {
      const commit = await api(`/repos/${r.full}/commits/${r.sha}`);
      const text = subjectOf(commit.commit?.message ?? '');
      return text && !NOISE.test(text) ? { ...r, text } : null;
    } catch {
      return null; // a row we cannot verify is not a row
    }
  }));
  return out.filter(Boolean);
}

const truncate = (s, n) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

function block(rows) {
  rows.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : b.weight - a.weight));
  return [
    START,
    '### Evidence',
    '',
    '| | | |',
    '|---|---|---|',
    ...rows.slice(0, ROWS).map((r) => `| \`${r.day}\` | **${r.repo}** | ${truncate(r.text, 68)} |`),
    '',
    END,
  ].join('\n');
}

const readme = readFileSync(README, 'utf8');
const from = readme.indexOf(START);
const to = readme.indexOf(END);

if (from === -1 || to === -1) {
  console.error('SHIPLOG markers missing from README.md — refusing to guess where the block goes.');
  process.exit(1);
}

try {
  const events = await api(`/users/${USER}/events/public?per_page=100`);
  // Over-select so that dropping unhydratable rows still fills the table.
  const rows = await hydrate(select(events, ROWS * 2));
  if (!rows.length) {
    console.log('no shippable events found; leaving the existing block alone');
    process.exit(0);
  }
  writeFileSync(README, readme.slice(0, from) + block(rows) + readme.slice(to + END.length));
  console.log(`ship log updated · ${Math.min(rows.length, ROWS)} rows`);
} catch (err) {
  console.error(`ship log not updated: ${err.message}`);
  process.exit(0); // stale beats blank
}
