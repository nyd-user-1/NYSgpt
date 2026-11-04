'use client'

import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'

const LABELS: Record<string, string> = {
  yr: 'Year',
  cites: 'Citations',
  infl: 'Influential',
  refs: 'References',
  authors: 'Authors',
  nuclides: 'Nuclides',
  reactions: 'Reactions',
  subjects: 'Subjects',
  exfor: 'EXFOR-linked',
}

export function MatrixChart({ vars, cells }: { vars: string[]; cells: [number, number, number][] }) {
  const ref = useEChart(() => {
    const names = vars.map((v) => LABELS[v] ?? v)
    return {
      backgroundColor: 'transparent',
      animationDuration: 600,
      tooltip: {
        formatter: (p: unknown) => {
          const v = (p as { value: [number, number, number] }).value
          return `${names[v[0]]} × ${names[v[1]]} — r = ${v[2].toFixed(3)}`
        },
      },
      grid: { left: 110, right: 90, top: 16, bottom: 90 },
      xAxis: { type: 'category', data: names, axisLabel: { color: '#334155', rotate: 40 }, axisLine: { lineStyle: { color: '#94a3b8' } }, splitArea: { show: true, areaStyle: { color: ['rgba(148,163,184,0.04)', 'rgba(148,163,184,0.08)'] } } },
      yAxis: { type: 'category', data: names, inverse: true, axisLabel: { color: '#334155' }, axisLine: { lineStyle: { color: '#94a3b8' } }, splitArea: { show: true, areaStyle: { color: ['rgba(148,163,184,0.04)', 'rgba(148,163,184,0.08)'] } } },
      visualMap: {
        min: -0.6,
        max: 0.6,
        calculable: true,
        orient: 'vertical',
        right: 8,
        top: 'center',
        inRange: { color: ['#dc2626', '#fca5a5', '#f8fafc', '#93c5fd', '#1e3a8a'] },
        textStyle: { color: '#64748b' },
      },
      series: [
        {
          type: 'heatmap',
          data: cells,
          label: {
            show: true,
            fontSize: 10,
            formatter: (p: unknown) => (p as { value: [number, number, number] }).value[2].toFixed(2),
            color: '#334155',
          },
          itemStyle: { borderColor: '#f9f9f9', borderWidth: 2 },
          emphasis: { itemStyle: { borderColor: '#1e3a8a', borderWidth: 2 } },
        },
      ],
    }
  }, false, firstSeriesRow)
  return <div ref={ref} className="h-[78vh] w-full" />
}
