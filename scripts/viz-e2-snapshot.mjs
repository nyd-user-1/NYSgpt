// The E(2⁺) snapshot (chart batch B, 2026-11-04): every even-even nuclide's first 2⁺ energy and, where measured,
// its B(E2; 0⁺ → 2⁺), from NNDC's adopted B(E2) compilation (Pritychenko, Birch, Singh, Horoi, ADNDT 107, 1 (2016)),
// as the nsr repo fetched it. Written to public/viz-data/e2.json for /viz/weight, /viz/scatter3d and
// /viz/first-excited. Rerun by hand:
//   node scripts/viz-e2-snapshot.mjs [path/to/be2/adopted.json]
//
// Output — { source, els, rows }: els[Z] is the element symbol; each row is [z, n, e2, be2], sorted by Z then N:
//   e2   E(2⁺₁) in keV, to 0.1
//   be2  B(E2)↑ in e²b², 4 significant figures, null where the compilation has none
import { readFileSync, writeFileSync } from "node:fs";

const SRC = process.argv[2] ?? "/Users/brendanstanton/Code/nsr/public/data/be2/adopted.json";
const OUT = "public/viz-data/e2.json";

const d = JSON.parse(readFileSync(SRC, "utf8"));
const els = [];
const rows = [];
for (const e of d.entries) {
  const { z, n, symbol } = e.nuclide;
  const e2 = e.transitionEnergy?.value;
  if (typeof e2 !== "number" || z % 2 || n % 2) continue;
  const be2 = typeof e.be2?.value === "number" ? Number(e.be2.value.toPrecision(4)) : null;
  els[z] = symbol;
  rows.push([z, n, Math.round(e2 * 10) / 10, be2]);
}
rows.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
for (let z = 0; z < els.length; z++) els[z] ??= "";

const json = JSON.stringify({ source: `${d.source}; fetched ${d.fetched}`, els, rows });
writeFileSync(OUT, json);
console.log(`${rows.length} even-even nuclides, ${rows.filter((r) => r[3] !== null).length} with B(E2); ${OUT} ${(json.length / 1024).toFixed(0)} KB`);
