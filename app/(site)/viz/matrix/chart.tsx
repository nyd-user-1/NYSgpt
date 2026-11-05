'use client'

import { useEChart, valueRow } from '@/components/viz/use-echart'
import { loadNuclideMatrix } from '@/lib/viz-data'

// Pearson r across nine nuclide measures (chart batch B, 2026-11-04), over the nuclides that have all nine
// (nuclide-matrix.json). The snapshot holds the 36 pairs; the chart draws both halves and a diagonal of 1. Each
// off-diagonal cell carries its pair's table row at value[3] (−1 on the diagonal), and a table row points at the
// first of its two cells.

export function MatrixChart() {
  const ref = useEChart(
    loadNuclideMatrix,
    (d) => {
      const names = d.labels
      const data: [number, number, number, number][] = []
      d.cells.forEach(([i, j, r], k) => data.push([i, j, r, k], [j, i, r, k]))
      names.forEach((_, i) => data.push([i, i, 1, -1]))
      return {
        backgroundColor: 'transparent',
        animationDuration: 600,
        tooltip: {
          formatter: (p: unknown) => {
            const v = (p as { value: [number, number, number] }).value
            return `${names[v[0]]} × ${names[v[1]]} — r = ${v[2].toFixed(3)} over ${d.n} nuclides`
          },
        },
        grid: { left: 110, right: 90, top: 16, bottom: 90 },
        xAxis: { type: 'category', data: names, axisLabel: { color: '#334155', rotate: 40 }, axisLine: { lineStyle: { color: '#94a3b8' } }, splitArea: { show: true, areaStyle: { color: ['rgba(148,163,184,0.04)', 'rgba(148,163,184,0.08)'] } } },
        yAxis: { type: 'category', data: names, inverse: true, axisLabel: { color: '#334155' }, axisLine: { lineStyle: { color: '#94a3b8' } }, splitArea: { show: true, areaStyle: { color: ['rgba(148,163,184,0.04)', 'rgba(148,163,184,0.08)'] } } },
        visualMap: {
          min: -1,
          max: 1,
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
            data,
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
    },
    false,
    valueRow(3),
    { point: (row) => ({ seriesIndex: 0, dataIndex: row * 2 }) },
  )
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
