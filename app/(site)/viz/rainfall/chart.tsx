'use client'

import { useEChart } from '@/components/viz/use-echart'
import { AXIS, FAMILIES, FAMILY, countsByA, familyColor, loadDecay } from '@/lib/viz-physics'

const full = new Intl.NumberFormat('en')

// Nuclides per mass number, stacked by primary decay mode (chart batch A, 2026-11-04): for each A, how many ENSDF
// ground states there are, and how they decay — stable at the foot, then β−, β+/EC, α, fission, p and n emission.
export function RainfallChart() {
  const ref = useEChart(loadDecay, (decay) => {
    const { as, counts } = countsByA(decay)
    return {
      backgroundColor: 'transparent',
      animationDuration: 900,
      tooltip: {
        trigger: 'axis',
        formatter: (ps: unknown) => {
          const list = ps as { axisValue: string; seriesName: string; value: number; color: string }[]
          if (!list.length) return ''
          const total = list.reduce((s, p) => s + (p.value || 0), 0)
          const lines = list.filter((p) => p.value).map((p) => `${p.seriesName} ${full.format(p.value)}`)
          return `A ${list[0].axisValue} — ${full.format(total)} nuclides<br/>${lines.join(' · ')}`
        },
      },
      legend: { top: 0, icon: 'roundRect', textStyle: { color: '#334155' }, itemWidth: 14, itemHeight: 8 },
      grid: { left: 56, right: 24, top: 40, bottom: 64 },
      dataZoom: [
        { type: 'slider', bottom: 8, start: 0, end: 100 },
        { type: 'inside' },
      ],
      xAxis: { type: 'category', data: as, name: 'A', boundaryGap: false, ...AXIS },
      yAxis: { type: 'value', name: 'nuclides', ...AXIS, splitLine: { lineStyle: { color: 'rgba(100,116,139,0.12)' } } },
      series: FAMILIES.map((f) => ({
        name: FAMILY[f].label,
        type: 'line',
        stack: 'all',
        data: counts[f],
        showSymbol: false,
        step: 'middle',
        lineStyle: { width: 0 },
        areaStyle: { color: familyColor(f), opacity: 0.85 },
        itemStyle: { color: familyColor(f) },
        emphasis: { focus: 'series' },
      })),
    }
  }, false, (p) => (typeof p.dataIndex === 'number' ? p.dataIndex : null))
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
