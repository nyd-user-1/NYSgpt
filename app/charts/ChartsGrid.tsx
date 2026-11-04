'use client'

import * as React from 'react'
import * as echarts from 'echarts'
import { BarChart3, X } from 'lucide-react'

import { PRODUCT_EXTRAS, type HomeCardData } from '@/lib/home-data'

// The contents plate, cut as charts (Brendan's ask, 2026-11-04): the same boxes as /, but pressing
// one opens a popover holding a chart and one explainer line, drawn from the data the cards
// already carry — each product's `stats` layers as bars, and Science as the real thing: the chart
// of nuclides read live from the corpus (/api/nsr/nuclide-field), every point a nuclide, its glow
// the number of papers that touch it.

const SERIF = { fontFamily: 'var(--font-display), Georgia, serif' } as const
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const

const nf = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const full = new Intl.NumberFormat('en')

type Field = { points: [number, number, number][] }

/** The bars behind a card: its measured stats layers, else its API's endpoint counts. */
function barsOf(card: HomeCardData): { label: string; value: number }[] {
  if (card.stats?.length) return [...card.stats].sort((a, b) => a.value - b.value).map((s) => ({ label: s.unit, value: s.value }))
  const api = PRODUCT_EXTRAS[card.title]?.api
  if (api?.endpoints?.length) return [...api.endpoints].sort((a, b) => a[1] - b[1]).map(([path, count]) => ({ label: path, value: count }))
  return []
}

function barOption(card: HomeCardData): echarts.EChartsOption {
  const bars = barsOf(card)
  const values = bars.map((b) => b.value).filter((v) => v > 0)
  // A thousand-fold spread flattens a linear axis into one visible bar: go logarithmic.
  const log = values.length > 1 && Math.max(...values) / Math.min(...values) > 1000
  return {
    animationDuration: 700,
    animationEasing: 'cubicOut',
    grid: { left: 8, right: 56, top: 8, bottom: 28, containLabel: true },
    tooltip: { trigger: 'item', valueFormatter: (v) => full.format(Number(v)) },
    xAxis: {
      type: log ? 'log' : 'value',
      axisLabel: { fontSize: 11, color: '#64748b', formatter: (v: number) => nf.format(v) },
      splitLine: { show: false },
      axisLine: { show: true, lineStyle: { color: '#94a3b8' } },
    },
    yAxis: {
      type: 'category',
      data: bars.map((b) => b.label),
      axisLabel: { fontSize: 11, color: '#334155', width: 150, overflow: 'truncate' },
      axisLine: { lineStyle: { color: '#94a3b8' } },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: bars.map((b) => Math.max(b.value, log ? 1 : 0)),
        barMaxWidth: 16,
        itemStyle: { color: card.accent || '#1e3a8a', borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'right', fontSize: 10, color: '#64748b', formatter: (p) => nf.format(bars[p.dataIndex].value) },
      },
    ],
  }
}

function fieldOption(field: Field): echarts.EChartsOption {
  // Paper counts per nuclide run 1 → ~25,000: the glow maps their log, or the stable valley's
  // giants drown everything else to black. The tooltip keeps the raw count in dimension 2.
  const data = field.points.map(([n, z, c]) => [n, z, c, Math.log10(c + 1)])
  const max = Math.max(...data.map((p) => p[3]))
  return {
    animationDuration: 900,
    backgroundColor: '#0b1120',
    grid: { left: 44, right: 16, top: 16, bottom: 40 },
    tooltip: {
      formatter: (p) => {
        const v = (p as unknown as { value: [number, number, number] }).value
        return `Z ${v[1]} · N ${v[0]} — ${full.format(v[2])} papers`
      },
    },
    xAxis: {
      type: 'value', name: 'N', nameTextStyle: { color: '#64748b' }, max: 180,
      axisLabel: { color: '#475569', fontSize: 10 }, axisLine: { lineStyle: { color: '#1e293b' } }, splitLine: { show: false },
    },
    yAxis: {
      type: 'value', name: 'Z', nameTextStyle: { color: '#64748b' }, max: 118,
      axisLabel: { color: '#475569', fontSize: 10 }, axisLine: { lineStyle: { color: '#1e293b' } }, splitLine: { show: false },
    },
    visualMap: {
      show: false, dimension: 3, min: 0, max,
      inRange: { color: ['#172554', '#1d4ed8', '#00bfff', '#e0f2fe'], symbolSize: [2, 8] },
    },
    series: [
      {
        // ~7,800 points: no need for large mode, which would bypass the visualMap's size/color encodings.
        type: 'scatter',
        data,
        blendMode: 'lighter',
        itemStyle: { opacity: 0.85 },
      },
    ],
  }
}

function explainer(card: HomeCardData, nuclides: boolean): string {
  if (nuclides)
    return 'Every point is a nuclide the literature has touched — neutrons across, protons up, the valley of stability drawn by the corpus’s 303,568 references. Brightness and size are how many papers mention that nuclide, from 1.21 million paper–nuclide links; the dark fringes are where the data runs thin.'
  if (card.stats?.length) return `The bars are the measured layers behind the headline figure — each one counted from ${card.title}’s own database. A logarithmic scale where the spread demands it: the long bars run into the millions.`
  return `Each bar is one endpoint of the ${card.title} API and the records it reaches.`
}

/** The popover: a paper card over a scrim, the chart drawn the moment it opens. */
function ChartPopover({ card, onClose }: { card: HomeCardData; onClose: () => void }) {
  const el = React.useRef<HTMLDivElement>(null)
  const science = card.title === 'Science'
  const [nuclides, setNuclides] = React.useState(false)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  React.useEffect(() => {
    const c = echarts.init(el.current!, undefined, { renderer: 'canvas' })
    let live = true
    if (science) {
      c.showLoading('default', { text: '', color: '#00bfff', maskColor: '#0b1120' })
      fetch('/api/nsr/nuclide-field')
        .then((r) => r.json() as Promise<Field & { error?: string }>)
        .then((f) => {
          if (!live) return
          c.hideLoading()
          if (f.points?.length) { setNuclides(true); c.setOption(fieldOption(f)) }
          else c.setOption(barOption(card))
        })
        .catch(() => { if (live) { c.hideLoading(); c.setOption(barOption(card)) } })
    } else {
      c.setOption(barOption(card))
    }
    const ro = new ResizeObserver(() => c.resize())
    ro.observe(el.current!)
    return () => { live = false; ro.disconnect(); c.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.title])
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 p-4 sm:p-8" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper)] shadow-[0_18px_60px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--paper-rule)] px-5 py-4">
          <h2 className="min-w-0 flex-1 truncate text-[20px] leading-none" style={{ ...SERIF, color: card.accent }}>{card.title}</h2>
          <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-[var(--paper-faint)] tabular-nums" style={MONO}>
            {nf.format(card.value)} {card.unit.replace(/^~\s*/, '')}
          </span>
          <button onClick={onClose} aria-label="Close" className="shrink-0 rounded-lg p-1.5 text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div ref={el} className={`h-[380px] w-full ${science ? '' : 'px-2 pt-2'}`} />
        <p className="border-t border-[var(--paper-rule)] px-5 py-4 text-[12.5px] leading-[1.65] text-[var(--paper-muted)]" style={SANS}>
          {explainer(card, nuclides)}
        </p>
      </div>
    </div>
  )
}

export function ChartsGrid({ cards }: { cards: HomeCardData[] }) {
  const [open, setOpen] = React.useState<HomeCardData | null>(null)
  const plates = cards.filter((c) => (c.stats?.length ?? 0) > 0 || PRODUCT_EXTRAS[c.title]?.api?.endpoints?.length)
  return (
    <>
      <div className="-m-px grid grid-cols-1 border-t border-l border-[var(--paper-rule)] sm:grid-cols-2 lg:grid-cols-3">
        {plates.map((card, i) => (
          <button
            key={card.title}
            type="button"
            onClick={() => setOpen(card)}
            style={{ '--accent': card.accent, '--accent-tint': `color-mix(in oklab, ${card.accent} 5%, var(--paper))` } as React.CSSProperties}
            className="group/chart flex min-h-[190px] flex-col border-b border-r border-[var(--paper-rule)] px-5 py-5 text-left transition-colors hover:bg-[var(--accent-tint)] [-webkit-tap-highlight-color:transparent]"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="m-0 text-[20px] leading-[1.1] transition-colors group-hover/chart:text-[var(--accent)]" style={{ ...SERIF, color: 'var(--paper-text)' }}>
                {card.title}
              </h3>
              <BarChart3 className="h-4 w-4 shrink-0 text-[var(--paper-faint)] transition-colors group-hover/chart:text-[var(--accent)]" />
            </div>
            <p className="mt-2 flex-1 text-[12px] leading-[1.5] text-[var(--paper-muted)]" style={SANS}>{card.body}</p>
            <div className="mt-4 flex items-end justify-between gap-3">
              <span className="text-[10px] uppercase tracking-[0.18em] tabular-nums text-[var(--paper-faint)]" style={MONO}>
                {nf.format(card.value)} {card.unit.replace(/^~\s*/, '')}
              </span>
              <span className="text-[10px] tabular-nums tracking-[0.2em] text-[var(--paper-faint)]" style={MONO}>{String(i + 1).padStart(2, '0')}</span>
            </div>
          </button>
        ))}
      </div>
      {open && <ChartPopover card={open} onClose={() => setOpen(null)} />}
    </>
  )
}
