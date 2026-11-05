// The capture-gamma snapshot (2026-11-04, chart batch B): NNDC CapGam's thermal-neutron-capture γ rays, from the
// nsr repo's copy (/Code/nsr/public/data/capgam, 287 datasets, 38 MB, fetched from nndc.bnl.gov/capgam 2026-08-17),
// reduced to what /viz/simplex, /viz/spectra, /viz/gamma-atlas and /viz/gamma-punchcard draw, in
// public/viz-data/capgam.json. Read-only on the source. Rerun by hand:
//   node scripts/viz-capgam-snapshot.mjs
//
// One set per product nucleus (the compound nucleus the capture makes), ordered by A then Z. A product's datasets
// are merged — CapGam splits some into PRIMARY/SECONDARY or PLACED/UNPLACED — and a line both list once is kept once.
//
// Output — { source, sets: [{ z, n, el, target, sigma, e, i, p }] }:
//   target  the captured-on nucleus, "99Ru"; sigma its thermal capture cross section (b), or null
//   e       γ energies, keV (0.1 keV)
//   i       absolute intensities, γ per 100 captures (2 significant figures); null where CapGam gives none
//   p       one character per line: "1" a primary γ (from the capture state), "0" a secondary
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = "/Users/brendanstanton/Code/nsr/public/data/capgam";
const index = JSON.parse(readFileSync(join(SRC, "index.json"), "utf8"));

const sig2 = (x) => (x === 0 ? 0 : Number(x.toPrecision(2)));
const products = new Map();
let lines = 0, dupes = 0;
for (const d of index.datasets) {
  const f = JSON.parse(readFileSync(join(SRC, "ds", `${d.file}.json`), "utf8"));
  const k = `${f.product.z}:${f.product.a}`;
  let set = products.get(k);
  if (!set) {
    set = {
      z: f.product.z, n: f.product.n, el: f.product.symbol,
      target: `${f.target.a}${f.target.symbol}`,
      sigma: f.crossSection?.value ?? null,
      lines: [],
    };
    products.set(k, set);
  }
  set.sigma ??= f.crossSection?.value ?? null;
  const norm = f.normalizationFactor?.value ?? null;
  for (const g of f.gammaRecords) {
    const e = g.energy?.value;
    if (typeof e !== "number" || !(e > 0)) continue;
    const abs = g.absoluteIntensity?.value;
    const rel = g.originalIntensity?.value;
    const i = typeof abs === "number" ? abs : typeof rel === "number" && typeof norm === "number" ? rel * norm : null;
    const p = g.isPrimaryGamma ? 1 : 0;
    if (set.lines.some((x) => x.p === p && Math.abs(x.e - e) < 0.01)) { dupes++; continue; }
    set.lines.push({ e, i, p });
    lines++;
  }
}

const sets = [...products.values()]
  .filter((s) => s.lines.length)
  .sort((a, b) => a.z + a.n - (b.z + b.n) || a.z - b.z)
  .map((s) => {
    s.lines.sort((a, b) => a.e - b.e);
    return {
      z: s.z, n: s.n, el: s.el, target: s.target, sigma: s.sigma,
      e: s.lines.map((x) => Math.round(x.e * 10) / 10),
      i: s.lines.map((x) => (x.i === null ? null : sig2(x.i))),
      p: s.lines.map((x) => x.p).join(""),
    };
  });

const out = { source: "NNDC CapGam, thermal-neutron capture γ rays (nndc.bnl.gov/capgam, fetched 2026-08-17)", sets };
const json = JSON.stringify(out);
writeFileSync("public/viz-data/capgam.json", json);
console.log(`capgam.json: ${sets.length} product nuclei, ${lines} γ lines (${dupes} duplicates dropped), ${(json.length / 1024).toFixed(0)} KB`);
