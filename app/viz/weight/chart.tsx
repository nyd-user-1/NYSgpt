'use client'

import { useEChart } from '@/components/viz/use-echart'

const full = new Intl.NumberFormat('en')
type Row = { y: number; c: number; nsr: boolean }

export function WeightChart({ rows }: { rows: Row[] }) {
  const ref = useEChart(() => {
    const split = (want: boolean) => rows.filter((r) => r.nsr === want).map((r) => [r.y, r.c])
    const series = (name: string, data: number[][], color: string) => ({
      name, type: 'scatter', data, symbolSize: 4, itemStyle: { color, opacity: 0.45 },
      emphasis: { itemStyle: { opacity: 1 } },
    })
    return {
      backgroundColor: 'transparent',
      animationDuration: 900,
      legend: { top: 0, textStyle: { color: '#334155' } },
      tooltip: { formatter: (p: unknown) => { const v = (p as { value: [number, number] }).value; return `${v[0]} — ${full.format(v[1])} citations` } },
      grid: { left: 64, right: 32, top: 40, bottom: 48 },
      xAxis: { type: 'value', min: 1950, max: 2026, axisLabel: { color: '#64748b', formatter: (v: number) => String(v) }, axisLine: { lineStyle: { color: '#94a3b8' } }, splitLine: { show: false } },
      yAxis: { type: 'log', min: 1, name: 'citations', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: 'rgba(100,116,139,0.12)' } } },
      series: [series('NSR record', split(true), '#1e3a8a'), series('arXiv/APS additions', split(false), '#00bfff')],
    }
  })
  return <div ref={ref} className="h-[78vh] w-full" />
}
