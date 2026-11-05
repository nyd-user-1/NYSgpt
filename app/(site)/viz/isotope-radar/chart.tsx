'use client'

import { useEChart } from '@/components/viz/use-echart'
import { decayIndex, halfLifeText, isDark, keyOf, loadMassesAndDecay, nucName, type DecayNuclide, type Mass } from '@/lib/viz-physics'

// One element at a time, all of its isotopes as translucent polygons on one radar (the radar-aqi
// pattern, Brendan 2026-11-04): the timeline under the chart walks Z from hydrogen up, with a play
// button. Spokes and scales match /viz/nuclide-card. Neutron-rich isotopes run warm, neutron-poor
// cool, so the chain's drift across the radar reads as colour.

type Spoke = { name: string; min: number; max: number; of: (m: Mass, d?: DecayNuclide) => number | null }
const MEV = (v: number | null) => (v === null ? null : v / 1000)
const T_MAX = 33
const SPOKES: Spoke[] = [
  { name: 'T½', min: -22, max: T_MAX, of: (_, d) => (!d || d.t === -1 ? null : d.t === null ? T_MAX : Math.log10(d.t)) },
  { name: 'Qα', min: -20, max: 15, of: (m) => MEV(m.qa) },
  { name: 'Qβ−', min: -25, max: 25, of: (m) => MEV(m.qb) },
  { name: 'Sₙ', min: -5, max: 25, of: (m) => MEV(m.sn) },
  { name: 'Sₚ', min: -5, max: 25, of: (m) => MEV(m.sp) },
  { name: 'E(2⁺)', min: 0, max: 5, of: (m) => MEV(m.e2) },
]

/** Cool → warm across the isotope chain, light and dark variants. */
function ramp(i: number, count: number, dark: boolean): string {
  const t = count < 2 ? 0.5 : i / (count - 1)
  const cool = dark ? [91, 156, 255] : [47, 111, 220]
  const warm = dark ? [255, 138, 61] : [232, 115, 12]
  const c = cool.map((v, k) => Math.round(v + (warm[k] - v) * t))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

export function IsotopeRadarChart() {
  const ref = useEChart(loadMassesAndDecay, ([ms, decay]) => {
    const dark = isDark()
    const di = decayIndex(decay)
    const dOf = (m: Mass) => decay.nuclides[di.get(keyOf(m.z, m.n)) ?? -1]
    const clamp = (v: number | null, s: Spoke) => (v === null ? s.min : Math.min(s.max, Math.max(s.min, v)))
    const byZ = new Map<number, Mass[]>()
    for (const m of ms) {
      if (m.z < 1) continue
      const list = byZ.get(m.z) ?? []
      list.push(m)
      byZ.set(m.z, list)
    }
    const zs = [...byZ.keys()].sort((a, b) => a - b)
    const label = (z: number) => `${byZ.get(z)![0].el} ${z}`
    return {
      baseOption: {
        backgroundColor: 'transparent',
        timeline: {
          axisType: 'category',
          data: zs.map(label),
          currentIndex: zs.indexOf(50),
          playInterval: 1100,
          loop: true,
          bottom: 8,
          left: 40,
          right: 40,
          symbolSize: 7,
          label: { show: false },
          lineStyle: { color: 'rgba(100,116,139,0.4)' },
          itemStyle: { color: '#94a3b8' },
          checkpointStyle: { color: dark ? '#5b9cff' : '#2f6fdc', symbolSize: 11 },
          controlStyle: { color: '#64748b', borderColor: '#64748b' },
          progress: { lineStyle: { color: dark ? '#5b9cff' : '#2f6fdc' } },
        },
        tooltip: {},
        radar: {
          center: ['50%', '47%'],
          radius: '62%',
          shape: 'circle',
          splitNumber: 5,
          indicator: SPOKES.map((s) => ({ name: s.name, min: s.min, max: s.max })),
          axisName: { color: '#475569', fontSize: 13 },
          splitLine: { lineStyle: { color: 'rgba(100,116,139,0.22)' } },
          splitArea: { areaStyle: { color: ['rgba(100,116,139,0.02)', 'rgba(100,116,139,0.06)'] } },
          axisLine: { lineStyle: { color: 'rgba(100,116,139,0.3)' } },
        },
        series: [{ type: 'radar', symbol: 'none' }],
      },
      options: zs.map((z) => {
        const chain = byZ.get(z)!.slice().sort((a, b) => a.n - b.n)
        return {
          title: { text: `${label(z)} — ${chain.length} isotopes`, left: 12, top: 4, textStyle: { color: '#475569', fontSize: 13, fontWeight: 'normal' as const } },
          series: [
            {
              type: 'radar',
              symbol: 'none',
              data: chain.map((m, i) => {
                const c = ramp(i, chain.length, dark)
                const d = dOf(m)
                return {
                  name: nucName(m),
                  value: SPOKES.map((s) => clamp(s.of(m, d), s)),
                  lineStyle: { color: c, width: 1, opacity: 0.6 },
                  itemStyle: { color: c },
                  emphasis: { lineStyle: { width: 2.5, opacity: 1 } },
                  tooltip: {
                    formatter: () =>
                      [`${nucName(m)} · Z ${m.z} · N ${m.n}`, `T½ ${halfLifeText(d)}`, ...SPOKES.slice(1).map((s) => `${s.name} ${s.of(m, d) === null ? '—' : `${(s.of(m, d) as number).toFixed(3)} MeV`}`)].join('<br/>'),
                  },
                }
              }),
            },
          ],
        }
      }),
    }
  })
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
