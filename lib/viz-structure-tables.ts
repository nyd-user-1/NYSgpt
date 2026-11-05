// The nuclear-structure charts' data tables (chart batch B, 2026-11-04): what a click on each opens at
// /viz/data/<slug>. Each table's rows are its chart's rows in the chart's own order — the order the datum's
// carried row index (or series 0) refers to — so a row pressed points at its own datum.
import { loadE2, loadLevelStats, loadNuclideMatrix, nearMagic, nuclideName } from '@/lib/viz-data'

type Cell = string | number
export type StructureTable = { columns: string[]; rows: Cell[][]; note?: string }

/** e2.json's rows with a B(E2): /viz/weight and /viz/scatter3d. */
const withBE2 = (series: boolean) => () =>
  loadE2().then((d) => ({
    columns: ['Nuclide', 'Z', 'N', 'E(2⁺) (keV)', 'B(E2) (e²b²)', ...(series ? ['Series'] : [])],
    rows: d.rows
      .filter((r) => r[3] !== null)
      .map(([z, n, e2, be2]) => [nuclideName(z, n, d.els[z]), z, n, e2, be2 as number, ...(series ? [nearMagic(z, n) ? 'Near magic' : 'Midshell'] : [])]),
  }))

/** level-stats.json, every row: /viz/level-spans and /viz/level-candles. */
const levelStats = () =>
  loadLevelStats().then((d) => ({
    columns: ['Nuclide', 'Z', 'N', 'First excited (keV)', 'Median (keV)', 'Highest (keV)', 'Levels'],
    rows: d.rows.map(([z, n, el, first, median, max, count]) => [nuclideName(z, n, el), z, n, first, median, max, count]),
  }))

export const STRUCTURE_TABLES: Record<string, () => Promise<StructureTable>> = {
  weight: withBE2(true),
  scatter3d: withBE2(false),
  'first-excited': () =>
    loadE2().then((d) => ({
      columns: ['Nuclide', 'Z', 'N', 'E(2⁺) (keV)'],
      rows: d.rows.map(([z, n, e2]) => [nuclideName(z, n, d.els[z]), z, n, e2]),
    })),
  'level-spans': levelStats,
  'level-candles': levelStats,
  matrix: () =>
    loadNuclideMatrix().then((d) => ({
      columns: ['Measure', 'Measure', 'Pearson r'],
      rows: d.cells.map(([i, j, r]) => [d.labels[i], d.labels[j], r]),
      note: `over ${d.n} nuclides with all nine`,
    })),
}
