'use client'

import * as React from 'react'
import { useEChart, valueRow } from '@/components/viz/use-echart'
import { loadE2, nearMagic, nuclideName } from '@/lib/viz-data'

// E(2⁺) against B(E2) for the even-even nuclides that have both (chart batch B, 2026-11-04). Near a shell closure
// the first 2⁺ sits high and the transition is weak; midshell, deformed nuclei put it low and strong. Both axes log.
// Each datum carries its row in the data table (e2.json's rows with a B(E2), in order) at value[2].

const full = new Intl.NumberFormat('en', { maximumSignificantDigits: 4 })

export function WeightChart() {
  // Table row → [series, index], for a table press pointing at its datum.
  const where = React.useRef<[number, number][]>([])
  const ref = useEChart(
    loadE2,
    (d) => {
      const rows = d.rows.filter((r) => r[3] !== null)
      const names = rows.map(([z, n]) => nuclideName(z, n, d.els[z]))
      const near: number[][] = []
      const mid: number[][] = []
      where.current = rows.map(([z, n, e2, be2], k) => {
        const s = nearMagic(z, n) ? near : mid
        s.push([e2, be2 as number, k])
        return [s === near ? 0 : 1, s.length - 1] as [number, number]
      })
      const series = (name: string, data: number[][], color: string) => ({
        name, type: 'scatter', data, symbolSize: 6, itemStyle: { color, opacity: 0.7 },
        emphasis: { itemStyle: { opacity: 1 } },
      })
      return {
        backgroundColor: 'transparent',
        animationDuration: 900,
        legend: { top: 0, textStyle: { color: '#334155' } },
        tooltip: {
          formatter: (p: unknown) => {
            const v = (p as { value: [number, number, number] }).value
            return `${names[v[2]]} — E(2⁺) ${full.format(v[0])} keV · B(E2) ${full.format(v[1])} e²b²`
          },
        },
        grid: { left: 72, right: 32, top: 40, bottom: 56 },
        xAxis: { type: 'log', name: 'E(2⁺), keV', nameLocation: 'middle', nameGap: 30, nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b' }, axisLine: { lineStyle: { color: '#94a3b8' } }, splitLine: { show: false } },
        yAxis: { type: 'log', name: 'B(E2), e²b²', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: 'rgba(100,116,139,0.12)' } } },
        series: [series('Near a magic number (Z or N within 2)', near, '#00bfff'), series('Midshell', mid, '#1e3a8a')],
      }
    },
    false,
    valueRow(2),
    { point: (row) => (where.current[row] ? { seriesIndex: where.current[row][0], dataIndex: where.current[row][1] } : null) },
  )
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
