// The /viz datasets (2026-11-04, second cut): the corpus is frozen, so every query ran ONCE
// (scripts/viz-snapshot.mjs) and lives as JSON in data/viz/ — the pages import it and prerender.
// No database at request time; rerun the snapshot and commit when the corpus ever moves.

import barsJson from "@/data/viz/bars.json"
import fieldJson from "@/data/viz/field.json"
import flowsJson from "@/data/viz/flows.json"
import graphJson from "@/data/viz/graph.json"
import matrixJson from "@/data/viz/matrix.json"
import perYearJson from "@/data/viz/per-year.json"
import scatterJson from "@/data/viz/scatter.json"
import triplesJson from "@/data/viz/triples.json"

/** The nuclide field: every (N, Z) the literature touches, with its paper count. 7,799 rows. */
export const nuclideField = () => fieldJson as { n: number; z: number; c: number }[]

/** Nuclides with their names, for the big bar run. */
export const nuclideBars = () => barsJson as { a: number; sym: string; c: number }[]

/** The corpus by year, and the slice of it that flowed into EXFOR as measured data. */
export const perYear = () => perYearJson as { papers: { y: number; c: number }[]; exfor: { y: number; c: number }[] }

/** A random 12,000 cited papers: year × citations, NSR vs the arXiv/APS additions. */
export const paperScatter = () => scatterJson as { y: number; c: number; nsr: boolean }[]

/** A random 10,000 papers in three measures, for the 3D dataset scatter. */
export const paperTriples = () => triplesJson as { y: number; refs: number; cites: number; nsr: boolean }[]

/** Reaction flow: each (nuclide, reaction) pairing's (ΔN, ΔZ) trajectory, weighted by papers. */
export const reactionFlows = () => flowsJson as { n: number; z: number; dn: number; dz: number; w: number }[]

/** Co-authorship among the 1,200 most-published authors; edges at four-plus shared papers. */
export const authorGraph = () => graphJson as { nodes: { id: string; name: string; c: number }[]; edges: { s: string; t: string; w: number }[] }

/** 36 Pearson correlations across nine per-paper measures, from the snapshot run. */
export const measureMatrix = () => matrixJson as { vars: string[]; cells: [number, number, number][] }
