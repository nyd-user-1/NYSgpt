// scripts/column-profiles.mjs (brief 55 part 2, nysgpt-1): a profile of every column of every table the query API
// reaches, from the catalog's 1,000-row samples (~/Downloads/NYSgpt-catalog-2026-11-12/samples/<db>.<table>.js).
// No Athena. Every figure is from the sample, and each file says so. Writes public/profiles/<db>.<table>.json, read
// one table at a time by lib/column-profiles.ts. Credential-like columns get no values.
// Run: node scripts/column-profiles.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SAMPLES = process.env.SAMPLES || path.join(process.env.HOME, 'Downloads/NYSgpt-catalog-2026-11-12/samples');
const OUT = path.join(ROOT, 'public/profiles');
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/library-index.json'), 'utf8'));
const CRED = /(^|_)(password|passwd|pass_?hash|password_?hash|hashed_?password|salt|totp|credentials?)($|_)|(^|_)(api|access|private|secret|signing|client|encryption)_?(key|secret)s?($|_)|(^|_)secret($|_)|(^|_)(access|refresh|session|auth|bearer|id|api|reset|verification|confirm|invite|magic|csrf|oauth)_?tokens?($|_)|^tokens?$|(^|_)otp($|_)/i;
const ID_NAME = /(^id$|_id$|^id_|uuid|guid|_key$|^key$|code$|_cd$|^cik$|^ein$|uei|duns|npi|fips|geoid|zip|_no$|_num$|number$|^ccn$|leaid|unitid|ncessch|isin|cusip|accession|adsh)/i;
const BOOL = new Set(['true', 'false', 'yes', 'no', 'y', 'n', 't', 'f']);
const DATE = /^(\d{4})-(\d{2})(-(\d{2}))?([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const r3 = (v) => (Number.isFinite(v) ? (Math.abs(v) >= 1000 ? Math.round(v * 100) / 100 : Math.round(v * 10000) / 10000) : null);
const quant = (s, q) => { const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };

function profile(name, type, vals) {
  const filled = vals.filter((v) => v !== null && v !== undefined && v !== '' && v !== 'hidden');
  const out = { name, type, filled: filled.length, empty: vals.length - filled.length };
  if (CRED.test(name)) return { ...out, kind: 'hidden', note: 'credential-like column: no values shown' };
  const distinct = new Set(filled);
  out.distinct = distinct.size;
  if (!filled.length) return { ...out, kind: 'empty' };
  const low = filled.map((v) => String(v).trim().toLowerCase());
  if (distinct.size <= 2 && low.every((v) => BOOL.has(v) || v === '0' || v === '1') && !ID_NAME.test(name)) {
    const yes = low.filter((v) => ['true', 'yes', 'y', 't', '1'].includes(v)).length;
    return { ...out, kind: 'yes/no', yes, no: filled.length - yes };
  }
  const nums = filled.map((v) => Number(String(v).replace(/,/g, '')));
  const numeric = nums.every((n) => Number.isFinite(n)) && filled.every((v) => /^-?[\d,]*\.?\d+(e[+-]?\d+)?$/i.test(String(v).trim()));
  const dates = filled.map((v) => String(v).trim().match(DATE));
  if (dates.every(Boolean)) {
    const ds = filled.map((v) => String(v).slice(0, 10)).sort();
    const y0 = +ds[0].slice(0, 4), y1 = +ds[ds.length - 1].slice(0, 4);
    const by = y1 - y0 <= 2 ? 'month' : 'year';
    const counts = {};
    for (const d of ds) { const k = by === 'month' ? d.slice(0, 7) : d.slice(0, 4); counts[k] = (counts[k] || 0) + 1; }
    return { ...out, kind: 'date', earliest: ds[0], latest: ds[ds.length - 1], by, counts };
  }
  if (numeric && !ID_NAME.test(name)) {
    const s = [...nums].sort((a, b) => a - b), n = s.length;
    const mean = s.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1));
    const min = s[0], max = s[n - 1];
    const log = min > 0 && max / min >= 1000;
    const edges = Array.from({ length: 21 }, (_, i) => (log ? Math.exp(Math.log(min) + ((Math.log(max) - Math.log(min)) * i) / 20) : min + ((max - min) * i) / 20));
    const bins = new Array(20).fill(0);
    for (const v of s) { let b = max === min ? 0 : log ? Math.floor(((Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min))) * 20) : Math.floor(((v - min) / (max - min)) * 20); bins[Math.min(19, Math.max(0, b))]++; }
    return { ...out, kind: 'number', min: r3(min), max: r3(max), mean: r3(mean), sd: r3(sd), q1: r3(quant(s, 0.25)), median: r3(quant(s, 0.5)), q3: r3(quant(s, 0.75)), histogram: { scale: log ? 'log' : 'linear', edges: edges.map(r3), counts: bins } };
  }
  const kind = ID_NAME.test(name) || (distinct.size > 0.9 * filled.length && filled.every((v) => !/\s/.test(String(v)))) ? 'identifier' : 'text';
  if (distinct.size <= 20) {
    const c = new Map(); for (const v of filled) c.set(v, (c.get(v) || 0) + 1);
    const top = [...c].sort((a, b) => b[1] - a[1]).slice(0, 10);
    return { ...out, kind, top: top.map(([value, count]) => ({ value: String(value).slice(0, 80), count })), other: filled.length - top.reduce((a, [, n]) => a + n, 0) };
  }
  const lens = filled.map((v) => String(v).length).sort((a, b) => a - b);
  return { ...out, kind, length: { min: lens[0], median: quant(lens, 0.5), max: lens[lens.length - 1] }, examples: [...distinct].slice(0, 3).map((v) => String(v).slice(0, 80)) };
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let n = 0, missing = 0, total = 0, largest = ['', 0];
for (const t of index.tables) {
  const f = path.join(SAMPLES, `${t.s}.js`);
  if (!fs.existsSync(f)) { missing++; continue; }
  let j;
  try { const txt = fs.readFileSync(f, 'utf8'); j = JSON.parse(txt.slice(txt.indexOf('=') + 1).replace(/;\s*$/, '')); } catch { missing++; continue; }
  const types = Object.fromEntries(t.f.map((x) => [index.N[x[0]], index.T[x[1]]]));
  const cols = j.c.map((c, i) => profile(c, types[c] || '', j.r.map((row) => row[i])));
  const byKind = {}; for (const c of cols) byKind[c.kind] = (byKind[c.kind] || 0) + 1;
  const doc = { table: t.s, basis: `a sample of ${j.r.length.toLocaleString('en-US')} rows (the catalog's sample, read ${j.how === 'athena' ? 'by Athena' : 'from the Parquet files'}); every figure describes the sample, not the whole table`, sampleRows: j.r.length, tableRows: t.n, columnsByKind: byKind, columns: cols };
  const s = JSON.stringify(doc);
  fs.writeFileSync(path.join(OUT, `${t.s}.json`), s);
  n++; total += s.length; if (s.length > largest[1]) largest = [t.s, s.length];
}
console.log(`profiles ${n} tables (${missing} without a sample), total ${(total / 1e6).toFixed(1)} MB, largest ${largest[0]} ${(largest[1] / 1e3).toFixed(0)} KB`);
