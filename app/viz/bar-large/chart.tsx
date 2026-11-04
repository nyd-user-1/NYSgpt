'use client'

import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'

const full = new Intl.NumberFormat('en')

export function BarLargeChart({ bars }: { bars: { a: number; sym: string; c: number }[] }) {
  const ref = useEChart(() => ({
    backgroundColor: 'transparent',
    animation: false,
    tooltip: { trigger: 'axis', formatter: (ps: unknown) => { const p = (ps as { name: string; value: number }[])[0]; return `${p.name} — ${full.format(p.value)} papers` } },
    grid: { left: 64, right: 24, top: 16, bottom: 64 },
    dataZoom: [
      { type: 'slider', bottom: 8, start: 0, end: 6 },
      { type: 'inside' },
    ],
    xAxis: { type: 'category', data: bars.map((b) => `${b.a}${b.sym}`), axisLabel: { color: '#64748b', fontSize: 10 }, axisLine: { lineStyle: { color: '#94a3b8' } } },
    yAxis: { type: 'log', min: 1, name: 'papers', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: 'rgba(100,116,139,0.12)' } } },
    series: [{ type: 'bar', data: bars.map((b) => b.c), large: true, itemStyle: { color: '#1e3a8a' } }],
  }), false, firstSeriesRow)
  return <div ref={ref} className="h-[78vh] w-full" />
}
