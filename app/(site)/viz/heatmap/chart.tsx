'use client'

import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'
import { loadField } from '@/lib/viz-data'

const full = new Intl.NumberFormat('en')

export function HeatmapChart() {
  const ref = useEChart(loadField, (field) => {
    const data = field.map((p) => [p.n, p.z, Math.log10(p.c + 1)])
    const counts = new Map(field.map((p) => [`${p.n},${p.z}`, p.c]))
    const max = Math.max(1, ...data.map((p) => p[2] as number))
    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        formatter: (p: unknown) => {
          const v = (p as { value: [number, number, number] }).value
          return `Z ${v[1]} · N ${v[0]} — ${full.format(counts.get(`${v[0]},${v[1]}`) ?? 0)} papers`
        },
      },
      grid: { left: 48, right: 24, top: 16, bottom: 44 },
      xAxis: { type: 'category', data: Array.from({ length: 181 }, (_, i) => i), name: 'N', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569', fontSize: 10, interval: 19 }, axisLine: { lineStyle: { color: '#1e293b' } }, splitArea: { show: false } },
      yAxis: { type: 'category', data: Array.from({ length: 119 }, (_, i) => i), name: 'Z', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569', fontSize: 10, interval: 19 }, axisLine: { lineStyle: { color: '#1e293b' } }, splitArea: { show: false } },
      visualMap: { show: false, min: 0, max, inRange: { color: ['#0b1a3a', '#1d4ed8', '#00bfff', '#f0f9ff'] } },
      series: [{ type: 'heatmap', data, progressive: 2000, emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } } }],
    }
  }, false, firstSeriesRow)
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
