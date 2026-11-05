'use client'

import { useEChart } from '@/components/viz/use-echart'
import { loadField } from '@/lib/viz-data'

export function SimplexChart() {
  const ref = useEChart(loadField, (field) => {
    // Each nuclide becomes a plume: log-count points rising off its (N, Z) seat, jittered by a
    // cheap hash-noise so neighboring plumes drift differently. ~45k points — nothing to a GPU.
    const noise = (x: number) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) - 0.5 }
    const data: [number, number, number, number][] = []
    for (const p of field) {
      const h = Math.log10(p.c + 1)
      const puffs = Math.max(1, Math.round(h * 4))
      for (let i = 0; i < puffs; i++) {
        const t = i / puffs
        data.push([
          p.n + noise(p.n * 7 + p.z * 13 + i) * (1.6 + t * 3),
          p.z + noise(p.z * 11 + p.n * 3 + i * 5) * (1.2 + t * 2.4),
          t * h + noise(i * 17 + p.n) * 0.2,
          h,
        ])
      }
    }
    return {
      backgroundColor: 'transparent',
      visualMap: { show: false, dimension: 3, min: 0, max: 4.5, inRange: { color: ['#13306b', '#1d4ed8', '#00bfff', '#bfefff'], opacity: [0.12, 0.5] } },
      xAxis3D: { type: 'value', name: '', axisLabel: { show: false }, axisLine: { lineStyle: { color: '#10192e' } }, axisTick: { show: false } },
      yAxis3D: { type: 'value', name: '', axisLabel: { show: false }, axisLine: { lineStyle: { color: '#10192e' } }, axisTick: { show: false } },
      zAxis3D: { type: 'value', name: '', axisLabel: { show: false }, axisLine: { lineStyle: { color: '#10192e' } }, axisTick: { show: false } },
      grid3D: { show: false, boxWidth: 170, boxDepth: 110, boxHeight: 60, viewControl: { distance: 210, alpha: 28, beta: 40, autoRotate: true, autoRotateSpeed: 3 }, environment: '#05070d' },
      series: [{ type: 'scatter3D', data, symbolSize: 2.2, shading: 'color', silent: true }],
    }
  }, true)
  return <div ref={ref} className="h-[78vh] w-full" />
}
