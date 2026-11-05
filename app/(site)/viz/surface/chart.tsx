'use client'

import { useEChart } from '@/components/viz/use-echart'
import { loadField } from '@/lib/viz-data'

export function SurfaceChart() {
  const ref = useEChart(loadField, (field) => {
    // The surface wants a full grid: every (N, Z) cell, zero where the literature is silent.
    const NMAX = 170
    const ZMAX = 110
    const height = new Map(field.map((p) => [`${p.n},${p.z}`, Math.log10(p.c + 1)]))
    const data: [number, number, number][] = []
    for (let z = 0; z <= ZMAX; z++) for (let n = 0; n <= NMAX; n++) data.push([n, z, height.get(`${n},${z}`) ?? 0])
    return {
      backgroundColor: 'transparent',
      tooltip: {},
      visualMap: { show: false, dimension: 2, min: 0, max: 4.5, inRange: { color: ['#060b18', '#172554', '#1d4ed8', '#00bfff', '#e0f2fe'] } },
      xAxis3D: { type: 'value', name: 'N', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569' }, axisLine: { lineStyle: { color: '#1e293b' } } },
      yAxis3D: { type: 'value', name: 'Z', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569' }, axisLine: { lineStyle: { color: '#1e293b' } } },
      zAxis3D: { type: 'value', name: 'log papers', nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569' }, axisLine: { lineStyle: { color: '#1e293b' } } },
      grid3D: {
        boxWidth: 170, boxDepth: 110, boxHeight: 46,
        viewControl: { distance: 230, alpha: 38, beta: 18 },
        light: { main: { intensity: 1.2, shadow: true }, ambient: { intensity: 0.3 } },
        environment: '#05070d',
      },
      series: [{ type: 'surface', data, shading: 'color', wireframe: { show: false } }],
    }
  }, true)
  return <div ref={ref} className="h-[78vh] w-full" />
}
