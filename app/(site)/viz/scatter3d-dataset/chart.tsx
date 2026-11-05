'use client'

// EXFOR measurements in 3D (2026-11-04, chart batch B, rewritten in place of the papers scatter): 50,000 measured
// cross sections sampled from the EXFOR library — incident energy × cross section × year, both physics axes on
// log scales, coloured by projectile. Thermal neutron capture sits in a wall at 0.0253 eV; the resonance region
// rises in spikes; fast and charged-particle work fills the MeV end.

import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'
import { PROJECTILE_GROUPS, fromLog, loadExfor, projectileGroup, targetName } from '@/lib/viz-exfor'

const AXIS = { nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569' }, axisLine: { lineStyle: { color: '#1e293b' } } }
const COLORS: Record<(typeof PROJECTILE_GROUPS)[number], string> = {
  n: '#3b63d8',
  p: '#e8730c',
  d: '#d9ab00',
  t: '#8b3fd9',
  '³He': '#d42f2f',
  α: '#1f9d4c',
  γ: '#00bfff',
  'Heavy ion': '#c026d3',
  Other: '#94a3b8',
}

export function Scatter3dDatasetChart() {
  const ref = useEChart(loadExfor, (d) => ({
    backgroundColor: 'transparent',
    tooltip: {
      formatter: (p: unknown) => {
        const v = (p as { value: number[] }).value
        return `${d.entries[v[6]]} · ${targetName(v[3], v[4])}(${d.projectiles[v[5]].toLowerCase()},…) · ${v[2]}<br/>E ${fromLog(v[0], 'eV')} — σ ${fromLog(v[1], 'b')}`
      },
    },
    xAxis3D: { type: 'value', name: 'log₁₀ E (eV)', min: -6, max: 11, ...AXIS },
    yAxis3D: { type: 'value', name: 'year', min: 1940, max: 2026, ...AXIS },
    zAxis3D: { type: 'value', name: 'log₁₀ σ (b)', min: -9, max: 7, ...AXIS },
    grid3D: { boxWidth: 150, boxDepth: 90, boxHeight: 90, viewControl: { distance: 250, alpha: 16, beta: 30, autoRotate: true, autoRotateSpeed: 3 }, environment: '#05070d' },
    series: [
      {
        type: 'scatter3D',
        symbolSize: 2.6,
        itemStyle: { opacity: 0.65 },
        data: d.rows.map((r) => ({
          value: [r[0], r[2], r[1], r[3], r[4], r[5], r[6]],
          itemStyle: { color: COLORS[projectileGroup(d.projectiles[r[5]])] },
        })),
      },
    ],
  }), true, firstSeriesRow)
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
