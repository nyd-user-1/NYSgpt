// scripts/library-index.mjs (brief 49, nysgpt-1): the table finder's index, built from the reconciled catalog.
// Keeps only what the Data Library query API can reach: govblock_* databases, less its closed databases and
// tables (aws/data-library/query_api.py DENY_DB, DENY_TB), less anything marked internal, raw files and buckets.
// Per table: stored name, plain name, topic, about, what a row is, rows, years, and up to MAXF fields
// (name, type, description, two samples; no samples from credential-like columns).
// Writes lib/library-index.json (read by lib/find-tables.ts) and public/library-topics.json (the scope picker).
// Run: node scripts/library-index.mjs [path to catalog-reconciled.json]
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2] || path.join(process.env.HOME, 'Downloads/NYSgpt-catalog-2026-11-12/catalog-reconciled.json');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MAXF = 32, DESC = 100, SAMPLE = 40, ABOUT = 320;

// the query API's own rules (aws/data-library/query_api.py), read from the file so they stay in step
const api = fs.readFileSync(path.join(ROOT, 'aws/data-library/query_api.py'), 'utf8');
const DENY_DB = new Set([...api.match(/DENY_DB = \{([^}]*)\}/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
const DENY_TB = new RegExp(api.match(/DENY_TB = re\.compile\(r'\(\?i\)(.*)'\)/)[1].replace(/"\?\\s\*\\\.\\s\*"\?/, '\\.'), 'i');
// credential-like column names (the catalog box's own rule, tools/cat13.py)
const CRED = /(^|_)(password|passwd|pass_?hash|password_?hash|hashed_?password|salt|totp|credentials?)($|_)|(^|_)(api|access|private|secret|signing|client|encryption)_?(key|secret)s?($|_)|(^|_)secret($|_)|(^|_)(access|refresh|session|auth|bearer|id|api|reset|verification|confirm|invite|magic|csrf|oauth)_?tokens?($|_)|^tokens?$|(^|_)otp($|_)/i;
const cut = (v, n) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

const C = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const keep = C.filter((e) => (e.kind === 'table' || e.kind === 'view') && /^govblock_[a-z0-9_]+$/.test(e.database) && !DENY_DB.has(e.database) && !DENY_TB.test(`${e.database}.${e.table}`) && !e.internal);
const topics = [...new Set(keep.map((e) => e.topic))].sort((a, b) => a.localeCompare(b));
const ti = Object.fromEntries(topics.map((t, i) => [t, i]));
const tables = keep.map((e) => {
  const f = (e.fields || []).slice(0, MAXF).map((x) => {
    const s = CRED.test(x.name) ? [] : (x.samples || []).filter((v) => v !== null && v !== '' && v !== 'hidden').slice(0, 2).map((v) => cut(v, SAMPLE));
    const row = [x.name, x.type || '', cut(x.desc, DESC), ...s];
    while (row.length > 2 && row[row.length - 1] === '') row.pop();
    return row;
  });
  return { s: `${e.database}.${e.table}`, p: e.pn || e.table, t: ti[e.topic], a: cut(e.about, ABOUT), r: cut(e.row_is, 140), n: e.rows ?? null, y: e.years || '', v: e.kind === 'view' ? 1 : undefined, nf: (e.fields || []).length > MAXF ? (e.fields || []).length : undefined, f };
});
const out = { built: new Date().toISOString(), source: path.basename(SRC), topics, tables };
fs.writeFileSync(path.join(ROOT, 'lib/library-index.json'), JSON.stringify(out));
const pick = topics.map((t, i) => ({ topic: t, tables: tables.filter((x) => x.t === i).map((x) => ({ stored: x.s, plain: x.p })).sort((a, b) => a.plain.localeCompare(b.plain)) }));
fs.writeFileSync(path.join(ROOT, 'public/library-topics.json'), JSON.stringify(pick));
const mb = (f) => (fs.statSync(path.join(ROOT, f)).size / 1e6).toFixed(2);
console.log(`tables ${tables.length} of ${C.length} entries, topics ${topics.length}, closed databases ${[...DENY_DB].join(' ')}; lib/library-index.json ${mb('lib/library-index.json')} MB, public/library-topics.json ${mb('public/library-topics.json')} MB`);
