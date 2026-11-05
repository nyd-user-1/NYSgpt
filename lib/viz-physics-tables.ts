// The physics charts' data tables (chart batch A, 2026-11-04): what a click on each opens at /viz/data/<slug>.
// Every table's rows come through the same lib/viz-physics.ts function as its chart's series 0, in the same
// order, so a row pressed points at its own datum.
import {
  FAMILIES,
  FAMILY,
  SERIES,
  countsByA,
  decayIndex,
  decayLinks,
  decaySeries,
  familyOf,
  halfLifeRun,
  halfLifeText,
  keyOf,
  loadDecay,
  loadMasses,
  loadMassesAndDecay,
  modesText,
  nucName,
  separationCandles,
} from '@/lib/viz-physics'

type Cell = string | number
export type PhysicsTable = { columns: string[]; rows: Cell[][]; note?: string }

const fmt = new Intl.NumberFormat('en')
const MeV = (kev: number | null): Cell => (kev === null ? '—' : kev / 1000)

const massTable = () =>
  loadMassesAndDecay().then(([ms, decay]) => {
    const di = decayIndex(decay)
    return {
      columns: ['Nuclide', 'Z', 'N', 'B/A (MeV)', 'Primary decay', 'AME mass'],
      rows: ms.map(m => [nucName(m), m.z, m.n, MeV(m.b), FAMILY[familyOf(decay.nuclides[di.get(keyOf(m.z, m.n)) ?? -1])].label, m.est ? 'extrapolated' : 'measured']),
    }
  })

export const PHYSICS_TABLES: Record<string, () => Promise<PhysicsTable>> = {
  nebula: massTable,
  surface: massTable,
  heatmap: () =>
    loadDecay().then(d => ({
      columns: ['Nuclide', 'Z', 'N', 'Half-life', 'Decay modes'],
      rows: d.nuclides.map(x => [nucName(x), x.z, x.n, halfLifeText(x), modesText(x, d.modes)]),
    })),
  rainfall: () =>
    loadDecay().then(d => {
      const { as, counts } = countsByA(d)
      return {
        columns: ['A', ...FAMILIES.map(f => FAMILY[f].label), 'Total'],
        rows: as.map((a, i) => [a, ...FAMILIES.map(f => counts[f][i]), FAMILIES.reduce((s, f) => s + counts[f][i], 0)]),
      }
    }),
  'bar-large': () =>
    loadDecay().then(d => {
      const run = halfLifeRun(d)
      const stable = d.nuclides.filter(x => x.t === null).length
      return {
        columns: ['Nuclide', 'Half-life', 'Seconds', 'Decay modes'],
        rows: run.map(x => [nucName(x), halfLifeText(x), (x.t as number).toExponential(3).replace('e', 'E'), modesText(x, d.modes)]),
        note: `${fmt.format(stable)} stable and ${fmt.format(d.nuclides.length - stable - run.length)} without a half-life not listed`,
      }
    }),
  graph: () =>
    loadDecay().then(d => {
      const links = decayLinks(d)
      const out = d.nuclides.map(() => [] as string[])
      const fed = d.nuclides.map(() => 0)
      for (const l of links) {
        out[l.from].push(`${nucName(d.nuclides[l.to])} (${d.modes[l.mode]?.label ?? l.mode})`)
        fed[l.to]++
      }
      return {
        columns: ['Nuclide', 'Half-life', 'Decays to', 'Parents'],
        rows: d.nuclides.map((x, i) => [nucName(x), halfLifeText(x), out[i].join(', '), fed[i]]),
        note: `${fmt.format(links.length)} decay links`,
      }
    }),
  reactions: () =>
    loadDecay().then(d => ({
      columns: ['Series', 'Parent', 'Daughter', 'Mode', 'Branch %', 'Parent half-life'],
      rows: decaySeries(d).map(s => [
        SERIES[s.series].name,
        nucName(d.nuclides[s.from]),
        nucName(d.nuclides[s.to]),
        d.modes[s.mode]?.label ?? s.mode,
        s.pct === null ? '—' : String(s.pct),
        halfLifeText(d.nuclides[s.from]),
      ]),
    })),
  separation: () =>
    loadMasses().then(ms => ({
      columns: ['Nuclide', 'Z', 'N', 'Sₙ(N−1) (MeV)', 'Sₙ (MeV)', 'σ(Sₙ) (keV)', 'Levels known'],
      rows: separationCandles(ms).map(({ m, prev }) => [nucName(m), m.z, m.n, MeV(prev.sn), MeV(m.sn), m.su === null ? '—' : String(m.su), m.nl ?? 0]),
    })),
  'nuclide-card': () =>
    loadMassesAndDecay().then(([ms, decay]) => {
      const di = decayIndex(decay)
      return {
        columns: ['Nuclide', 'Half-life', 'Qα (MeV)', 'Qβ− (MeV)', 'Sₙ (MeV)', 'Sₚ (MeV)', 'E(2⁺) (MeV)'],
        rows: ms.map(m => [nucName(m), halfLifeText(decay.nuclides[di.get(keyOf(m.z, m.n)) ?? -1]), MeV(m.qa), MeV(m.qb), MeV(m.sn), MeV(m.sp), MeV(m.e2)]),
      }
    }),
}
