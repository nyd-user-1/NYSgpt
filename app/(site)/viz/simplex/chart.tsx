'use client'

// Capture-gamma strips (2026-11-04, chart batch B, rewritten in place of the noise field): one vertical strip per
// product nucleus, ordered by A, each of its thermal-capture γ lines a tick at its energy, shaded by intensity
// (log γ per 100 captures). The capture state's binding energy shows as the top edge the primaries climb to.

import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'
import { E_MAX_KEV, I_FLOOR, allLines, loadCapgam, logI, setName } from '@/lib/viz-gamma'

const AXIS = { nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569', fontSize: 10 }, axisLine: { lineStyle: { color: '#1e293b' } } }

export function SimplexChart() {
  const ref = useEChart(loadCapgam, (data) => {
    const names = data.sets.map(setName)
    const lines = allLines(data)
    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        formatter: (p: unknown) => {
          const l = lines[(p as { dataIndex: number }).dataIndex]
          if (!l) return ''
          return `${names[l.set]} — ${l.e.toLocaleString('en')} keV · ${l.i === null ? 'no intensity' : `${l.i} per 100 captures`}${l.primary ? ' · primary' : ''}`
        },
      },
      grid: { left: 64, right: 24, top: 16, bottom: 56 },
      xAxis: { type: 'category', data: names, name: 'Product nucleus, by A', nameLocation: 'middle', nameGap: 34, axisTick: { show: false }, splitLine: { show: false }, ...AXIS },
      yAxis: { type: 'value', name: 'Eγ (keV)', min: 0, max: E_MAX_KEV, splitLine: { lineStyle: { color: '#1e293b', opacity: 0.12 } }, ...AXIS },
      visualMap: { show: false, dimension: 2, min: Math.log10(I_FLOOR), max: 2, inRange: { color: ['#0b1a3a', '#1d4ed8', '#00bfff', '#f0f9ff'] } },
      series: [
        {
          type: 'scatter',
          symbol: 'rect',
          symbolSize: [4, 1.5],
          data: lines.map((l) => [l.set, l.e, logI(l.i)]),
          progressive: 5000,
          progressiveThreshold: 10000,
          emphasis: { scale: 2.4 },
        },
      ],
    }
  }, false, firstSeriesRow)
  return <div ref={ref} className="h-[78vh] w-full" />
}
