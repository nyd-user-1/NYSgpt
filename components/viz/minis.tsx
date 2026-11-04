'use client'

// The twelve charts at box scale (2026-11-04): each full /viz page's option, cut down to live
// inside a 210px contents-plate cell — axes off or whispered, interactions off, the data itself
// unchanged. Dark charts keep their dark ground as the box's panel; light ones sit on the paper.

import { useEChart } from '@/components/viz/use-echart'

const DARK = { background: '#05070d' }
const box = 'h-full w-full'

type Field = { n: number; z: number; c: number }[]

/* 01 — scatter-nebula */
export function MiniNebula({ field }: { field: Field }) {
  const ref = useEChart(() => {
    const data = field.map((p) => [p.n, p.z, Math.log10(p.c + 1)])
    const max = Math.max(1, ...data.map((p) => p[2] as number))
    return {
      grid: { left: 4, right: 4, top: 4, bottom: 4 },
      xAxis: { type: 'value', max: 180, show: false },
      yAxis: { type: 'value', max: 118, show: false },
      visualMap: { show: false, dimension: 2, min: 0, max, inRange: { color: ['#172554', '#1d4ed8', '#00bfff', '#e0f2fe'], symbolSize: [1, 4] } },
      series: [{ type: 'scatter', data, blendMode: 'lighter', silent: true, itemStyle: { opacity: 0.85 } }],
    }
  })
  return <div ref={ref} className={box} style={DARK} />
}

/* 02 — area-rainfall */
export function MiniRainfall({ papers, exfor }: { papers: { y: number; c: number }[]; exfor: { y: number; c: number }[] }) {
  const ref = useEChart(() => {
    const byYear = new Map(exfor.map((r) => [r.y, r.c]))
    return {
      grid: [
        { left: 6, right: 6, top: 6, height: '52%' },
        { left: 6, right: 6, top: '62%', height: '32%' },
      ],
      xAxis: [
        { type: 'category', data: papers.map((r) => r.y), gridIndex: 0, show: false },
        { type: 'category', data: papers.map((r) => r.y), gridIndex: 1, show: false },
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, show: false },
        { type: 'value', gridIndex: 1, inverse: true, show: false },
      ],
      series: [
        { type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: papers.map((r) => r.c), showSymbol: false, silent: true, smooth: 0.2, lineStyle: { color: '#1e3a8a', width: 1.5 }, areaStyle: { color: '#1e3a8a', opacity: 0.12 } },
        { type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: papers.map((r) => byYear.get(r.y) ?? 0), showSymbol: false, silent: true, smooth: 0.2, lineStyle: { color: '#00bfff', width: 1.5 }, areaStyle: { color: '#00bfff', opacity: 0.14 } },
      ],
    }
  })
  return <div ref={ref} className={box} />
}

/* 03 — bar-large */
export function MiniBarLarge({ bars }: { bars: { c: number }[] }) {
  const ref = useEChart(() => ({
    animation: false,
    grid: { left: 6, right: 6, top: 6, bottom: 6 },
    xAxis: { type: 'category', data: bars.map((_, i) => i), show: false },
    yAxis: { type: 'log', min: 1, show: false },
    series: [{ type: 'bar', data: bars.map((b) => b.c), large: true, silent: true, itemStyle: { color: '#1e3a8a' }, barCategoryGap: '0%' }],
  }))
  return <div ref={ref} className={box} />
}

/* 04 — scatter-weight */
export function MiniWeight({ rows }: { rows: { y: number; c: number; nsr: boolean }[] }) {
  const ref = useEChart(() => {
    const take = rows.slice(0, 6000)
    const split = (want: boolean) => take.filter((r) => r.nsr === want).map((r) => [r.y, r.c])
    return {
      grid: { left: 6, right: 6, top: 6, bottom: 6 },
      xAxis: { type: 'value', min: 1950, max: 2026, show: false },
      yAxis: { type: 'log', min: 1, show: false },
      series: [
        { type: 'scatter', data: split(true), symbolSize: 2, silent: true, itemStyle: { color: '#1e3a8a', opacity: 0.4 } },
        { type: 'scatter', data: split(false), symbolSize: 2, silent: true, itemStyle: { color: '#00bfff', opacity: 0.5 } },
      ],
    }
  })
  return <div ref={ref} className={box} />
}

/* 05 — heatmap-large */
export function MiniHeatmap({ field }: { field: Field }) {
  const ref = useEChart(() => {
    const data = field.map((p) => [p.n, p.z, Math.log10(p.c + 1)])
    const max = Math.max(1, ...data.map((p) => p[2] as number))
    return {
      animation: false,
      grid: { left: 4, right: 4, top: 4, bottom: 4 },
      xAxis: { type: 'category', data: Array.from({ length: 181 }, (_, i) => i), show: false },
      yAxis: { type: 'category', data: Array.from({ length: 119 }, (_, i) => i), show: false },
      visualMap: { show: false, min: 0, max, inRange: { color: ['#0b1a3a', '#1d4ed8', '#00bfff', '#f0f9ff'] } },
      series: [{ type: 'heatmap', data, silent: true, progressive: 3000 }],
    }
  })
  return <div ref={ref} className={box} style={DARK} />
}

/* 06 — scatter3d */
export function MiniScatter3d({ field }: { field: Field }) {
  const ref = useEChart(() => {
    const data = field.map((p) => [p.n, p.z, Math.log10(p.c + 1)])
    const max = Math.max(1, ...data.map((p) => p[2] as number))
    return {
      visualMap: { show: false, dimension: 2, min: 0, max, inRange: { color: ['#172554', '#1d4ed8', '#00bfff', '#e0f2fe'], symbolSize: [1, 5] } },
      xAxis3D: { type: 'value', axisLabel: { show: false }, name: '', axisLine: { lineStyle: { color: '#10192e' } }, axisTick: { show: false } },
      yAxis3D: { type: 'value', axisLabel: { show: false }, name: '', axisLine: { lineStyle: { color: '#10192e' } }, axisTick: { show: false } },
      zAxis3D: { type: 'value', axisLabel: { show: false }, name: '', axisLine: { lineStyle: { color: '#10192e' } }, axisTick: { show: false } },
      grid3D: { boxWidth: 170, boxDepth: 110, boxHeight: 46, viewControl: { distance: 300, alpha: 24, beta: 24, autoRotate: true, autoRotateSpeed: 6 }, environment: '#05070d' },
      series: [{ type: 'scatter3D', data, silent: true, shading: 'color', itemStyle: { opacity: 0.85 } }],
    }
  }, true)
  return <div ref={ref} className={box} style={DARK} />
}

/* 07 — scatter3D-dataset */
export function MiniTriples({ rows }: { rows: { y: number; refs: number; cites: number; nsr: boolean }[] }) {
  const ref = useEChart(() => ({
    xAxis3D: { type: 'value', min: 1950, max: 2026, axisLabel: { show: false }, name: '', axisLine: { lineStyle: { color: '#10192e' } }, axisTick: { show: false } },
    yAxis3D: { type: 'value', axisLabel: { show: false }, name: '', axisLine: { lineStyle: { color: '#10192e' } }, axisTick: { show: false } },
    zAxis3D: { type: 'value', axisLabel: { show: false }, name: '', axisLine: { lineStyle: { color: '#10192e' } }, axisTick: { show: false } },
    grid3D: { boxWidth: 140, boxDepth: 90, boxHeight: 90, viewControl: { distance: 300, alpha: 14, beta: 32, autoRotate: true, autoRotateSpeed: 6 }, environment: '#05070d' },
    series: [{ type: 'scatter3D', symbolSize: 2, silent: true, itemStyle: { opacity: 0.6 }, data: rows.slice(0, 6000).map((r) => ({ value: [r.y, Math.log10(r.refs + 1), Math.log10(r.cites + 1)], itemStyle: { color: r.nsr ? '#3b63d8' : '#00bfff' } })) }],
  }), true)
  return <div ref={ref} className={box} style={DARK} />
}

/* 08 — scatter3d-simplex-noise */
export function MiniSimplex({ field }: { field: Field }) {
  const ref = useEChart(() => {
    const noise = (x: number) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) - 0.5 }
    const data: [number, number, number, number][] = []
    for (const p of field) {
      const h = Math.log10(p.c + 1)
      const puffs = Math.max(1, Math.round(h * 2))
      for (let i = 0; i < puffs; i++) {
        const t = i / puffs
        data.push([p.n + noise(p.n * 7 + p.z * 13 + i) * (1.6 + t * 3), p.z + noise(p.z * 11 + p.n * 3 + i * 5) * (1.2 + t * 2.4), t * h + noise(i * 17 + p.n) * 0.2, h])
      }
    }
    return {
      visualMap: { show: false, dimension: 3, min: 0, max: 4.5, inRange: { color: ['#13306b', '#1d4ed8', '#00bfff', '#bfefff'], opacity: [0.12, 0.5] } },
      xAxis3D: { type: 'value', show: false },
      yAxis3D: { type: 'value', show: false },
      zAxis3D: { type: 'value', show: false },
      grid3D: { show: false, boxWidth: 170, boxDepth: 110, boxHeight: 60, viewControl: { distance: 260, alpha: 28, beta: 40, autoRotate: true, autoRotateSpeed: 5 }, environment: '#05070d' },
      series: [{ type: 'scatter3D', data, symbolSize: 1.6, silent: true, shading: 'color' }],
    }
  }, true)
  return <div ref={ref} className={box} style={DARK} />
}

/* 09 — simple-surface */
export function MiniSurface({ field }: { field: Field }) {
  const ref = useEChart(() => {
    const NMAX = 170
    const ZMAX = 110
    const height = new Map(field.map((p) => [`${p.n},${p.z}`, Math.log10(p.c + 1)]))
    const data: [number, number, number][] = []
    for (let z = 0; z <= ZMAX; z += 2) for (let n = 0; n <= NMAX; n += 2) data.push([n, z, height.get(`${n},${z}`) ?? 0])
    return {
      visualMap: { show: false, dimension: 2, min: 0, max: 4.5, inRange: { color: ['#060b18', '#172554', '#1d4ed8', '#00bfff', '#e0f2fe'] } },
      xAxis3D: { type: 'value', show: false },
      yAxis3D: { type: 'value', show: false },
      zAxis3D: { type: 'value', show: false },
      grid3D: { show: false, boxWidth: 170, boxDepth: 110, boxHeight: 40, viewControl: { distance: 260, alpha: 38, beta: 18, autoRotate: true, autoRotateSpeed: 5 }, environment: '#05070d' },
      series: [{ type: 'surface', data, silent: true, shading: 'color', wireframe: { show: false } }],
    }
  }, true)
  return <div ref={ref} className={box} style={DARK} />
}

/* 10 — graphgl-large-internet */
export function MiniGraph({ nodes, edges }: { nodes: { id: number; c: number }[]; edges: { s: number; t: number; w: number }[] }) {
  const ref = useEChart(() => {
    const keep = new Set(nodes.slice(0, 400).map((n) => n.id))
    return {
      series: [
        {
          type: 'graphGL',
          nodes: nodes.slice(0, 400).map((n) => ({ id: String(n.id), symbolSize: Math.max(1.5, Math.sqrt(n.c) / 3), itemStyle: { color: n.c > 400 ? '#e0f2fe' : n.c > 150 ? '#00bfff' : '#1d4ed8', opacity: 0.9 } })),
          edges: edges.filter((e) => keep.has(e.s) && keep.has(e.t)).map((e) => ({ source: String(e.s), target: String(e.t), lineStyle: { color: 'rgba(29,78,216,0.2)', width: 0.5 } })),
          forceAtlas2: { steps: 5, stopThreshold: 2, gravity: 0.8, scaling: 0.5 },
        },
      ],
    }
  }, true)
  return <div ref={ref} className={box} style={DARK} />
}

/* 11 — lines-ny */
export function MiniReactions({ field, flows }: { field: Field; flows: { n: number; z: number; dn: number; dz: number; w: number }[] }) {
  const ref = useEChart(() => {
    const line = (f: { n: number; z: number; dn: number; dz: number }) => ({ coords: [[f.n, f.z], [f.n + f.dn, f.z + f.dz]] })
    return {
      animation: false,
      grid: { left: 4, right: 4, top: 4, bottom: 4 },
      xAxis: { type: 'value', max: 180, show: false },
      yAxis: { type: 'value', max: 118, show: false },
      series: [
        { type: 'scatter', data: field.map((p) => [p.n, p.z]), symbolSize: 1, silent: true, itemStyle: { color: '#1d4ed8', opacity: 0.2 }, blendMode: 'lighter' },
        { type: 'lines', coordinateSystem: 'cartesian2d', data: flows.slice(400, 6000).map(line), silent: true, large: true, blendMode: 'lighter', lineStyle: { color: '#1d4ed8', opacity: 0.05, width: 0.5 } },
        { type: 'lines', coordinateSystem: 'cartesian2d', data: flows.slice(0, 400).map(line), silent: true, blendMode: 'lighter', lineStyle: { color: '#00bfff', opacity: 0.16, width: 0.8 }, effect: { show: true, constantSpeed: 20, symbol: 'circle', symbolSize: 1.8, trailLength: 0.5, color: '#bfefff' } },
      ],
    }
  })
  return <div ref={ref} className={box} style={DARK} />
}

/* 12 — matrix-covariance */
export function MiniMatrix({ vars, cells }: { vars: string[]; cells: [number, number, number][] }) {
  const ref = useEChart(() => ({
    animation: false,
    grid: { left: 4, right: 4, top: 4, bottom: 4 },
    xAxis: { type: 'category', data: vars, show: false },
    yAxis: { type: 'category', data: vars, inverse: true, show: false },
    visualMap: { show: false, min: -0.6, max: 0.6, inRange: { color: ['#dc2626', '#fca5a5', '#f8fafc', '#93c5fd', '#1e3a8a'] } },
    series: [{ type: 'heatmap', data: cells, silent: true, itemStyle: { borderColor: '#f9f9f9', borderWidth: 1 } }],
  }))
  return <div ref={ref} className={box} />
}
