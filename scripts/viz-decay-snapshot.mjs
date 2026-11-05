// The decay simulation's snapshot (/viz/decay, 2026-11-04): every ENSDF Adopted Levels deck's ground state —
// its half-life and decay branchings — read once from the lake (Athena, nysgpt_nsr.ensdf_datasets) and written
// to public/viz-data/decay.json. Rerun by hand; it uses the local AWS CLI's credentials:
//   node scripts/viz-decay-snapshot.mjs
//
// ENSDF is fixed-width (the ENSDF manual's columns; parser reference: /Code/nsr/api/_lib/ensdf.ts):
//   col 1–5 NUCID · col 6 continuation (blank = primary record) · col 7 comment flag · col 8 record type.
//   L record: E 10–19, J 22–39, T½ 40–49. The first primary L record is the ground state; its continuation
//   records carry "$"-separated quantities, the decay branchings among them: %B-=100, %A=96.898 3, %SF=3.102 3.
//
// Output — { source, modes, nuclides }:
//   modes:    code → { label, dz, dn }: the daughter is (Z + dz, N + dn); dz/dn null for fission (no single daughter).
//   nuclides: { z, n, el, t, lim?, exp?, m }
//     t   half-life in seconds; null = stable; -1 = not given in the deck.
//     lim ">" / "<" / "~" when t is a limit or an approximation.
//     exp 1 when the nuclide is expected but not observed: no half-life in the deck, and the deck marks its ground
//         level uncertain ("?" in col 80) or lists every decay mode as "=?" (²⁴³U–²⁵⁵U, for one run). Absent otherwise.
//     m   [[mode, branching %], …], largest first; branching null where the deck lists the mode without a value.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const ELEMENTS = ["Nn","H","He","Li","Be","B","C","N","O","F","Ne","Na","Mg","Al","Si","P","S","Cl","Ar","K","Ca","Sc","Ti","V","Cr","Mn","Fe","Co","Ni","Cu","Zn","Ga","Ge","As","Se","Br","Kr","Rb","Sr","Y","Zr","Nb","Mo","Tc","Ru","Rh","Pd","Ag","Cd","In","Sn","Sb","Te","I","Xe","Cs","Ba","La","Ce","Pr","Nd","Pm","Sm","Eu","Gd","Tb","Dy","Ho","Er","Tm","Yb","Lu","Hf","Ta","W","Re","Os","Ir","Pt","Au","Hg","Tl","Pb","Bi","Po","At","Rn","Fr","Ra","Ac","Th","Pa","U","Np","Pu","Am","Cm","Bk","Cf","Es","Fm","Md","No","Lr","Rf","Db","Sg","Bh","Hs","Mt","Ds","Rg","Cn","Nh","Fl","Mc","Lv","Ts","Og"];
const zOf = (sym) => ELEMENTS.findIndex((e) => e.toUpperCase() === sym.toUpperCase());

// ── Athena ────────────────────────────────────────────────────────────────────────────────────────
const aws = (...args) => execFileSync("aws", [...args, "--region", "us-east-1", "--output", "json"], { encoding: "utf8", maxBuffer: 1 << 30 });

// The ground state's cards only: the deck's non-comment L records, first sixteen (the ground state and its
// continuations come first) — a few MB instead of the decks' 100 MB.
const SQL = `SELECT nucid, array_join(slice(filter(split(raw, chr(10)), l -> length(l) >= 8 AND substr(l, 8, 1) = 'L' AND substr(l, 7, 1) = ' '), 1, 16), chr(31)) AS cards
FROM ensdf_datasets WHERE dsid LIKE 'ADOPTED LEVELS%'`;

const qid = JSON.parse(aws("athena", "start-query-execution", "--work-group", "nysgpt-chat", "--query-execution-context", "Database=nysgpt_nsr", "--query-string", SQL)).QueryExecutionId;
let exec;
for (;;) {
  exec = JSON.parse(aws("athena", "get-query-execution", "--query-execution-id", qid)).QueryExecution;
  const s = exec.Status.State;
  if (s === "SUCCEEDED") break;
  if (s === "FAILED" || s === "CANCELLED") throw new Error(`Athena ${s}: ${exec.Status.StateChangeReason}`);
  await new Promise((r) => setTimeout(r, 1000));
}
const csv = execFileSync("aws", ["s3", "cp", exec.ResultConfiguration.OutputLocation, "-"], { encoding: "utf8", maxBuffer: 1 << 30 });

/** Athena's CSV: every field quoted, quotes doubled. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const rows = parseCsv(csv).slice(1);
console.log(`${rows.length} adopted decks`);

// ── half-life ───────────────────────────────────────────────────────────────────────────────────
const YEAR = 365.2422 * 86400;
const UNIT = { YS: 1e-24, ZS: 1e-21, AS: 1e-18, FS: 1e-15, PS: 1e-12, NS: 1e-9, US: 1e-6, MS: 1e-3, S: 1, M: 60, H: 3600, D: 86400, Y: YEAR };
/** ħ·ln2 in eV·s: a width Γ (eV) is a half-life of HBAR_LN2 / Γ seconds. */
const HBAR_LN2 = 6.582119569e-16 * Math.LN2;
const WIDTH = { EV: 1, KEV: 1e3, MEV: 1e6 };
const sig = (x) => Number(x.toPrecision(4));

/** The T field → { t, lim }: seconds, null for stable, -1 when absent or unreadable. */
function halfLife(field) {
  const s = field.toUpperCase().trim();
  if (s.includes("STABLE")) return { t: null };
  const m = /(>=|<=|>|<|~|AP|GT|LT|GE|LE)?\s*([0-9]*\.?[0-9]+(?:E[+-]?\d+)?)\s*(MEV|KEV|EV|YS|ZS|AS|FS|PS|NS|US|MS|S|M|H|D|Y)\b/.exec(s);
  if (!m) return { t: -1 };
  const v = Number(m[2]);
  const t = m[3] in WIDTH ? HBAR_LN2 / (v * WIDTH[m[3]]) : v * UNIT[m[3]];
  const op = m[1] ?? "";
  const lim = /^(>|GT|>=|GE)$/.test(op) ? ">" : /^(<|LT|<=|LE)$/.test(op) ? "<" : /^(~|AP)$/.test(op) ? "~" : undefined;
  return { t: sig(t), lim };
}

// ── decay modes ─────────────────────────────────────────────────────────────────────────────────
// β+ and EC reach the same daughter, so the simulation keeps them as one mode, "EC" (β+/EC), as the NNDC chart does.
const MODES = {
  "B-": { label: "β−", dz: 1, dn: -1 },
  "2B-": { label: "2β−", dz: 2, dn: -2 },
  EC: { label: "β+/EC", dz: -1, dn: 1 },
  "2EC": { label: "2β+/2EC", dz: -2, dn: 2 },
  A: { label: "α", dz: -2, dn: -2 },
  SF: { label: "SF", dz: null, dn: null },
  P: { label: "p", dz: -1, dn: 0 },
  "2P": { label: "2p", dz: -2, dn: 0 },
  "3P": { label: "3p", dz: -3, dn: 0 },
  N: { label: "n", dz: 0, dn: -1 },
  "2N": { label: "2n", dz: 0, dn: -2 },
  "3N": { label: "3n", dz: 0, dn: -3 },
  "4N": { label: "4n", dz: 0, dn: -4 },
  "B-N": { label: "β−n", dz: 1, dn: -2 },
  "B-2N": { label: "β−2n", dz: 1, dn: -3 },
  "B-3N": { label: "β−3n", dz: 1, dn: -4 },
  "B-4N": { label: "β−4n", dz: 1, dn: -5 },
  "B-5N": { label: "β−5n", dz: 1, dn: -6 },
  "B-6N": { label: "β−6n", dz: 1, dn: -7 },
  "B-7N": { label: "β−7n", dz: 1, dn: -8 },
  "B-P": { label: "β−p", dz: 0, dn: -1 },
  "B-A": { label: "β−α", dz: -1, dn: -3 },
  "B-D": { label: "β−d", dz: 0, dn: -2 },
  "B-T": { label: "β−t", dz: 0, dn: -3 },
  "B-SF": { label: "β−SF", dz: null, dn: null },
  ECP: { label: "β+p", dz: -2, dn: 1 },
  EC2P: { label: "β+2p", dz: -3, dn: 1 },
  EC3P: { label: "β+3p", dz: -4, dn: 1 },
  ECA: { label: "β+α", dz: -3, dn: -1 },
  ECSF: { label: "β+SF", dz: null, dn: null },
};
/** ENSDF's spellings → the codes above. */
const ALIAS = {
  "B-": "B-", "2B-": "2B-",
  EC: "EC", "B+": "EC", "EC+B+": "EC", "B+EC": "EC", "EC+%B+": "EC",
  "2EC": "2EC", "2B+": "2EC", "ECB+": "2EC", "2EC+2B+": "2EC",
  A: "A", SF: "SF", P: "P", "2P": "2P", "3P": "3P", N: "N", "2N": "2N", "3N": "3N", "4N": "4N",
  "B-N": "B-N", "B-2N": "B-2N", "B-3N": "B-3N", "B-4N": "B-4N", "B-5N": "B-5N", "B-6N": "B-6N", "B-7N": "B-7N", "B-P": "B-P", "B-A": "B-A", "B-D": "B-D", "B-T": "B-T", "B-SF": "B-SF",
  ECP: "ECP", "B+P": "ECP", "EC+B+P": "ECP", ECP2: "EC2P", EC2P: "EC2P", "B+2P": "EC2P", EC3P: "EC3P", "B+3P": "EC3P",
  ECA: "ECA", "B+A": "ECA", "EC+B+A": "ECA", ECSF: "ECSF", "B+SF": "ECSF", "EC+B+SF": "ECSF",
};
const unknown = new Map();

/** A cluster emission (%14C, %24NE, %3HE …): the emitted nucleus's Z and A. */
function cluster(code) {
  const m = /^(\d+)([A-Z]{1,2})$/.exec(code);
  if (!m) return null;
  const z = zOf(m[2]);
  if (z < 2) return null;
  const a = Number(m[1]);
  const key = `${a}${ELEMENTS[z]}`;
  MODES[key] ??= { label: key, dz: -z, dn: -(a - z) };
  return key;
}

/** The ground state's continuation text → { modes: [[mode, %], …], allExpected: every mode given as "=?" }. */
function modesOf(text) {
  const found = new Map(); // mode → { pct, combined }
  let listed = 0, expected = 0;
  for (const raw of text.split("$")) {
    const item = raw.trim().toUpperCase();
    if (!item.startsWith("%")) continue;
    const m = /^%([A-Z0-9+%\-]+?)\s*(=|<=|>=|<|>| AP |\?|$|\s)\s*([0-9]*\.?[0-9]+(?:E[+-]?\d+)?)?/.exec(item + " ");
    if (!m) continue;
    const spelled = m[1].replace(/%/g, "");
    const code = ALIAS[spelled] ?? ALIAS[m[1]] ?? cluster(spelled);
    if (!code) { unknown.set(spelled, (unknown.get(spelled) ?? 0) + 1); continue; }
    const pct = m[3] !== undefined ? Number(m[3]) : null;
    listed++;
    if (m[2] === "?" || /=\s*\?/.test(item)) expected++;
    const combined = /\+/.test(spelled) && code === "EC";
    const prev = found.get(code);
    // %EC and %B+ given apart are summed; a combined %EC+%B+ wins over either.
    if (!prev) found.set(code, { pct, combined });
    else if (combined && !prev.combined) found.set(code, { pct, combined });
    else if (!combined && !prev.combined && pct !== null) found.set(code, { pct: (prev.pct ?? 0) + pct, combined: false });
  }
  const modes = [...found].map(([code, { pct }]) => [code, pct === null ? null : sig(pct)]).sort((a, b) => (b[1] ?? -1) - (a[1] ?? -1));
  return { modes, allExpected: listed > 0 && expected === listed };
}

// ── decks → nuclides ────────────────────────────────────────────────────────────────────────────
const nuclides = [];
const skipped = { nucid: 0, noGround: 0 };
for (const [nucid, cards] of rows) {
  const id = /^(\d+)([A-Z]{1,2})$/.exec(nucid.trim().toUpperCase());
  const z = id ? (id[2] === "NN" ? 0 : zOf(id[2])) : -1;
  if (!id || z < 0) { skipped.nucid++; continue; }
  const a = Number(id[1]);
  let ground = null;
  const cont = [];
  for (const line of cards.split("\x1f")) {
    if ((line[5] ?? " ") === " ") { if (ground) break; ground = line; }
    else if (ground) cont.push(line.slice(9));
  }
  if (!ground) { skipped.noGround++; continue; }
  const { t, lim } = halfLife(ground.slice(39, 49));
  const { modes: m, allExpected } = t === null ? { modes: [], allExpected: false } : modesOf(cont.join("$"));
  // A measured half-life means the nuclide was seen; only a deck with none can describe an expected one.
  const exp = t === -1 && ((ground[79] ?? " ") === "?" || allExpected);
  nuclides.push({ z, n: a - z, el: ELEMENTS[z], t, ...(lim ? { lim } : {}), ...(exp ? { exp: 1 } : {}), m });
}
nuclides.sort((p, q) => p.z - q.z || p.n - q.n);

const out = { source: "ENSDF Adopted Levels, ground states (nysgpt_nsr.ensdf_datasets), snapshot 2026-11-04", modes: MODES, nuclides };
const json = JSON.stringify(out);
writeFileSync("public/viz-data/decay.json", json);

const stable = nuclides.filter((x) => x.t === null).length;
const noT = nuclides.filter((x) => x.t === -1).length;
const noMode = nuclides.filter((x) => x.t !== null && x.m.length === 0).length;
const expected = nuclides.filter((x) => x.exp).length;
console.log(`decay.json: ${nuclides.length} nuclides (${stable} stable, ${noT} without a half-life, ${noMode} unstable without a mode, ${expected} expected but not observed), ${(json.length / 1024).toFixed(0)} KB`);
console.log("skipped:", skipped, "unrecognized mode spellings:", Object.fromEntries([...unknown].sort((a, b) => b[1] - a[1])));
