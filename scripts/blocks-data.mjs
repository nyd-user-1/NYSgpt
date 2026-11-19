// scripts/blocks-data.mjs (brief 52, nysgpt-1): the data the payload blocks carry, written once at build time.
// 1. lib/blocks-material.json: Material Design 3's baseline tokens, read from Google's published token files
//    (material-foundation/material-tokens, branch "json", pinned to one commit; Apache License 2.0). The site never
//    fetches them at run time.
// 2. public/blocks/stored.json: the stored name (database.table) of each Tables box, by its topic and plain name,
//    from the reconciled catalog, so a table or API block can name the table the query API knows.
// Run: node scripts/blocks-data.mjs [path to catalog-reconciled.json]
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REPO = 'material-foundation/material-tokens';
const SHA = '5d3f2f297f1547bb202833cdea50b5b51b400c4c'; // branch "json", read 19 Nov 2026
const FILES = ['css/palette.css', 'css/themes/light.css', 'css/themes/dark.css', 'css/typescale.css', 'css/typeface.css', 'css/shape.css', 'css/elevation.css', 'css/state.css', 'css/motion.css', 'LICENSE'];
const raw = (f) => `https://raw.githubusercontent.com/${REPO}/${SHA}/${f}`;

const text = {};
for (const f of FILES) {
  const r = await fetch(raw(f));
  if (!r.ok) throw new Error(`${f}: ${r.status}`);
  text[f] = await r.text();
}
// every custom property in a file: --md-sys-...: value;
const props = (css) => Object.fromEntries([...css.matchAll(/--(md-[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].replace(/\s+/g, ' ').trim()]));
// values that point at the reference palette or typeface (var(--md-ref-...)) are resolved to what they name
const REF = { ...props(text['css/palette.css']), ...props(text['css/typeface.css']) };
const resolve = (v) => { for (let i = 0; i < 5 && /var\(--/.test(v); i++) v = v.replace(/var\(\s*--(md-[a-z0-9-]+)\s*\)/g, (m, k) => REF[k] ?? m); return v.replace(/^rgb\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)\s*\)$/, (m, r, g, b) => '#' + [r, g, b].map((x) => (+x).toString(16).padStart(2, '0')).join('')); };
const pick = (o, prefix) => Object.fromEntries(Object.entries(o).filter(([k]) => k.startsWith(prefix) && !k.endsWith('-rgb')).map(([k, v]) => [k.slice(prefix.length), resolve(v)]));

const light = pick(props(text['css/themes/light.css']), 'md-sys-color-');
const dark = pick(props(text['css/themes/dark.css']), 'md-sys-color-');
// a role that names another role of the same theme (surface-tint-color: primary) takes its value
for (const t of [light, dark]) for (const [k, v] of Object.entries(t)) { const m = v.match(/^var\(\s*--md-sys-color-([a-z-]+)\s*\)$/); if (m && t[m[1]]) t[k] = t[m[1]]; }
const ts = pick(props(text['css/typescale.css']), 'md-sys-typescale-');
const typeface = pick(props(text['css/typeface.css']), 'md-ref-typeface-');
// the type scale as one row per role: display-large -> { font, size, lineHeight, weight, tracking }
const roles = {};
for (const [k, v] of Object.entries(ts)) {
  const m = k.match(/^(display|headline|title|body|label)-(large|medium|small)-(font|line-height|size|tracking|weight)$/);
  if (!m) continue;
  const role = `${m[1]}-${m[2]}`;
  roles[role] ||= {};
  roles[role][{ font: 'font', 'line-height': 'lineHeight', size: 'size', tracking: 'tracking', weight: 'weight' }[m[3]]] = resolve(v).replace(/^var\(\s*--md-ref-typeface-([a-z-]+)\s*\)$/, (x, k) => typeface[k] ?? x);
}
const shape = pick(props(text['css/shape.css']), 'md-sys-shape-');
const elevation = pick(props(text['css/elevation.css']), 'md-sys-elevation-');
const state = pick(props(text['css/state.css']), 'md-sys-state-');
const motion = pick(props(text['css/motion.css']), 'md-sys-motion-');
const licence = text.LICENSE.split('\n').slice(0, 3).map((l) => l.trim()).filter(Boolean).join(' ');

const material = {
  name: 'Material Design 3',
  publisher: 'Google',
  licence: { name: 'Apache License 2.0', heading: licence, url: `https://github.com/${REPO}/blob/${SHA}/LICENSE` },
  source: { repository: `https://github.com/${REPO}`, branch: 'json', commit: SHA, files: FILES.filter((f) => f.endsWith('.css')).map(raw), read: '2026-11-19' },
  units: { motionDuration: 'ms' },
  color: { light, dark },
  typeface,
  typescale: roles,
  shape,
  elevation,
  state,
  motion,
  spacing: null,
  notes: 'Spacing is not part of the published Material 3 token files, so the payload carries none.',
};
fs.writeFileSync(path.join(ROOT, 'lib/blocks-material.json'), JSON.stringify(material, null, 1));

// stored names of the Tables boxes
const SRC = process.argv[2] || path.join(process.env.HOME, 'Downloads/NYSgpt-catalog-2026-11-12/catalog-reconciled.json');
const cat = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const boxes = fs.readFileSync(path.join(ROOT, 'lib/home-tables.ts'), 'utf8');
const want = [...boxes.matchAll(/"title": "([^"]+)",\s*"group": "([^"]+)"/g)].map((m) => ({ title: m[1], group: m[2] }));
const stored = {};
for (const w of want) {
  const e = cat.find((x) => x.topic === w.group && (x.pn === w.title || x.table === w.title) && (x.kind === 'table' || x.kind === 'view'));
  if (e) stored[`${w.group}|${w.title}`] = { stored: `${e.database}.${e.table}`, rowIs: e.row_is || '', fields: (e.fields || []).map((f) => [f.name, f.type || '', f.desc || '']) };
}
fs.mkdirSync(path.join(ROOT, 'public/blocks'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'public/blocks/stored.json'), JSON.stringify(stored));
const kb = (f) => (fs.statSync(path.join(ROOT, f)).size / 1e3).toFixed(1);
console.log(`material: ${Object.keys(light).length} light and ${Object.keys(dark).length} dark colour roles, ${Object.keys(roles).length} type roles, ${Object.keys(shape).length} shape, ${Object.keys(elevation).length} elevation, ${Object.keys(state).length} state, ${Object.keys(motion).length} motion tokens; lib/blocks-material.json ${kb('lib/blocks-material.json')} KB`);
console.log(`stored names: ${Object.keys(stored).length} of ${want.length} Tables boxes; public/blocks/stored.json ${kb('public/blocks/stored.json')} KB`);
