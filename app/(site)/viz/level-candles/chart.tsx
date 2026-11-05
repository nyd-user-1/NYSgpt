'use client'

import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'
import { loadLevelStats, nuclideName } from '@/lib/viz-data'

// One candle per nuclide, ordered by A then Z (chart batch B, 2026-11-04; ECharts' candlestick-large pattern): the
// body runs from the first excited level to the median level, the wick from the ground state to the highest known
// level, MeV. From level-stats.json, every ENSDF adopted level with an absolute energy. The x zoom filters, so the
// energy axis rescales to the candles in view. Series 0 draws the table's rows in order.

const full = new Intl.NumberFormat('en', { maximumSignificantDigits: 4 })

export function LevelCandlesChart() {
  const ref = useEChart(
    loadLevelStats,
    (d) => {
      const names = d.rows.map(([z, n, el]) => nuclideName(z, n, el))
      return {
        backgroundColor: 'transparent',
        animation: false,
        tooltip: {
          trigger: 'axis',
          formatter: (ps: unknown) => {
            const i = (ps as { dataIndex: number }[])[0].dataIndex
            const [, , , first, median, max, count] = d.rows[i]
            return `${names[i]} — first excited ${full.format(first)} keV · median ${full.format(median)} keV · highest ${full.format(max)} keV · ${count} levels`
          },
        },
        grid: { left: 64, right: 24, top: 16, bottom: 72 },
        dataZoom: [
          { type: 'slider', bottom: 8, start: 0, end: 4 },
          { type: 'inside' },
        ],
        xAxis: { type: 'category', data: names, axisLabel: { color: '#64748b', fontSize: 10 }, axisLine: { lineStyle: { color: '#94a3b8' } } },
        yAxis: { type: 'value', name: 'Level energy, MeV', min: 0, nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: 'rgba(100,116,139,0.12)' } } },
        series: [
          {
            type: 'candlestick',
            large: true,
            largeThreshold: 500,
            // ECharts' order: open, close, lowest, highest.
            data: d.rows.map(([, , , first, median, max]) => [first / 1000, median / 1000, 0, max / 1000]),
            itemStyle: { color: '#1e3a8a', color0: '#dc2626', borderColor: '#1e3a8a', borderColor0: '#dc2626' },
          },
        ],
      }
    },
    false,
    firstSeriesRow,
  )
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
