'use client'

import { useEChart } from '@/components/viz/use-echart'

const full = new Intl.NumberFormat('en')
type Row = { y: number; c: number }

export function RainfallChart({ papers, exfor }: { papers: Row[]; exfor: Row[] }) {
  const ref = useEChart(() => {
    const years = papers.map((r) => r.y)
    const byYear = new Map(exfor.map((r) => [r.y, r.c]))
    return {
      backgroundColor: 'transparent',
      animationDuration: 900,
      tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => full.format(Number(v)) },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      legend: { top: 0, textStyle: { color: '#334155' } },
      grid: [
        { left: 64, right: 32, top: 40, height: '36%' },
        { left: 64, right: 32, top: '58%', height: '28%' },
      ],
      dataZoom: [
        { type: 'slider', xAxisIndex: [0, 1], bottom: 8, start: 20, end: 100 },
        { type: 'inside', xAxisIndex: [0, 1] },
      ],
      xAxis: [
        { type: 'category', data: years, gridIndex: 0, axisLabel: { color: '#64748b' }, axisLine: { lineStyle: { color: '#94a3b8' } } },
        { type: 'category', data: years, gridIndex: 1, position: 'top', axisLabel: { show: false }, axisLine: { lineStyle: { color: '#94a3b8' } } },
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, name: 'papers', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: 'rgba(100,116,139,0.12)' } } },
        { type: 'value', gridIndex: 1, inverse: true, name: 'into EXFOR', nameLocation: 'start', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: 'rgba(100,116,139,0.12)' } } },
      ],
      series: [
        { name: 'Papers', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: papers.map((r) => r.c), showSymbol: false, smooth: 0.2, lineStyle: { color: '#1e3a8a', width: 2 }, areaStyle: { color: '#1e3a8a', opacity: 0.12 } },
        { name: 'Into EXFOR', type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: years.map((y) => byYear.get(y) ?? 0), showSymbol: false, smooth: 0.2, lineStyle: { color: '#00bfff', width: 2 }, areaStyle: { color: '#00bfff', opacity: 0.14 } },
      ],
    }
  })
  return <div ref={ref} className="h-[78vh] w-full" />
}
