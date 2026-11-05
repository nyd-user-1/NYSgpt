'use client'

import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'
import { loadTriples } from '@/lib/viz-data'

const full = new Intl.NumberFormat('en')

export function Scatter3dDatasetChart() {
  const ref = useEChart(loadTriples, (rows) => ({
    backgroundColor: 'transparent',
    tooltip: { formatter: (p: unknown) => { const v = (p as { value: [number, number, number, number, number] }).value; return `${v[0]} — ${full.format(v[3])} refs · ${full.format(v[4])} citations` } },
    xAxis3D: { type: 'value', name: 'year', min: 1950, max: 2026, nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569' }, axisLine: { lineStyle: { color: '#1e293b' } } },
    yAxis3D: { type: 'value', name: 'log refs', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569' }, axisLine: { lineStyle: { color: '#1e293b' } } },
    zAxis3D: { type: 'value', name: 'log citations', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569' }, axisLine: { lineStyle: { color: '#1e293b' } } },
    grid3D: { boxWidth: 140, boxDepth: 90, boxHeight: 90, viewControl: { distance: 240, alpha: 14, beta: 32 }, environment: '#05070d' },
    series: [
      {
        type: 'scatter3D',
        symbolSize: 3.5,
        itemStyle: { opacity: 0.6 },
        data: rows.map((r) => ({
          value: [r.y, Math.log10(r.refs + 1), Math.log10(r.cites + 1), r.refs, r.cites],
          itemStyle: { color: r.nsr ? '#3b63d8' : '#00bfff' },
        })),
      },
    ],
  }), true, firstSeriesRow)
  return <div ref={ref} className="h-[78vh] w-full" />
}
