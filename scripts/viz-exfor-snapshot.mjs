// The EXFOR measurements snapshot (/viz/scatter3d-dataset, 2026-11-04, chart batch B): ~50,000 measured cross
// sections — incident energy × cross section × year — sampled from the EXFOR library's data tables into
// public/viz-data/exfor.json.
//
// Source: IAEA-NDS/exfor_json (https://github.com/IAEA-NDS/exfor_json), the IAEA's JSON export of the whole EXFOR
// library, commit 36b38778d9feb27d0142cd052f078ad2452c2e31 (2026-09-08). The lake's exfor_entries (Athena
// nysgpt_nsr) was exported without its data tables, so the numbers come from the export itself. The clone is
// read as data only. Reproduce:
//   git clone https://github.com/IAEA-NDS/exfor_json /tmp/exfor_json && git -C /tmp/exfor_json checkout 36b38778
//   node scripts/viz-exfor-snapshot.mjs /tmp/exfor_json
//
// A row is one data point of a subentry whose reaction is a plain cross section (SF6 = SIG, no ratio or
// expression, no particle/partial modifier), with an incident-energy column (EN) and a DATA column in barn
// units. Every such point in the library is a candidate; a seeded reservoir sample keeps SAMPLE of them, so the
// same commit gives the same file.
//
// Output — { source, commit, candidates, projectiles, entries, rows }:
//   rows  [log10 E (eV), log10 σ (b), year, Z, A, projectile index, entry index], logs to 3 decimals
//   projectiles / entries  the string tables the indexes point into; A = 0 is a natural element
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.argv[2];
if (!ROOT) throw new Error("usage: node scripts/viz-exfor-snapshot.mjs <path to an exfor_json clone>");
const COMMIT = "36b38778d9feb27d0142cd052f078ad2452c2e31";
const SAMPLE = 50000;

const EN_UNIT = { "MILLI-EV": 1e-3, EV: 1, KEV: 1e3, MEV: 1e6, GEV: 1e9 };
const SIG_UNIT = { B: 1, MB: 1e-3, "MICRO-B": 1e-6, NB: 1e-9, PB: 1e-12 };

// mulberry32: a small seeded generator, so the sample reproduces.
let seed = 20261104;
const rand = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const projectiles = [];
const projIndex = new Map();
const entries = [];
const entryIndex = new Map();
const intern = (list, map, v) => {
  let i = map.get(v);
  if (i === undefined) { i = list.length; list.push(v); map.set(v, i); }
  return i;
};

const reservoir = [];
let candidates = 0;
const r3 = (x) => Math.round(x * 1000) / 1000;

function yearOf(entry) {
  const ys = (entry.bib_record?.references ?? []).map((r) => Number(r.publication_year)).filter((y) => y > 1900 && y < 2100);
  return ys.length ? Math.min(...ys) : null;
}

function take(entry, sub, table) {
  const reaction = entry.reactions?.[sub];
  if (!reaction) return;
  const keys = Object.keys(reaction);
  if (keys.length !== 1) return; // pointers: several reactions share the table
  const r = reaction[keys[0]];
  if (r.operator || r.math_expression || (r.children ?? []).length !== 1) return;
  const c = r.children[0];
  if (c.sf6 !== "SIG" || c.sf5 || c.sf7 || c.sf8 || c.sf9) return;
  const t = /^(\d+)-([A-Z]+)-(\d+)/.exec(c.target ?? "");
  if (!t) return;
  const proj = (c.process ?? "").split(",")[0];
  if (!proj) return;
  const d = table?.data;
  if (!d?.heads || !d.data) return;
  const ie = d.heads.indexOf("EN");
  const is = d.heads.indexOf("DATA");
  if (ie < 0 || is < 0) return;
  const fe = EN_UNIT[d.units[ie]];
  const fs = SIG_UNIT[d.units[is]];
  if (!fe || !fs) return;
  const year = yearOf(entry);
  if (!year) return;
  const E = d.data[ie];
  const S = d.data[is];
  for (let k = 0; k < E.length; k++) {
    const e = E[k], s = S[k];
    if (!(typeof e === "number" && e > 0 && typeof s === "number" && s > 0)) continue;
    candidates++;
    const row = () => [r3(Math.log10(e * fe)), r3(Math.log10(s * fs)), year, Number(t[1]), Number(t[3]), intern(projectiles, projIndex, proj), intern(entries, entryIndex, entry.entry)];
    if (reservoir.length < SAMPLE) reservoir.push(row());
    else {
      const j = Math.floor(rand() * candidates);
      if (j < SAMPLE) reservoir[j] = row();
    }
  }
}

const dirs = readdirSync(join(ROOT, "json")).sort();
let files = 0;
for (const dir of dirs) {
  for (const f of readdirSync(join(ROOT, "json", dir)).sort()) {
    if (!f.endsWith(".json")) continue;
    files++;
    const entry = JSON.parse(readFileSync(join(ROOT, "json", dir, f), "utf8"));
    for (const [sub, table] of Object.entries(entry.data_tables ?? {})) take(entry, sub, table);
  }
  if (files % 5000 < 100) process.stdout.write(`\r${files} entries, ${candidates} candidate points`);
}
console.log(`\r${files} entries, ${candidates} candidate points`);

// The sample keeps only the entries it uses; reindex them.
const used = [...new Set(reservoir.map((r) => r[6]))].sort((a, b) => a - b);
const remap = new Map(used.map((old, i) => [old, i]));
const rows = reservoir.map((r) => [...r.slice(0, 6), remap.get(r[6])]).sort((a, b) => a[2] - b[2] || a[0] - b[0]);
const out = {
  source: "EXFOR via IAEA-NDS/exfor_json (github.com/IAEA-NDS/exfor_json)",
  commit: COMMIT,
  candidates,
  projectiles,
  entries: used.map((i) => entries[i]),
  rows,
};
const json = JSON.stringify(out);
writeFileSync("public/viz-data/exfor.json", json);
console.log(`exfor.json: ${rows.length} of ${candidates} points, ${out.entries.length} entries, projectiles ${projectiles.join(" ")}, ${(json.length / 1024).toFixed(0)} KB`);
