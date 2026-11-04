'use client'

import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'

const full = new Intl.NumberFormat('en')

export function NebulaChart({ field }: { field: { n: number; z: number; c: number }[] }) {
  const ref = useEChart(() => {
    const data = field.map((p) => [p.n, p.z, p.c, Math.log10(p.c + 1)])
    const max = Math.max(1, ...data.map((p) => p[3] as number))
    return {
      backgroundColor: 'transparent',
      animationDuration: 1200,
      tooltip: {
        formatter: (p: unknown) => {
          const v = (p as { value: [number, number, number] }).value
          return `Z ${v[1]} · N ${v[0]} — ${full.format(v[2])} papers`
        },
      },
      grid: { left: 48, right: 24, top: 16, bottom: 44 },
      xAxis: { type: 'value', name: 'N', max: 180, nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569', fontSize: 10 }, axisLine: { lineStyle: { color: '#1e293b' } }, splitLine: { show: false } },
      yAxis: { type: 'value', name: 'Z', max: 118, nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569', fontSize: 10 }, axisLine: { lineStyle: { color: '#1e293b' } }, splitLine: { show: false } },
      visualMap: { show: false, dimension: 3, min: 0, max, inRange: { color: ['#172554', '#1d4ed8', '#00bfff', '#e0f2fe'], symbolSize: [2, 9] } },
      series: [{ type: 'scatter', data, blendMode: 'lighter', itemStyle: { opacity: 0.85 } }],
    }
  }, false, firstSeriesRow)
  return <div ref={ref} className="h-[78vh] w-full" />
}
