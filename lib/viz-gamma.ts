// The capture-gamma charts' data (2026-11-04, chart batch B): public/viz-data/capgam.json, written by
// scripts/viz-capgam-snapshot.mjs from NNDC CapGam — thermal-neutron capture γ rays, one set per product nucleus.
// /viz/simplex, /viz/spectra, /viz/gamma-atlas and /viz/gamma-punchcard all draw from it, one fetch between them.

export type GammaSet = {
  z: number
  n: number
  el: string
  /** The captured-on nucleus, "99Ru". */
  target: string
  /** Its thermal capture cross section, barns. */
  sigma: number | null
  /** γ energies, keV. */
  e: number[]
  /** Absolute intensities, γ per 100 captures; null where CapGam gives none. */
  i: (number | null)[]
  /** "1" per primary γ, "0" per secondary. */
  p: string
}
export type Capgam = { source: string; sets: GammaSet[] }

let cached: Promise<Capgam> | null = null
export function loadCapgam(): Promise<Capgam> {
  if (!cached) {
    const p = fetch('/viz-data/capgam.json').then((r) => {
      if (!r.ok) throw new Error(`/viz-data/capgam.json: ${r.status}`)
      return r.json() as Promise<Capgam>
    })
    p.catch(() => {
      cached = null
    })
    cached = p
  }
  return cached
}

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
/** "¹⁰⁰Ru" — the product nucleus. */
export const setName = (s: { z: number; n: number; el: string }) => `${String(s.z + s.n).replace(/\d/g, (d) => SUP[d])}${s.el}`
/** "¹⁰⁰Ru · ⁹⁹Ru(n,γ)" for headings. */
export const setLabel = (s: GammaSet) => `${setName(s)} · ${s.target.replace(/^\d+/, (a) => a.replace(/\d/g, (d) => SUP[d]))}(n,γ)`

/** Every line, set by set and low to high within a set — the order the strips draw and their table lists. */
export type GammaLine = { set: number; e: number; i: number | null; primary: boolean }
export function allLines(data: Capgam): GammaLine[] {
  const out: GammaLine[] = []
  data.sets.forEach((s, set) => {
    for (let k = 0; k < s.e.length; k++) out.push({ set, e: s.e[k], i: s.i[k], primary: s.p[k] === '1' })
  })
  return out
}

/** The floor the log-intensity scales start from: lines without an intensity sit here. */
export const I_FLOOR = 0.001
export const logI = (i: number | null) => Math.log10(Math.max(I_FLOOR, i ?? 0))

/** Summed intensity per (row, energy bin), over the sets a row groups. Cells with no lines are left out. */
export function binned(data: Capgam, binKeV: number, rowOf: (s: GammaSet, index: number) => number) {
  const cells = new Map<string, { row: number; bin: number; sum: number; lines: number }>()
  data.sets.forEach((s, si) => {
    const row = rowOf(s, si)
    for (let k = 0; k < s.e.length; k++) {
      const bin = Math.floor(s.e[k] / binKeV)
      const key = `${row}:${bin}`
      let c = cells.get(key)
      if (!c) cells.set(key, (c = { row, bin, sum: 0, lines: 0 }))
      c.sum += s.i[k] ?? 0
      c.lines++
    }
  })
  return [...cells.values()].sort((a, b) => a.row - b.row || a.bin - b.bin)
}

export const E_MAX_KEV = 11500
/** The atlas's energy bins (/viz/gamma-atlas). */
export const ATLAS_BIN_KEV = 25

/** The punch card's energy bins (/viz/gamma-punchcard). */
export const PUNCH_BIN_KEV = 500

/** The elements present, by Z, with how many product nuclei each has in CapGam. */
export function punchElements(data: Capgam) {
  const byZ = new Map<number, { z: number; el: string; nuclei: number }>()
  for (const s of data.sets) {
    const e = byZ.get(s.z)
    if (e) e.nuclei++
    else byZ.set(s.z, { z: s.z, el: s.el, nuclei: 1 })
  }
  return [...byZ.values()].sort((a, b) => a.z - b.z)
}

/** The punch card's cells: one per (element, bin) with lines, intensity averaged over the element's nuclei. */
export function punchCells(data: Capgam) {
  const els = punchElements(data)
  const row = new Map(els.map((e, i) => [e.z, i]))
  return {
    els,
    cells: binned(data, PUNCH_BIN_KEV, (s) => row.get(s.z) ?? 0).map((c) => ({ ...c, mean: c.sum / els[c.row].nuclei })),
  }
}
