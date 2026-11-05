// The physics charts' data (chart batch A, 2026-11-04): the AME2020 masses (public/viz-data/masses.json, from
// scripts/viz-masses-snapshot.mjs) and the ENSDF ground-state decays (public/viz-data/decay.json, from
// scripts/viz-decay-snapshot.mjs). Each chart and its data table derive their rows through the same function
// here, so a table row and the datum it points at stay in step.
//
// The decay-mode colours, the nuclide names and the half-life text match /viz/decay's (lib/viz-decay.ts).

// ── loading ──────────────────────────────────────────────────────────────────────────────────────

/** One AME2020 nuclide. keV; null where the value doesn't exist. */
export type Mass = {
  z: number
  n: number
  el: string
  /** B/A */ b: number | null
  /** Sₙ and AME's σ(Sₙ) */ sn: number | null
  su: number | null
  /** Sₚ */ sp: number | null
  /** Qα */ qa: number | null
  /** Qβ− */ qb: number | null
  /** AME's mass is extrapolated (#). */ est: boolean
  /** ENSDF adopted levels known. */ nl: number | null
  /** E(2⁺₁), even-even only. */ e2: number | null
}
type MassFile = { source: string; els: string[]; cols: string[]; rows: (number | null)[][] }

export type DecayMode = { label: string; dz: number | null; dn: number | null }
export type DecayNuclide = {
  z: number
  n: number
  el: string
  /** Half-life in seconds; null = stable; -1 = the deck gives none. */
  t: number | null
  lim?: '>' | '<' | '~'
  /** [mode, branching %], largest first; branching null where the deck lists the mode without a value. */
  m: [string, number | null][]
}
export type Decay = { source: string; modes: Record<string, DecayMode>; nuclides: DecayNuclide[] }

// One request per file per page, as lib/viz-data.ts does it; a failed fetch is dropped so the next mount retries.
const cache = new Map<string, Promise<unknown>>()
function once<T>(name: string, make: () => Promise<T>): () => Promise<T> {
  return () => {
    let p = cache.get(name) as Promise<T> | undefined
    if (!p) {
      p = make()
      p.catch(() => cache.delete(name))
      cache.set(name, p)
    }
    return p
  }
}
async function json(name: string): Promise<unknown> {
  const r = await fetch(`/viz-data/${name}.json`)
  if (!r.ok) throw new Error(`/viz-data/${name}.json: ${r.status}`)
  return r.json()
}

function parseMasses(f: MassFile): Mass[] {
  return f.rows.map(([z, n, , b, sn, su, sp, qa, qb, e, nl, e2]) => ({
    z: z as number,
    n: n as number,
    el: f.els[z as number],
    b, sn, su, sp, qa, qb,
    est: e === 1,
    nl, e2,
  }))
}

export const loadMasses = once('masses', () => json('masses').then((raw) => parseMasses(raw as MassFile)))
export const loadDecay = once('decay', () => json('decay').then((raw) => raw as Decay))
export const loadMassesAndDecay = () => Promise.all([loadMasses(), loadDecay()])

export const keyOf = (z: number, n: number) => z * 1000 + n

// ── names, units, colours ────────────────────────────────────────────────────────────────────────

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' }
export const sup = (v: number | string) => String(v).replace(/[\d-]/g, (d) => SUP[d])
/** "⁶⁰Co"; the free neutron is "n". */
export const nucName = (x: { z: number; n: number; el: string }) => (x.z === 0 && x.n === 1 ? 'n' : `${sup(x.z + x.n)}${x.el}`)

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

export function halfLifeText(x: DecayNuclide | undefined): string {
  if (!x) return 'Not in ENSDF'
  if (x.t === null) return 'Stable'
  if (x.t < 0) return 'Not given'
  return `${x.lim ?? ''}${formatSeconds(x.t)}`
}

/** "α 100%, SF 5.45E-5%" — the branchings as the deck gives them. */
export function modesText(x: DecayNuclide | undefined, modes: Record<string, DecayMode>): string {
  if (!x || !x.m.length) return ''
  return x.m.map(([k, pct]) => `${modes[k]?.label ?? k}${pct === null ? '' : ` ${pct < 0.01 ? pct.toExponential(2).replace('e', 'E') : +pct.toPrecision(4)}%`}`).join(', ')
}

/** keV → "8.795 MeV". */
export const mev = (kev: number | null, digits = 3) => (kev === null ? '—' : `${(kev / 1000).toFixed(digits)} MeV`)

/** The NNDC chart's colour families, by a nuclide's primary (largest) mode — /viz/decay's palette. */
export type Family = 'stable' | 'b-' | 'ec' | 'a' | 'sf' | 'p' | 'n' | 'unknown'
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

export function familyOf(x: DecayNuclide | undefined): Family {
  if (!x) return 'unknown'
  if (x.t === null) return 'stable'
  return familyOfMode(x.m[0]?.[0])
}

/** The theme at draw time: useEChart rebuilds the option when <html>'s class flips, so a build may read it. */
export const isDark = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
export const familyColor = (f: Family, dark = isDark()) => (dark ? FAMILY[f].dark : FAMILY[f].light)
/** The paper's ink and its quiet grey, per theme — for marks that sit on the paper itself. */
export const ink = (dark = isDark()) => (dark ? '#f0e9d8' : '#16181d')

/** The axes as the other /viz charts dress them (use-echart recolours these for dark paper). */
export const AXIS = {
  nameTextStyle: { color: '#64748b' },
  axisLabel: { color: '#475569', fontSize: 10 },
  axisLine: { lineStyle: { color: '#94a3b8' } },
  splitLine: { show: false },
} as const

// ── derived rows, shared by chart and table ──────────────────────────────────────────────────────

export const decayIndex = (d: Decay) => new Map(d.nuclides.map((x, i) => [keyOf(x.z, x.n), i]))

/** Every radioactive nuclide with a half-life, longest first. */
export function halfLifeRun(d: Decay): DecayNuclide[] {
  return d.nuclides.filter((x) => x.t !== null && x.t > 0).sort((p, q) => (q.t as number) - (p.t as number))
}

/** Nuclides per mass number, by primary decay family. */
export function countsByA(d: Decay): { as: number[]; counts: Record<Family, number[]> } {
  const maxA = Math.max(...d.nuclides.map((x) => x.z + x.n))
  const as = Array.from({ length: maxA }, (_, i) => i + 1)
  const counts = Object.fromEntries(FAMILIES.map((f) => [f, as.map(() => 0)])) as Record<Family, number[]>
  for (const x of d.nuclides) {
    const a = x.z + x.n
    if (a >= 1) counts[familyOf(x)][a - 1]++
  }
  return { as, counts }
}

/** Each decay mode with a single daughter that is itself in the data, as a directed link. */
export type Link = { from: number; to: number; mode: string; pct: number | null }
export function decayLinks(d: Decay): Link[] {
  const index = decayIndex(d)
  const links: Link[] = []
  d.nuclides.forEach((x, from) => {
    for (const [mode, pct] of x.m) {
      const m = d.modes[mode]
      if (!m || m.dz === null || m.dn === null) continue
      const to = index.get(keyOf(x.z + m.dz, x.n + m.dn))
      if (to !== undefined && to !== from) links.push({ from, to, mode, pct })
    }
  })
  return links
}

/** The three natural decay series: every α and β branch of at least 0.001% from the head down to stable lead. */
export const SERIES = [
  { name: 'Uranium series', head: [92, 146] as const, light: '#2f6fdc', dark: '#5b9cff' },
  { name: 'Thorium series', head: [90, 142] as const, light: '#e8730c', dark: '#ff8a3d' },
  { name: 'Actinium series', head: [92, 143] as const, light: '#1f9d4c', dark: '#3ddc7a' },
]
export const SERIES_MIN_PCT = 0.001
export type SeriesStep = { series: number; from: number; to: number; mode: string; pct: number | null }
export function decaySeries(d: Decay): SeriesStep[] {
  const index = decayIndex(d)
  const steps: SeriesStep[] = []
  SERIES.forEach((s, si) => {
    const start = index.get(keyOf(s.head[0], s.head[1]))
    if (start === undefined) return
    const seen = new Set<number>([start])
    const queue = [start]
    while (queue.length) {
      const from = queue.shift() as number
      const x = d.nuclides[from]
      for (const [mode, pct] of x.m) {
        const m = d.modes[mode]
        if (!m || m.dz === null || m.dn === null) continue
        // A series keeps its A mod 4: β−n (²¹⁰Tl → ²⁰⁹Pb) and the cluster emissions leave it, as does any
        // branch under the floor.
        if ((m.dz + m.dn) % 4 !== 0 || Math.abs(m.dz) > 2) continue
        if (pct !== null && pct < SERIES_MIN_PCT) continue
        const to = index.get(keyOf(x.z + m.dz, x.n + m.dn))
        if (to === undefined) continue
        steps.push({ series: si, from, to, mode, pct })
        if (!seen.has(to)) {
          seen.add(to)
          queue.push(to)
        }
      }
    }
  })
  return steps
}

/** The separation candles: each nuclide whose Sₙ and its lighter isotope's are both known, Z then N. */
export type Candle = { m: Mass; prev: Mass }
export function separationCandles(ms: Mass[]): Candle[] {
  const byKey = new Map(ms.map((m) => [keyOf(m.z, m.n), m]))
  const out: Candle[] = []
  for (const m of ms) {
    const prev = byKey.get(keyOf(m.z, m.n - 1))
    if (m.sn !== null && prev && prev.sn !== null) out.push({ m, prev })
  }
  return out
}
