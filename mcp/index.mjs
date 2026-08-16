#!/usr/bin/env node
/**
 * @harshsaver/mcp — the operator, exposed as a connectable peer.
 *
 * State is fetched live from the profile repo rather than bundled, so a published
 * package never goes stale against the operation it describes.
 *
 * Nothing here sends anything on anyone's behalf. ask_harsh and request_intro
 * return a prefilled URL for a human to open and submit. An agent calling them
 * has not contacted Harsh; it has produced a link.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const USER = 'harshsaver';
// This repo's default branch is master, not main.
const BRANCH = process.env.HARSHSAVER_BRANCH ?? 'master';
const RAW = `https://raw.githubusercontent.com/${USER}/${USER}/${BRANCH}/state.json`;
const ISSUES = `https://github.com/${USER}/${USER}/issues/new`;

const UA = { 'user-agent': `${USER}-mcp` };

/** Shipped with the package so the server still answers offline or pre-push. */
const snapshot = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'state.snapshot.json'), 'utf8'),
);

let cache = null;
let cachedAt = 0;

async function getState() {
  if (cache && Date.now() - cachedAt < 300_000) return cache;
  try {
    const res = await fetch(RAW, { headers: UA });
    if (!res.ok) throw new Error(String(res.status));
    cache = await res.json();
    cache.$source = 'live';
  } catch {
    // Never fail a read because the network did. The snapshot is real data,
    // just possibly older than the operation it describes — so say which it is.
    cache = { ...snapshot, $source: 'bundled snapshot' };
  }
  cachedAt = Date.now();
  return cache;
}

const gh = async (path) => {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { ...UA, accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  return res.json();
};

const NOISE = /^(merge|bump|wip|fixup|revert)\b/i;

/**
 * The public events feed redacts commit messages, so pushes are resolved through
 * the commits API by head SHA. Anything that will not resolve is dropped — this
 * returns verified rows or none.
 */
async function getShiplog(limit) {
  const events = await gh(`/users/${USER}/events/public?per_page=100`);
  const seen = new Set();
  const picked = [];

  for (const e of events) {
    if (picked.length >= limit * 2) break;
    const full = e.repo?.name;
    if (!full) continue;
    const repo = full.split('/')[1];
    const date = e.created_at.slice(0, 10);
    if (seen.has(`${repo}@${date}`)) continue;

    if (e.type === 'ReleaseEvent' && e.payload?.action === 'published') {
      seen.add(`${repo}@${date}`);
      picked.push({ date, repo, what: `${e.payload.release?.tag_name ?? ''} released` });
    } else if (e.type === 'PushEvent' && e.payload?.head) {
      seen.add(`${repo}@${date}`);
      picked.push({ date, repo, full, sha: e.payload.head });
    }
  }

  const rows = await Promise.all(picked.map(async (r) => {
    if (r.what) return r;
    try {
      const c = await gh(`/repos/${r.full}/commits/${r.sha}`);
      const what = (c.commit?.message ?? '').split('\n')[0].replace(/^(\w+)(\([^)]*\))?!?:\s*/, '').trim();
      return what && !NOISE.test(what) ? { date: r.date, repo: r.repo, what } : null;
    } catch {
      return null;
    }
  }));

  return rows.filter(Boolean).slice(0, limit);
}

const issueUrl = (title, body) =>
  `${ISSUES}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;

const TOOLS = [
  {
    name: 'get_projects',
    description:
      'What Harsh has shipped and what is still live. Flagship products, single-purpose apps, and games, with current status.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_shiplog',
    description: 'Recent releases and commits across every public repository, newest first.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'How many rows to return (1-25).', default: 10 },
      },
    },
  },
  {
    name: 'get_ledger',
    description:
      'The supervision ledger: adjudications made and bits emitted by the operator. Each verdict is one selection among {approve, edit, reject, defer} and carries exactly log2(4) = 2 bits.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'ask_harsh',
    description:
      'Compose a public question for the operator. Returns a prefilled issue URL for a human to review and submit — this does NOT send anything and does not reach Harsh on its own.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question, in one or two sentences.' },
        context: { type: 'string', description: 'Why you are asking. Optional but read first.' },
      },
      required: ['question'],
    },
  },
  {
    name: 'request_intro',
    description:
      'Compose a scoped introduction request. Returns a prefilled issue URL for a human to review and submit — it does not send anything.',
    inputSchema: {
      type: 'object',
      properties: {
        who: { type: 'string', description: 'Who you are and who you represent.' },
        want: { type: 'string', description: 'What you are asking for, specifically.' },
        unblocks: { type: 'string', description: 'The decision this unblocks.' },
      },
      required: ['who', 'want'],
    },
  },
];

const server = new Server(
  { name: 'harshsaver', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  const json = (v) => ({ content: [{ type: 'text', text: JSON.stringify(v, null, 2) }] });

  try {
    switch (name) {
      case 'get_projects': {
        const s = await getState();
        return json({ operator: s.operator, projects: s.projects ?? [] });
      }

      case 'get_shiplog': {
        const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 25);
        return json({ shiplog: await getShiplog(limit) });
      }

      case 'get_ledger': {
        const { ledger } = await getState();
        const bits = ledger.verdicts.length * ledger.bitsPerVerdict;
        return json({
          window: ledger.window,
          adjudications: ledger.verdicts.length,
          verdicts: ledger.verdicts,
          bitsEmitted: bits,
          reachableOutcomes: Math.pow(ledger.vocabulary, ledger.verdicts.length),
          note: ledger.note,
        });
      }

      case 'ask_harsh': {
        const body = `${args.question}\n\n${args.context ? `Context: ${args.context}\n\n` : ''}---\nOpened via @harshsaver/mcp. Answered publicly, asynchronously.`;
        return json({
          sent: false,
          action: 'A human must open this URL and submit it. Nothing has been sent.',
          url: issueUrl(`ask: ${String(args.question).slice(0, 60)}`, body),
        });
      }

      case 'request_intro': {
        const body = `**Who:** ${args.who}\n**Want:** ${args.want}\n**Unblocks:** ${args.unblocks ?? '—'}\n\n---\nOpened via @harshsaver/mcp.`;
        return json({
          sent: false,
          action: 'A human must open this URL and submit it. Nothing has been sent.',
          url: issueUrl(`intro: ${String(args.who).slice(0, 60)}`, body),
        });
      }

      default:
        throw new Error(`unknown tool: ${name}`);
    }
  } catch (err) {
    return { content: [{ type: 'text', text: `error: ${err.message}` }], isError: true };
  }
});

await server.connect(new StdioServerTransport());
