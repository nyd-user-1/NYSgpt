'use client'

import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'
import { AXIS, decayIndex, familyColor, familyOf, halfLifeText, ink, keyOf, loadMassesAndDecay, nucName } from '@/lib/viz-physics'

// Binding energy per nucleon against mass number, every AME2020 nuclide (chart batch A, 2026-11-04), each dot in
// its decay mode's colour. The top of the curve is ⁶²Ni, a hair above ⁵⁸Fe and ⁵⁶Fe; both ends are marked.
export function NebulaChart({ fill }: { fill?: boolean }) {
  const ref = useEChart(loadMassesAndDecay, ([masses, decay]) => {
    const index = decayIndex(decay)
    const at = (z: number, n: number) => decay.nuclides[index.get(keyOf(z, n)) ?? -1]
    const data = masses.map((m, row) => ({
      value: [m.z + m.n, (m.b ?? 0) / 1000, row],
      itemStyle: { color: familyColor(familyOf(at(m.z, m.n))), opacity: m.est ? 0.45 : 0.85 },
    }))
    const mark = (z: number, n: number, dx: number) => {
      const m = masses.find((x) => x.z === z && x.n === n)
      return m && {
        coord: [z + n, (m.b ?? 0) / 1000],
        label: { show: true, position: 'top', offset: [dx, -2], formatter: `${nucName(m)} ${((m.b ?? 0) / 1000).toFixed(3)}`, color: ink(), fontSize: 11 },
      }
    }
    return {
      backgroundColor: 'transparent',
      animationDuration: 1200,
      tooltip: {
        formatter: (p: unknown) => {
          const row = (p as { value?: number[] }).value?.[2]
          const m = typeof row === 'number' ? masses[row] : undefined
          if (!m) return ''
          return `${nucName(m)} — ${((m.b ?? 0) / 1000).toFixed(4)} MeV per nucleon${m.est ? ' (extrapolated)' : ''} · ${halfLifeText(at(m.z, m.n))}`
        },
      },
      grid: { left: 56, right: 24, top: 40, bottom: 44 },
      xAxis: { type: 'value', name: 'A', max: 300, ...AXIS },
      yAxis: { type: 'value', name: 'B/A, MeV', min: 0, max: 9.2, ...AXIS },
      series: [
        {
          type: 'scatter',
          data,
          symbolSize: 3.5,
          markPoint: {
            symbol: 'circle',
            symbolSize: 7,
            itemStyle: { color: 'transparent', borderColor: ink(), borderWidth: 1.2 },
            data: [mark(28, 34, 26), mark(26, 30, -26)].filter(Boolean),
          },
        },
      ],
    }
  }, false, firstSeriesRow)
  return <div ref={ref} className={fill ? 'h-full min-h-0 w-full flex-1' : 'h-[78vh] w-full'} />
}
