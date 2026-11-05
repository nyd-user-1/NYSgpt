'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { VIZ_POINT, isEmbedded } from '@/lib/pane'
import { loadBars, loadField, loadFlows, loadGraph, loadMatrix, loadPerYear, loadScatter, loadTriples } from '@/lib/viz-data'

/** A pressed row points at its datum: framed, the shell relays it; same-page, the chart hears it directly. */
function pointAt(slug: string, row: number) {
  const msg = { type: VIZ_POINT, slug, row }
  if (isEmbedded()) window.parent.postMessage(msg, window.location.origin)
  else window.dispatchEvent(new CustomEvent(VIZ_POINT, { detail: msg }))
}

// A chart's data as a table (2026-11-04: a click on any /viz chart opens it in the second panel). The
// rows come from the same snapshot file the chart draws (public/viz-data/*.json, via lib/viz-data.ts),
// fetched in the browser once the page is up — the page renders at once, the worker computes nothing,
// and a file the chart already pulled comes from the browser's cache. A hundred rows to a page;
// ?row=<i> opens on that row's page with the row marked (the clicked datum, when the chart can name it).

const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const
const PER = 100
const fmt = new Intl.NumberFormat('en')

type Cell = string | number
type Table = { columns: string[]; rows: Cell[][]; note?: string }

const field = () => loadField().then(f => ({ columns: ['N', 'Z', 'Papers'], rows: f.map(p => [p.n, p.z, p.c]) }))
const source = (nsr: boolean) => (nsr ? 'NSR' : 'arXiv/APS')

const LOAD: Record<string, () => Promise<Table>> = {
  nebula: field,
  heatmap: field,
  scatter3d: field,
  simplex: field,
  surface: field,
  'bar-large': () => loadBars().then(d => ({ columns: ['Nuclide', 'Papers'], rows: d.map(b => [`${b.a}${b.sym}`, b.c]) })),
  rainfall: () =>
    loadPerYear().then(d => {
      const ex = new Map(d.exfor.map(r => [r.y, r.c]))
      return { columns: ['Year', 'Papers', 'Into EXFOR'], rows: d.papers.map(r => [r.y, r.c, ex.get(r.y) ?? 0]) }
    }),
  weight: () => loadScatter().then(d => ({ columns: ['Year', 'Citations', 'Source'], rows: d.map(r => [r.y, r.c, source(r.nsr)]) })),
  'scatter3d-dataset': () =>
    loadTriples().then(d => ({ columns: ['Year', 'References', 'Citations', 'Source'], rows: d.map(r => [r.y, r.refs, r.cites, source(r.nsr)]) })),
  reactions: () => loadFlows().then(d => ({ columns: ['N', 'Z', 'ΔN', 'ΔZ', 'Papers'], rows: d.map(f => [f.n, f.z, f.dn, f.dz, f.w]) })),
  graph: () =>
    loadGraph().then(g => {
      const degree = new Map<string, number>()
      for (const e of g.edges) {
        degree.set(e.s, (degree.get(e.s) ?? 0) + 1)
        degree.set(e.t, (degree.get(e.t) ?? 0) + 1)
      }
      return {
        columns: ['Author', 'Papers', 'Co-authors'],
        rows: g.nodes.map(n => [n.name, n.c, degree.get(n.id) ?? 0]),
        note: `${fmt.format(g.edges.length)} co-author links not listed`,
      }
    }),
  matrix: () => loadMatrix().then(d => ({ columns: ['Measure', 'Measure', 'Pearson r'], rows: d.cells.map(([i, j, r]) => [d.vars[i], d.vars[j], r]) })),
}

export function DataTable({ slug }: { slug: string }) {
  const [table, setTable] = useState<Table | null>(null)
  const [page, setPage] = useState(0)
  const [mark, setMark] = useState<number | null>(null)
  const marked = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    let live = true
    const load = LOAD[slug]
    if (!load) return
    void load().then(t => {
      if (!live) return
      const raw = new URLSearchParams(window.location.search).get('row')
      const row = raw === null ? NaN : Number(raw)
      setTable(t)
      if (Number.isInteger(row) && row >= 0 && row < t.rows.length) {
        setMark(row)
        setPage(Math.floor(row / PER))
      }
    })
    return () => {
      live = false
    }
  }, [slug])

  useEffect(() => {
    marked.current?.scrollIntoView({ block: 'center' })
  }, [table, mark])

  if (!table) {
    return (
      <p className="px-6 py-6 text-[13px] text-[var(--paper-muted)]" style={SANS}>
        Loading the data…
      </p>
    )
  }
  const pages = Math.max(1, Math.ceil(table.rows.length / PER))
  const from = page * PER
  const rows = table.rows.slice(from, from + PER)
  // Chip dress gone (Brendan, 2026-11-04): a bare chevron either side of the count.
  const btn =
    'flex h-6 w-6 items-center justify-center rounded-md text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)] disabled:opacity-30 disabled:hover:bg-transparent'

  return (
    <div className="px-6 pb-8">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-[var(--paper)] py-3">
        <p className="text-[12px] text-[var(--paper-muted)]" style={SANS}>
          Rows {fmt.format(from + 1)}–{fmt.format(from + rows.length)} of {fmt.format(table.rows.length)}
          {table.note ? ` · ${table.note}` : ''}
        </p>
        <div className="flex items-center gap-2" style={MONO}>
          <button type="button" aria-label="Previous page" className={btn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[11px] tabular-nums text-[var(--paper-faint)]">
            {page + 1} / {pages}
          </span>
          <button type="button" aria-label="Next page" className={btn} disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <table className="w-full border-collapse text-[13px] text-[var(--paper-text)]" style={SANS}>
        <thead>
          <tr className="border-b border-[var(--paper-rule)]">
            {table.columns.map((c, i) => (
              <th key={i} className={`py-2 pr-4 text-[10px] font-normal uppercase tracking-[0.18em] text-[var(--paper-faint)] ${i ? 'text-right' : 'text-left'}`} style={MONO}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, k) => {
            const at = from + k
            const on = at === mark
            return (
              <tr
                key={at}
                ref={on ? marked : undefined}
                onClick={() => pointAt(slug, at)}
                className={`cursor-pointer border-b border-[var(--paper-rule-soft)] transition-colors hover:bg-[var(--paper-quiet)] ${on ? 'bg-[var(--paper-quiet)] text-[var(--paper-strong)]' : ''}`}
              >
                {r.map((v, i) => (
                  <td key={i} className={`py-1.5 pr-4 ${i ? 'text-right tabular-nums' : 'text-left'}`} style={typeof v === 'number' ? MONO : undefined}>
                    {typeof v === 'number' ? (Number.isInteger(v) ? fmt.format(v) : v.toFixed(3)) : v}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
