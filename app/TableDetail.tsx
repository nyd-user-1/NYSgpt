'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { compactNum, loadSample, type Sample, type Table } from '@/lib/home-catalog'
import { TableIcon } from './HomeIcons'

/** One table: its name, counts and description, then its fields or its sample rows. Shared with the side panel. */
export function TableDetail({ t, rows, onRows, panel }: { t: Table; rows: boolean; onRows: () => void; panel?: boolean }) {
  const head = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [sample, setSample] = useState<Sample | null | 'loading'>('loading')
  /* the sample rows' columns can be dragged into another order; the order holds until another table is shown */
  const [order, setOrder] = useState<number[] | null>(null)
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
    if (!rows) return
    let live = true
    setSample('loading')
    loadSample(t).then(s => {
      if (live) setSample(s)
    })
    return () => {
      live = false
    }
  }, [rows, t])

  return (
    <div ref={wrap} className={panel ? 'hm-panel' : undefined}>
      <div ref={head} className="hm-dh">
        <div className="hm-dt">
          <h3>{t.table}</h3>
          {t.rows != null && (
            <button type="button" className="hm-ovr hm-tb" aria-label="Show the sample rows" title="Show the sample rows" onClick={onRows}>
              <TableIcon />
            </button>
          )}
        </div>
        <p className="hm-om">{meta}</p>
        {t.about && <p className="hm-oa">{t.about}</p>}
      </div>
      {rows ? (
        sample === 'loading' ? (
          <p className="hm-cnote" style={panel ? { padding: '0 20px' } : undefined}>Loading the rows…</p>
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
