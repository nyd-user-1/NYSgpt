'use client'

import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'
import { loadE2, nearMagic, nuclideName } from '@/lib/viz-data'

// E(2⁺) × B(E2) × Z for the even-even nuclides that have both (chart batch B, 2026-11-04): the floor is the two
// measures on log scales, height is Z, so each element's isotopes stand in a layer. Colour splits near-magic from
// midshell as /viz/weight does. Series 0 draws the table's rows in order.

const full = new Intl.NumberFormat('en', { maximumSignificantDigits: 4 })
const pow10 = (v: number) => full.format(10 ** v)

export function Scatter3dChart() {
  const ref = useEChart(
    loadE2,
    (d) => {
      const rows = d.rows.filter((r) => r[3] !== null)
      const names = rows.map(([z, n]) => nuclideName(z, n, d.els[z]))
      const axis = (name: string, log: boolean) => ({
        type: 'value', name, nameTextStyle: { color: '#64748b' },
        axisLabel: { color: '#475569', ...(log ? { formatter: pow10 } : {}) },
        axisLine: { lineStyle: { color: '#1e293b' } },
      })
      return {
        backgroundColor: 'transparent',
        tooltip: {
          formatter: (p: unknown) => {
            const v = (p as { value: [number, number, number, number, number, number] }).value
            return `${names[v[5]]} — E(2⁺) ${full.format(v[3])} keV · B(E2) ${full.format(v[4])} e²b²`
          },
        },
        xAxis3D: axis('E(2⁺), keV', true),
        yAxis3D: axis('B(E2), e²b²', true),
        zAxis3D: axis('Z', false),
        grid3D: { boxWidth: 130, boxDepth: 110, boxHeight: 90, viewControl: { distance: 250, alpha: 18, beta: 38, autoRotate: true, autoRotateSpeed: 3 }, environment: '#05070d' },
        series: [
          {
            type: 'scatter3D',
            symbolSize: 5,
            itemStyle: { opacity: 0.85 },
            data: rows.map(([z, n, e2, be2], k) => ({
              value: [Math.log10(e2), Math.log10(be2 as number), z, e2, be2, k],
              itemStyle: { color: nearMagic(z, n) ? '#00bfff' : '#3b63d8' },
            })),
          },
        ],
      }
    },
    true,
    firstSeriesRow,
  )
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
