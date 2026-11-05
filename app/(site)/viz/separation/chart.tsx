'use client'

import { useEChart } from '@/components/viz/use-echart'
import { AXIS, isDark, loadMasses, nucName, separationCandles } from '@/lib/viz-physics'

// Neutron separation energy along each isotope chain, as candles (chart batch A, 2026-11-04). A nuclide's candle
// opens at its lighter isotope's Sₙ and closes at its own, so the pairing stagger reads as alternation: adding
// the neutron that completes a pair binds harder (a rising candle), the next one less (a falling one), and a
// magic number shows as the deep fall after it. Wicks span AME's σ at both ends, so they show only where the
// masses are extrapolated. The line is S₂ₙ/2, the pair's average; the row beneath counts the ENSDF levels known.
// Candles run by Z, then N; the view opens on tin (Z 50).
const OPEN_Z = 50

export function SeparationChart() {
  const ref = useEChart(loadMasses, (masses) => {
    const dark = isDark()
    const up = dark ? '#5b9cff' : '#2f6fdc'
    const down = dark ? '#ff8a3d' : '#e8730c'
    const candles = separationCandles(masses)
    const k = (v: number | null) => (v ?? 0) / 1000
    const first = candles.findIndex((c) => c.m.z === OPEN_Z - 1)
    let last = -1
    candles.forEach((c, i) => {
      if (c.m.z === OPEN_Z + 1) last = i
    })
    return {
      backgroundColor: 'transparent',
      animation: false,
      legend: { top: 0, textStyle: { color: '#334155' }, data: ['Sₙ', 'S₂ₙ / 2'] },
      tooltip: {
        trigger: 'axis',
        formatter: (ps: unknown) => {
          const i = (ps as { dataIndex: number }[])[0]?.dataIndex
          const c = typeof i === 'number' ? candles[i] : undefined
          if (!c) return ''
          const { m, prev } = c
          const sigma = m.su !== null && m.su >= 1 ? ` ± ${m.su.toFixed(0)} keV` : ''
          return [
            `${nucName(m)} · Z ${m.z} · N ${m.n}${m.est ? ' (extrapolated)' : ''}`,
            `Sₙ ${k(m.sn).toFixed(3)} MeV${sigma} · from ${nucName(prev)} ${k(prev.sn).toFixed(3)}`,
            `S₂ₙ / 2 ${((k(m.sn) + k(prev.sn)) / 2).toFixed(3)} MeV · ${m.nl ?? 0} levels known`,
          ].join('<br/>')
        },
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: [
        { left: 56, right: 24, top: 36, height: '58%' },
        { left: 56, right: 24, top: '76%', height: '12%' },
      ],
      dataZoom: [
        { type: 'slider', xAxisIndex: [0, 1], bottom: 8, startValue: Math.max(0, first), endValue: last > 0 ? last : 120 },
        { type: 'inside', xAxisIndex: [0, 1] },
      ],
      xAxis: [
        { type: 'category', data: candles.map((c) => nucName(c.m)), gridIndex: 0, ...AXIS, axisLabel: { ...AXIS.axisLabel, show: false } },
        { type: 'category', data: candles.map((c) => nucName(c.m)), gridIndex: 1, ...AXIS },
      ],
      yAxis: [
        { type: 'value', name: 'Sₙ, MeV', gridIndex: 0, scale: true, ...AXIS, splitLine: { lineStyle: { color: 'rgba(100,116,139,0.12)' } } },
        { type: 'value', name: 'levels', gridIndex: 1, ...AXIS, splitNumber: 2, splitLine: { show: false } },
      ],
      series: [
        {
          name: 'Sₙ',
          type: 'candlestick',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: candles.map(({ m, prev }) => {
            const o = k(prev.sn)
            const c = k(m.sn)
            const so = k(prev.su)
            const sc = k(m.su)
            return [o, c, Math.min(o - so, c - sc), Math.max(o + so, c + sc)]
          }),
          itemStyle: { color: up, color0: down, borderColor: up, borderColor0: down },
        },
        {
          name: 'S₂ₙ / 2',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          // A chain's first candle starts the line afresh, so it never joins one element's chain to the next.
          data: candles.map(({ m, prev }, i) => (i === 0 || candles[i - 1].m.z !== m.z ? '-' : (k(m.sn) + k(prev.sn)) / 2)),
          showSymbol: false,
          smooth: 0.3,
          lineStyle: { color: '#64748b', width: 1, opacity: 0.8 },
          itemStyle: { color: '#64748b' },
        },
        {
          name: 'Levels',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: candles.map(({ m, prev }) => ({ value: m.nl ?? 0, itemStyle: { color: (m.sn ?? 0) >= (prev.sn ?? 0) ? up : down, opacity: 0.7 } })),
        },
      ],
    }
  }, false, (p) => (typeof p.dataIndex === 'number' ? p.dataIndex : null))
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
