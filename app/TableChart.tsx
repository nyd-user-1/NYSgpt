'use client'

import { useEffect, useRef } from 'react'
import { Calendar, CircleSlash, Hash, KeyRound, ToggleLeft, Type } from 'lucide-react'
import { fig, KIND_LABEL, mostlyEmpty, share, type Bin, type ColumnProfile, type Kind } from './table-profile'

/**
 * The table explorer's charts (brief 56, 2026-11-19), drawn from the profiles in table-profile.ts:
 *  - MiniChart, a column's small chart in the Detail header: a histogram with its ends for numbers and dates,
 *    the top two values and the rest for text, the count of different values for keys, and the mostly-empty
 *    warning in red, with its words;
 *  - ColumnsView, one column at a time down the pane: its description, a large histogram or its values, filled
 *    and empty with a bar, different values, and for numbers the mean, standard deviation and quartiles.
 * One hue (the site blue; #5b8ff0 in the dark theme, checked with the dataviz palette validator), bars at most
 * 24px with 3px rounded tops, a recessive axis, a tooltip on every bar. Everything describes the sample rows.
 */

const ICONS: Record<Kind, typeof Hash> = { number: Hash, text: Type, date: Calendar, key: KeyRound, yesno: ToggleLeft, empty: CircleSlash }

/** The type mark: a lucide icon in ink, with the kind's name for readers who cannot see it. */
export function KindMark({ kind, size = 13 }: { kind: Kind; size?: number }) {
  const I = ICONS[kind]
  return <I aria-label={KIND_LABEL[kind]} className="tx-mark" width={size} height={size} strokeWidth={2} />
}

/** A histogram in ECharts: one series, thin bars, a tooltip with the bin and its count. */
export function Histogram({ bins, rows, height, big }: { bins: Bin[]; rows: number; height: number; big?: boolean }) {
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = el.current
    if (!node) return
    let chart: { dispose(): void; resize(): void } | null = null
    let ro: ResizeObserver | null = null
    let live = true
    void import('echarts').then(echarts => {
      if (!live) return
      const dark = document.documentElement.classList.contains('dark')
      const cs = getComputedStyle(node)
      const ink = cs.getPropertyValue('--paper-text').trim() || '#16181d'
      const paper = cs.getPropertyValue('--paper').trim() || '#fff'
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const c = echarts.init(node, undefined, { renderer: 'svg' })
      c.setOption({
        animation: !reduce,
        animationDuration: 300,
        grid: { left: 1, right: 1, top: big ? 8 : 3, bottom: 1 },
        xAxis: { type: 'category', data: bins.map(b => b.label), axisLabel: { show: false }, axisTick: { show: false }, axisLine: { lineStyle: { color: ink, opacity: 0.2 } } },
        yAxis: { type: 'value', show: false, min: 0 },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow', shadowStyle: { color: ink, opacity: 0.05 } },
          confine: true,
          backgroundColor: paper,
          borderColor: ink,
          borderWidth: 1,
          padding: [6, 10],
          textStyle: { color: ink, fontSize: 12 },
          extraCssText: 'box-shadow:0 4px 12px rgba(0,0,0,.12);border-radius:8px;max-width:240px;white-space:normal;',
          formatter: (raw: unknown) => {
            const a = (raw as { name: string; value: number }[])[0]
            return `${a.name.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch] ?? ch)}<br><b>${a.value}</b> of ${rows} sample rows`
          },
        },
        series: [
          {
            type: 'bar',
            data: bins.map(b => b.n),
            barMaxWidth: 24,
            barCategoryGap: 2,
            itemStyle: { color: dark ? '#5b8ff0' : '#033882', borderRadius: [3, 3, 0, 0] },
            emphasis: { itemStyle: { color: dark ? '#8fb2f6' : '#0b55c4' } },
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
  }, [bins, rows, big])
  return <div ref={el} className="tx-hist" style={{ height }} role="img" aria-label={`Histogram of ${bins.length} bins from ${rows} sample rows`} />
}

function TopRow({ label, n, rows, other }: { label: string; n: number; rows: number; other?: boolean }) {
  return (
    <p className={`tx-tv${other ? ' tx-other' : ''}`}>
      <span className="tx-v" title={label}>{label}</span>
      <span className="tx-s">{share(n, rows)}</span>
      <i style={{ width: `${Math.max(2, (n / rows) * 100)}%` }} />
    </p>
  )
}

function Warn({ p, rows }: { p: ColumnProfile; rows: number }) {
  if (p.kind === 'empty') return <p className="tx-warn"><b>Empty</b> in all {rows} sample rows</p>
  return mostlyEmpty(p) ? <p className="tx-warn"><b>Mostly empty</b> · {share(p.empty, rows)}</p> : null
}

/** A column's small chart for the Detail header. */
export function MiniChart({ p, rows }: { p: ColumnProfile; rows: number }) {
  if (p.kind === 'empty') return <div className="tx-mini"><Warn p={p} rows={rows} /></div>
  if (p.bins && p.different === 1)
    return (
      <div className="tx-mini">
        <p className="tx-tv"><span className="tx-v" title={p.ends?.[0]}>Every value: {p.ends?.[0]}</span></p>
        <Warn p={p} rows={rows} />
      </div>
    )
  if (p.bins)
    return (
      <div className="tx-mini">
        <Histogram bins={p.bins} rows={rows} height={34} />
        <p className="tx-ends"><span>{p.ends?.[0]}</span>{p.log && <span>log</span>}<span>{p.ends?.[1]}</span></p>
        <Warn p={p} rows={rows} />
      </div>
    )
  if (p.kind === 'key')
    return (
      <div className="tx-mini">
        <p className="tx-tv"><span className="tx-v">{fig(p.different)} different</span><span className="tx-s">{share(p.filled, rows)} filled</span><i style={{ width: `${(p.filled / rows) * 100}%` }} /></p>
        <Warn p={p} rows={rows} />
      </div>
    )
  const top = (p.top ?? []).slice(0, 2)
  const rest = p.filled - top.reduce((s, [, n]) => s + n, 0)
  return (
    <div className="tx-mini">
      {top.map(([v, n]) => <TopRow key={v} label={v} n={n} rows={rows} />)}
      {rest > 0 && <TopRow label={`Other (${fig(p.different - top.length)})`} n={rest} rows={rows} other />}
      <Warn p={p} rows={rows} />
    </div>
  )
}

/** The Columns view: one column at a time, down the pane. */
export function ColumnsView({ profiles, desc, rows }: { profiles: ColumnProfile[]; desc: Record<string, string>; rows: number }) {
  return (
    <div className="tx-cols">
      {profiles.map(p => {
        const top = (p.top ?? []).slice(0, 8)
        const rest = (p.top ?? []).slice(8)
        return (
          <section key={p.name} className="tx-col">
            <header>
              <p className="tx-nm"><KindMark kind={p.kind} size={14} /><span title={p.name}>{p.name}</span><em>{KIND_LABEL[p.kind]}</em></p>
              {desc[p.name] && <p className="tx-ds">{desc[p.name]}</p>}
            </header>
            <div className="tx-colbody">
              <div className="tx-chartbox">
                {p.kind === 'empty' ? (
                  <Warn p={p} rows={rows} />
                ) : p.bins && p.different === 1 ? (
                  <p className="tx-one">Every value is <b>{p.ends?.[0]}</b>.</p>
                ) : p.bins ? (
                  <>
                    <Histogram bins={p.bins} rows={rows} height={140} big />
                    <p className="tx-ends tx-big"><span>{p.ends?.[0]}</span>{p.log && <span>log scale</span>}<span>{p.ends?.[1]}</span></p>
                  </>
                ) : p.kind === 'key' ? (
                  <p className="tx-one">{fig(p.different)} different values in {fig(p.filled)} filled rows.</p>
                ) : (
                  <table className="tx-topv">
                    <tbody>
                      {top.map(([v, n]) => (
                        <tr key={v}>
                          <td className="tx-v" title={v}>{v}</td>
                          <td className="tx-b"><i style={{ width: `${(n / top[0][1]) * 100}%` }} /></td>
                          <td className="tx-n">{n}</td>
                        </tr>
                      ))}
                      {rest.length > 0 && (
                        <tr className="tx-other">
                          <td className="tx-v">Other ({fig(rest.length)} values)</td>
                          <td className="tx-b" />
                          <td className="tx-n">{rest.reduce((s, [, n]) => s + n, 0)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="tx-fe">
                <div className="tx-bar"><i style={{ width: `${(p.filled / rows) * 100}%` }} /></div>
                <dl>
                  <div><dt>Filled</dt><dd>{p.filled} <span>{share(p.filled, rows)}</span></dd></div>
                  <div className={mostlyEmpty(p) || p.kind === 'empty' ? 'tx-warnrow' : undefined}>
                    <dt>Empty</dt>
                    <dd>{p.empty} <span>{share(p.empty, rows)}</span>{(mostlyEmpty(p) || p.kind === 'empty') && <b>{p.kind === 'empty' ? 'empty' : 'mostly empty'}</b>}</dd>
                  </div>
                  <div><dt>Different values</dt><dd>{p.different}</dd></div>
                </dl>
              </div>
            </div>
            {p.stats && (
              <dl className="tx-st">
                {(
                  [
                    ['Mean', p.stats.mean],
                    ['Std. deviation', p.stats.sd],
                    ['Minimum', p.stats.min],
                    ['25%', p.stats.q1],
                    ['Median', p.stats.median],
                    ['75%', p.stats.q3],
                    ['Maximum', p.stats.max],
                  ] as [string, number][]
                ).map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd>{fig(v)}</dd></div>
                ))}
              </dl>
            )}
          </section>
        )
      })}
    </div>
  )
}
