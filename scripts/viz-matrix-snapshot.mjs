// The nuclide-measure matrix (chart batch B, 2026-11-04): Pearson r between nine measured quantities, over every
// nuclide that has all nine. Written to public/viz-data/nuclide-matrix.json for /viz/matrix. Inputs are the
// committed snapshots, nothing re-derived:
//   decay.json   T½ (ENSDF ground states; stable nuclides have none, so they drop out)
//   masses.json  Δ, Sₙ, Sₚ, Qα, Qβ− (AME2020, batch A's derivation) and the ENSDF level count
//   e2.json      E(2⁺₁) and B(E2) (NNDC's adopted B(E2) compilation) — even-even nuclides only
// T½, E(2⁺), B(E2) and the level count span orders of magnitude, so they enter as log₁₀; the energies enter as
// they are, keV. Rerun by hand after any of the three inputs changes:
//   node scripts/viz-matrix-snapshot.mjs
//
// Output — { source, vars, labels, n, cells }: cells [i, j, r] for i < j (36 pairs), r to 4 places; n nuclides.
import { readFileSync, writeFileSync } from "node:fs";

const read = (f) => JSON.parse(readFileSync(`public/viz-data/${f}`, "utf8"));
const decay = read("decay.json");
const masses = read("masses.json");
const e2 = read("e2.json");
const OUT = "public/viz-data/nuclide-matrix.json";

const key = (z, n) => z * 1000 + n;
const col = Object.fromEntries(masses.cols.map((c, i) => [c, i]));
const halfLife = new Map(decay.nuclides.map((x) => [key(x.z, x.n), x.t]));
const mass = new Map(masses.rows.map((r) => [key(r[col.z], r[col.n]), r]));

const VARS = ["t", "qa", "qb", "sn", "sp", "e2", "be2", "d", "nl"];
const LABELS = ["log T½", "Qα", "Qβ−", "Sₙ", "Sₚ", "log E(2⁺)", "log B(E2)", "Mass excess", "log levels"];

const rows = [];
for (const [z, n, e2keV, be2] of e2.rows) {
  const m = mass.get(key(z, n));
  const t = halfLife.get(key(z, n));
  if (!m || be2 === null || typeof t !== "number" || t <= 0) continue;
  const v = [Math.log10(t), m[col.qa], m[col.qb], m[col.sn], m[col.sp], Math.log10(e2keV), Math.log10(be2), m[col.d], m[col.nl] ? Math.log10(m[col.nl]) : null];
  if (v.every((x) => typeof x === "number" && Number.isFinite(x))) rows.push(v);
}

const pearson = (i, j) => {
  const n = rows.length;
  let sx = 0, sy = 0;
  for (const r of rows) { sx += r[i]; sy += r[j]; }
  const mx = sx / n, my = sy / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const r of rows) {
    const dx = r[i] - mx, dy = r[j] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxy / Math.sqrt(sxx * syy);
};

const cells = [];
for (let i = 0; i < VARS.length; i++) for (let j = i + 1; j < VARS.length; j++) cells.push([i, j, Math.round(pearson(i, j) * 1e4) / 1e4]);

writeFileSync(OUT, JSON.stringify({
  source: "decay.json (ENSDF), masses.json (AME2020), e2.json (NNDC B(E2)); snapshot 2026-11-04",
  vars: VARS,
  labels: LABELS,
  n: rows.length,
  cells,
}));
console.log(`${rows.length} nuclides with all nine; strongest pairs:`);
for (const [i, j, r] of [...cells].sort((a, b) => Math.abs(b[2]) - Math.abs(a[2])).slice(0, 6)) console.log(`  ${LABELS[i]} × ${LABELS[j]}: ${r}`);
