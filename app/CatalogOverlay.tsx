'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SET_INFO } from '@/lib/home-boxes'
import { home, useHome } from '@/lib/home-store'
import { compactNum, loadCatalog, type Table } from '@/lib/home-catalog'
import { useSwitchboard } from '@/components/SwitchboardPanel'
import { Icon } from './HomeIcons'
import { TableDetail } from './TableDetail'

/**
 * The catalog overlay (2026-11-19, brief 43, the option 3 sketch's): a box
 * opens it, and it grows out of that box into the exact shape of the app
 * frame, tracking the frame while the side panels open or the window resizes.
 *
 * Search on top; under it the chips (All, and the product it opened on) and
 * arrows that step through the databases; the tables on the left, grouped by
 * database; the chosen table on the right, its fields or (the table button,
 * Enter, or a list item's arrow) its sample rows. The column between them is
 * dragged or stepped with the arrow keys, and remembered in this browser.
 * Up and down step through the tables, left and right through the databases,
 * Escape closes.
 *
 * Data boxes read the static catalog in public/home-catalog/ (lib/home-catalog);
 * models, platforms and tools read their facts from SET_INFO.
 */

const COL_KEY = 'catalog-ov-col4'

const frameEl = () => document.querySelector<HTMLElement>('[data-app-frame]')

function place(el: HTMLElement, r: DOMRect | null) {
  if (!r) return
  el.style.top = `${r.top}px`
  el.style.left = `${r.left}px`
  el.style.width = `${r.width}px`
  el.style.height = `${r.height}px`
}

export function CatalogOverlay() {
  const { overlay } = useHome()
  const { open: panelOpen, openMenu, close: closePanel } = useSwitchboard()
  const [shown, setShown] = useState(false)
  const [grown, setGrown] = useState(false)
  const [mounted, setMounted] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  const [data, setData] = useState<Table[] | null | 'loading'>(null)
  const [product, setProduct] = useState(overlay.product)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<number | null>(null)
  const [rows, setRows] = useState(false)

  useEffect(() => setMounted(true), [])

  /* open: snap onto the box, then grow into the frame; close: shrink back onto the box */
  useLayoutEffect(() => {
    const el = box.current
    if (overlay.open) {
      setShown(true)
      setProduct(overlay.product)
      setQ('')
      setSel(null)
      setRows(false)
    } else if (el && shown) {
      setGrown(false)
      const t1 = window.setTimeout(() => place(el, overlay.from), 120)
      const t2 = window.setTimeout(() => setShown(false), 600)
      return () => {
        window.clearTimeout(t1)
        window.clearTimeout(t2)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay.open])

  useLayoutEffect(() => {
    const el = box.current
    if (!el || !shown || !overlay.open) return
    el.classList.add('hm-noanim')
    place(el, overlay.from ?? frameEl()?.getBoundingClientRect() ?? null)
    void el.offsetHeight
    el.classList.remove('hm-noanim')
    const raf = requestAnimationFrame(() => {
      setGrown(true)
      place(el, frameEl()?.getBoundingClientRect() ?? null)
    })
    const focus = window.setTimeout(() => input.current?.focus(), 450)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(focus)
    }
  }, [shown, overlay.open, overlay.from])

  /* keep the frame's exact shape while it changes */
  useEffect(() => {
    if (!shown || !grown) return
    const f = frameEl()
    const el = box.current
    if (!f || !el) return
    // A ResizeObserver reports once as soon as it starts watching. That first report arrived while the
    // overlay was still growing out of its box and snapped it to full size, so the opening never showed.
    // Until the opening has run (450 ms), a report only moves the target and leaves the transition alone.
    let opened = false
    const settle = window.setTimeout(() => { opened = true }, 500)
    const snap = () => {
      if (!opened) {
        place(el, f.getBoundingClientRect())
        return
      }
      el.classList.add('hm-noanim')
      place(el, f.getBoundingClientRect())
      void el.offsetHeight
      el.classList.remove('hm-noanim')
    }
    const ro = new ResizeObserver(snap)
    ro.observe(f)
    window.addEventListener('resize', snap)
    return () => {
      window.clearTimeout(settle)
      ro.disconnect()
      window.removeEventListener('resize', snap)
    }
  }, [shown, grown])

  /* the tables for the set the overlay opened on */
  useEffect(() => {
    if (!overlay.open) return
    if (overlay.set !== 'data') {
      setData(
        SET_INFO[overlay.set].map(e => ({
          database: e.database,
          table: e.table,
          rows: null,
          about: e.about,
          years: '',
          fields: e.fields.map(f => ({ name: f.name, type: '', desc: f.desc, sample: '' })),
        })),
      )
      return
    }
    setData('loading')
    let live = true
    loadCatalog().then(c => {
      if (live) setData(c ? c.tables : null)
    })
    return () => {
      live = false
    }
  }, [overlay.open, overlay.set])

  const tables = useMemo(() => (Array.isArray(data) ? data : []), [data])
  const dbs = useMemo(() => [...new Set(tables.map(t => t.database))], [tables])
  /* every table the search matches, in any database; the database column counts these */
  const matched = useMemo(() => {
    const toks = q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
    return tables
      .map((t, i) => [t, i] as const)
      .filter(
        ([t]) =>
          !toks.length ||
          toks.every(k => `${t.database} ${t.table} ${t.fields.map(f => f.name).join(' ')} ${t.about}`.toLowerCase().includes(k)),
      )
  }, [tables, q])
  const dbCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const [t] of matched) m.set(t.database, (m.get(t.database) ?? 0) + 1)
    return m
  }, [matched])
  const hits = useMemo(() => matched.filter(([t]) => product === 'All' || t.database === product), [matched, product])
  const order = hits.map(([, i]) => i)
  const cur = sel !== null && order.includes(sel) ? sel : (order[0] ?? null)
  const table = cur !== null ? tables[cur] : null

  const stepDb = useCallback(
    (d: number) => {
      if (!dbs.length) return
      const from = product !== 'All' ? product : table?.database
      let i = dbs.indexOf(from ?? '')
      i = (((i < 0 ? 0 : i + d) % dbs.length) + dbs.length) % dbs.length
      setProduct(dbs[i])
      setSel(null)
    },
    [dbs, product, table],
  )
  const stepTable = useCallback(
    (d: number) => {
      if (!order.length) return
      let i = order.indexOf(cur ?? -1)
      i = i < 0 ? 0 : Math.max(0, Math.min(order.length - 1, i + d))
      setSel(order[i])
    },
    [order, cur],
  )

  /* the keys while the overlay is open; capture, so the plate's keys stay out */
  useEffect(() => {
    if (!overlay.open) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const inp = t.closest?.('input,textarea') as HTMLInputElement | null
      const k = e.key
      if (k === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        home.closeOverlay()
        return
      }
      if (t.closest?.('.hm-chd')) return
      if (k === 'ArrowUp' || k === 'ArrowDown') {
        if (inp && inp !== input.current) return
        e.preventDefault()
        e.stopImmediatePropagation()
        stepTable(k === 'ArrowUp' ? -1 : 1)
      } else if (k === 'Enter') {
        if ((inp && inp !== input.current) || (t.closest?.('button') && !t.closest('.hm-oi'))) return
        e.preventDefault()
        e.stopImmediatePropagation()
        setRows(true)
      } else if (k === 'ArrowLeft' || k === 'ArrowRight') {
        if (inp && inp.value) return
        e.preventDefault()
        e.stopImmediatePropagation()
        stepDb(k === 'ArrowLeft' ? -1 : 1)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [overlay.open, stepDb, stepTable])

  /* the selected table stays in view in the list */
  useEffect(() => {
    document.querySelector('.hm-otb .hm-oi.hm-on')?.scrollIntoView({ block: 'nearest' })
  }, [cur])

  if (!mounted || !shown) return null

  const groups = new Map<string, (readonly [Table, number])[]>()
  for (const h of hits) groups.set(h[0].database, [...(groups.get(h[0].database) ?? []), h])

  return createPortal(
    <div ref={box} className={`nysgpt-app hm-ovp ${grown ? 'hm-open' : ''}`} role="dialog" aria-label="Catalog">
      <div className="hm-ovh">
        <button type="button" className="hm-ovr" aria-label="Close the catalog" onClick={() => home.closeOverlay()}>
          <Icon name="x" />
        </button>
        <span className="hm-ovqw">
          <input
            ref={input}
            value={q}
            placeholder="Search catalog..."
            aria-label="Search the catalog"
            onChange={e => {
              setQ(e.target.value)
              setSel(null)
            }}
          />
          {q && (
            <button
              type="button"
              className="hm-ovqx"
              aria-label="Clear the search"
              onClick={() => {
                setQ('')
                setSel(null)
                input.current?.focus()
              }}
            >
              <Icon name="x" />
            </button>
          )}
        </span>
        <button
          type="button"
          className="hm-ovr"
          aria-label={panelOpen ? 'Close the switchboard' : 'Open the switchboard'}
          onClick={() => (panelOpen ? closePanel() : openMenu())}
        >
          <Icon name="chat" fill="#dbe7fa" style={{ color: '#033882' }} />
        </button>
      </div>
      <div className="hm-ovc">
        {['All', ...(product !== 'All' ? [product] : [])].map(p => (
          <button
            type="button"
            key={p}
            className={`hm-chip ${p === product ? 'hm-on' : ''}`}
            onClick={() => {
              setProduct(p)
              setSel(null)
            }}
          >
            {p}
          </button>
        ))}
        <span className="hm-ovnav">
          <button type="button" className="hm-ovr hm-sm" aria-label="Previous database" onClick={() => stepDb(-1)}>
            <Icon name="left" />
          </button>
          <button type="button" className="hm-ovr hm-sm" aria-label="Next database" onClick={() => stepDb(1)}>
            <Icon name="right" />
          </button>
        </span>
      </div>
      <Columns>
        <div className="hm-pane hm-ovl">
          {data === 'loading' ? (
            <p className="hm-cnote" style={{ padding: '16px 20px' }}>Loading the catalog…</p>
          ) : data === null ? (
            <p className="hm-cnote" style={{ padding: '16px 20px' }}>The catalog did not load.</p>
          ) : (
            <div className="hm-odb thin-scrollbar">
              <p className="hm-og">Database</p>
              {dbs
                .filter(d => dbCount.has(d))
                .map(d => (
                  <button
                    type="button"
                    key={d}
                    className={`hm-oi hm-od ${d === (product !== 'All' ? product : table?.database) ? (product !== 'All' ? 'hm-on' : 'hm-at') : ''}`}
                    onClick={() => {
                      setProduct(d)
                      setSel(null)
                    }}
                  >
                    <span>{d}</span>
                    <small>{dbCount.get(d)}</small>
                  </button>
                ))}
            </div>
          )}
          {Array.isArray(data) && (hits.length ? (
            <div className="hm-otb thin-scrollbar">
              <p className="hm-og">Table</p>
              {[...groups.values()].map(l =>
                l.slice(0, 300).map(([t, i]) => (
                  <button
                    type="button"
                    key={i}
                    className={`hm-oi ${i === cur ? 'hm-on' : ''}`}
                    onClick={() => setSel(i)}
                  >
                    <span>{t.table}</span>
                    <small>
                      {t.rows != null ? compactNum(t.rows) : ''}
                      <span
                        className="hm-oarr"
                        title="Show the sample rows"
                        onClick={e => {
                          e.stopPropagation()
                          setSel(i)
                          setRows(true)
                        }}
                      >
                        <Icon name="arrow" />
                      </span>
                    </small>
                  </button>
                )),
              )}
            </div>
          ) : (
            <p className="hm-cnote" style={{ padding: '16px 20px' }}>No tables match.</p>
          ))}
        </div>
        <div className="hm-pane hm-ovd thin-scrollbar">{table && <TableDetail key={cur} t={table} rows={rows} onRows={() => setRows(v => !v)} />}</div>
      </Columns>
    </div>,
    document.body,
  )
}

/** The two columns and the handle between them, as on the catalog page. */
function Columns({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const h = useRef<HTMLButtonElement>(null)
  const w = useRef<number | null>(null)

  const fit = useCallback(() => {
    const b = ref.current
    if (!b) return
    if (w.current != null) {
      const W = b.clientWidth || 1200
      w.current = Math.max(380, Math.min(w.current, W - 320))
      b.style.setProperty('--ow1', `${w.current}px`)
    }
    const l = b.querySelector<HTMLElement>('.hm-ovl')?.offsetWidth
    if (l) b.style.setProperty('--owl', `${l}px`)
  }, [])
  const save = () => {
    try {
      localStorage.setItem(COL_KEY, String(w.current))
    } catch {}
  }

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(COL_KEY))
      if (v) w.current = v
    } catch {}
    fit()
    const ro = new ResizeObserver(fit)
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [fit])

  return (
    <div ref={ref} className="hm-ovb">
      {children}
      <button
        ref={h}
        type="button"
        className="hm-chd"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the columns"
        onPointerDown={e => {
          e.preventDefault()
          const el = h.current!
          el.setPointerCapture(e.pointerId)
          el.classList.add('hm-drag')
          document.body.style.cursor = 'col-resize'
          document.body.style.userSelect = 'none'
          const mv = (ev: PointerEvent) => {
            w.current = ev.clientX - ref.current!.getBoundingClientRect().left
            fit()
          }
          const up = () => {
            el.classList.remove('hm-drag')
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
            el.removeEventListener('pointermove', mv)
            el.removeEventListener('pointerup', up)
            save()
          }
          el.addEventListener('pointermove', mv)
          el.addEventListener('pointerup', up)
        }}
        onKeyDown={e => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          e.preventDefault()
          const l = ref.current?.querySelector<HTMLElement>('.hm-ovl')?.offsetWidth ?? 360
          w.current = (w.current ?? l) + (e.key === 'ArrowLeft' ? -16 : 16)
          fit()
          save()
        }}
      >
        <span />
      </button>
    </div>
  )
}
