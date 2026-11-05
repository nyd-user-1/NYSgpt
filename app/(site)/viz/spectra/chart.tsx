'use client'

// Capture-gamma spectra (2026-11-04, chart batch B): the strips of /viz/simplex in 2D with a zoom slider along the
// foot — drag its handles, or brush across it, to stretch a run of nuclei over the width — and a column beside it
// with the picked nucleus's whole spectrum: every line as a stick at its energy, height its intensity on a log
// scale, primaries in red, then its strongest lines. A click on a strip picks its nucleus.

import * as React from 'react'
import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'
import { E_MAX_KEV, I_FLOOR, allLines, loadCapgam, logI, setLabel, setName, type Capgam, type GammaLine } from '@/lib/viz-gamma'

const SERIF = { fontFamily: 'var(--font-display), Georgia, serif' } as const
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const
const AXIS = { nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569', fontSize: 10 }, axisLine: { lineStyle: { color: '#1e293b' } } }

function Strips({ onPick }: { onPick: (set: number) => void }) {
  const lines = React.useRef<GammaLine[]>([])
  const ref = useEChart(
    loadCapgam,
    (data) => {
      const names = data.sets.map(setName)
      const ls = allLines(data)
      lines.current = ls
      return {
        backgroundColor: 'transparent',
        animation: false,
        tooltip: {
          formatter: (p: unknown) => {
            const l = ls[(p as { dataIndex: number }).dataIndex]
            if (!l) return ''
            return `${names[l.set]} — ${l.e.toLocaleString('en')} keV · ${l.i === null ? 'no intensity' : `${l.i} per 100 captures`}${l.primary ? ' · primary' : ''}`
          },
        },
        grid: { left: 60, right: 40, top: 12, bottom: 64 },
        xAxis: { type: 'category', data: names, axisTick: { show: false }, splitLine: { show: false }, ...AXIS },
        yAxis: { type: 'value', name: 'Eγ (keV)', min: 0, max: E_MAX_KEV, splitLine: { lineStyle: { color: '#1e293b', opacity: 0.12 } }, ...AXIS },
        dataZoom: [
          { type: 'slider', xAxisIndex: 0, bottom: 10, height: 22, brushSelect: true },
          { type: 'inside', xAxisIndex: 0 },
          { type: 'slider', yAxisIndex: 0, right: 6, width: 14, brushSelect: true },
        ],
        visualMap: { show: false, dimension: 2, min: Math.log10(I_FLOOR), max: 2, inRange: { color: ['#0b1a3a', '#1d4ed8', '#00bfff', '#f0f9ff'] } },
        series: [
          {
            type: 'scatter',
            symbol: 'rect',
            symbolSize: [4, 1.5],
            data: ls.map((l) => [l.set, l.e, logI(l.i)]),
            progressive: 5000,
            progressiveThreshold: 10000,
            emphasis: { scale: 2.4 },
          },
        ],
      }
    },
    false,
    firstSeriesRow,
    {
      onPick: (p) => {
        const l = typeof p.dataIndex === 'number' ? lines.current[p.dataIndex] : undefined
        if (l) onPick(l.set)
      },
    },
  )
  return <div ref={ref} className="h-full w-full" />
}

/** One nucleus's spectrum; keyed by the set, so a new pick mounts a new chart. */
function Spectrum({ index }: { index: number }) {
  const ref = useEChart(
    () => loadCapgam().then((d) => d.sets[index]),
    (s) => {
      const sticks = s.e.map((e, k) => ({ e, i: s.i[k], primary: s.p[k] === '1' })).filter((x) => x.i !== null && x.i > 0)
      const top = Math.max(1000, Math.ceil(Math.max(...s.e) / 1000) * 1000)
      const bar = (primary: boolean, color: string) => ({
        type: 'bar',
        barWidth: 1.5,
        barGap: '-100%',
        itemStyle: { color },
        data: sticks.filter((x) => x.primary === primary).map((x) => [x.e, Math.max(I_FLOOR, x.i as number)]),
      })
      return {
        backgroundColor: 'transparent',
        animation: false,
        tooltip: {
          formatter: (p: unknown) => {
            const v = (p as { value: [number, number] }).value
            return `${v[0].toLocaleString('en')} keV · ${v[1]} per 100 captures`
          },
        },
        grid: { left: 44, right: 10, top: 10, bottom: 34 },
        xAxis: { type: 'value', name: 'keV', nameGap: 4, min: 0, max: top, splitLine: { show: false }, ...AXIS },
        yAxis: { type: 'log', min: I_FLOOR, max: 100, splitLine: { lineStyle: { color: '#1e293b', opacity: 0.1 } }, ...AXIS },
        dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
        series: [bar(false, '#1e3a8a'), bar(true, '#dc2626')],
      }
    },
    false,
    undefined,
    { onPick: () => {} },
  )
  return <div ref={ref} className="h-[260px] w-full" />
}

export function SpectraChart() {
  const [data, setData] = React.useState<Capgam | null>(null)
  const [pick, setPick] = React.useState<number | null>(null)
  React.useEffect(() => {
    loadCapgam().then(setData, () => {})
  }, [])
  // Opens on ¹⁵⁸Gd: ¹⁵⁷Gd's 254,000 b capture, the largest in the set.
  const index = pick ?? (data ? Math.max(0, data.sets.findIndex((s) => s.el === 'Gd' && s.z + s.n === 158)) : null)
  const set = data && index !== null ? data.sets[index] : null
  const strongest = set
    ? set.e
        .map((e, k) => ({ e, i: set.i[k], primary: set.p[k] === '1' }))
        .filter((x) => x.i !== null)
        .sort((a, b) => (b.i as number) - (a.i as number))
        .slice(0, 12)
    : []

  return (
    <div className="flex min-h-0 w-full flex-1 gap-4">
      <div className="min-w-0 flex-1">
        <Strips onPick={setPick} />
      </div>
      <div className="flex w-[340px] shrink-0 flex-col overflow-hidden text-[var(--paper-text)]">
        {set && index !== null ? (
          <>
            <div className="text-[24px] leading-none" style={SERIF}>
              {setLabel(set)}
            </div>
            <div className="mt-2 text-[11px] text-[var(--paper-muted)]" style={MONO}>
              {set.e.length.toLocaleString('en')} lines · {[...set.p].filter((c) => c === '1').length} primary
              {set.sigma !== null ? ` · σ ${set.sigma.toLocaleString('en')} b` : ''}
            </div>
            <div className="mt-3">
              <Spectrum key={index} index={index} />
            </div>
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
              <table className="w-full border-collapse text-[11.5px]" style={MONO}>
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[var(--paper-faint)]" style={{ fontFamily: 'inherit' }}>
                    <th className="pb-1.5 font-medium">Eγ (keV)</th>
                    <th className="pb-1.5 text-right font-medium">Per 100 captures</th>
                    <th className="pb-1.5 text-right font-medium">Primary</th>
                  </tr>
                </thead>
                <tbody>
                  {strongest.map((x) => (
                    <tr key={`${x.e}-${x.primary}`} className="border-t border-[var(--paper-rule)]/10">
                      <td className="py-1">{x.e.toLocaleString('en')}</td>
                      <td className="py-1 text-right">{x.i}</td>
                      <td className="py-1 text-right">{x.primary ? 'yes' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
