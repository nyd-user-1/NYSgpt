'use client'

/**
 * A payload block in the Blocks panel (brief 52, nysgpt-1): what the block carries, under the panel's own header.
 * design: swatches, a type specimen and the scales; table: its fields and sample rows (TableDetail); api: the request
 * and a sample response with copy buttons; page: its sections in order; brief: its fields, editable. Built from the
 * panel's existing classes (hm-kv, hm-rows, hm-boxopen) and type; no new look.
 */

import * as React from 'react'
import { TableDetail } from '@/app/TableDetail'
import { useHome } from '@/lib/home-store'
import type { Table } from '@/lib/home-catalog'
import { blockType, payloadOf, saveBrief, type ApiPayload, type BriefPayload, type DesignPayload, type PagePayload, type Payload, type TablePayload } from '@/lib/blocks'

const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const
const SERIF = { fontFamily: 'var(--font-display), Georgia, serif' } as const
const HEAD = 'border-b border-[var(--paper-rule)] px-5 py-6'
const SUB = 'px-5 pt-6 pb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--paper-faint)]'

function Head({ title, text, source }: { title: string; text?: string; source?: React.ReactNode }) {
  return (
    <div className={HEAD}>
      <h2 className="text-[22px] leading-[1.15] text-[var(--paper-text)] [overflow-wrap:anywhere]" style={SERIF}>{title}</h2>
      {text && <p className="mt-3 text-[13px] leading-[1.6] text-[var(--paper-muted)]" style={SANS}>{text}</p>}
      {source && <p className="mt-2 text-[12px] leading-[1.6] text-[var(--paper-faint)]" style={SANS}>{source}</p>}
    </div>
  )
}

function Copy({ text, label }: { text: string; label: string }) {
  const [done, setDone] = React.useState(false)
  return (
    <button
      type="button"
      className="hm-boxopen"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true)
          window.setTimeout(() => setDone(false), 1500)
        })
      }}
    >
      {done ? 'Copied' : label}
    </button>
  )
}

const Pre = ({ children }: { children: string }) => (
  <pre className="mx-5 overflow-x-auto rounded-lg border border-[var(--paper-rule-soft)] bg-[var(--paper-quiet)] p-3 text-[12px] leading-[1.55] text-[var(--paper-text)]" style={MONO}>
    {children}
  </pre>
)

function Design({ d }: { d: DesignPayload }) {
  const [mode, setMode] = React.useState<'light' | 'dark'>('light')
  const c = d.color[mode]
  const order = ['primary', 'on-primary', 'primary-container', 'on-primary-container', 'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container', 'tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container', 'error', 'on-error', 'error-container', 'on-error-container', 'background', 'on-background', 'surface', 'on-surface', 'surface-variant', 'on-surface-variant', 'outline', 'outline-variant', 'inverse-surface', 'inverse-on-surface', 'inverse-primary', 'shadow', 'scrim', 'surface-tint']
  const roles = order.filter(k => k in c) as (keyof typeof c)[]
  return (
    <>
      <Head
        title={d.name}
        text={`The baseline theme’s tokens: ${roles.length} colour roles for light and dark, ${Object.keys(d.typescale).length} type roles, shape, elevation, state layers and motion.`}
        source={
          <>
            {d.publisher}, {d.licence.name}. Source: <a className="underline" href={d.source.repository} target="_blank" rel="noreferrer noopener">{d.source.repository.replace(/^https:\/\//, '')}</a>, branch {d.source.branch}, commit {d.source.commit.slice(0, 7)}, read {d.source.read}. {d.notes}
          </>
        }
      />
      <div className="flex gap-2 px-5 pt-5">
        {(['light', 'dark'] as const).map(m => (
          <button key={m} type="button" className="hm-boxopen" aria-pressed={mode === m} style={mode === m ? { borderColor: 'var(--paper-strong)', color: 'var(--paper-strong)' } : undefined} onClick={() => setMode(m)}>
            {m === 'light' ? 'Light' : 'Dark'}
          </button>
        ))}
      </div>
      <p className={SUB} style={MONO}>Colour</p>
      <div className="grid grid-cols-2 gap-2 px-5 sm:grid-cols-3">
        {roles.map(k => (
          <div key={k} className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--paper-rule-soft)] p-2">
            <span className="h-8 w-8 shrink-0 rounded-md border border-[var(--paper-rule-soft)]" style={{ background: c[k] }} />
            <span className="min-w-0">
              <span className="block truncate text-[12px] text-[var(--paper-text)]" style={SANS}>{k}</span>
              <span className="block text-[11px] text-[var(--paper-faint)]" style={MONO}>{c[k]}</span>
            </span>
          </div>
        ))}
      </div>
      <p className={SUB} style={MONO}>Type scale ({d.typeface.brand})</p>
      <div className="px-5">
        {Object.entries(d.typescale).map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 border-b border-[var(--paper-rule-soft)] py-2">
            <span className="min-w-0 truncate text-[var(--paper-text)]" style={{ fontFamily: `${v.font}, var(--font-sans), sans-serif`, fontSize: `min(${v.size}, 40px)`, lineHeight: `min(${v.lineHeight}, 48px)`, fontWeight: Number(v.weight), letterSpacing: v.tracking }}>
              {k.replace('-', ' ')}
            </span>
            <span className="shrink-0 text-[11px] text-[var(--paper-faint)]" style={MONO}>{v.size}/{v.lineHeight} · {v.weight} · {v.tracking}</span>
          </div>
        ))}
      </div>
      {(
        [
          ['Shape', d.shape],
          ['Elevation', d.elevation],
          ['State layers (opacity)', d.state],
          ['Motion (durations in ms, easings)', d.motion],
        ] as [string, Record<string, string>][]
      ).map(([label, o]) => (
        <React.Fragment key={label}>
          <p className={SUB} style={MONO}>{label}</p>
          <table className="hm-kv">
            <tbody>
              {Object.entries(o).map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td style={MONO}>{/^\d+\.\d{4,}$/.test(v) ? (+v).toFixed(2) : v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </React.Fragment>
      ))}
      <p className="p-5 text-[12px] text-[var(--paper-faint)]" style={SANS}>{d.licence.heading}. <a className="underline" href={d.licence.url} target="_blank" rel="noreferrer noopener">Licence</a></p>
    </>
  )
}

function TableBlock({ t }: { t: TablePayload }) {
  const [rows, setRows] = React.useState(false)
  // TableDetail reads the shipped catalog's shape; the payload carries the same table.
  const table: Table = { database: t.topic, table: t.plain, rows: t.rows, about: t.about || t.rowIs, years: t.years, fields: t.fields.map(f => ({ name: f.name, type: f.type, desc: f.description, sample: '' })) }
  return (
    <>
      {t.stored && <p className="px-5 pt-5 text-[11px] text-[var(--paper-faint)]" style={MONO}>{t.stored}</p>}
      <TableDetail t={table} rows={rows} panel onRows={() => setRows(r => !r)} />
    </>
  )
}

function Api({ a }: { a: ApiPayload }) {
  const curl = `curl -X ${a.method} ${a.endpoint} \\\n  -H "Content-Type: application/json" \\\n  -H "X-Api-Key: YOUR_KEY" \\\n  -d '${JSON.stringify(a.body)}'`
  const resp = JSON.stringify(a.sampleResponse, null, 2)
  return (
    <>
      <Head title={a.plain} text="The Data Library query API for this table: one read-only SQL statement in, up to 1,000 rows out. Put your key where YOUR_KEY is." />
      <p className={SUB} style={MONO}>Request</p>
      <table className="hm-kv">
        <tbody>
          <tr><td>Endpoint</td><td style={MONO}>{a.method} {a.endpoint}</td></tr>
          {Object.entries(a.headers).map(([k, v]) => (
            <tr key={k}><td>{k}</td><td style={MONO}>{v}</td></tr>
          ))}
          <tr><td>MCP</td><td style={MONO}>{a.mcp}</td></tr>
        </tbody>
      </table>
      <p className={SUB} style={MONO}>SQL</p>
      <Pre>{a.sql}</Pre>
      <div className="flex flex-wrap gap-2 px-5 pt-3">
        <Copy text={curl} label="Copy the request" />
        <Copy text={a.sql} label="Copy the SQL" />
        <Copy text={a.mcp} label="Copy the MCP address" />
      </div>
      <p className={SUB} style={MONO}>Sample response (from the shipped sample rows)</p>
      <Pre>{resp.length > 4000 ? resp.slice(0, 4000) + '\n…' : resp}</Pre>
      <div className="px-5 pt-3 pb-5">
        <Copy text={resp} label="Copy the response" />
      </div>
    </>
  )
}

function Page({ g }: { g: PagePayload }) {
  return (
    <>
      <Head title={g.name} text="The page’s sections in order, and what each one takes its content from." />
      <table className="hm-kv" style={{ marginTop: 16 }}>
        <thead>
          <tr><th>Section</th><th>Binds to</th></tr>
        </thead>
        <tbody>
          {g.sections.map((s, i) => (
            <tr key={i}><td>{i + 1}. {s.label}</td><td>{s.binds}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function Brief({ k, b }: { k: string; b: BriefPayload }) {
  const [v, setV] = React.useState(b)
  const F: [keyof BriefPayload, string][] = [['siteName', 'Site name'], ['purpose', 'Purpose, in one line'], ['audience', 'Audience'], ['pages', 'Pages wanted'], ['tone', 'Tone']]
  return (
    <>
      <Head title="Site brief" text="What the site is for. Replace the placeholders; the block keeps what you write in this browser." />
      <div className="flex flex-col gap-4 p-5">
        {F.map(([f, label]) => (
          <label key={f} className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--paper-faint)]" style={MONO}>{label}</span>
            <textarea
              rows={f === 'purpose' || f === 'pages' ? 2 : 1}
              value={v[f]}
              onChange={e => setV({ ...v, [f]: e.target.value })}
              onBlur={() => saveBrief(k, v)}
              className="resize-y rounded-lg border border-[var(--paper-rule-soft)] bg-[var(--paper)] p-2.5 text-[13px] text-[var(--paper-text)] outline-none focus:border-[var(--paper-strong)]"
              style={SANS}
            />
          </label>
        ))}
      </div>
    </>
  )
}

/** The payload view for the block with this shelf key. */
export function BlockView({ blockKey }: { blockKey: string }) {
  const st = useHome()
  const s = st.shelf.find(x => x.key === blockKey) ?? null
  const [p, setP] = React.useState<Payload | null | 'loading'>('loading')
  React.useEffect(() => {
    let live = true
    if (!s) return setP(null)
    void payloadOf(s).then(x => live && setP(x))
    return () => {
      live = false
    }
    // the shelf item's identity changes on every store write; its key and payload are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockKey, s?.payload])
  if (!s) return <p className="p-5 text-[13px] text-[var(--paper-muted)]" style={SANS}>This block is no longer on the shelf.</p>
  if (p === 'loading') return <p className="p-5 text-[13px] text-[var(--paper-muted)]" style={SANS}>Loading…</p>
  if (!p) return <p className="p-5 text-[13px] text-[var(--paper-muted)]" style={SANS}>This block carries nothing to show.</p>
  const type = blockType(s)
  if (type === 'design') return <Design d={p as DesignPayload} />
  if (type === 'table') return <TableBlock t={p as TablePayload} />
  if (type === 'api') return <Api a={p as ApiPayload} />
  if (type === 'page') return <Page g={p as PagePayload} />
  if (type === 'brief') return <Brief k={s.key} b={p as BriefPayload} />
  return null
}
