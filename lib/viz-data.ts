// The /viz datasets (2026-11-04, second cut): the corpus is frozen, so every query ran ONCE
// (scripts/viz-snapshot.mjs) and lives as JSON in public/viz-data/. The browser fetches each file
// as a static asset: no page carries the data in its HTML, nothing bundles it, and the worker
// never touches it. Rerun the snapshot and commit when the corpus ever moves.

/** The nuclide field: every (N, Z) the literature touches, with its paper count. 7,799 rows. */
export type Field = { n: number; z: number; c: number }[]

/** Nuclides with their names, for the big bar run. */
export type Bars = { a: number; sym: string; c: number }[]

/** The corpus by year, and the slice of it that flowed into EXFOR as measured data. */
export type PerYear = { papers: { y: number; c: number }[]; exfor: { y: number; c: number }[] }

/** A random 12,000 cited papers: year × citations, NSR vs the arXiv/APS additions. */
export type Scatter = { y: number; c: number; nsr: boolean }[]

/** A random 10,000 papers in three measures, for the 3D dataset scatter. */
export type Triples = { y: number; refs: number; cites: number; nsr: boolean }[]

/** Reaction flow: each (nuclide, reaction) pairing's (ΔN, ΔZ) trajectory, weighted by papers. */
export type Flows = { n: number; z: number; dn: number; dz: number; w: number }[]

/** Co-authorship among the 1,200 most-published authors; edges at four-plus shared papers. */
export type Graph = { nodes: { id: string; name: string; c: number }[]; edges: { s: string; t: string; w: number }[] }

/** 36 Pearson correlations across nine per-paper measures, from the snapshot run. */
export type Matrix = { vars: string[]; cells: [number, number, number][] }

/** ENSDF adopted levels per nuclide (scripts/viz-levels-snapshot.mjs). L: flat [keV, Jπ, T½, …] ascending;
 *  G: flat [from level index, to level index, relative intensity or null, …]; nl / ng: counts before the caps. */
export type Levels = {
  source: string
  caps: { maxKeV: number; levels: number; gammas: number }
  nuclides: { z: number; n: number; el: string; L: (number | string)[]; G: (number | null)[]; nl: number; ng: number }[]
}

// One request per file per page: field.json feeds five charts and a table, and client-side moves
// between them reuse the first fetch. A failed fetch is dropped so the next mount retries.
const cache = new Map<string, Promise<unknown>>()
function get<T>(name: string): () => Promise<T> {
  return () => {
    let p = cache.get(name)
    if (!p) {
      p = fetch(`/viz-data/${name}.json`).then((r) => {
        if (!r.ok) throw new Error(`/viz-data/${name}.json: ${r.status}`)
        return r.json()
      })
      p.catch(() => cache.delete(name))
      cache.set(name, p)
    }
    return p as Promise<T>
  }
}

export const loadField = get<Field>('field')
export const loadBars = get<Bars>('bars')
export const loadPerYear = get<PerYear>('per-year')
export const loadScatter = get<Scatter>('scatter')
export const loadTriples = get<Triples>('triples')
export const loadFlows = get<Flows>('flows')
export const loadGraph = get<Graph>('graph')
export const loadMatrix = get<Matrix>('matrix')
export const loadLevels = get<Levels>('levels')

// Chart batch B (2026-11-04): nuclear-structure snapshots.

/** Even-even nuclides' first 2⁺ energy and B(E2)↑ (scripts/viz-e2-snapshot.mjs): rows [z, n, e2 keV, be2 e²b² or
 *  null], by Z then N; els[Z] the element symbol. */
export type E2 = { source: string; els: string[]; rows: [number, number, number, number | null][] }

/** Per nuclide, from all its ENSDF adopted levels (scripts/viz-levels-snapshot.mjs): rows [z, n, el, first excited,
 *  median, highest, count], keV, ordered by A then Z. */
export type LevelStats = { source: string; cols: string[]; rows: [number, number, string, number, number, number, number][] }

/** Pearson r across nine nuclide measures (scripts/viz-matrix-snapshot.mjs): cells [i, j, r] for i < j over n nuclides. */
export type NuclideMatrix = { source: string; vars: string[]; labels: string[]; n: number; cells: [number, number, number][] }

export const loadE2 = get<E2>('e2')
export const loadLevelStats = get<LevelStats>('level-stats')
export const loadNuclideMatrix = get<NuclideMatrix>('nuclide-matrix')

export const MAGIC = [2, 8, 20, 28, 50, 82, 126]
/** Z or N within 2 of a magic number. */
export const nearMagic = (z: number, n: number) => MAGIC.some((m) => Math.abs(z - m) <= 2 || Math.abs(n - m) <= 2)

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
/** ²⁰⁸Pb. */
export const nuclideName = (z: number, n: number, el: string) => `${String(z + n).replace(/\d/g, (d) => SUP[Number(d)])}${el}`
