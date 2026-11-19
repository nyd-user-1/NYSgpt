'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { compactNum, loadSample, type Field, type Sample, type Table } from '@/lib/home-catalog'
import { Icon, TableIcon } from './HomeIcons'
import { ColumnsView, KindMark, MiniChart } from './TableChart'
import { fig, KIND_LABEL, profileColumn, type Kind } from './table-profile'
import { explorerColumn, loadProfile, storedName, type TableProfile } from '@/lib/column-profiles'
import './table-explorer.css'

/**
 * One table, in the catalog overlay, the right panel and /search's try panel (brief 56, 2026-11-19, after
 * Kaggle's Data Explorer, in NYSgpt's look):
 *  - a summary: records, fields and years (for the whole table), the stored name when the caller has it, and
 *    the columns counted by kind (from the sample rows);
 *  - Fields: every field, its kind, type, description and a sample value;
 *  - Data, in two densities: Detail (each column's header carries its kind, a sort control, its description
 *    and a small chart) and Compact (the rows alone);
 *  - Columns: one column at a time down the pane, with its chart and figures;
 *  - a column chooser ("10 of 135 columns") for Data and Columns, held while the table is open.
 * Every chart and figure describes the sample rows, and says so once.
 */

/** The three views of a table, in the order the switcher lists them. The id "chart" is the Columns view. */
export type TableView = 'fields' | 'data' | 'chart'
export const TABLE_VIEWS: { id: TableView; label: string }[] = [
  { id: 'fields', label: 'Fields' },
  { id: 'data', label: 'Data' },
  { id: 'chart', label: 'Columns' },
]
export const nextView = (v: TableView): TableView => TABLE_VIEWS[(TABLE_VIEWS.findIndex(x => x.id === v) + 1) % TABLE_VIEWS.length].id

const FIRST = 10

/* Escape with the column chooser or the view menu open closes that, not the overlay or the panel around it: this
   listener is set when the module loads, so it runs before theirs, which are set when they mount. */
const CLOSE = 'tx:close'
if (typeof window !== 'undefined')
  window.addEventListener(
    'keydown',
    e => {
      if (e.key !== 'Escape' || !document.querySelector('.tx-cpop, .tx .hm-ctx-m')) return
      e.preventDefault()
      e.stopImmediatePropagation()
      window.dispatchEvent(new Event(CLOSE))
    },
    true,
  )

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

/** The column chooser: "10 of 135 columns", a filter and a checkbox a column. */
function Chooser({ all, shown, onShown }: { all: { name: string; kind: Kind }[]; shown: string[]; onShown: (s: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = () => setOpen(false)
    document.addEventListener('mousedown', away, true)
    window.addEventListener(CLOSE, esc)
    return () => {
      document.removeEventListener('mousedown', away, true)
      window.removeEventListener(CLOSE, esc)
    }
  }, [open])
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const hits = all.filter(c => words.every(w => c.name.toLowerCase().includes(w)))
  const on = new Set(shown)
  return (
    <div ref={box} className="tx-chooser">
      <button type="button" className="tx-cbtn" aria-expanded={open} onClick={() => setOpen(v => !v)}>
        {shown.length} of {all.length} columns
        <svg viewBox="0 0 24 24" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="tx-cpop" role="dialog" aria-label="Choose the columns">
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Filter the columns" aria-label="Filter the columns" />
          <p className="tx-clab">{q ? `${hits.length} match` : 'Columns'}</p>
          <div className="tx-clist">
            {hits.map(c => (
              <label key={c.name} title={c.name}>
                <input
                  type="checkbox"
                  checked={on.has(c.name)}
                  onChange={() => onShown(on.has(c.name) ? shown.filter(x => x !== c.name) : all.map(x => x.name).filter(x => on.has(x) || x === c.name))}
                />
                <KindMark kind={c.kind} />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
          <p className="tx-cfoot">
            <button type="button" onClick={() => onShown(all.map(c => c.name))}>Show all</button>
            <button type="button" onClick={() => onShown(all.slice(0, FIRST).map(c => c.name))}>First {FIRST}</button>
          </p>
        </div>
      )}
    </div>
  )
}

/** The fields table (field, type, description, sample), here and in the switchboard's facts for a model, platform or tool.
 *  Pointing at the table shows a copy button in its header (Brendan, 2026-11-19): it copies the table as tab-separated
 *  lines, header first, which paste as a table. */
export function FieldsTable({ fields, byName, style }: { fields: Field[]; byName?: Map<string, { kind: Kind }>; style?: import('react').CSSProperties }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    const lines = [['field', 'type', 'description', 'sample'], ...fields.map(f => [f.name, f.type, f.desc, f.sample])]
    try {
      const text = lines.map(l => l.map(v => (v ?? '').replace(/[\t\n]+/g, ' ')).join('\t')).join('\n')
      // The clipboard API needs a secure page; the dev box is plain http, so there the copy goes through a hidden text box.
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const box = document.createElement('textarea')
        box.value = text
        box.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
        document.body.appendChild(box)
        box.select()
        const ok = document.execCommand('copy')
        box.remove()
        if (!ok) return
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <table className="hm-of group/copy" style={style}>
      <colgroup>
        <col style={{ width: '26%' }} />
        <col style={{ width: '12%' }} />
        <col style={{ width: '34%' }} />
        <col style={{ width: '28%' }} />
      </colgroup>
      <thead>
        <tr>
          <th>field</th>
          <th>type</th>
          <th>description</th>
          <th>
            sample
            <button
              type="button"
              onClick={copy}
              aria-label={copied ? 'Copied the table' : 'Copy the table'}
              title={copied ? 'Copied' : 'Copy the table'}
              className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--paper-faint)] opacity-0 transition-opacity hover:bg-[color-mix(in_oklab,var(--paper-text)_14%,var(--paper))] hover:text-[var(--paper-text)] focus-visible:opacity-100 group-hover/copy:opacity-100"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {fields.map(f => {
          const p = byName?.get(f.name)
          return (
            <tr key={f.name}>
              <td>
                <div className="hm-cl tx-fname" title={p ? `${f.name} · ${KIND_LABEL[p.kind]} in the sample rows` : f.name}>
                  {p && <KindMark kind={p.kind} />}
                  <span>{f.name}</span>
                </div>
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
          )
        })}
      </tbody>
    </table>
  )
}

export function TableDetail({
  t,
  rows,
  onRows,
  panel,
  view: viewProp,
  onView,
  stored,
}: {
  t: Table
  rows: boolean
  onRows: () => void
  panel?: boolean
  /** The overlay passes the view and its setter; the side panel passes only rows, and the Columns view is kept here. */
  view?: TableView
  onView?: (v: TableView) => void
  /** The table's stored name (database.table), when the caller has it: shown in the summary, copied on a click. */
  stored?: string
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
    const esc = () => setMenu(false)
    document.addEventListener('mousedown', away, true)
    window.addEventListener(CLOSE, esc)
    return () => {
      document.removeEventListener('mousedown', away, true)
      window.removeEventListener(CLOSE, esc)
    }
  }, [menu])
  const head = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [sample, setSample] = useState<Sample | null | 'loading'>('loading')
  /* the sample rows' columns can be dragged into another order; the order, the chosen columns, the sort and the density hold until another table is shown */
  const [order, setOrder] = useState<string[] | null>(null)
  const [shown, setShown] = useState<string[] | null>(null)
  const [sort, setSort] = useState<{ col: string; dir: 1 | -1 } | null>(null)
  const [dense, setDense] = useState(false)
  const [copied, setCopied] = useState<'' | 'name' | 'stored'>('')
  const drag = useRef<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  useEffect(() => {
    setOrder(null)
    setShown(null)
    setSort(null)
  }, [t])

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
  /* the sample rows load with the table, for every view: the summary's kinds and the Fields view's marks read them too */
  useEffect(() => {
    let live = true
    setSample('loading')
    loadSample(t).then(s => {
      if (live) setSample(s)
    })
    return () => {
      live = false
    }
  }, [t])

  /* the figures: the catalog's 1,000-row profile of the table (brief 55), found by its stored name; a column the
     profile lacks, or a table with none, is profiled from the shipped sample rows instead */
  const [prof, setProf] = useState<TableProfile | null>(null)
  useEffect(() => {
    let live = true
    setProf(null)
    void (async () => {
      const name = stored ?? (await storedName(t.database, t.table))
      const p = name ? await loadProfile(name) : null
      if (live) setProf(p)
    })()
    return () => {
      live = false
    }
  }, [t, stored])
  const shipped = sample && sample !== 'loading' ? sample : null
  // a table with a profile but no rows shipped with the page still gets its columns, kinds and charts (and no rows)
  const s = useMemo<Sample | null>(() => shipped ?? (prof ? { c: prof.columns.map(c => c.name), r: [], n: 0 } : null), [shipped, prof])
  const profiles = useMemo(() => {
    if (!s) return []
    const from = prof ? new Map(prof.columns.map(c => [c.name, explorerColumn(c)])) : null
    return s.c.map((c, j) => from?.get(c) ?? profileColumn(c, s.r.map(r => r[j])))
  }, [s, prof])
  const byName = useMemo(() => new Map(profiles.map(p => [p.name, p])), [profiles])
  const desc = useMemo(() => Object.fromEntries(t.fields.map(f => [f.name, f.desc])), [t])
  const kinds = useMemo(() => {
    const n = new Map<Kind, number>()
    for (const p of profiles) n.set(p.kind, (n.get(p.kind) ?? 0) + 1)
    return (['number', 'text', 'date', 'key', 'yesno', 'empty'] as Kind[]).filter(k => n.get(k)).map(k => [k, n.get(k)!] as const)
  }, [profiles])
  const all = useMemo(() => (s ? s.c.map(c => ({ name: c, kind: byName.get(c)?.kind ?? ('text' as Kind) })) : []), [s, byName])
  const chosen = shown ?? all.slice(0, FIRST).map(c => c.name)
  const cols = (order ?? all.map(c => c.name)).filter(c => chosen.includes(c))
  const idx = useMemo(() => new Map((s?.c ?? []).map((c, i) => [c, i])), [s])
  const sorted = useMemo(() => {
    if (!s || !sort) return s?.r ?? []
    const j = idx.get(sort.col)
    if (j == null) return s.r
    const numeric = byName.get(sort.col)?.kind === 'number'
    const key = (v: string | null) => (numeric ? Number(String(v ?? '').replace(/[$,%\s]/g, '')) : String(v ?? ''))
    return [...s.r].sort((a, b) => {
      const x = key(a[j]), y = key(b[j])
      const ex = x === '' || (numeric && !Number.isFinite(x as number)), ey = y === '' || (numeric && !Number.isFinite(y as number))
      if (ex !== ey) return ex ? 1 : -1
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir
    })
  }, [s, sort, idx, byName])
  // the rows the figures describe: the profile's sample (1,000, or fewer for a short table), else the shipped rows
  const n = prof ? prof.sampleRows : (s?.r.length ?? 0)
  const pad = panel ? { padding: '0 20px' } : undefined
  const copy = (text: string, what: 'name' | 'stored') =>
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(what)
      window.setTimeout(() => setCopied(''), 1200)
    })

  const header = (c: string) => {
    const p = byName.get(c)
    const dragProps = {
      draggable: true,
      className: over === c ? 'hm-drop' : undefined,
      onDragStart: (e: React.DragEvent) => {
        drag.current = c
        e.dataTransfer.effectAllowed = 'move'
      },
      onDragOver: (e: React.DragEvent) => {
        if (drag.current === null) return
        e.preventDefault()
        if (over !== c) setOver(c)
      },
      onDragEnd: () => {
        drag.current = null
        setOver(null)
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault()
        const from = drag.current
        drag.current = null
        setOver(null)
        if (!from || from === c) return
        const next = (order ?? all.map(x => x.name)).filter(x => x !== from)
        next.splice(next.indexOf(c), 0, from)
        setOrder(next)
      },
    }
    if (dense)
      return (
        <th key={c} {...dragProps} title={`${c}: drag to move this column`}>
          {p && <KindMark kind={p.kind} />}
          <span>{c}</span>
        </th>
      )
    const dir = sort?.col === c ? sort.dir : 0
    return (
      <th key={c} {...dragProps} aria-sort={dir === 1 ? 'ascending' : dir === -1 ? 'descending' : 'none'}>
        <div className="tx-h">
          <p className="tx-nm">
            {p && <KindMark kind={p.kind} />}
            <span title={`${c}: drag to move this column`}>{c}</span>
            <button
              type="button"
              className={`tx-sort${dir ? ' tx-on' : ''}`}
              aria-label={`Sort by ${c}`}
              title={dir === 1 ? 'Sorted, lowest first' : dir === -1 ? 'Sorted, highest first' : 'Sort'}
              onClick={() => setSort(dir === 0 ? { col: c, dir: 1 } : dir === 1 ? { col: c, dir: -1 } : null)}
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                {dir === 1 ? <path d="m7 9 5-5 5 5M12 4v16" /> : dir === -1 ? <path d="m7 15 5 5 5-5M12 20V4" /> : <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />}
              </svg>
            </button>
          </p>
          <p className="tx-ds" title={desc[c] || undefined}>{desc[c] || ''}</p>
          {p && <MiniChart p={p} rows={n} />}
        </div>
      </th>
    )
  }

  return (
    <div ref={wrap} className={`tx ${panel ? 'hm-panel' : ''}`}>
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
              className={`hm-copy hm-copy-b ${copied === 'name' ? 'hm-copied' : ''}`}
              title="Copy the name"
              aria-label={`Copy the name ${t.table}`}
              onClick={() => copy(t.table, 'name')}
            >
              <span className="hm-copy-ic" aria-hidden>
                <Icon name={copied === 'name' ? 'check' : 'copy'} />
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
        {t.about && <p className="hm-oa">{t.about}</p>}
        <dl className="tx-sum">
          {t.rows != null && <div><dt>Records</dt><dd>{compactNum(t.rows)}</dd></div>}
          <div><dt>Fields</dt><dd>{t.fields.length}</dd></div>
          {t.years && <div><dt>Years</dt><dd>{t.years}</dd></div>}
          {stored && (
            <div className="tx-stored">
              <dt>Stored as</dt>
              <dd><button type="button" title="Copy the stored name" onClick={() => copy(stored, 'stored')}>{copied === 'stored' ? 'Copied' : stored}</button></dd>
            </div>
          )}
          {kinds.length > 0 && (
            <div className="tx-kinds">
              <dt>Columns by kind</dt>
              <dd>
                {kinds.map(([k, c]) => (
                  <span key={k}><KindMark kind={k} />{KIND_LABEL[k]} <b>{c}</b></span>
                ))}
              </dd>
            </div>
          )}
        </dl>
        {view !== 'fields' && s && (
          <div className="tx-tools">
            {view === 'data' && (
              <span className="tx-dens" role="radiogroup" aria-label="Density">
                <button type="button" role="radio" aria-checked={!dense} className={!dense ? 'tx-on' : undefined} onClick={() => setDense(false)}>Detail</button>
                <button type="button" role="radio" aria-checked={dense} className={dense ? 'tx-on' : undefined} onClick={() => setDense(true)}>Compact</button>
              </span>
            )}
            <Chooser all={all} shown={chosen} onShown={setShown} />
          </div>
        )}
        {s && (
          <p className="tx-note">
            {prof
              ? `Charts and figures are drawn from ${fig(n)} sample rows, not the whole table.${shipped ? '' : ' No rows are shipped with the page for this table.'}`
              : `Charts and figures are drawn from the ${n} rows shipped with the page; this table has no 1,000-row profile.`}{' '}
            Records and years are for the whole table.
          </p>
        )}
      </div>

      {view !== 'fields' ? (
        sample === 'loading' ? (
          <p className="hm-cnote" style={pad}>Loading the rows…</p>
        ) : !s ? (
          <p className="hm-cnote" style={pad}>No sample rows for this table yet.</p>
        ) : view === 'chart' ? (
          <ColumnsView profiles={cols.map(c => byName.get(c)!).filter(Boolean)} desc={desc} rows={n} />
        ) : (
          <div className="tx-grid">
            <table className={`tx-table ${dense ? 'tx-compact' : 'tx-detail'}`}>
              <thead>
                <tr>{cols.map(c => header(c))}</tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={i}>
                    {cols.map(c => {
                      const v = r[idx.get(c)!]
                      return <td key={c} title={v ?? undefined}>{v}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <FieldsTable fields={t.fields} byName={byName} />
      )}
    </div>
  )
}
