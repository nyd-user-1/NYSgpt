'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { compactNum, loadSample, type Sample, type Table } from '@/lib/home-catalog'
import { Icon, TableIcon } from './HomeIcons'
import { TableChart } from './TableChart'

/** The three views of a table, in the order the switcher lists them. */
export type TableView = 'fields' | 'data' | 'chart'
export const TABLE_VIEWS: { id: TableView; label: string }[] = [
  { id: 'fields', label: 'Fields' },
  { id: 'data', label: 'Data' },
  { id: 'chart', label: 'Chart' },
]
export const nextView = (v: TableView): TableView => TABLE_VIEWS[(TABLE_VIEWS.findIndex(x => x.id === v) + 1) % TABLE_VIEWS.length].id

/** The chart button: three bars in the site's blue. */
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#033882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 21V10M12 21V4M19 21v-7" />
    </svg>
  )
}

/** The fields button, shown while the sample rows are up: a list of lines, in the site's blue like the table button. */
function FieldsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#033882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 5h.01M3 12h.01M3 19h.01M8 5h13M8 12h13M8 19h13" />
    </svg>
  )
}

/** One table: its name, counts and description, then its fields or its sample rows. Shared with the side panel. */
export function TableDetail({
  t,
  rows,
  onRows,
  panel,
  view: viewProp,
  onView,
}: {
  t: Table
  rows: boolean
  onRows: () => void
  panel?: boolean
  /** The overlay passes the view and its setter; the side panel passes only rows, and the chart view is kept here. */
  view?: TableView
  onView?: (v: TableView) => void
}) {
  const [local, setLocal] = useState<TableView>(rows ? 'data' : 'fields')
  const view: TableView = viewProp ?? (local === 'chart' ? 'chart' : rows ? 'data' : 'fields')
  const setView = (v: TableView) => {
    if (onView) return onView(v)
    setLocal(v)
    if (v !== 'chart' && (v === 'data') !== rows) onRows()
  }
  const [menu, setMenu] = useState(false)
  const sw = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!menu) return
    const away = (e: MouseEvent) => {
      if (!sw.current?.contains(e.target as Node)) setMenu(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      setMenu(false)
    }
    document.addEventListener('mousedown', away, true)
    window.addEventListener('keydown', esc, true)
    return () => {
      document.removeEventListener('mousedown', away, true)
      window.removeEventListener('keydown', esc, true)
    }
  }, [menu])
  const head = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [sample, setSample] = useState<Sample | null | 'loading'>('loading')
  /* the sample rows' columns can be dragged into another order; the order holds until another table is shown */
  const [order, setOrder] = useState<number[] | null>(null)
  const [copied, setCopied] = useState(false)
  const drag = useRef<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  useEffect(() => setOrder(null), [t])
  const meta = [`${t.fields.length} fields`, t.rows != null ? `${compactNum(t.rows)} rows` : '', t.years].filter(Boolean).join(' · ')

  /* the table's header row sticks under the title block, whose height changes as the overlay grows */
  useLayoutEffect(() => {
    const h = head.current
    const w = wrap.current
    if (!h || !w) return
    const fit = () => w.style.setProperty('--ovh', `${h.offsetHeight}px`)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(h)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    if (view === 'fields') return
    let live = true
    setSample('loading')
    loadSample(t).then(s => {
      if (live) setSample(s)
    })
    return () => {
      live = false
    }
  }, [view, t])

  return (
    <div ref={wrap} className={panel ? 'hm-panel' : undefined}>
      <div ref={head} className="hm-dh">
        <div className="hm-dt">
          <h3>
            <span ref={sw} className="hm-ctx">
              <button
                type="button"
                className="hm-copy hm-ctx-b"
                aria-haspopup="menu"
                aria-expanded={menu}
                title="Switch the view"
                onClick={() => setMenu(v => !v)}
              >
                <span>{t.table}</span>
                <span className="hm-ctx-v">{TABLE_VIEWS.find(x => x.id === view)?.label}</span>
                <span className="hm-ctx-c" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
                  </svg>
                </span>
              </button>
              {menu && (
                <span className="hm-ctx-m" role="menu">
                  {TABLE_VIEWS.map(x => (
                    <button
                      type="button"
                      key={x.id}
                      role="menuitemradio"
                      aria-checked={x.id === view}
                      className={x.id === view ? 'hm-on' : undefined}
                      onClick={() => {
                        setView(x.id)
                        setMenu(false)
                      }}
                    >
                      <span>{x.label}</span>
                      {x.id === view && <Icon name="check" />}
                    </button>
                  ))}
                </span>
              )}
            </span>
            <button
              type="button"
              className={`hm-copy hm-copy-b ${copied ? 'hm-copied' : ''}`}
              title="Copy the name"
              aria-label={`Copy the name ${t.table}`}
              onClick={() => {
                void navigator.clipboard?.writeText(t.table).then(() => {
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1200)
                })
              }}
            >
              <span className="hm-copy-ic" aria-hidden>
                <Icon name={copied ? 'check' : 'copy'} />
              </span>
            </button>
          </h3>
          {t.rows != null && (
            <button
              type="button"
              className="hm-ovr hm-tb"
              aria-label={`Show ${TABLE_VIEWS.find(x => x.id === nextView(view))?.label.toLowerCase()}`}
              title={`Show ${TABLE_VIEWS.find(x => x.id === nextView(view))?.label.toLowerCase()}`}
              onClick={() => setView(nextView(view))}
            >
              {nextView(view) === 'data' ? <TableIcon /> : nextView(view) === 'chart' ? <ChartIcon /> : <FieldsIcon />}
            </button>
          )}
        </div>
        <p className="hm-om">{meta}</p>
        {t.about && <p className="hm-oa">{t.about}</p>}
      </div>
      {view !== 'fields' ? (
        sample === 'loading' ? (
          <p className="hm-cnote" style={panel ? { padding: '0 20px' } : undefined}>Loading the rows…</p>
        ) : sample && view === 'chart' ? (
          <TableChart sample={sample} panel={panel} />
        ) : sample ? (
          <>
            <table className="hm-rows">
              <thead>
                <tr>
                  {(order ?? sample.c.map((_, i) => i)).map((ci, pos) => (
                    <th
                      key={sample.c[ci]}
                      draggable
                      className={over === pos ? 'hm-drop' : undefined}
                      title="Drag to move this column"
                      onDragStart={e => {
                        drag.current = pos
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onDragOver={e => {
                        if (drag.current === null) return
                        e.preventDefault()
                        if (over !== pos) setOver(pos)
                      }}
                      onDragEnd={() => {
                        drag.current = null
                        setOver(null)
                      }}
                      onDrop={e => {
                        e.preventDefault()
                        const from = drag.current
                        drag.current = null
                        setOver(null)
                        if (from === null || from === pos) return
                        const next = [...(order ?? sample.c.map((_, i) => i))]
                        const [m] = next.splice(from, 1)
                        next.splice(pos, 0, m)
                        setOrder(next)
                      }}
                    >
                      {sample.c[ci]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.r.map((r, i) => (
                  <tr key={i}>
                    {(order ?? r.map((_, j) => j)).map(j => (
                      <td key={j} title={r[j]}>
                        {r[j]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hm-cnote" style={panel ? { padding: '0 20px' } : undefined}>
              {sample.r.length} sample rows
            </p>
          </>
        ) : (
          <p className="hm-cnote" style={panel ? { padding: '0 20px' } : undefined}>No sample rows for this table yet.</p>
        )
      ) : (
        <table className="hm-of">
          <colgroup>
            <col style={{ width: '24%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '34%' }} />
            <col style={{ width: '30%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>field</th>
              <th>type</th>
              <th>description</th>
              <th>sample</th>
            </tr>
          </thead>
          <tbody>
            {t.fields.map(f => (
              <tr key={f.name}>
                <td>
                  <div className="hm-cl" title={f.name}>{f.name}</div>
                </td>
                <td className="hm-m hm-ty" title={f.type}>
                  {f.type}
                </td>
                <td>
                  <div className="hm-cl" title={f.desc}>{f.desc}</div>
                </td>
                <td className="hm-m">
                  <div className="hm-cl" title={f.sample}>{f.sample}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
