'use client'

import { useEChart } from '@/components/viz/use-echart'
import { AXIS, SERIES, decaySeries, halfLifeText, ink, isDark, loadDecay, modesText, nucName } from '@/lib/viz-physics'

// The three natural decay series as routes over (N, Z) (chart batch A, 2026-11-04): uranium from ²³⁸U, thorium
// from ²³²Th, actinium from ²³⁵U, every α and β branch of at least 0.001% down to stable lead. Each step carries
// a light whose speed follows its parent's half-life — ²¹²Po's 0.3 µs flashes past, ²³⁸U's 4.5 Gy crawls. Series 0
// holds every step in table order; the three legend entries are empty series that only carry the colours.
const N0 = 120
const N1 = 148
const Z0 = 79
const Z1 = 94

/** Seconds a light takes to cross its step: 0.4 s for the shortest half-lives, 9 s for the longest. */
const period = (t: number | null) => {
  if (t === null || t <= 0) return 9
  const k = (Math.log10(t) + 7) / 25
  return 0.4 + 8.6 * Math.min(1, Math.max(0, k))
}

export function ReactionsChart() {
  const ref = useEChart(loadDecay, (decay) => {
    const dark = isDark()
    const steps = decaySeries(decay)
    const colour = (s: number) => (dark ? SERIES[s].dark : SERIES[s].light)
    const members = new Map<number, number>()
    for (const s of steps) {
      members.set(s.from, s.series)
      members.set(s.to, s.series)
    }
    const at = (i: number) => [decay.nuclides[i].n, decay.nuclides[i].z]
    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        formatter: (p: unknown) => {
          const d = p as { seriesIndex: number; dataIndex: number }
          if (d.seriesIndex === 0) {
            const s = steps[d.dataIndex]
            const x = decay.nuclides[s.from]
            const label = decay.modes[s.mode]?.label ?? s.mode
            return `${nucName(x)} → ${nucName(decay.nuclides[s.to])} · ${label}${s.pct === null ? '' : ` ${s.pct}%`} · T½ ${halfLifeText(x)}`
          }
          if (d.seriesIndex === 1) {
            const x = decay.nuclides[[...members.keys()][d.dataIndex]]
            const modes = modesText(x, decay.modes)
            return `${nucName(x)} — ${halfLifeText(x)}${modes ? ` · ${modes}` : ''}`
          }
          return ''
        },
      },
      legend: { top: 0, selectedMode: false, textStyle: { color: '#334155' }, data: SERIES.map((s) => s.name) },
      grid: { left: 48, right: 24, top: 36, bottom: 44 },
      xAxis: { type: 'value', name: 'N', min: N0, max: N1, interval: 2, ...AXIS, splitLine: { lineStyle: { color: 'rgba(100,116,139,0.08)' } } },
      yAxis: { type: 'value', name: 'Z', min: Z0, max: Z1, interval: 1, ...AXIS, splitLine: { lineStyle: { color: 'rgba(100,116,139,0.08)' } } },
      series: [
        {
          type: 'lines',
          coordinateSystem: 'cartesian2d',
          zlevel: 1,
          data: steps.map((s) => ({
            coords: [at(s.from), at(s.to)],
            lineStyle: { color: colour(s.series), opacity: s.pct !== null && s.pct < 1 ? 0.35 : 0.8, width: s.pct !== null && s.pct < 1 ? 1 : 2 },
            effect: { period: period(decay.nuclides[s.from].t) },
          })),
          effect: { show: true, symbol: 'circle', symbolSize: 5, trailLength: 0.35, loop: true },
        },
        // The series' nuclides, named; stable lead in ink.
        {
          type: 'scatter',
          zlevel: 2,
          data: [...members].map(([i, s]) => {
            const x = decay.nuclides[i]
            return {
              value: at(i),
              symbolSize: x.t === null ? 9 : 6,
              itemStyle: { color: x.t === null ? ink(dark) : colour(s) },
              label: { show: true, formatter: nucName(x), position: 'right', distance: 4, fontSize: 10, color: ink(dark) },
            }
          }),
        },
        // Every other nuclide in the window, faint, for the ground.
        {
          type: 'scatter',
          silent: true,
          data: decay.nuclides.filter((x) => x.n >= N0 && x.n <= N1 && x.z >= Z0 && x.z <= Z1).map((x) => [x.n, x.z]),
          symbolSize: 4,
          itemStyle: { color: '#94a3b8', opacity: 0.25 },
        },
        ...SERIES.map((s, i) => ({ name: s.name, type: 'line', data: [], itemStyle: { color: colour(i) }, lineStyle: { color: colour(i) } })),
      ],
    }
  }, false, (p) => (p.seriesIndex === 0 && typeof p.dataIndex === 'number' ? p.dataIndex : null))
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
