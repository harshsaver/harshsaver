#!/usr/bin/env node
/**
 * Renders github.com/harshsaver from state.json.
 *
 * The look is copied from October Desktop itself, not the marketing site:
 * values come from src/renderer/src/styles.css, TerminalNode.tsx, CanvasView.tsx
 * and TopNav.tsx. Dark is the app's default, so dark is the default here.
 *
 * Animation may only ever ADD motion to something already visible. An earlier
 * pass gated whole groups behind SMIL and any renderer that skipped it got a
 * blank rectangle.
 *
 *   node scripts/render.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const state = JSON.parse(readFileSync(join(root, 'state.json'), 'utf8'));

/* ── tokens, verbatim from october-desktop/src/renderer/src/styles.css ────── */

const THEMES = {
  dark: {
    canvas: '#0a0a0a', dots: '#333333',
    panel: '#181818', panel2: '#222222', border: '#2d2d2d',
    text: '#ececec', muted: '#9a9a9a',
    accent: '#4e8cff', accentBg: 'rgba(78,140,255,0.12)', accentBorder: 'rgba(78,140,255,0.4)',
    glass: 'rgba(24,24,24,0.71)', glassStrong: 'rgba(24,24,24,0.78)',
    hover: 'rgba(255,255,255,0.06)',
  },
  light: {
    canvas: '#ecedf0', dots: '#cfd2d8',
    panel: '#ffffff', panel2: '#efefef', border: '#dedede',
    text: '#1a1a1a', muted: '#6e6e6e',
    accent: '#2b6cf6', accentBg: 'rgba(43,108,246,0.10)', accentBorder: 'rgba(43,108,246,0.35)',
    glass: 'rgba(255,255,255,0.85)', glassStrong: 'rgba(255,255,255,0.92)',
    hover: 'rgba(0,0,0,0.05)',
  },
};

/* Theme-independent in the app: status colors, edges, handles, terminal body. */
const OK = '#22c55e';
const WARN = '#f59e0b';
const EDGE = '#3b82f6';
const HANDLE_RING = '#15803d';

/**
 * The terminal surface stays dark in both themes, exactly as it does in the app.
 * Light mode needs more opacity or the canvas bleeds through and washes it to
 * mid-grey. Anything drawn ON this surface must use TERM_* colours below —
 * theme text colours are chosen against the theme background, not this one, and
 * go invisible here.
 */
const TERM_BG = { dark: 'rgba(13,13,13,0.73)', light: 'rgba(13,13,13,0.92)' };
const TERM_TEXT = '#e5e7eb';
const TERM_MUTED = '#9a9a9a';
const TERM_ACCENT = '#60a5fa';
const ANSI = {
  fg: '#e5e7eb', dim: '#6b7280', green: '#4ade80', blue: '#60a5fa',
  yellow: '#fbbf24', red: '#fca5a5', magenta: '#c084fc',
};

/* HarnessLogo.tsx:73-107 */
const HARNESS = { 'claude code': '#D97757', codex: '#10A37F', october: '#A855F7' };
const harnessColor = (name) => HARNESS[name.toLowerCase()] ?? '#9CA3AF';

/* styles.css:131-141 — no webfont is bundled, so this is the real stack. */
const UI = "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'SF Mono', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace";

/* ── svg helpers ─────────────────────────────────────────────────────────── */

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const attrs = (o) => Object.entries(o)
  .filter(([, v]) => v !== undefined && v !== null && v !== '')
  .map(([k, v]) => `${k}="${typeof v === 'string' ? esc(v) : v}"`)
  .join(' ');

const text = (x, y, s, o = {}) => {
  const { font = UI, size = 12, fill, weight, anchor, spacing, opacity } = o;
  return `<text ${attrs({
    x, y, 'font-family': font, 'font-size': size, fill, 'font-weight': weight,
    'text-anchor': anchor, 'letter-spacing': spacing, opacity,
  })}>${esc(s)}</text>`;
};

const rect = (x, y, w, h, o = {}) => `<rect ${attrs({ x, y, width: w, height: h, ...o })}/>`;
const circle = (cx, cy, r, o = {}) => `<circle ${attrs({ cx, cy, r, ...o })}/>`;
const path = (d, o = {}) => `<path ${attrs({ d, ...o })}/>`;
const line = (x1, y1, x2, y2, o = {}) => `<line ${attrs({ x1, y1, x2, y2, ...o })}/>`;

/**
 * React Flow's `smoothstep` — orthogonal with rounded corners, exiting the
 * source downward and entering the target from above. Not a bezier; the app
 * switched away from those (CanvasView.tsx:767).
 */
function smoothstep(x1, y1, x2, y2, r = 12) {
  if (Math.abs(x2 - x1) < 1) return `M${x1} ${y1} L${x2} ${y2}`;
  const my = (y1 + y2) / 2;
  const dir = x2 > x1 ? 1 : -1;
  return [
    `M${x1} ${y1}`,
    `L${x1} ${my - r}`,
    `Q${x1} ${my} ${x1 + dir * r} ${my}`,
    `L${x2 - dir * r} ${my}`,
    `Q${x2} ${my} ${x2} ${my + r}`,
    `L${x2} ${y2}`,
  ].join(' ');
}

/** Both ends carry a closed arrowhead — October's connections are two-way. */
const markers = (id) => `
  <marker id="ar-${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" fill="${EDGE}"/>
  </marker>`;

/** 18px connection handle, styles.css:559-580 + TerminalNode.tsx:1236 */
const handle = (cx, cy) => `
  ${circle(cx, cy, 9, { fill: OK, stroke: HANDLE_RING, 'stroke-width': 3 })}`;

/** Ambient bus dot: 2.6s along the edge, opacity 0 → .9 → 0 (styles.css:864-880) */
const flowDot = (d, dur, delay, fill, r) => `
  <circle r="${r}" fill="${fill}" opacity="0">
    <animate attributeName="opacity" values="0;.9;.9;0" keyTimes="0;.15;.8;1"
             dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
    <animateMotion dur="${dur}s" begin="${delay}s" repeatCount="indefinite" path="${esc(d)}"/>
  </circle>`;

const liveDot = (cx, cy, r, fill, delay = 0) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}">
    <animate attributeName="opacity" values="1;.35;1" dur="2.4s" begin="${delay}s" repeatCount="indefinite"/>
  </circle>`;

/** 20px dot grid, radius 1 — CanvasView.tsx:1612-1617 */
const canvas = (t, id, w, h) => `
  <defs>
    <pattern id="dots-${id}" width="20" height="20" patternUnits="userSpaceOnUse">
      ${circle(1, 1, 1, { fill: t.dots })}
    </pattern>
    ${markers(id)}
  </defs>
  ${rect(0, 0, w, h, { fill: t.canvas })}
  ${rect(0, 0, w, h, { fill: `url(#dots-${id})` })}`;

const svg = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}">
${body}
</svg>`;

/* ── chrome ──────────────────────────────────────────────────────────────── */

/** TopNav.tsx:254-506 — floats over the canvas, 86px left inset for traffic lights. */
const topBar = (t, w, project, right) => `
  ${rect(0, 0, w, 40, { fill: t.glass })}
  ${line(0, 40, w, 40, { stroke: t.border })}
  ${circle(16, 20, 6, { fill: '#ff5f57' })}
  ${circle(36, 20, 6, { fill: '#febc2e' })}
  ${circle(56, 20, 6, { fill: '#28c840' })}
  ${rect(86, 12, 16, 16, { fill: '#A855F7', rx: 3 })}
  ${text(110, 25, 'October', { size: 14, weight: 500, fill: t.text, spacing: '.02em' })}
  ${line(176, 10, 176, 30, { stroke: t.border })}
  ${text(190, 25, project, { size: 12, weight: 500, fill: t.text })}
  ${rect(w - 268, 11, 92, 18, { fill: t.accentBg, stroke: t.accentBorder, rx: 9 })}
  ${liveDot(w - 256, 20, 3, t.accent)}
  ${text(w - 246, 24, '2 agents', { size: 10, fill: t.accent })}
  ${rect(w - 168, 11, 100, 18, { fill: 'rgba(245,158,11,0.14)', stroke: 'rgba(245,158,11,0.4)', rx: 9 })}
  ${text(w - 156, 24, right, { size: 10, fill: WARN })}`;

/** Dock.tsx:776-793 — glass pill, 18px radius, icon tiles only. */
const dock = (t, cx, y, tiles) => {
  const slot = 42;
  const w = tiles.length * slot + 14;
  const x = cx - w / 2;
  return `
  ${rect(x, y, w, slot + 8, { fill: t.glass, stroke: t.border, rx: 18 })}
  ${tiles.map((c, i) => {
    const tx = x + 7 + i * slot;
    return `${rect(tx, y + 6, slot - 8, slot - 8, { fill: c, rx: 9, opacity: 0.9 })}`;
  }).join('')}`;
};

/* ── nodes ───────────────────────────────────────────────────────────────── */

/**
 * TerminalNode.tsx:1390-1700 — 12px radius, 2px border, 44px glass header,
 * body rgba(13,13,13,0.73). The header reads: status dot, harness logo, agent
 * name at 15px/600, then "· <harness>" at 10px in the harness brand colour.
 */
function terminalNode({ t, tk, x, y, w, h, name, harness, model, status, lines }) {
  const hc = harnessColor(harness);
  const dotColor = status === 'exited' ? '#6b7280' : status === 'blocked' ? WARN : OK;
  const nameW = name.length * 8.4;

  return `<g>
    ${rect(x, y, w, h, { fill: TERM_BG[tk], stroke: t.border, 'stroke-width': 2, rx: 12 })}
    ${rect(x + 1, y + 1, w - 2, 43, { fill: t.glass, rx: 11 })}
    ${rect(x + 1, y + 22, w - 2, 22, { fill: t.glass })}
    ${line(x + 1, y + 44, x + w - 1, y + 44, { stroke: t.border })}

    ${liveDot(x + 16, y + 22, 4, dotColor)}
    ${rect(x + 27, y + 13, 18, 18, { fill: hc, rx: 4, opacity: 0.92 })}
    ${text(x + 36, y + 26, harness[0].toUpperCase(), { size: 11, weight: 700, fill: '#0a0a0a', anchor: 'middle' })}
    ${text(x + 53, y + 27, name, { size: 15, weight: 600, fill: t.text, spacing: '-.01em' })}
    ${text(x + 57 + nameW, y + 27, `· ${harness}`, { size: 10, weight: 500, fill: hc })}
    ${text(x + w - 16, y + 27, model, { size: 10, weight: 500, fill: t.muted, anchor: 'end' })}

    ${lines.map((l, i) => text(x + 16, y + 72 + i * 20, l.s, {
      font: MONO, size: 12, fill: ANSI[l.c] ?? ANSI.fg,
    })).join('\n    ')}
  </g>`;
}

/* ── I. the operation ────────────────────────────────────────────────────── */

function renderOperation(theme) {
  const t = THEMES[theme];
  const W = 1200, H = 604;
  const [a1, a2] = state.agents;

  const nw = 486, nh = 202;
  const ax = 60, bx = W - 60 - nw, ny = 78;
  const aOut = [ax + nw / 2, ny + nh];
  const bOut = [bx + nw / 2, ny + nh];

  const busX = 460, busY = 396, busW = 280, busH = 96;
  const busInL = [busX + 70, busY];
  const busInR = [busX + busW - 70, busY];

  const eL = smoothstep(aOut[0], aOut[1], busInL[0], busInL[1]);
  const eR = smoothstep(bOut[0], bOut[1], busInR[0], busInR[1]);

  const body = `
  ${canvas(t, `op-${theme}`, W, H)}

  ${path(eL, { fill: 'none', stroke: EDGE, 'stroke-width': 3, 'marker-start': `url(#ar-op-${theme})`, 'marker-end': `url(#ar-op-${theme})` })}
  ${path(eR, { fill: 'none', stroke: EDGE, 'stroke-width': 3, 'marker-start': `url(#ar-op-${theme})`, 'marker-end': `url(#ar-op-${theme})` })}
  ${flowDot(eL, 2.6, 0, EDGE, 3)}
  ${flowDot(eR, 1.6, 1.1, WARN, 3.5)}

  ${terminalNode({
    t, tk: theme, x: ax, y: ny, w: nw, h: nh,
    name: a1.name, harness: a1.harness, model: 'opus-5', status: 'running',
    lines: [
      { s: '$ october watch --repos', c: 'dim' },
      { s: '▸ release detected   filenav@1.4.0', c: 'green' },
      { s: '▸ drafted entry from 4 commits', c: 'green' },
      { s: '→ delegate atlas  "verify every number"', c: 'blue' },
      { s: '  blocked on: atlas', c: 'dim' },
    ],
  })}

  ${terminalNode({
    t, tk: theme, x: bx, y: ny, w: nw, h: nh,
    name: a2.name, harness: a2.harness, model: 'gpt-5', status: 'blocked',
    lines: [
      { s: '$ october review --task 412', c: 'dim' },
      { s: '✗ reject  "2.1k installs" unverified', c: 'red' },
      { s: '  no source in repo or API', c: 'dim' },
      { s: '▲ escalate operator', c: 'yellow' },
      { s: '  verdict: edit · 2 bits', c: 'magenta' },
    ],
  })}

  ${handle(aOut[0], aOut[1])}
  ${handle(bOut[0], bOut[1])}
  ${handle(busInL[0], busInL[1])}
  ${handle(busInR[0], busInR[1])}

  <g>
    ${rect(busX, busY, busW, busH, { fill: TERM_BG[theme], stroke: t.accent, 'stroke-width': 2, rx: 12 })}
    ${rect(busX + 1, busY + 1, busW - 2, 43, { fill: t.glassStrong, rx: 11 })}
    ${rect(busX + 1, busY + 22, busW - 2, 22, { fill: t.glassStrong })}
    ${line(busX + 1, busY + 44, busX + busW - 1, busY + 44, { stroke: t.border })}
    ${liveDot(busX + 16, busY + 22, 4, t.accent)}
    ${text(busX + 30, busY + 27, 'october bus', { size: 15, weight: 600, fill: t.text, spacing: '-.01em' })}
    ${text(busX + 16, busY + 72, 'shared state · direct messages', { font: MONO, size: 11, fill: TERM_MUTED })}
  </g>

  ${topBar(t, W, state.operation, '1 needs you')}
  ${dock(t, W / 2, H - 56, ['#D97757', '#10A37F', '#A855F7', '#3b82f6', '#f59e0b'])}`;

  return svg(W, H, body, 'operation.profile — two agents on the October Bus');
}

/* ── II. the ledger ──────────────────────────────────────────────────────── */

function renderLedger(theme) {
  const t = THEMES[theme];
  const W = 1200, H = 300;
  const { verdicts, bitsPerVerdict, vocabulary } = state.ledger;
  const bits = verdicts.length * bitsPerVerdict;
  const outcomes = Math.pow(vocabulary, verdicts.length);

  const cells = 24;
  const strip = Array.from({ length: cells }, (_, i) => {
    const on = i < bits;
    return rect(48 + i * 22, 176, 14, 14, {
      fill: on ? t.accent : 'none', stroke: on ? t.accent : t.border, rx: 3,
      opacity: on ? 1 : 0.6,
    });
  }).join('');

  const body = `
  ${canvas(t, `led-${theme}`, W, H)}
  <g>
    ${rect(24, 24, W - 48, H - 48, { fill: t.glass, stroke: t.border, 'stroke-width': 2, rx: 18 })}
    ${liveDot(48, 62, 4, OK)}
    ${text(62, 67, 'supervision.ledger', { font: MONO, size: 12, fill: t.muted })}
    ${text(W - 48, 67, state.ledger.window, { font: MONO, size: 11, fill: t.muted, anchor: 'end' })}
    ${line(24, 88, W - 24, 88, { stroke: t.border })}

    ${text(48, 136, 'The agents proposed. The operator selected.', { size: 26, weight: 600, fill: t.text, spacing: '-.015em' })}

    ${strip}
    ${text(48 + cells * 22 + 14, 188, `${bits} bits`, { size: 15, weight: 600, fill: t.accent })}

    ${text(48, 228, `${verdicts.length} adjudications · one selection among {approve, edit, reject, defer} · log₂(${vocabulary}) = ${bitsPerVerdict} bits each`, { font: MONO, size: 11, fill: t.muted })}
    ${text(48, 250, `${vocabulary}^${verdicts.length} = ${outcomes} reachable outcomes · a sentence carries ~50 bits · wegalabs.com`, { font: MONO, size: 11, fill: t.muted, opacity: 0.75 })}
  </g>`;

  return svg(W, H, body, `Supervision ledger — ${bits} bits emitted`);
}

/* ── III. the agent card ─────────────────────────────────────────────────── */

function renderCard(theme) {
  const t = THEMES[theme];
  const W = 1200, H = 340;
  const c = state.card, op = state.operator;
  const x = 24, y = 24, w = W - 48, h = H - 48;

  const skills = c.skills.map((s, i) => {
    const yy = y + 116 + i * 30;
    return `${text(x + 24, yy, s.name, { font: MONO, size: 12, fill: TERM_TEXT })}
      ${text(x + 210, yy, s.desc, { font: MONO, size: 11, fill: TERM_MUTED })}`;
  }).join('\n    ');

  const body = `
  ${canvas(t, `card-${theme}`, W, H)}
  <g>
    ${rect(x, y, w, h, { fill: TERM_BG[theme], stroke: t.border, 'stroke-width': 2, rx: 12 })}
    ${rect(x + 1, y + 1, w - 2, 43, { fill: t.glass, rx: 11 })}
    ${rect(x + 1, y + 22, w - 2, 22, { fill: t.glass })}
    ${line(x + 1, y + 44, x + w - 1, y + 44, { stroke: t.border })}

    ${liveDot(x + 16, y + 22, 4, OK)}
    ${rect(x + 27, y + 13, 18, 18, { fill: '#A855F7', rx: 4 })}
    ${text(x + 36, y + 26, 'H', { size: 11, weight: 700, fill: '#0a0a0a', anchor: 'middle' })}
    ${text(x + 53, y + 27, op.name, { size: 15, weight: 600, fill: t.text, spacing: '-.01em' })}
    ${text(x + 232, y + 27, `· ${op.role} · human peer`, { size: 10, weight: 500, fill: '#A855F7' })}
    ${text(x + w - 16, y + 27, c.protocol, { size: 10, weight: 500, fill: t.muted, anchor: 'end' })}

    ${text(x + 24, y + 84, '$ ' + c.mcp, { font: MONO, size: 13, fill: ANSI.green })}
    ${skills}

    ${line(x + 1, y + h - 44, x + w - 1, y + h - 44, { stroke: t.border })}
    ${text(x + 24, y + h - 18, c.endpoint, { font: MONO, size: 10, fill: TERM_MUTED })}
    ${text(x + w - 24, y + h - 18, 'october.dev', { font: MONO, size: 10, fill: TERM_ACCENT, anchor: 'end' })}
  </g>`;

  return svg(W, H, body, `Agent card — ${op.name}`);
}

/* ── emit ────────────────────────────────────────────────────────────────── */

const targets = [['operation', renderOperation], ['ledger', renderLedger], ['card', renderCard]];
mkdirSync(join(root, 'assets'), { recursive: true });

let total = 0;
for (const [name, render] of targets) {
  for (const theme of ['dark', 'light']) {
    const out = join(root, 'assets', `${name}-${theme}.svg`);
    const content = render(theme);
    writeFileSync(out, content);
    total += content.length;
    console.log(`  assets/${name}-${theme}.svg  ${(content.length / 1024).toFixed(1)}kb`);
  }
}
console.log(`\nrendered ${targets.length * 2} files · ${(total / 1024).toFixed(1)}kb`);
