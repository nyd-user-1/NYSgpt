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
