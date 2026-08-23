#!/usr/bin/env node
/**
 * Renders the october.dev hero as a standalone SVG for the profile README.
 *
 * Every value here is lifted from the live site, not approximated:
 * Saturday/src/components/LandingPage.tsx for the copy and structure,
 * Saturday/src/components/landing/OctoberLandingPage.css for type and colour,
 * Saturday/src/components/landing/HarnessRail.tsx for the rail.
 *
 * Measured at a 1200px viewport, where the site's fluid clamps resolve to:
 *   container  min(1180px, 100% - 64px)  -> 1136px
 *   hero pad   clamp(64px, 8vw, 116px)   -> 96px top
 *   h1         clamp(3rem, 5.5vw, 5.35rem) -> 66px
 *
 *   node scripts/render.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* OctoberLandingPage.css:20-34 */
const C = {
  bg: '#f3f0e8', surface: '#faf8f3', ink: '#181511', muted: '#554e45',
  faint: '#746c61', line: '#dcd4c5', lineStrong: '#bfb5a2',
  accent: '#b8460d', accentDeep: '#923506',
};

const SERIF = "'Libre Caslon Text', Georgia, 'Times New Roman', serif";
const SANS = "'IBM Plex Sans', ui-sans-serif, -apple-system, 'Segoe UI', Helvetica, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const attrs = (o) => Object.entries(o)
  .filter(([, v]) => v !== undefined && v !== null && v !== '')
  .map(([k, v]) => `${k}="${typeof v === 'string' ? esc(v) : v}"`)
  .join(' ');

const T = (x, y, s, o = {}) => {
  const { font = SANS, size = 15, fill = C.ink, weight, anchor, spacing } = o;
  return `<text ${attrs({ x, y, 'font-family': font, 'font-size': size, fill,
    'font-weight': weight, 'text-anchor': anchor, 'letter-spacing': spacing })}>${esc(s)}</text>`;
};
const R = (x, y, w, h, o = {}) => `<rect ${attrs({ x, y, width: w, height: h, ...o })}/>`;
const L = (x1, y1, x2, y2, o = {}) => `<line ${attrs({ x1, y1, x2, y2, stroke: C.line, ...o })}/>`;

/* Rail tiles are pre-normalised 30px plates on the site; embedded as data URIs
   so the SVG stands alone with no external requests (camo blocks them anyway). */
const logos = readdirSync(join(root, 'assets/harness'))
  .filter((f) => f.endsWith('.png'))
  .sort();
const ORDER = ['claude-code', 'codex', 'cursor', 'grok', 'muse', 'opencode', 'hermes', 'pi',
  'omp', 'gemini', 'cline', 'kimi', 'qwen', 'goose', 'deepseek', 'freebuff', 'october'];
const rail = ORDER
  .map((n) => logos.find((f) => f === `${n}.png`))
  .filter(Boolean)
  .map((f) => readFileSync(join(root, 'assets/harness', f)).toString('base64'));

const W = 1200;
const X = 32;                 // (1200 - 1136) / 2
const CW = 1136;

/* ── hero ────────────────────────────────────────────────────────────────── */

let y = 96;                                    // hero top padding at this width

const plateY = y;
const head = `
  ${R(X, plateY, 27, 27, { fill: 'none', stroke: C.accent })}
  ${T(X + 13.5, plateY + 18, 'I', { font: MONO, size: 10, fill: C.accent, anchor: 'middle', weight: 600 })}
  ${T(X + 39, plateY + 18, '17 HARNESSES. ONE WORKSPACE.', { font: MONO, size: 11, fill: C.muted, spacing: '.13em' })}`;

y = plateY + 27 + 25;                          // h1 margin-top: 25px
const h1Base = y + 58;                         // 66px Caslon, baseline ~.88em
const title = `
  ${T(X, h1Base, 'Agents live on', { font: SERIF, size: 66, fill: C.ink, spacing: '-.01em' })}
  ${T(X + 428, h1Base, 'October.', { font: SERIF, size: 66, fill: C.accent, spacing: '-.01em' })}
  ${T(X, h1Base + 12 + 38, 'And work with each other.', { font: SERIF, size: 38, fill: C.ink, weight: 500, spacing: '-.025em' })}`;

y = h1Base + 12 + 38 + 24;                     // h1 margin-bottom: 24px
const lede = `
  ${T(X, y + 14, 'Run the agents you already use. Connect them across machines,', { size: 18, fill: C.muted })}
  ${T(X, y + 14 + 28, 'let them split work, and control the whole job from one canvas.', { size: 18, fill: C.muted })}`;

y = y + 14 + 28 + 34;                          // actions margin-top: 34px

/* Primary button + curl field, 52px tall, 12px gap (.ol-hero__actions) */
const btnW = 240, curlX = X + btnW + 12, curlW = 724;
const actions = `
  ${R(X, y, btnW, 52, { fill: C.accent, rx: 2 })}
  <path transform="translate(${X + 20}, ${y + 16}) scale(0.038)" fill="#fffaf3" d="M256 0c-14 33-45 61-77 58-4-32 12-65 30-85C228 -47 262 -68 256 0zM370 175c-38 22-38 76 0 98 -11 33-38 76-64 96 -21 17-42 33-70 33s-36-10-68-10-41 10-68 11c-27 1-48-18-69-35 -44-38-77-108-77-172 0-101 66-155 130-155 34 0 62 23 83 23 20 0 51-24 86-24 33 0 76 9 97 47z"/>
  ${T(X + 46, y + 31, 'DOWNLOAD FOR MACOS', { font: MONO, size: 12, fill: '#fffaf3', weight: 600, spacing: '.09em' })}

  ${R(curlX, y, curlW, 52, { fill: 'rgba(250,248,243,0.62)', stroke: C.lineStrong })}
  ${T(curlX + 21, y + 31, '$', { font: MONO, size: 12, fill: C.accent, weight: 600, anchor: 'middle' })}
  ${T(curlX + 42, y + 31, 'curl -fL "https://october.dev/api/download?platform=mac" -o "October-arm64.dmg"', { font: MONO, size: 12, fill: C.muted })}
  ${L(curlX + curlW - 76, y, curlX + curlW - 76, y + 52)}
  ${T(curlX + curlW - 38, y + 31, 'COPY', { font: MONO, size: 10, fill: C.faint, weight: 600, spacing: '.1em', anchor: 'middle' })}`;

y = y + 52 + 20;                               // rail margin-top: 20px

/* .ol-harness-rail — 240px copy column, 30px tiles, 10px gaps, hairline rules */
const railTop = y, railH = 58;
const tiles = rail.map((b64, i) => {
  const tx = X + 240 + 22 + i * 40;
  return `<image href="data:image/png;base64,${b64}" x="${tx}" y="${railTop + 14}" width="30" height="30" preserveAspectRatio="xMidYMid meet"/>`;
}).join('\n  ');
const customX = X + 240 + 22 + rail.length * 40;
const railBlock = `
  ${L(X, railTop, X + CW, railTop)}
  ${T(X, railTop + 24, 'SUPPORTED HARNESSES', { font: MONO, size: 11, fill: C.accent, weight: 600, spacing: '.08em' })}
  ${T(X, railTop + 44, `${rail.length} local harnesses, plus app agents`, { size: 11, fill: C.faint })}
  ${tiles}
  ${R(customX, railTop + 14, 92, 30, { fill: 'none', stroke: C.line })}
  ${T(customX + 46, railTop + 33, '+ APP AGENTS', { font: MONO, size: 9, fill: C.accent, anchor: 'middle' })}
  ${L(X, railTop + railH, X + CW, railTop + railH)}`;

/* .ol-hero padding-bottom: clamp(56px, 7vw, 92px) -> 84px at this width */
const H = railTop + railH + 84;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Agents live on October. And work with each other.">
  <defs>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.045 0"/>
    </filter>
    <radialGradient id="glow" cx="12%" cy="8%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${R(0, 0, W, H, { fill: C.bg })}
  ${R(0, 0, W, H, { fill: 'url(#glow)' })}
  ${R(0, 0, W, H, { filter: 'url(#grain)', opacity: 0.9 })}
  ${head}
  ${title}
  ${lede}
  ${actions}
  ${railBlock}
  ${L(0, H - 1, W, H - 1)}
</svg>
`;

writeFileSync(join(root, 'assets/hero.svg'), svg);
console.log(`assets/hero.svg  ${(svg.length / 1024).toFixed(1)}kb · ${rail.length} harness tiles`);
