'use client'

import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'
import { AXIS, familyColor, familyOf, halfLifeRun, halfLifeText, ink, loadDecay, modesText, nucName, sup } from '@/lib/viz-physics'

const YEAR = 365.2422 * 86400

// Every measured half-life, longest first, on a log axis (chart batch A, 2026-11-04): the radioactive ENSDF
// ground states that give one, each bar in its primary decay mode's colour. Lines mark a second, a year and the
// age of the universe. The bars stand on log₁₀ T½ shifted by FLOOR on a value axis, labelled back as powers of
// ten: on ECharts' log axis a bar grows from 1 s, so sub-second half-lives would hang below it.
const FLOOR = 25
export function BarLargeChart() {
  const ref = useEChart(loadDecay, (decay) => {
    const run = halfLifeRun(decay)
    const line = (s: number, label: string) => ({ yAxis: Math.log10(s) + FLOOR, label: { formatter: label, position: 'insideEndTop', color: ink(), fontSize: 10 } })
    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        formatter: (ps: unknown) => {
          const i = (ps as { dataIndex: number }[])[0]?.dataIndex
          const x = typeof i === 'number' ? run[i] : undefined
          if (!x) return ''
          const modes = modesText(x, decay.modes)
          return `${nucName(x)} — ${halfLifeText(x)}${modes ? ` · ${modes}` : ''}`
        },
      },
      grid: { left: 64, right: 24, top: 16, bottom: 64 },
      dataZoom: [
        { type: 'slider', bottom: 8, start: 0, end: 100 },
        { type: 'inside' },
      ],
      xAxis: { type: 'category', data: run.map(nucName), ...AXIS },
      yAxis: {
        type: 'value',
        name: 'T½, s',
        min: 0,
        max: 60,
        interval: 5,
        ...AXIS,
        axisLabel: { ...AXIS.axisLabel, formatter: (v: number) => `10${sup(v - FLOOR)}` },
        splitLine: { lineStyle: { color: 'rgba(100,116,139,0.12)' } },
      },
      series: [
        {
          type: 'bar',
          barCategoryGap: 0,
          data: run.map((x) => ({ value: Math.log10(x.t as number) + FLOOR, itemStyle: { color: familyColor(familyOf(x)) } })),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
            data: [line(1, '1 s'), line(YEAR, '1 y'), line(13.8e9 * YEAR, 'Age of the universe')],
          },
        },
      ],
    }
  }, false, firstSeriesRow)
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
