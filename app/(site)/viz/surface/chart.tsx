'use client'

import * as React from 'react'

import { useEChart } from '@/components/viz/use-echart'
import { keyOf, loadMasses, nucName } from '@/lib/viz-physics'

// The measured mass surface (chart batch A, 2026-11-04): binding energy per nucleon over (N, Z) from AME2020, as
// terrain. Cells with no AME mass are left out (NaN), so the surface ends where the known nuclides end. The floor
// is 6 MeV: everything from oxygen up lies between 6 and 8.8, and the few lighter nuclides below it (down to ²H's
// 1.1) would flatten that range to a strip; they rest on the floor, and the tooltip gives their value.
const NMAX = 178
const ZMAX = 118
const FLOOR = 6

export function SurfaceChart() {
  // The table row of each grid cell (the grid runs N fastest, then Z), for the click.
  const cellRow = React.useRef<(number | undefined)[]>([])
  const ref = useEChart(loadMasses, (masses) => {
    const row = new Map(masses.map((m, i) => [keyOf(m.z, m.n), i]))
    const data: [number, number, number][] = []
    cellRow.current = []
    for (let z = 0; z <= ZMAX; z++)
      for (let n = 0; n <= NMAX; n++) {
        const i = row.get(keyOf(z, n))
        cellRow.current.push(i)
        data.push([n, z, i === undefined ? NaN : Math.max(FLOOR, (masses[i].b ?? 0) / 1000)])
      }
    return {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (p: unknown) => {
          const v = (p as { value?: number[] }).value
          const i = v ? row.get(keyOf(v[1], v[0])) : undefined
          if (i === undefined) return ''
          const m = masses[i]
          return `${nucName(m)} · Z ${m.z} · N ${m.n} — ${((m.b ?? 0) / 1000).toFixed(3)} MeV per nucleon${m.est ? ' (extrapolated)' : ''}`
        },
      },
      visualMap: { show: false, dimension: 2, min: 7, max: 8.8, inRange: { color: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'] } },
      xAxis3D: { type: 'value', name: 'N', max: NMAX, nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569' }, axisLine: { lineStyle: { color: '#1e293b' } } },
      yAxis3D: { type: 'value', name: 'Z', max: ZMAX, nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569' }, axisLine: { lineStyle: { color: '#1e293b' } } },
      zAxis3D: { type: 'value', name: 'B/A, MeV', min: FLOOR, max: 9, nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569' }, axisLine: { lineStyle: { color: '#1e293b' } } },
      grid3D: {
        boxWidth: 178, boxDepth: 118, boxHeight: 50,
        viewControl: { distance: 230, alpha: 40, beta: -20 },
        light: { main: { intensity: 1.1, shadow: true }, ambient: { intensity: 0.35 } },
        environment: '#05070d',
      },
      series: [{ type: 'surface', data, shading: 'lambert', wireframe: { show: false } }],
    }
  }, true, (p) => (p.seriesIndex === 0 && typeof p.dataIndex === 'number' ? cellRow.current[p.dataIndex] ?? null : null))
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
