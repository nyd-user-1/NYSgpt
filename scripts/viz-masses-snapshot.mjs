// The masses snapshot (chart batch A, 2026-11-04): binding energy per nucleon, separation energies and the
// α and β− Q-values of every AME2020 nuclide, plus each nuclide's known level count and E(2⁺) from the
// committed ENSDF levels snapshot. Written to public/viz-data/masses.json for /viz/nebula, /viz/surface,
// /viz/separation and /viz/nuclide-card. Rerun by hand:
//   node scripts/viz-masses-snapshot.mjs [path/to/ame2020.json]
//
// Source: /Code/nsr/public/data/ame2020.json (nsr's scripts/build-ame2020.mjs, from AME2020's mass_1.mas20 and
// rct files). Δ is the mass excess in keV; with Δn and ΔH the neutron's and ¹H's:
//   B(Z, N)   = Z·ΔH + N·Δn − Δ(Z, N)            b = B / A
//   Sₙ(Z, N)  = Δ(Z, N−1) + Δn − Δ(Z, N)          Sₚ(Z, N) = Δ(Z−1, N) + ΔH − Δ(Z, N)
//   Qα(Z, N)  = Δ(Z, N) − Δ(Z−2, N−2) − Δ(⁴He)    Qβ−(Z, N) = Δ(Z, N) − Δ(Z+1, N−1)
// Every value is derived so, and checked against AME's published one: the run stops if any differs by more
// than 1 keV or the published uncertainty, whichever is larger. Where AME publishes a value, the snapshot keeps
// AME's — some Qα and Sₚ were measured directly, more precisely than the extrapolated (#) masses either side
// (¹⁵⁸Ta's Qα: 6123.6 published, 6124.1 from its masses) — and the derived value fills the rest. σ(Sₙ) is AME's:
// the adjustment's correlations make it smaller than quadrature over two masses.
//
// Output — { source, els, cols, rows }: els[Z] is the element symbol; each row is
//   [z, n, d, b, sn, su, sp, qa, qb, e, nl, e2]  keV to 0.1, null where the value doesn't exist:
//   d   Δ, AME's mass excess
//   b   B/A            sn  Sₙ     su  σ(Sₙ)     sp  Sₚ     qa  Qα     qb  Qβ−
//   e   1 when AME's mass is extrapolated (#), else 0
//   nl  ENSDF adopted levels known (levels.json's nl, before its cap)
//   e2  E(2⁺₁), the lowest 2⁺ level (firm or tentative), even-even nuclides only
// S₂ₙ is not stored: S₂ₙ(Z, N) = Sₙ(Z, N) + Sₙ(Z, N−1).
import { readFileSync, writeFileSync } from "node:fs";

const AME = process.argv[2] ?? "/Users/brendanstanton/Code/nsr/public/data/ame2020.json";
const LEVELS = "public/viz-data/levels.json";
const OUT = "public/viz-data/masses.json";
const COLS = ["z", "n", "d", "b", "sn", "su", "sp", "qa", "qb", "e", "nl", "e2"];

const ame = JSON.parse(readFileSync(AME, "utf8"));
const levels = JSON.parse(readFileSync(LEVELS, "utf8"));

const key = (z, n) => z * 1000 + n;
const mass = new Map(ame.nuclides.map((x) => [key(x.z, x.n), x]));
const D = (z, n) => mass.get(key(z, n))?.d;
const DN = D(0, 1);
const DH = D(1, 0);
const DHE4 = D(2, 2);
const r1 = (v) => (v === undefined || v === null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);

// Jπ 2⁺ as ENSDF writes it: 2+, (2+) or (2)+ — firm or tentative, no alternatives listed.
const TWO_PLUS = /^\(?2\)?\+\)?$/;
const lev = new Map();
for (const x of levels.nuclides) {
  let e2;
  if (x.z % 2 === 0 && x.n % 2 === 0) {
    for (let i = 3; i < x.L.length; i += 3) {
      if (typeof x.L[i] === "number" && x.L[i] > 0 && TWO_PLUS.test(String(x.L[i + 1]))) {
        e2 = x.L[i];
        break;
      }
    }
  }
  lev.set(key(x.z, x.n), { nl: x.nl, e2 });
}

const worst = { b: 0, sn: 0, sp: 0, qa: 0, qb: 0 };
/** The derived value, checked against AME's [value, σ]; AME's where it exists, else the derived one. */
function pick(what, x, derived, published, sigma) {
  if (published === undefined || published === null) return derived;
  if (derived !== undefined) {
    const diff = Math.abs(derived - published);
    if (diff > Math.max(1, sigma ?? 0)) throw new Error(`${what}, Z ${x.z} N ${x.n}: derived ${derived}, AME ${published} ± ${sigma}`);
    worst[what] = Math.max(worst[what], diff);
  }
  return published;
}

const els = [];
const rows = [];
for (const x of ame.nuclides) {
  const { z, n } = x;
  const a = z + n;
  const d = x.d;
  const nb = (dz, dn) => D(z + dz, n + dn);
  if (z > 0) els[z] ??= x.el;
  const rct = (k) => [x.r?.[k]?.[0], x.r?.[k]?.[1]];

  const b = pick("b", x, a > 0 ? (z * DH + n * DN - d) / a : undefined, a > 1 ? x.be : undefined, x.bee);
  const sn = pick("sn", x, nb(0, -1) !== undefined ? nb(0, -1) + DN - d : undefined, ...rct("SN"));
  const sp = pick("sp", x, nb(-1, 0) !== undefined ? nb(-1, 0) + DH - d : undefined, ...rct("SP"));
  const qa = pick("qa", x, a > 4 && nb(-2, -2) !== undefined ? d - nb(-2, -2) - DHE4 : undefined, ...rct("QA"));
  const qb = pick("qb", x, nb(1, -1) !== undefined ? d - nb(1, -1) : undefined, x.qbm, x.qbme);
  const l = lev.get(key(z, n));
  rows.push([z, n, r1(d), r1(b), r1(sn), sn === undefined ? null : r1(x.r?.SN?.[1]), r1(sp), r1(qa), r1(qb), x.est ? 1 : 0, l?.nl ?? null, l?.e2 ?? null]);
}
els[0] = "n";
rows.sort((p, q) => p[0] - q[0] || p[1] - q[1]);

const out = {
  source: `${ame.source}; levels and E(2+) from ENSDF adopted levels (public/viz-data/levels.json); snapshot 2026-11-04`,
  els,
  cols: COLS,
  rows,
};
const json = JSON.stringify(out);
writeFileSync(OUT, json);

const peak = rows.reduce((m, r) => ((r[3] ?? 0) > (m[3] ?? 0) ? r : m));
console.log(`${rows.length} nuclides → ${OUT} (${(json.length / 1024).toFixed(0)} KB)`);
console.log(`largest |derived − AME|, keV: ${Object.entries(worst).map(([k, v]) => `${k} ${v.toFixed(4)}`).join(", ")}`);
console.log(`B/A peak: ${peak[0] + peak[1]}${els[peak[0]]}, ${peak[3]} keV`);
console.log(`with levels: ${rows.filter((r) => r[10]).length}; with E(2+): ${rows.filter((r) => r[11]).length}`);
