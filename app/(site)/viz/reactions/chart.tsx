'use client'

import { useEChart } from '@/components/viz/use-echart'
import { loadField, loadFlows, type Flows } from '@/lib/viz-data'

type Flow = Flows[number]
const load = () => Promise.all([loadField(), loadFlows()])

export function ReactionsChart() {
  const ref = useEChart(load, ([field, flows]) => {
    const line = (f: Flow) => ({ coords: [[f.n, f.z], [f.n + f.dn, f.z + f.dz]] })
    const busiest = flows.slice(0, 1200)
    const rest = flows.slice(1200)
    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: { left: 48, right: 24, top: 16, bottom: 44 },
      xAxis: { type: 'value', name: 'N', max: 180, nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#334155', fontSize: 10 }, axisLine: { lineStyle: { color: '#13203b' } }, splitLine: { show: false } },
      yAxis: { type: 'value', name: 'Z', max: 118, nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#334155', fontSize: 10 }, axisLine: { lineStyle: { color: '#13203b' } }, splitLine: { show: false } },
      series: [
        // The city underneath: the nuclide field as faint streetlight.
        {
          type: 'scatter',
          data: field.map((p) => [p.n, p.z]),
          symbolSize: 1.6,
          silent: true,
          itemStyle: { color: '#1d4ed8', opacity: 0.22 },
          blendMode: 'lighter',
        },
        // Every route, as the bus map draws the grid: thin, additive, massed.
        {
          type: 'lines',
          coordinateSystem: 'cartesian2d',
          data: rest.map(line),
          silent: true,
          large: true,
          blendMode: 'lighter',
          lineStyle: { color: '#1d4ed8', opacity: 0.045, width: 0.6 },
        },
        // The busiest routes carry the lights.
        {
          type: 'lines',
          coordinateSystem: 'cartesian2d',
          data: busiest.map(line),
          silent: true,
          blendMode: 'lighter',
          lineStyle: { color: '#00bfff', opacity: 0.14, width: 1 },
          effect: { show: true, constantSpeed: 24, symbol: 'circle', symbolSize: 2.4, trailLength: 0.5, color: '#bfefff' },
        },
      ],
    }
  })
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
