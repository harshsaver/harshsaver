#!/usr/bin/env node
/**
 * Regenerates the PROJECTS block in README.md from state.json.
 *
 * The portfolio lives in one place. If a human edits the README list directly it
 * will be overwritten on the next run, and `get_projects` over MCP would have
 * disagreed with the page anyway — which is worse than being out of date.
 *
 *   node scripts/projects.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const README = join(root, 'README.md');
const { projects: p } = JSON.parse(readFileSync(join(root, 'state.json'), 'utf8'));

const START = '<!-- PROJECTS:START — generated from state.json. Do not hand-edit. -->';
const END = '<!-- PROJECTS:END -->';

const link = (i) => (i.url ? `[${i.name}](${i.url})` : i.name);
const row = (i) => `| **${link(i)}** | ${i.what} |`;

const section = (title, items, note) => [
  `**${title}**${note ? ` — <sub>${note}</sub>` : ''}`,
  '',
  '| | |',
  '|---|---|',
  ...items.map(row),
  '',
];

const block = [
  START,
  '<details>',
  // Counting games and benched apps inside the total AND listing them again beside
  // it double-counts. Break it out instead.
  `<summary><b>Everything built</b> — ${p.flagship.length} flagship · ${p.snacks.length} snacks · ${p.games.length} games · ${p.benched.items.length} benched</summary>`,
  '',
  ...section('Flagship', p.flagship),
  ...section('Snacks', p.snacks, 'single-purpose apps'),
  ...section('Games', p.games),
  ...section('Built but benched', p.benched.items, 'functional, never launched — not live'),
  ...section('Research', p.research),
  '**Before that** — ' + p.journey.filter((j) => j.when === 'previous').map((j) => `${j.org}: ${j.what.replace(/\.$/, '')}`).join(' · ') + '.',
  '',
  '</details>',
  END,
].join('\n');

const readme = readFileSync(README, 'utf8');
const from = readme.indexOf(START);
const to = readme.indexOf(END);

if (from === -1 || to === -1) {
  console.error('PROJECTS markers missing from README.md — refusing to guess where the block goes.');
  process.exit(1);
}

writeFileSync(README, readme.slice(0, from) + block + readme.slice(to + END.length));
console.log(`projects block updated · ${p.flagship.length + p.snacks.length + p.games.length + p.benched.items.length} entries`);
