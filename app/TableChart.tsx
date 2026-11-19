'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { Sample } from '@/lib/home-catalog'

/**
 * The Chart view of a table (2026-11-19): one small bar chart per field, drawn
 * from the table's sample rows, so every table gets the same picture whatever
 * its fields hold.
 *
 *  - a field of numbers: how its values are spread, in ten bins. When the
 *    values are all above zero and span a thousandfold or more, the bins are
 *    on a logarithmic scale and the panel says so.
 *  - a field of dates: rows by year, or by month when the dates fall within
 *    three years.
 *  - a field with few different values: rows for each value, most common first.
 *  - any other text: how long the values are, in characters.
 *
 * A field that is empty in every sample row gets a note and no chart. The
 * charts describe the sample rows only, never the whole table; the panel
 * header states the count.
 */

type Bar = { label: string; n: number }
type Profile = { name: string; kind: string; filled: number; bars: Bar[]; ends: [string, string] | null }

const BINS = 10
const MONTHS: Record<string, string> = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' }

const fmt = (v: number) => {
  const a = Math.abs(v)
  if (a >= 1e12) return `${+(v / 1e12).toFixed(1)}T`
  if (a >= 1e9) return `${+(v / 1e9).toFixed(1)}B`
  if (a >= 1e6) return `${+(v / 1e6).toFixed(1)}M`
  if (a >= 1e4) return `${+(v / 1e3).toFixed(1)}K`
  if (a >= 100 || Number.isInteger(v)) return String(Math.round(v))
  if (a >= 1) return String(+v.toFixed(2))
  return String(+v.toPrecision(2))
}

const num = (s: string) => {
  const t = s.replace(/[$,%\s]/g, '')
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return NaN
  return Number(t)
}

/** A date as "YYYY-MM", from 2025-06-10, 20250610, 06/10/2025 or 10-JUN-2025; null when the text is not a date. */
const ym = (s: string): string | null => {
  let m = /^(\d{4})-(\d{2})(-\d{2})?/.exec(s)
  if (!m) {
    const a = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s)
    if (a) m = [a[0], a[3], a[1].padStart(2, '0')] as unknown as RegExpExecArray
  }
  if (!m) {
    const a = /^(\d{1,2})[- ]?([A-Za-z]{3})[- ]?(\d{4})/.exec(s)
    if (a && MONTHS[a[2].toUpperCase()]) m = [a[0], a[3], MONTHS[a[2].toUpperCase()]] as unknown as RegExpExecArray
  }
  if (!m) {
    const a = /^(\d{4})(\d{2})(\d{2})$/.exec(s)
    if (a) m = [a[0], a[1], a[2]] as unknown as RegExpExecArray
  }
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  return y >= 1600 && y <= 2100 && mo >= 1 && mo <= 12 ? `${m[1]}-${m[2]}` : null
}

function bins(vals: number[], log: boolean): { bars: Bar[]; ends: [string, string] } {
  const f = (v: number) => (log ? Math.log10(v) : v)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const a = f(lo)
  const w = (f(hi) - a) / BINS || 1
  const count = new Array<number>(BINS).fill(0)
  for (const v of vals) count[Math.min(BINS - 1, Math.max(0, Math.floor((f(v) - a) / w)))]++
  const edge = (i: number) => (log ? 10 ** (a + i * w) : a + i * w)
  return { bars: count.map((n, i) => ({ label: `${fmt(edge(i))} to ${fmt(edge(i + 1))}`, n })), ends: [fmt(lo), fmt(hi)] }
}

function profile(name: string, col: string[]): Profile {
  const vals = col.map(v => (v ?? '').trim()).filter(v => v !== '' && v.toLowerCase() !== 'null')
  const filled = vals.length
  if (!filled) return { name, kind: 'empty in the sample', filled, bars: [], ends: null }

  const dates = vals.map(ym)
  if (dates.filter(Boolean).length >= filled * 0.8) {
    const d = dates.filter(Boolean) as string[]
    const years = d.map(x => Number(x.slice(0, 4)))
    const byMonth = Math.max(...years) - Math.min(...years) < 3
    const key = (x: string) => (byMonth ? x : x.slice(0, 4))
    const m = new Map<string, number>()
    for (const x of d) m.set(key(x), (m.get(key(x)) ?? 0) + 1)
    const keys = [...m.keys()].sort()
    // every year or month between the first and the last, so a gap shows as a gap
    const all: string[] = []
    if (byMonth) {
      let [y, mo] = keys[0].split('-').map(Number)
      const end = keys[keys.length - 1]
      for (let i = 0; i < 48; i++) {
        const k = `${y}-${String(mo).padStart(2, '0')}`
        all.push(k)
        if (k === end) break
        if (++mo > 12) {
          mo = 1
          y++
        }
      }
    } else {
      const a = Number(keys[0])
      const b = Number(keys[keys.length - 1])
      const step = Math.max(1, Math.ceil((b - a + 1) / 40))
      for (let y = a; y <= b; y += step) all.push(String(y))
      if (step > 1) {
        // wide spans are grouped into equal runs of years
        const g = new Map<string, number>()
        for (const [k, n] of m) {
          const s = String(a + Math.floor((Number(k) - a) / step) * step)
          g.set(s, (g.get(s) ?? 0) + n)
        }
        return { name, kind: `dates · by ${step} years`, filled, bars: all.map(k => ({ label: `${k} to ${Number(k) + step - 1}`, n: g.get(k) ?? 0 })), ends: [keys[0], keys[keys.length - 1]] }
      }
    }
    return { name, kind: byMonth ? 'dates · by month' : 'dates · by year', filled, bars: all.map(k => ({ label: k, n: m.get(k) ?? 0 })), ends: [all[0], all[all.length - 1]] }
  }

  const distinct = new Map<string, number>()
  for (const v of vals) distinct.set(v, (distinct.get(v) ?? 0) + 1)

  const nums = vals.map(num)
  const isNum = nums.filter(n => Number.isFinite(n)).length >= filled * 0.8
  if (isNum && distinct.size > 6) {
    const n = nums.filter(x => Number.isFinite(x))
    const lo = Math.min(...n)
    const hi = Math.max(...n)
    const log = lo > 0 && hi / lo >= 1000
    return { name, kind: log ? 'numbers · log scale' : 'numbers', filled, ...bins(n, log) }
  }

  if (distinct.size <= Math.max(2, Math.min(10, Math.floor(filled * 0.6)))) {
    const top = [...distinct.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    return { name, kind: distinct.size === 1 ? 'one value' : `${distinct.size} values`, filled, bars: top.map(([label, n]) => ({ label, n })), ends: null }
  }

  const len = vals.map(v => v.length)
  if (Math.min(...len) === Math.max(...len))
    return { name, kind: `text · every value ${len[0]} characters`, filled, bars: [{ label: `${len[0]} characters`, n: filled }], ends: null }
  const b = bins(len, Math.min(...len) > 0 && Math.max(...len) / Math.min(...len) >= 1000)
  return { name, kind: 'text · length in characters', filled, ...b }
}

export function TableChart({ sample, panel }: { sample: Sample; panel?: boolean }) {
  const profiles = useMemo(() => sample.c.map((c, j) => profile(c, sample.r.map(r => r[j] ?? ''))), [sample])
  const rows = sample.r.length
  return (
    <>
      <div className="hm-charts" style={panel ? { padding: '0 20px' } : undefined}>
        {profiles.map(p => (
          <FieldChart key={p.name} p={p} rows={rows} />
        ))}
      </div>
      <p className="hm-cnote" style={panel ? { padding: '0 20px' } : undefined}>
        Drawn from {rows} sample rows, not the whole table.
      </p>
    </>
  )
}

function FieldChart({ p, rows }: { p: Profile; rows: number }) {
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = el.current
    if (!node || !p.bars.length) return
    let chart: { dispose(): void; resize(): void } | null = null
    let ro: ResizeObserver | null = null
    let live = true
    void import('echarts').then(echarts => {
      if (!live) return
      const dark = document.documentElement.classList.contains('dark')
      const cs = getComputedStyle(node)
      const ink = cs.getPropertyValue('--paper-text').trim() || '#16181d'
      const paper = cs.getPropertyValue('--paper').trim() || '#fff'
      const c = echarts.init(node, undefined, { renderer: 'svg' })
      c.setOption({
        animationDuration: 300,
        grid: { left: 1, right: 1, top: 6, bottom: 2 },
        xAxis: { type: 'category', data: p.bars.map(b => b.label), axisLabel: { show: false }, axisTick: { show: false }, axisLine: { lineStyle: { color: ink, opacity: 0.25 } } },
        yAxis: { type: 'value', show: false, min: 0 },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow', shadowStyle: { color: ink, opacity: 0.06 } },
          confine: true,
          backgroundColor: paper,
          borderColor: ink,
          borderWidth: 1,
          padding: [6, 10],
          textStyle: { color: ink, fontSize: 12 },
          extraCssText: 'box-shadow:0 4px 12px rgba(0,0,0,.12);border-radius:8px;max-width:260px;white-space:normal;word-break:break-word;',
          formatter: (raw: unknown) => {
            const a = (raw as { name: string; value: number }[])[0]
            const esc = (s: string) => s.replace(/[&<>]/g, ch => (ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : '&gt;'))
            return `${esc(a.name.length > 80 ? `${a.name.slice(0, 80)}…` : a.name)}<br><b>${a.value}</b> of ${rows} rows`
          },
        },
        series: [
          {
            type: 'bar',
            data: p.bars.map(b => b.n),
            barCategoryGap: '14%',
            barMinHeight: 0,
            itemStyle: { color: dark ? '#8fb2ee' : '#033882', borderRadius: [3, 3, 0, 0] },
            emphasis: { itemStyle: { color: dark ? '#c3d6f7' : '#0b55c4' } },
          },
        ],
      })
      chart = c
      ro = new ResizeObserver(() => c.resize())
      ro.observe(node)
    })
    return () => {
      live = false
      ro?.disconnect()
      chart?.dispose()
    }
  }, [p, rows])

  const empty = rows - p.filled
  return (
    <div className="hm-chart">
      <p className="hm-chart-n" title={p.name}>{p.name}</p>
      <p className="hm-chart-k">
        {p.kind}
        {p.bars.length > 0 && empty > 0 ? ` · ${empty} empty` : ''}
      </p>
      {p.bars.length > 0 ? (
        <>
          <div ref={el} className="hm-chart-c" role="img" aria-label={`${p.name}: ${p.kind}, ${p.filled} of ${rows} sample rows`} />
          <p className="hm-chart-e">
            {p.ends ? (
              <>
                <span>{p.ends[0]}</span>
                <span>{p.ends[1]}</span>
              </>
            ) : (
              <span title={p.bars[0].label}>most common: {p.bars[0].label}</span>
            )}
          </p>
        </>
      ) : (
        <div className="hm-chart-c hm-chart-none" />
      )}
    </div>
  )
}
