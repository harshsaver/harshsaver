#!/usr/bin/env node
/**
 * Renders github.com/harshsaver from state.json.
 *
 * The agents on the October Bus write state.json. This turns it into artwork.
 * Nothing here is hand-drawn twice — light and dark come out of the same code,
 * so the two themes can never drift apart.
 *
 *   node scripts/render.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const state = JSON.parse(readFileSync(join(root, 'state.json'), 'utf8'));

/* ── October's design tokens, lifted from OctoberLandingPage.css ─────────── */

const THEMES = {
  light: {
    bg: '#f3f0e8', surface: '#faf8f3', recessed: '#e9e4d9',
    ink: '#181511', muted: '#554e45', faint: '#746c61',
    line: '#dcd4c5', lineStrong: '#bfb5a2',
    accent: '#b8460d', accentDeep: '#923506', accentSoft: '#f0dfd1',
    green: '#367951', blue: '#315c97',
    grain: 0.045, glowColor: '#ffffff', glowAlpha: 0.55,
  },
  dark: {
    bg: '#14120f', surface: '#1c1916', recessed: '#221e1a',
    ink: '#f3f0e8', muted: '#b3a99b', faint: '#8b8175',
    line: '#332e28', lineStrong: '#4a433a',
    accent: '#e0662a', accentDeep: '#b8460d', accentSoft: '#3a2418',
    green: '#4e9e6c', blue: '#5b86c4',
    grain: 0.05, glowColor: '#e0662a', glowAlpha: 0.12,
  },
};

/* Named families first for anyone who has them; the fallbacks are what most
   viewers actually get, since camo will not load a webfont for us. */
const SERIF = "Libre Caslon Text, Georgia, 'Times New Roman', serif";
const SANS = "'IBM Plex Sans', ui-sans-serif, -apple-system, 'Segoe UI', Helvetica, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/* ── tiny SVG helpers ────────────────────────────────────────────────────── */

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const attrs = (o) => Object.entries(o)
  .filter(([, v]) => v !== undefined && v !== null && v !== '')
  .map(([k, v]) => `${k}="${typeof v === 'string' ? esc(v) : v}"`)
  .join(' ');

const text = (x, y, content, o = {}) => {
  const { font = MONO, size = 12, fill, weight, anchor, spacing, style, opacity } = o;
  return `<text ${attrs({
    x, y, 'font-family': font, 'font-size': size, fill, 'font-weight': weight,
    'text-anchor': anchor, 'letter-spacing': spacing, 'font-style': style, opacity,
  })}>${esc(content)}</text>`;
};

const rect = (x, y, w, h, o = {}) => `<rect ${attrs({ x, y, width: w, height: h, ...o })}/>`;
const line = (x1, y1, x2, y2, o = {}) => `<line ${attrs({ x1, y1, x2, y2, ...o })}/>`;
const circle = (cx, cy, r, o = {}) => `<circle ${attrs({ cx, cy, r, ...o })}/>`;
const path = (d, o = {}) => `<path ${attrs({ d, ...o })}/>`;

/** A dot that breathes. Status is a living thing, so it should look like one. */
const liveDot = (cx, cy, r, fill, delay = 0) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}">
     <animate attributeName="opacity" values="1;.3;1" dur="2.4s"
              begin="${delay}s" repeatCount="indefinite"/>
   </circle>`;

/** A message travelling an edge of the bus. */
const pulse = (d, t, delay, fill) =>
  `<circle r="3.5" fill="${fill}" opacity="0">
     <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1"
              dur="${t}s" begin="${delay}s" repeatCount="indefinite"/>
     <animateMotion dur="${t}s" begin="${delay}s" repeatCount="indefinite" path="${esc(d)}"/>
   </circle>`;

/**
 * Deliberately a no-op.
 *
 * An earlier pass staggered every group in with SMIL, which meant the whole
 * composition sat at opacity 0 until animation ran. Any renderer that skips
 * SMIL — and there are several between here and a reader's browser — got a
 * blank rectangle. Animation may only ever ADD to a README image, so entrances
 * are gone and the moving parts below (pulses, breathing dots) are additive.
 */
const arrive = () => '';

const defs = (t, id) => `
  <defs>
    <filter id="grain-${id}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${t.grain} 0"/>
    </filter>
    <radialGradient id="glow-${id}" cx="12%" cy="8%" r="55%">
      <stop offset="0%" stop-color="${t.glowColor}" stop-opacity="${t.glowAlpha}"/>
      <stop offset="100%" stop-color="${t.glowColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

const paper = (t, id, w, h) => `
  ${rect(0, 0, w, h, { fill: t.bg })}
  ${rect(0, 0, w, h, { fill: `url(#glow-${id})` })}
  ${rect(0, 0, w, h, { filter: `url(#grain-${id})`, opacity: 0.9 })}`;

/** October's roman-numeral section mark. */
const plate = (x, y, mark, label, t) => `
  ${rect(x, y - 16, 24, 24, { fill: 'none', stroke: t.lineStrong, rx: 4 })}
  ${text(x + 12, y + 1, mark, { size: 11, fill: t.muted, anchor: 'middle', spacing: '.04em' })}
  ${text(x + 36, y + 1, label, { size: 11, fill: t.muted, spacing: '.13em' })}`;

const header = (t, w, left, right) => `
  ${liveDot(44, 52, 4, t.green)}
  ${text(62, 57, left, { size: 14, fill: t.muted, spacing: '.06em' })}
  ${text(w - 40, 57, right, { size: 12, fill: t.faint, spacing: '.06em', anchor: 'end' })}
  ${line(40, 82, w - 40, 82, { stroke: t.line })}`;

const footer = (t, w, y, left, right) => `
  ${line(40, y, w - 40, y, { stroke: t.line })}
  ${text(40, y + 26, left, { size: 11, fill: t.faint, spacing: '.1em' })}
  ${text(w - 40, y + 26, right, { size: 11, fill: t.accent, spacing: '.1em', anchor: 'end' })}`;

const svg = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}">
${body}
</svg>`;

/* ── I. the operation ────────────────────────────────────────────────────── */

const agentCard = (a, x, y, t, delay) => {
  const w = 360, h = 112;
  const active = a.state === 'active';
  return `<g>
    ${rect(x, y, w, h, { fill: t.surface, stroke: t.line, rx: 10 })}
    ${rect(x, y, 3, h, { fill: active ? t.accent : t.lineStrong, rx: 1.5 })}
    ${circle(x + 26, y + 34, 6, { fill: t.accentSoft, stroke: t.accent })}
    ${text(x + 46, y + 33, a.name, { font: SANS, size: 17, weight: 600, fill: t.ink })}
    ${text(x + 46, y + 54, a.harness.toLowerCase(), { size: 12, fill: t.faint, spacing: '.05em' })}
    ${line(x + 20, y + 72, x + w - 20, y + 72, { stroke: t.line })}
    ${text(x + 20, y + 94, a.machine, { size: 12, fill: t.muted })}
    ${liveDot(x + w - 24, y + 90, 4, t.green, delay)}
    ${text(x + w - 38, y + 94, a.status, { size: 12, fill: t.green, anchor: 'end' })}
  </g>`;
};

const busNode = (t, delay) => {
  const x = 470, y = 390, w = 260, h = 92;
  const hx = x + 36, hy = y + h / 2;
  const hex = [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      return `${(hx + 13 * Math.cos(a)).toFixed(1)},${(hy + 13 * Math.sin(a)).toFixed(1)}`;
    })
    .join(' ');
  return `<g>
    ${rect(x - 6, y - 6, w + 12, h + 12, { fill: 'none', stroke: t.line, rx: 16, opacity: 0.6 })}
    ${rect(x, y, w, h, { fill: t.recessed, stroke: t.lineStrong, rx: 12 })}
    <polygon points="${hex}" fill="none" stroke="${t.accent}" stroke-width="1.5"/>
    ${circle(hx, hy, 3, { fill: t.accent })}
    ${text(x + 66, y + 42, 'october bus', { font: SANS, size: 16, weight: 600, fill: t.ink })}
    ${text(x + 66, y + 63, 'shared state · direct messages', { size: 11, fill: t.faint })}
  </g>`;
};

const traceRow = (row, y, t, delay) => {
  const map = {
    detect: { glyph: '▸', color: t.blue }, message: { glyph: '▸', color: t.accent },
    reject: { glyph: '✗', color: t.accentDeep }, verdict: { glyph: '✓', color: t.green },
    commit: { glyph: '●', color: t.muted },
  };
  const { glyph, color } = map[row.kind] ?? map.message;
  const human = row.actor === 'harsh';
  return `<g>
    ${rect(40, y - 17, 96, 24, {
      fill: human ? 'none' : t.accentSoft, stroke: human ? t.green : 'none', rx: 6,
    })}
    ${text(88, y, row.actor, {
      size: 11, fill: human ? t.green : t.accentDeep, anchor: 'middle', spacing: '.06em',
    })}
    ${text(152, y, glyph, { size: 13, fill: color })}
    ${text(176, y, row.text, { size: 14, fill: t.ink })}
    ${text(1160, y, row.sub, { size: 11, fill: t.faint, anchor: 'end' })}
  </g>`;
};

function renderHero(theme) {
  const t = THEMES[theme];
  const W = 1200, H = 980;
  const [a1, a2] = state.agents;
  const m = state.message;

  const edgeL = 'M220 282 C220 366 336 436 470 436';
  const edgeR = 'M980 282 C980 366 864 436 730 436';
  const drop = 'M600 482 L600 512';

  const body = `
  ${defs(t, `hero-${theme}`)}
  ${paper(t, `hero-${theme}`, W, H)}
  ${header(t, W, state.operation, `${state.agents.length} agents · 1 operator · live`)}
  ${plate(40, 124, 'I', 'THE OPERATION', t)}

  ${agentCard(a1, 40, 170, t, 0.15)}
  ${agentCard(a2, 800, 170, t, 0.3)}

  <g>
    ${path(edgeL, { fill: 'none', stroke: t.lineStrong, 'stroke-width': 1.25 })}
    ${path(edgeR, { fill: 'none', stroke: t.lineStrong, 'stroke-width': 1.25 })}
    ${path(drop, { fill: 'none', stroke: t.lineStrong, 'stroke-width': 1.25, 'stroke-dasharray': '3 4' })}
    ${path('M595 506 L600 514 L605 506 Z', { fill: t.lineStrong })}
  </g>
  ${pulse(edgeL, 2.6, 1.2, t.accent)}
  ${pulse(edgeR, 2.6, 2.1, t.blue)}
  ${busNode(t, 0.6)}

  <g>
    ${rect(300, 520, 600, 112, { fill: t.surface, stroke: t.line, rx: 10 })}
    ${text(324, 550, `${m.from} → ${m.to}`, { size: 11, fill: t.accent, spacing: '.1em' })}
    ${text(324, 583, m.body, { font: SERIF, size: 17, fill: t.ink })}
    ${text(324, 612, m.meta, { size: 11, fill: t.faint })}
  </g>

  ${plate(40, 686, 'II', 'THE TRACE', t)}
  ${state.trace.map((r, i) => traceRow(r, 736 + i * 44, t, 1.0 + i * 0.12)).join('\n')}

  ${footer(t, W, 930, state.footer.left, state.footer.right)}`;

  return svg(W, H, body, `${state.operation} — a live October operation maintaining this profile`);
}

/* ── II. the supervision ledger ──────────────────────────────────────────── */

function renderLedger(theme) {
  const t = THEMES[theme];
  const W = 1200, H = 440;
  const { verdicts, bitsPerVerdict, vocabulary, window } = state.ledger;
  const bits = verdicts.length * bitsPerVerdict;
  const outcomes = Math.pow(vocabulary, verdicts.length);
  const SENTENCE = 50; // bits in a sentence, per the Wega thesis
  const cells = 24;
  const filled = Math.min(cells, bits);

  /* Each square is one bit the operator actually emitted. */
  const strip = Array.from({ length: cells }, (_, i) => {
    const x = 40 + i * 26;
    const on = i < filled;
    return `${rect(x, 250, 18, 18, {
      fill: on ? t.accent : 'none', stroke: on ? t.accent : t.lineStrong, rx: 3,
      opacity: on ? 1 : 0.5,
    })}${on ? `<animate attributeName="opacity" values="0;1" begin="${(0.6 + i * 0.06).toFixed(2)}s" dur=".3s" fill="freeze"/>` : ''}`;
  }).join('');

  const body = `
  ${defs(t, `led-${theme}`)}
  ${paper(t, `led-${theme}`, W, H)}
  ${header(t, W, 'supervision.ledger', window)}
  ${plate(40, 124, 'III', 'WHAT THE OPERATOR SPENT', t)}

  <g>
    ${text(40, 196, 'The agents proposed. The operator selected.', { font: SERIF, size: 34, fill: t.ink })}
  </g>

  <g>
    ${strip}
    ${text(40, 300, `${bits} bits emitted`, { font: SANS, size: 15, weight: 600, fill: t.accent, spacing: '.02em' })}
    ${text(40, 300 + 26, `${verdicts.length} adjudications · one selection among {${verdicts.join(', ')}, defer} · log₂(${vocabulary}) = ${bitsPerVerdict} bits each`, { size: 12, fill: t.muted })}
    ${text(40, 300 + 48, `${vocabulary}^${verdicts.length} = ${outcomes} reachable outcomes · a sentence carries ~${SENTENCE} bits`, { size: 12, fill: t.faint })}
  </g>

  ${line(760, 150, 760, 372, { stroke: t.line })}
  <g>
    ${text(800, 196, 'Selection is not authoring.', { font: SERIF, size: 22, style: 'italic', fill: t.muted })}
    ${text(800, 240, 'A deliberate signal carries one or two', { size: 13, fill: t.muted })}
    ${text(800, 262, 'bits per second. A sentence carries fifty.', { size: 13, fill: t.muted })}
    ${text(800, 292, 'So the model proposes options,', { size: 13, fill: t.muted })}
    ${text(800, 314, 'and the person selects among them.', { size: 13, fill: t.muted })}
    ${text(800, 348, 'wegalabs.com — interface research', { size: 11, fill: t.accent, spacing: '.08em' })}
  </g>

  ${footer(t, W, 392, 'october is the first testbed', 'wegalabs.com')}`;

  return svg(W, H, body, `Supervision ledger — ${bits} bits emitted ${window}`);
}

/* ── III. the agent card ─────────────────────────────────────────────────── */

function renderCard(theme) {
  const t = THEMES[theme];
  const W = 1200, H = 470;
  const c = state.card, op = state.operator;

  /* Deterministic bars — a barcode, not random noise, so redeploys are stable. */
  const seedStr = op.handle;
  const bars = Array.from({ length: 120 }, (_, i) => {
    const code = seedStr.charCodeAt(i % seedStr.length);
    const w = ((code + i * 7) % 3) + 1;
    const x = 40 + i * 9;
    return rect(x, 404, w, 20, { fill: t.ink, opacity: 0.55 });
  }).join('');

  const skills = c.skills.map((s, i) => {
    const y = 232 + i * 32;
    return `<g>
      ${text(660, y, '▸', { size: 11, fill: t.accent })}
      ${text(682, y, s.name, { size: 13, fill: t.ink })}
      ${text(1160, y, s.desc, { size: 11, fill: t.faint, anchor: 'end' })}
    </g>`;
  }).join('');

  const body = `
  ${defs(t, `card-${theme}`)}
  ${paper(t, `card-${theme}`, W, H)}
  ${header(t, W, 'agent.card', c.protocol)}
  ${plate(40, 124, 'IV', 'A PEER YOU CAN CONNECT TO', t)}

  <g>
    ${text(40, 196, op.name, { font: SERIF, size: 40, fill: t.ink })}
    ${text(40, 232, `@${op.handle}`, { size: 14, fill: t.accent, spacing: '.06em' })}
    ${line(40, 254, 600, 254, { stroke: t.line })}
    ${text(40, 284, 'ROLE', { size: 10, fill: t.faint, spacing: '.14em' })}
    ${text(150, 284, `${op.role} · human peer`, { size: 13, fill: t.ink })}
    ${text(40, 312, 'HARNESS', { size: 10, fill: t.faint, spacing: '.14em' })}
    ${text(150, 312, `wetware · ${op.location}`, { size: 13, fill: t.ink })}
    ${text(40, 340, 'ORG', { size: 10, fill: t.faint, spacing: '.14em' })}
    ${text(150, 340, `${op.org} · ${op.product}`, { size: 13, fill: t.ink })}
    ${text(40, 368, 'CONNECT', { size: 10, fill: t.faint, spacing: '.14em' })}
    ${text(150, 368, c.mcp, { size: 13, fill: t.accent })}
  </g>

  ${line(630, 150, 630, 380, { stroke: t.line })}
  <g>
    ${text(660, 196, 'SKILLS', { size: 10, fill: t.faint, spacing: '.14em' })}
    ${liveDot(1156, 192, 4, t.green)}
    ${text(1140, 196, 'resolvable', { size: 10, fill: t.green, spacing: '.1em', anchor: 'end' })}
  </g>
  ${skills}

  <g>${bars}</g>
  ${text(40, 448, c.endpoint, { size: 10, fill: t.faint, spacing: '.06em' })}
  ${text(1160, 448, 'october.dev', { size: 10, fill: t.accent, spacing: '.1em', anchor: 'end' })}`;

  return svg(W, H, body, `Agent card for ${op.name} — connect via ${c.mcp}`);
}

/* ── emit ────────────────────────────────────────────────────────────────── */

const targets = [
  ['operation', renderHero],
  ['ledger', renderLedger],
  ['card', renderCard],
];

mkdirSync(join(root, 'assets'), { recursive: true });

let total = 0;
for (const [name, render] of targets) {
  for (const theme of ['light', 'dark']) {
    const out = join(root, 'assets', `${name}-${theme}.svg`);
    const content = render(theme);
    writeFileSync(out, content);
    total += content.length;
    console.log(`  assets/${name}-${theme}.svg  ${(content.length / 1024).toFixed(1)}kb`);
  }
}
console.log(`\nrendered ${targets.length * 2} files · ${(total / 1024).toFixed(1)}kb total`);
