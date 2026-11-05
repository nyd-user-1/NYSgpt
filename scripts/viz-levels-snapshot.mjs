// The /viz/levels snapshot (2026-11-04): every ENSDF adopted-levels deck in the lake, reduced to each
// nuclide's levels (energy, Jπ, half-life) and the gammas between them, written once to
// public/viz-data/levels.json for the browser to fetch. Rerun by hand when ENSDF is reloaded:
//   node scripts/viz-levels-snapshot.mjs                 (queries Athena with the local AWS CLI)
//   node scripts/viz-levels-snapshot.mjs --csv=PATH      (reuses a results CSV already downloaded)
//
// Source: nysgpt_nsr.ensdf_datasets.raw (one card deck per dataset), dsid 'ADOPTED LEVELS…', minus
// the unobserved/not-observed decks; Z and N from nuclide_dict. Athena splits each deck into its
// 80-column cards and returns only the L (level) and G (gamma) records, plus G continuation records
// that carry FL= (the gamma's final level), in deck order.
//
// ENSDF card columns (1-based): NUCID 1-5, continuation 6, comment 7, record type 8.
//   L: E 10-19, Jπ 22-39, T½ 40-49.        G: E 10-19, RI 22-29.
// A G record belongs to the L record above it (the level it leaves). Its final level is FL= when
// given, else the level nearest E_i − E_γ − E_γ²/(2·A·931494) (the recoil term), within tolerance.
//
// Schema of levels.json:
//   { source, caps, nuclides: [{ z, n, el, L, G, nl, ng }] }
//   L: flat [energy keV (0.1), Jπ ("" if none), T½ ("" if none), …] — ascending energy.
//   G: flat [from level index, to level index, relative intensity (null if none), …] into L.
//   nl / ng: the nuclide's level and placed-gamma counts before the caps.

import { execFileSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createReadStream } from "node:fs";

const MAX_KEV = 10000;
const MAX_LEVELS = 150;
const MAX_GAMMAS = 40;
const AMU_KEV = 931494.1;
const OUT = "public/viz-data/levels.json";

const SQL = `
select e.nucid, d.z, d.n, t.line
from ensdf_datasets e
join nuclide_dict d on d.nuclide_code = e.nucid
cross join unnest(split(e.raw, chr(10))) with ordinality as t(line, i)
where e.dsid like 'ADOPTED LEVELS%' and e.dsid not like '%UNOBSERVED' and e.dsid not like '%NOT OBSERVED'
  and substr(t.line, 7, 1) = ' ' and substr(t.line, 8, 1) in ('L', 'G')
  and (substr(t.line, 6, 1) in (' ', '1') or (substr(t.line, 8, 1) = 'G' and strpos(t.line, 'FL=') > 0))
order by e.nucid, t.i`;

// ---------------------------------------------------------------- Athena (local AWS CLI)
const aws = (...args) => execFileSync("aws", args, { encoding: "utf8" }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function athenaCsv() {
  const id = aws("athena", "start-query-execution", "--work-group", "nysgpt-chat",
    "--query-execution-context", "Database=nysgpt_nsr", "--query-string", SQL,
    "--query", "QueryExecutionId", "--output", "text");
  for (;;) {
    const [state, why] = aws("athena", "get-query-execution", "--query-execution-id", id,
      "--query", "QueryExecution.Status.[State,StateChangeReason]", "--output", "text").split("\t");
    if (state === "SUCCEEDED") break;
    if (state === "FAILED" || state === "CANCELLED") throw new Error(`Athena ${state}: ${why}`);
    await sleep(2000);
  }
  const loc = aws("athena", "get-query-execution", "--query-execution-id", id,
    "--query", "QueryExecution.ResultConfiguration.OutputLocation", "--output", "text");
  console.log(`results: ${loc}`);
  return spawn("aws", ["s3", "cp", loc, "-"], { stdio: ["ignore", "pipe", "inherit"] }).stdout;
}

// ---------------------------------------------------------------- CSV (Athena quotes every field; no field spans lines)
function csvFields(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let s = "";
      i++;
      for (;;) {
        const q = line.indexOf('"', i);
        if (q < 0) { s += line.slice(i); i = line.length; break; }
        s += line.slice(i, q);
        if (line[q + 1] === '"') { s += '"'; i = q + 2; } else { i = q + 1; break; }
      }
      out.push(s);
      i++; // the comma
    } else {
      const c = line.indexOf(",", i);
      out.push(c < 0 ? line.slice(i) : line.slice(i, c));
      i = c < 0 ? line.length : c + 1;
    }
  }
  return out;
}

// ---------------------------------------------------------------- cards
const col = (l, a, b) => l.slice(a - 1, b).trim();
const NUM = /^\d+(\.\d*)?(E[+-]?\d+)?$/i;
const num = (s) => (NUM.test(s) ? Number(s) : null);
const r1 = (e) => Math.round(e * 10) / 10;
const sig3 = (x) => (x === 0 ? 0 : Number(x.toPrecision(3)));
const symbol = (nucid) => {
  const s = nucid.replace(/^\d+/, "");
  return s === "NN" ? "n" : s[0] + s.slice(1).toLowerCase();
};

/** One nuclide's cards → its capped levels and gammas. */
function reduce(nuc) {
  const A = Number(nuc.nucid.match(/^\d+/)[0]);
  // Levels in energy order; the deck's own order, kept for the gammas' parent links.
  const order = nuc.levels.map((l, i) => i).sort((a, b) => nuc.levels[a].e - nuc.levels[b].e);
  const rank = new Map(order.map((li, k) => [li, k]));
  const levels = order.map((i) => nuc.levels[i]);
  const energies = levels.map((l) => l.e);

  const nearest = (target, below) => {
    let best = -1, d = Infinity;
    for (let k = 0; k < energies.length && energies[k] < below; k++) {
      const dk = Math.abs(energies[k] - target);
      if (dk < d) { d = dk; best = k; }
    }
    return { k: best, d };
  };

  const placed = [];
  let unplaced = 0;
  for (const g of nuc.gammas) {
    const from = rank.get(g.parent);
    const ei = energies[from];
    let to;
    if (g.fl !== null) {
      const m = nearest(g.fl, ei);
      to = m.d <= Math.max(1, g.fl * 0.002) ? m.k : -1;
    } else {
      const target = ei - g.e - (g.e * g.e) / (2 * A * AMU_KEV);
      const m = nearest(target, ei);
      to = m.d <= Math.max(1.5, g.e * 0.004) ? m.k : -1;
    }
    if (to < 0) { unplaced++; continue; }
    placed.push({ from, to, ri: g.ri });
  }

  // Caps: levels at or under 10 MeV, the lowest 150; gammas between kept levels, at most 40 —
  // each level's strongest branch first (lowest levels first), then each level's second, and so on.
  const keep = Math.min(MAX_LEVELS, energies.filter((e) => e <= MAX_KEV).length);
  const byLevel = new Map();
  for (const g of placed) {
    if (g.from >= keep) continue;
    if (!byLevel.has(g.from)) byLevel.set(g.from, []);
    byLevel.get(g.from).push(g);
  }
  const ranked = [];
  for (const [, gs] of byLevel) {
    gs.sort((a, b) => (b.ri ?? -1) - (a.ri ?? -1));
    gs.forEach((g, k) => ranked.push({ ...g, k }));
  }
  ranked.sort((a, b) => a.k - b.k || a.from - b.from);
  const gammas = ranked.slice(0, MAX_GAMMAS).sort((a, b) => a.from - b.from || (b.ri ?? -1) - (a.ri ?? -1));

  return {
    z: nuc.z,
    n: nuc.n,
    el: symbol(nuc.nucid),
    L: levels.slice(0, keep).flatMap((l) => [r1(l.e), l.jp, l.t]),
    G: gammas.flatMap((g) => [g.from, g.to, g.ri === null ? null : sig3(g.ri)]),
    nl: levels.length,
    ng: placed.length,
    unplaced,
  };
}

// ---------------------------------------------------------------- main
const csvArg = process.argv.find((a) => a.startsWith("--csv="))?.slice(6);
const input = csvArg ? createReadStream(csvArg) : await athenaCsv();

const nuclides = [];
const stats = { cards: 0, levels: 0, skippedLevels: 0, gammas: 0, orphanGammas: 0, fl: 0 };
let cur = null;
let at = null; // column positions, read from the header row
for await (const raw of createInterface({ input, crlfDelay: Infinity })) {
  const f = csvFields(raw);
  if (!at) { at = Object.fromEntries(["nucid", "z", "n", "line"].map((k) => [k, f.indexOf(k)])); continue; }
  const [nucid, z, n, cardRaw] = [f[at.nucid], f[at.z], f[at.n], f[at.line]];
  const card = cardRaw.replace(/\r$/, "").padEnd(80);
  stats.cards++;
  if (!cur || cur.nucid !== nucid) {
    if (cur) nuclides.push(reduce(cur));
    cur = { nucid, z: Number(z), n: Number(n), levels: [], gammas: [], level: -1, gamma: null };
  }
  const type = card[7];
  const cont = card[5] !== " " && card[5] !== "1";
  if (type === "L") {
    const e = num(col(card, 10, 19));
    if (e === null) { cur.level = -1; stats.skippedLevels++; continue; } // "1234+X", "SN+…": no absolute energy
    cur.levels.push({ e, jp: col(card, 22, 39).replace(/\s+/g, " "), t: col(card, 40, 49).replace(/\s+/g, " ") });
    cur.level = cur.levels.length - 1;
    stats.levels++;
  } else if (type === "G" && !cont) {
    cur.gamma = null;
    const e = num(col(card, 10, 19));
    if (e === null || cur.level < 0) { stats.orphanGammas++; continue; }
    cur.gamma = { parent: cur.level, e, ri: num(col(card, 22, 29)), fl: null };
    cur.gammas.push(cur.gamma);
    stats.gammas++;
  } else if (type === "G" && cont && cur.gamma) {
    const m = card.match(/FL=\s*([\d.]+)/);
    if (m && NUM.test(m[1])) { cur.gamma.fl = Number(m[1]); stats.fl++; }
  }
}
if (cur) nuclides.push(reduce(cur));

// A nuclide whose every level sits on an unknown offset (+X) has nothing to place.
const dropped = nuclides.filter((x) => x.L.length === 0).length;
const kept = nuclides.filter((x) => x.L.length > 0).sort((a, b) => a.z - b.z || a.n - b.n);
const unplaced = kept.reduce((s, x) => s + x.unplaced, 0);
for (const x of kept) delete x.unplaced;

const doc = {
  source: "ENSDF adopted levels and gammas (nysgpt_nsr.ensdf_datasets), snapshot 2026-11-04",
  caps: { maxKeV: MAX_KEV, levels: MAX_LEVELS, gammas: MAX_GAMMAS },
  nuclides: kept,
};
const json = JSON.stringify(doc);
writeFileSync(OUT, json);

const keptL = kept.reduce((s, x) => s + x.L.length / 3, 0);
const keptG = kept.reduce((s, x) => s + x.G.length / 3, 0);
console.log(`${stats.cards} cards → ${kept.length} nuclides (${dropped} with no absolute level energy dropped)`);
console.log(`levels: ${stats.levels} parsed, ${stats.skippedLevels} without an absolute energy, ${keptL} kept`);
console.log(`gammas: ${stats.gammas} parsed (${stats.fl} with FL=), ${stats.orphanGammas} orphaned, ${unplaced} unplaced, ${keptG} kept`);
console.log(`${OUT}: ${(json.length / 1e6).toFixed(2)} MB`);
