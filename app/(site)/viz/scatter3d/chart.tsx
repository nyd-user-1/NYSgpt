'use client'

import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'
import { loadField } from '@/lib/viz-data'

const full = new Intl.NumberFormat('en')

export function Scatter3dChart() {
  const ref = useEChart(loadField, (field) => {
    const data = field.map((p) => [p.n, p.z, Math.log10(p.c + 1), p.c])
    const max = Math.max(1, ...data.map((p) => p[2] as number))
    return {
      backgroundColor: 'transparent',
      tooltip: { formatter: (p: unknown) => { const v = (p as { value: [number, number, number, number] }).value; return `Z ${v[1]} · N ${v[0]} — ${full.format(v[3])} papers` } },
      visualMap: { show: false, dimension: 2, min: 0, max, inRange: { color: ['#172554', '#1d4ed8', '#00bfff', '#e0f2fe'], symbolSize: [2, 10] } },
      xAxis3D: { type: 'value', name: 'N', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569' }, axisLine: { lineStyle: { color: '#1e293b' } } },
      yAxis3D: { type: 'value', name: 'Z', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569' }, axisLine: { lineStyle: { color: '#1e293b' } } },
      zAxis3D: { type: 'value', name: 'log papers', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569' }, axisLine: { lineStyle: { color: '#1e293b' } } },
      grid3D: { boxWidth: 170, boxDepth: 110, boxHeight: 56, viewControl: { distance: 240, alpha: 24, beta: 24, autoRotate: true, autoRotateSpeed: 4 }, environment: '#05070d' },
      series: [{ type: 'scatter3D', data, shading: 'color', itemStyle: { opacity: 0.85 } }],
    }
  }, true, firstSeriesRow)
  return <div ref={ref} className="h-[78vh] w-full" />
}
