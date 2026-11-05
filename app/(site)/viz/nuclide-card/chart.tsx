'use client'

import * as React from 'react'

import { useEChart } from '@/components/viz/use-echart'
import { decayIndex, halfLifeText, isDark, keyOf, loadMasses, loadMassesAndDecay, nucName, type DecayNuclide, type Mass } from '@/lib/viz-physics'

// One nuclide's card as a radar (chart batch A, 2026-11-04): half-life, Qα, Qβ−, Sₙ, Sₚ and E(2⁺) on six spokes,
// a second nuclide overlaid for comparison. Masses from AME2020, half-life from the ENSDF ground state, E(2⁺)
// from the adopted levels (even-even nuclides only). A value off a spoke's scale sits at its end; one that
// doesn't exist sits at the centre. A row pressed in the data table becomes the first nuclide.

type Spoke = { name: string; min: number; max: number; of: (m: Mass, d?: DecayNuclide) => number | null; text: (m: Mass, d?: DecayNuclide) => string }
const MEV = (v: number | null) => (v === null ? null : v / 1000)
const mevText = (v: number | null) => (v === null ? '—' : `${(v / 1000).toFixed(3)} MeV`)
const T_MAX = 33
const SPOKES: Spoke[] = [
  { name: 'T½', min: -22, max: T_MAX, of: (_, d) => (!d || d.t === -1 ? null : d.t === null ? T_MAX : Math.log10(d.t)), text: (_, d) => halfLifeText(d) },
  { name: 'Qα', min: -20, max: 15, of: (m) => MEV(m.qa), text: (m) => mevText(m.qa) },
  { name: 'Qβ−', min: -25, max: 25, of: (m) => MEV(m.qb), text: (m) => mevText(m.qb) },
  { name: 'Sₙ', min: -5, max: 25, of: (m) => MEV(m.sn), text: (m) => mevText(m.sn) },
  { name: 'Sₚ', min: -5, max: 25, of: (m) => MEV(m.sp), text: (m) => mevText(m.sp) },
  { name: 'E(2⁺)', min: 0, max: 5, of: (m) => MEV(m.e2), text: (m) => (m.e2 === null ? (m.z % 2 || m.n % 2 ? 'Not even-even' : 'Not known') : mevText(m.e2)) },
]
const COLOURS = [
  { light: '#2f6fdc', dark: '#5b9cff', swatch: 'bg-[#2f6fdc] dark:bg-[#5b9cff]' },
  { light: '#e8730c', dark: '#ff8a3d', swatch: 'bg-[#e8730c] dark:bg-[#ff8a3d]' },
]
const SUPERS = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const PB208 = keyOf(82, 126)
const U238 = keyOf(92, 146)

/** "208Pb", "Pb208", "pb-208", "²⁰⁸Pb" → the nuclide's key, or null. "1n" is the neutron. */
function parse(text: string, els: Map<string, number>): number | null {
  const s = text.trim().replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => String(SUPERS.indexOf(c))).replace(/[\s-]+/g, '')
  const massFirst = s.match(/^(\d+)([a-z]{1,3})$/i)
  const symbolFirst = s.match(/^([a-z]{1,3})(\d+)$/i)
  const [a, el]: [number, string] = massFirst ? [Number(massFirst[1]), massFirst[2]] : symbolFirst ? [Number(symbolFirst[2]), symbolFirst[1]] : [0, '']
  if (!el) return null
  if (el === 'n' && a === 1) return keyOf(0, 1)
  const z = els.get(el.toLowerCase())
  return z === undefined ? null : keyOf(z, a - z)
}

const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const

export function NuclideCardChart() {
  const [keys, setKeys] = React.useState<[number, number | null]>([PB208, U238])
  const [texts, setTexts] = React.useState<[string, string]>(['208Pb', '238U'])
  const [masses, setMasses] = React.useState<Mass[] | null>(null)
  React.useEffect(() => {
    void loadMasses().then(setMasses)
  }, [])
  const rowOfKey = React.useMemo(() => new Map((masses ?? []).map((m, i) => [keyOf(m.z, m.n), i])), [masses])
  const els = React.useMemo(() => new Map((masses ?? []).filter((m) => m.z > 0).map((m) => [m.el.toLowerCase(), m.z])), [masses])

  const ref = useEChart(
    loadMassesAndDecay,
    ([ms, decay], view) => {
      const dark = isDark()
      const di = decayIndex(decay)
      const byKey = new Map(ms.map((m) => [keyOf(m.z, m.n), m]))
      const ka = Math.floor(view / 1e6)
      const kb = (view % 1e6) - 1
      const picked = [ka, kb].map((k) => byKey.get(k)).filter((m): m is Mass => !!m)
      const dOf = (m: Mass) => decay.nuclides[di.get(keyOf(m.z, m.n)) ?? -1]
      const clamp = (v: number | null, s: Spoke) => (v === null ? s.min : Math.min(s.max, Math.max(s.min, v)))
      return {
        backgroundColor: 'transparent',
        tooltip: {
          formatter: (p: unknown) => {
            const m = picked[(p as { dataIndex: number }).dataIndex]
            if (!m) return ''
            const d = dOf(m)
            return [`${nucName(m)} · Z ${m.z} · N ${m.n}${m.est ? ' (mass extrapolated)' : ''}`, ...SPOKES.map((s) => `${s.name} ${s.text(m, d)}`)].join('<br/>')
          },
        },
        radar: {
          center: ['50%', '54%'],
          radius: '68%',
          shape: 'circle',
          splitNumber: 5,
          indicator: SPOKES.map((s) => ({ name: s.name, min: s.min, max: s.max })),
          axisName: { color: '#475569', fontSize: 13 },
          splitLine: { lineStyle: { color: 'rgba(100,116,139,0.22)' } },
          splitArea: { areaStyle: { color: ['rgba(100,116,139,0.02)', 'rgba(100,116,139,0.06)'] } },
          axisLine: { lineStyle: { color: 'rgba(100,116,139,0.3)' } },
        },
        series: [
          {
            type: 'radar',
            symbol: 'circle',
            symbolSize: 6,
            data: picked.map((m, i) => {
              const c = dark ? COLOURS[i].dark : COLOURS[i].light
              const d = dOf(m)
              return {
                name: nucName(m),
                value: SPOKES.map((s) => clamp(s.of(m, d), s)),
                lineStyle: { color: c, width: 2 },
                itemStyle: { color: c },
                areaStyle: { color: c, opacity: 0.18 },
              }
            }),
          },
        ],
      }
    },
    false,
    (p) => {
      const k = p.seriesIndex === 0 && typeof p.dataIndex === 'number' ? keys[p.dataIndex] : null
      return k === null || k === undefined ? null : rowOfKey.get(k) ?? null
    },
    {
      view: keys[0] * 1e6 + ((keys[1] ?? -1) + 1),
      // A table row pressed: that nuclide becomes the first.
      point: (row) => {
        const m = masses?.[row]
        if (m) {
          setKeys((k) => [keyOf(m.z, m.n), k[1]])
          setTexts((t) => [`${m.z + m.n}${m.el}`, t[1]])
        }
        return null
      },
    },
  )

  const enter = (i: 0 | 1, text: string) => {
    setTexts((t) => (i === 0 ? [text, t[1]] : [t[0], text]))
    const k = text.trim() === '' && i === 1 ? null : parse(text, els)
    if (k !== null && !rowOfKey.has(k)) return
    if (k === null && i === 0) return
    setKeys((ks) => (i === 0 ? [k as number, ks[1]] : [ks[0], k]))
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 px-3 pt-2" style={MONO}>
        {([0, 1] as const).map((i) => (
          <label key={i} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${COLOURS[i].swatch}`} />
            <input
              list="nuclide-card-names"
              value={texts[i]}
              onChange={(e) => enter(i, e.target.value)}
              placeholder={i === 0 ? '208Pb' : 'Overlay'}
              aria-label={i === 0 ? 'Nuclide' : 'Overlay nuclide'}
              spellCheck={false}
              className="w-28 rounded-md border border-[var(--paper-rule)] bg-[var(--paper)] px-2 py-1 text-[12px] text-[var(--paper-text)] outline-none placeholder:text-[var(--paper-faint)] focus:border-[var(--paper-muted)]"
            />
          </label>
        ))}
        <datalist id="nuclide-card-names">
          {(masses ?? []).map((m) => (
            <option key={keyOf(m.z, m.n)} value={`${m.z + m.n}${m.el}`} />
          ))}
        </datalist>
      </div>
      <div ref={ref} className="min-h-0 w-full flex-1" />
    </div>
  )
}
