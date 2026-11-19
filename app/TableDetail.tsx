'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { compactNum, loadSample, type Sample, type Table } from '@/lib/home-catalog'
import { TableIcon } from './HomeIcons'

/** One table: its name, counts and description, then its fields or its sample rows. Shared with the side panel. */
export function TableDetail({ t, rows, onRows, panel }: { t: Table; rows: boolean; onRows: () => void; panel?: boolean }) {
  const head = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [sample, setSample] = useState<Sample | null | 'loading'>('loading')
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
                  {sample.c.map(c => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.r.map((r, i) => (
                  <tr key={i}>
                    {r.map((v, j) => (
                      <td key={j} title={v}>
                        {v}
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
              <th>Field</th>
              <th>Type</th>
              <th>Description</th>
              <th>Sample</th>
            </tr>
          </thead>
          <tbody>
            {t.fields.map(f => (
              <tr key={f.name}>
                <td>
                  <div className="hm-cl" title={f.name}>{f.name}</div>
                </td>
                <td className="hm-m">
                  <div className="hm-cl" title={f.type}>{f.type}</div>
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
