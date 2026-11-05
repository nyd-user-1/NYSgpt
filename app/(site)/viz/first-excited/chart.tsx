'use client'

import * as React from 'react'
import { useEChart, valueRow, type ChartClick } from '@/components/viz/use-echart'
import { loadE2, nuclideName } from '@/lib/viz-data'

// Every even-even nuclide's first 2⁺ energy against Z, and the same points gathered into one bar per element, the
// mean (chart batch B, 2026-11-04; ECharts' scatter-aggregate-bar pattern). The two views share a series id and
// each datum's groupId is its Z, so on the switch every point flies into its element's bar and back
// (universalTransition, which needs the option replaced whole). The shell closures at Z = 20, 28, 50 and 82 stand
// above their neighbours. Points carry their table row at value[2]; bars have none.

const full = new Intl.NumberFormat('en', { maximumSignificantDigits: 4 })
const VIEWS = ['Each nuclide', 'Mean per Z'] as const
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const
const rowOf = (p: ChartClick) => (p.seriesType === 'scatter' ? valueRow(2)(p) : null)

export function FirstExcitedChart() {
  const [view, setView] = React.useState(0)
  const ref = useEChart(
    loadE2,
    (d, v) => {
      const names = d.rows.map(([z, n]) => nuclideName(z, n, d.els[z]))
      const zs = [...new Set(d.rows.map((r) => r[0]))]
      const base = {
        backgroundColor: 'transparent',
        grid: { left: 72, right: 32, top: 24, bottom: 56 },
        yAxis: { type: 'log', name: v ? 'Mean E(2⁺), keV' : 'E(2⁺), keV', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: 'rgba(100,116,139,0.12)' } } },
      }
      const axisX = { name: 'Z', nameLocation: 'middle', nameGap: 30, nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b' }, axisLine: { lineStyle: { color: '#94a3b8' } } }
      const transition = { enabled: true, delay: (i: number) => (i % 50) * 6 }
      if (!v)
        return {
          ...base,
          tooltip: {
            formatter: (p: unknown) => {
              const x = (p as { value: [number, number, number] }).value
              return `${names[x[2]]} — E(2⁺) ${full.format(x[1])} keV`
            },
          },
          xAxis: { type: 'value', min: 0, max: Math.ceil((zs[zs.length - 1] + 2) / 10) * 10, splitLine: { show: false }, ...axisX },
          series: [
            {
              id: 'e2',
              type: 'scatter',
              data: d.rows.map(([z, , e2], k) => ({ value: [z, e2, k], groupId: String(z) })),
              symbolSize: 5,
              itemStyle: { color: '#1e3a8a', opacity: 0.6 },
              universalTransition: transition,
            },
          ],
        }
      const mean = zs.map((z) => {
        const vals = d.rows.filter((r) => r[0] === z).map((r) => r[2])
        return vals.reduce((a, b) => a + b, 0) / vals.length
      })
      const count = zs.map((z) => d.rows.filter((r) => r[0] === z).length)
      return {
        ...base,
        tooltip: {
          formatter: (p: unknown) => {
            const i = (p as { dataIndex: number }).dataIndex
            return `Z ${zs[i]} (${d.els[zs[i]]}) — mean E(2⁺) ${full.format(mean[i])} keV over ${count[i]} isotope${count[i] === 1 ? '' : 's'}`
          },
        },
        xAxis: { type: 'category', data: zs.map(String), ...axisX, axisLabel: { color: '#64748b', interval: 4 } },
        series: [
          {
            id: 'e2',
            type: 'bar',
            data: zs.map((z, i) => ({ value: mean[i], groupId: String(z) })),
            itemStyle: { color: '#1e3a8a' },
            universalTransition: transition,
          },
        ],
      }
    },
    false,
    rowOf,
    { view, replace: true, point: (row) => (view ? null : { seriesIndex: 0, dataIndex: row }) },
  )
  const btn = (on: boolean) =>
    `rounded-md px-2.5 py-1 text-[12px] transition-colors ${on ? 'bg-[var(--paper-quiet)] text-[var(--paper-strong)]' : 'text-[var(--paper-muted)] hover:text-[var(--paper-text)]'}`
  return (
    <div className="flex w-full flex-col">
      <div className="flex gap-1 self-start" style={SANS} role="group" aria-label="View">
        {VIEWS.map((label, i) => (
          <button key={label} type="button" aria-pressed={view === i} className={btn(view === i)} onClick={() => setView(i)}>
            {label}
          </button>
        ))}
      </div>
      <div ref={ref} className="h-[74vh] w-full" />
    </div>
  )
}
