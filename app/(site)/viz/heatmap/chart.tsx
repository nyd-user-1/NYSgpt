'use client'

import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'
import { halfLifeText, ink, isDark, loadDecay, modesText, nucName } from '@/lib/viz-physics'

// Half-life over the chart of nuclides (chart batch A, 2026-11-04): every ENSDF ground state at (N, Z), coloured
// by log₁₀ T½ in decade bands, long-lived dark to short-lived bright, as the wall chart bands them; stable
// nuclides in ink. One cell per nuclide, in decay.json's order, so the table's rows point straight at them.
const STABLE = 99
const NOT_GIVEN = -99
/** Expected by ENSDF, never observed (decay.json's exp) — apart from the observed nuclides with no T½ measured. */
const NOT_OBSERVED = -199
const BANDS: [number, number, string][] = [
  [15, STABLE, '≥ 10¹⁵ s'],
  [10, 15, '10¹⁰–10¹⁵ s'],
  [7, 10, '10⁷–10¹⁰ s'],
  [5, 7, '10⁵–10⁷ s'],
  [3, 5, '10³–10⁵ s'],
  [1, 3, '10–10³ s'],
  [-1, 1, '0.1–10 s'],
  [-3, -1, '10⁻³–0.1 s'],
  [-6, -3, '10⁻⁶–10⁻³ s'],
  [NOT_GIVEN + 1, -6, '< 10⁻⁶ s'],
]
const LIGHT = ['#1b2f80', '#2f6fdc', '#2aa1d6', '#22b39a', '#5cbf4a', '#b5c935', '#f2c230', '#f08a24', '#e0482f', '#b8246b']
const DARK = ['#5468d9', '#4d8cf0', '#38b6e8', '#2fcfb0', '#6fd65a', '#c8dc45', '#ffd447', '#ff9a3c', '#ff6047', '#e0428e']

export function HeatmapChart() {
  const ref = useEChart(loadDecay, (decay) => {
    const dark = isDark()
    const data = decay.nuclides.map((x) => [x.n, x.z, x.t === null ? STABLE : x.t > 0 ? Math.log10(x.t) : x.exp ? NOT_OBSERVED : NOT_GIVEN])
    const ramp = dark ? DARK : LIGHT
    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        formatter: (p: unknown) => {
          const i = (p as { dataIndex?: number }).dataIndex
          const x = typeof i === 'number' ? decay.nuclides[i] : undefined
          if (!x) return ''
          const modes = modesText(x, decay.modes)
          return `${nucName(x)} · Z ${x.z} · N ${x.n} — ${x.exp ? 'Expected, not observed' : halfLifeText(x)}${modes ? ` · ${modes}` : ''}`
        },
      },
      grid: { left: 48, right: 170, top: 16, bottom: 44 },
      xAxis: { type: 'category', data: Array.from({ length: 179 }, (_, i) => i), name: 'N', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569', fontSize: 10, interval: 19 }, axisLine: { lineStyle: { color: '#94a3b8' } }, splitArea: { show: false } },
      yAxis: { type: 'category', data: Array.from({ length: 119 }, (_, i) => i), name: 'Z', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569', fontSize: 10, interval: 19 }, axisLine: { lineStyle: { color: '#94a3b8' } }, splitArea: { show: false } },
      visualMap: {
        type: 'piecewise',
        dimension: 2,
        right: 8,
        top: 'middle',
        itemWidth: 12,
        itemHeight: 10,
        itemGap: 6,
        textStyle: { color: '#475569', fontSize: 10 },
        pieces: [
          { gte: STABLE, label: 'Stable', color: ink(dark) },
          ...BANDS.map(([lo, hi, label], i) => ({ gte: lo, lt: hi, label, color: ramp[i] })),
          { gt: NOT_OBSERVED, lte: NOT_GIVEN, label: 'Observed, T½ not measured', color: dark ? '#6b6b6b' : '#a3a3a3' },
          { lte: NOT_OBSERVED, label: 'Expected, not observed', color: dark ? '#3a3a3a' : '#dcdcdc' },
        ],
      },
      series: [{ type: 'heatmap', data, progressive: 2000, emphasis: { itemStyle: { borderColor: ink(dark), borderWidth: 1 } } }],
    }
  }, false, firstSeriesRow)
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
