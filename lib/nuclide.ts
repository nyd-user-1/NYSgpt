// What every nuclide page shares (2026-11-04): the decay.json types, the (Z, N) key, the NNDC chart's decay-mode
// colours, a nuclide's name, and a half-life in words. /viz/decay reaches these through lib/viz-decay.ts, the
// physics charts through lib/viz-physics.ts; both re-export from here.

export type DecayMode = { label: string; dz: number | null; dn: number | null }
export type DecayNuclide = {
  z: number
  n: number
  el: string
  /** Half-life in seconds; null = stable; -1 = the deck gives none. */
  t: number | null
  lim?: '>' | '<' | '~'
  /** 1 when ENSDF expects the nuclide but nobody has observed it (no T½, ground level or every mode marked '?'). */
  exp?: 1
  /** [mode, branching %], largest first; branching null where the deck lists the mode without a value. */
  m: [string, number | null][]
}
/** public/viz-data/decay.json (scripts/viz-decay-snapshot.mjs). */
export type DecayData = { source: string; modes: Record<string, DecayMode>; nuclides: DecayNuclide[] }

export const keyOf = (z: number, n: number) => z * 1000 + n

/** The NNDC chart's colour families, by a nuclide's primary (largest) mode. */
export type Family = 'b-' | 'ec' | 'a' | 'sf' | 'p' | 'n' | 'stable' | 'unknown'
export const FAMILIES: Family[] = ['stable', 'b-', 'ec', 'a', 'sf', 'p', 'n', 'unknown']
export const FAMILY: Record<Family, { label: string; light: string; dark: string }> = {
  stable: { label: 'Stable', light: '#16181d', dark: '#f0e9d8' },
  'b-': { label: 'β−', light: '#2f6fdc', dark: '#5b9cff' },
  ec: { label: 'β+/EC', light: '#e8730c', dark: '#ff8a3d' },
  a: { label: 'α', light: '#d9ab00', dark: '#ffd84d' },
  sf: { label: 'Fission', light: '#1f9d4c', dark: '#3ddc7a' },
  p: { label: 'p emission', light: '#8b3fd9', dark: '#b57bff' },
  n: { label: 'n emission', light: '#d42f2f', dark: '#ff5c5c' },
  unknown: { label: 'Unknown', light: '#a3a3a3', dark: '#6b6b6b' },
}

export function familyOfMode(mode: string | undefined): Family {
  if (!mode) return 'unknown'
  if (mode.endsWith('SF')) return 'sf'
  if (mode.startsWith('B-') || mode === '2B-') return 'b-'
  if (mode.startsWith('EC') || mode === '2EC') return 'ec'
  if (/^\d*P$/.test(mode)) return 'p'
  if (/^\d*N$/.test(mode)) return 'n'
  // α and the cluster emissions (¹⁴C, ²⁴Ne …) share α's colour.
  return 'a'
}

/** A nuclide's family; one missing from decay.json is 'unknown'. */
export function familyOf(nuc: DecayNuclide | undefined): Family {
  if (!nuc) return 'unknown'
  if (nuc.t === null) return 'stable'
  return familyOfMode(nuc.m[0]?.[0])
}

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' }
/** Digits and minus signs as superscripts: sup(-6) = "⁻⁶". */
export const sup = (v: number | string) => String(v).replace(/[\d-]/g, (d) => SUP[d])
/** "⁶⁰Co"; the free neutron is "n". */
export const nucName = (nuc: { z: number; n: number; el: string }) => (nuc.z === 0 && nuc.n === 1 ? 'n' : `${sup(nuc.z + nuc.n)}${nuc.el}`)

const YEAR = 365.2422 * 86400
const UNITS: [string, number][] = [
  ['ys', 1e-24], ['zs', 1e-21], ['as', 1e-18], ['fs', 1e-15], ['ps', 1e-12], ['ns', 1e-9], ['µs', 1e-6], ['ms', 1e-3],
  ['s', 1], ['min', 60], ['h', 3600], ['d', 86400], ['y', YEAR], ['ky', 1e3 * YEAR], ['My', 1e6 * YEAR], ['Gy', 1e9 * YEAR],
]
const three = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2))

/** A span of seconds in the unit that reads best: "5.27 y", "613 s", "2.4E+23 y". */
export function formatSeconds(s: number): string {
  if (s >= 1e3 * 1e9 * YEAR) return `${(s / YEAR).toExponential(1).replace('e+', 'E+')} y`
  if (s < 1e-24) return `${s.toExponential(1).replace('e-', 'E-')} s`
  let unit = UNITS[0]
  for (const u of UNITS) if (s >= u[1]) unit = u
  return `${three(s / unit[1])} ${unit[0]}`
}

/** "5.27 y", "Stable", "Not given"; a nuclide missing from decay.json is "Not in ENSDF". */
export function halfLifeText(nuc: DecayNuclide | undefined): string {
  if (!nuc) return 'Not in ENSDF'
  if (nuc.t === null) return 'Stable'
  if (nuc.t < 0) return 'Not given'
  return `${nuc.lim ?? ''}${formatSeconds(nuc.t)}`
}
