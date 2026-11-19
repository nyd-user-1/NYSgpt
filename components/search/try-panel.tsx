'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { TableDetail, type TableView } from '@/app/TableDetail'
import { brandOf, KIND_NOUN, SET_INFO, type Box } from '@/lib/home-boxes'
import { compactNum, loadCatalog, loadSample, type Sample, type Table } from '@/lib/home-catalog'

import type { Answer } from './question-list'
import type { FullTable, Out, TableHit } from './search-worker'

// /search's try panel (brief 53): what is picked, tried for real. A table shows the catalog overlay's three views
// (TableDetail: Fields, Data, Columns) and an API view: the request as editable SQL, run on the reader's own Data
// Library key (the one the data pages keep in this browser), the rows in the site's grid table with the time, bytes
// scanned and query id. After it, cURL (the same call as curl, JavaScript and Python, following the SQL box) and MCP
// (the server, the Claude and Claude Code forms, the tools), brief 58. Without a key, the table's shipped sample
// rows, marked as such. A Hugging Face or GitHub box runs its public API from the browser; the other sources need
// their own keys, so their stored facts stand as the sample. The site holds no key here and calls no model.

export type TryView = TableView | 'api' | 'curl' | 'mcp'
/** A question's stored answer (brief 58) and the plain names of the tables it was run against. */
export type StoredAnswer = Answer & { tables: string[] }
export type Picked =
  | { kind: 'db'; topic: string }
  | { kind: 'table'; stored: string; field?: string; /** a question's or a name's SQL for the API view (brief 57) */ sql?: string; answer?: StoredAnswer }
  | { kind: 'box'; box: Box }
  | { kind: 'resolve'; box: Box }

const API = 'https://data.nysgpt.com'
const MCP = `${API}/mcp`
const KEY = 'nysgpt-data-key'
/** A signed-in admin's own key from the session (brief 58), kept once found; null for everyone else, asked again next time. */
let adminKey: Promise<string | null> | null = null
const sessionKey = () =>
  (adminKey ??= fetch('/api/auth/key', { cache: 'no-store' })
    .then((r) => (r.ok ? (r.json() as Promise<{ key?: string | null }>) : null))
    .then((b) => b?.key || null)
    .catch(() => null)
    .then((k) => ((adminKey = k ? adminKey : null), k)))
const VIEWS: { id: TryView; label: string }[] = [
  { id: 'fields', label: 'Fields' },
  { id: 'data', label: 'Data' },
  { id: 'chart', label: 'Columns' },
  { id: 'api', label: 'API' },
  { id: 'curl', label: 'cURL' },
  { id: 'mcp', label: 'MCP' },
]
/** The tab after this one, round the six (the right arrow in the try panel). */
export const nextTryView = (v: TryView): TryView => VIEWS[(VIEWS.findIndex((x) => x.id === v) + 1) % VIEWS.length].id

/** Ids far from the search's own (search-app.tsx counts from 1), so the two never answer each other. */
let nextId = 1_000_000_000
/** One request to the search worker, answered by id. */
function ask<T extends Out['type']>(w: Worker, msg: Record<string, unknown> & { type: string }, want: T): Promise<Extract<Out, { type: T }>> {
  const id = nextId++
  return new Promise((resolve) => {
    const on = (e: MessageEvent<Out>) => {
      const m = e.data as Out & { id?: number }
      if (m.type === want && m.id === id) {
        w.removeEventListener('message', on)
        resolve(m as Extract<Out, { type: T }>)
      }
    }
    w.addEventListener('message', on)
    w.postMessage({ ...msg, id })
  })
}

function Copy({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="sr-copy"
      onClick={() => {
        void navigator.clipboard?.writeText(text)
        setDone(true)
        window.setTimeout(() => setDone(false), 1200)
      }}
    >
      {done ? 'Copied' : label}
    </button>
  )
}

/** Rows in the site's grid table (home.css .hm-rows). */
function Grid({ columns, rows }: { columns: string[]; rows: (string | null)[][] }) {
  return (
    <div className="sr-grid">
      <table className="hm-rows">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, k) => (
                <td key={k} title={v ?? ''}>
                  {v ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const bytesText = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : b >= 1024 ** 2 ? `${(b / 1024 ** 2).toFixed(1)} MB` : b > 0 ? `${Math.max(1, Math.round(b / 1024))} KB` : '0 KB')

type Ran = { columns: string[]; rows: (string | null)[][]; truncated: boolean; bytes: number; id: string; ms: number } | { error: string; ms: number }

function ApiView({ table, home, sql, onSql, fresh }: { table: FullTable; home: Table | null; sql: string; onSql: (s: string) => void; /** the SQL as picked; a new one clears the last run */ fresh: string }) {
  const [key, setKey] = useState('')
  const [ran, setRan] = useState<Ran | null>(null)
  const [busy, setBusy] = useState(false)
  const [sample, setSample] = useState<Sample | null | 'loading'>('loading')
  useEffect(() => {
    // A key the reader saved in this browser wins; otherwise an admin's key from the session fills the field unsaved.
    const saved = localStorage.getItem(KEY)
    if (saved) return void setKey(saved)
    let live = true
    void sessionKey().then((k) => live && k && setKey((cur) => cur || k))
    return () => {
      live = false
    }
  }, [])
  useEffect(() => setRan(null), [table.stored, fresh])
  useEffect(() => {
    let live = true
    setSample('loading')
    if (!home) return void setSample(null)
    void loadSample(home).then((s) => live && setSample(s))
    return () => {
      live = false
    }
  }, [home])
  const saveKey = (k: string) => {
    setKey(k)
    if (k.trim()) localStorage.setItem(KEY, k.trim())
    else localStorage.removeItem(KEY)
  }
  const run = async () => {
    if (!key.trim() || busy) return
    setBusy(true)
    const t0 = performance.now()
    try {
      const r = await fetch(`${API}/query`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key.trim() }, body: JSON.stringify({ sql }) })
      const b = (await r.json().catch(() => ({}))) as { columns?: string[]; rows?: (string | null)[][]; truncated?: boolean; bytes_scanned?: number | string; query_id?: string; error?: string; message?: string }
      const ms = Math.round(performance.now() - t0)
      if (!r.ok || b.error || !Array.isArray(b.rows)) setRan({ error: String(b.error ?? b.message ?? `The API answered ${r.status}.`), ms })
      else setRan({ columns: b.columns ?? [], rows: b.rows, truncated: !!b.truncated, bytes: Number(b.bytes_scanned ?? 0) || 0, id: b.query_id ?? '', ms })
    } catch (e) {
      setRan({ error: `The API could not be reached: ${(e as Error).message}`, ms: Math.round(performance.now() - t0) })
    } finally {
      setBusy(false)
    }
  }
  const fieldSample = table.fields.filter((f) => f.sample).slice(0, 20)
  return (
    <div className="sr-api">
      <div className="sr-lbl">Request</div>
      <textarea className="sr-sql" value={sql} onChange={(e) => onSql(e.target.value)} spellCheck={false} rows={4} aria-label="SQL" />
      <div className="sr-runrow">
        <input className="sr-key" type="password" value={key} onChange={(e) => saveKey(e.target.value)} placeholder="Your Data Library key" aria-label="Your Data Library key" autoComplete="off" />
        <button type="button" className="sr-run" onClick={run} disabled={!key.trim() || busy}>
          {busy ? 'Running…' : 'Run'}
        </button>
      </div>
      {!key.trim() && (
        <p className="sr-hint">
          Run uses your own key, kept in this browser. No key yet? <a href="/data#pricing">Get one</a>.
        </p>
      )}
      {ran &&
        ('error' in ran ? (
          <p className="sr-err">{ran.error}</p>
        ) : (
          <>
            <div className="sr-meta">
              {compactNum(ran.rows.length)} {ran.rows.length === 1 ? 'row' : 'rows'}
              {ran.truncated ? ' (more not shown)' : ''} · {ran.ms} ms · {bytesText(ran.bytes)} scanned{ran.id ? ` · query ${ran.id}` : ''}
            </div>
            <Grid columns={ran.columns} rows={ran.rows} />
          </>
        ))}
      {!ran && !key.trim() && (
        <>
          <div className="sr-lbl">Sample rows, not a live call</div>
          {sample === 'loading' ? (
            <p className="sr-note">Loading the sample…</p>
          ) : sample ? (
            <Grid columns={sample.c} rows={sample.r} />
          ) : fieldSample.length ? (
            <Grid columns={['field', 'type', 'a sample value']} rows={fieldSample.map((f) => [f.name, f.type, f.sample])} />
          ) : (
            <p className="sr-note">No sample is shipped for this table.</p>
          )}
        </>
      )}
    </div>
  )
}

/** One line to copy, under its label. */
function Call({ label, text, copy, children }: { label: string; text: string; copy: string; children?: ReactNode }) {
  return (
    <>
      <div className="sr-lbl">{label}</div>
      {children}
      <div className="sr-call">
        <code>{text}</code>
        <Copy text={text} label={copy} />
      </div>
    </>
  )
}

/** The API view's call in the three forms a developer reaches for; each follows the SQL box. */
function CurlView({ sql }: { sql: string }) {
  const body = JSON.stringify({ sql })
  const curl = `curl -s ${API}/query -H "X-Api-Key: YOUR_KEY" -H "content-type: application/json" -d '${body.replace(/'/g, "'\\''")}'`
  const js = `await fetch("${API}/query", { method: "POST", headers: { "X-Api-Key": "YOUR_KEY", "content-type": "application/json" }, body: JSON.stringify({ sql: ${JSON.stringify(sql)} }) }).then((r) => r.json())`
  const py = `import requests; requests.post("${API}/query", headers={"X-Api-Key": "YOUR_KEY"}, json={"sql": ${JSON.stringify(sql)}}).json()`
  return (
    <div className="sr-api">
      <Call label="curl" text={curl} copy="Copy curl" />
      <Call label="JavaScript" text={js} copy="Copy" />
      <Call label="Python" text={py} copy="Copy" />
    </div>
  )
}

const MCP_TOOLS: [string, string][] = [
  ['list_databases', 'The databases, with their tables and record counts.'],
  ['list_tables', "A database's tables."],
  ['describe_table', "A table's columns and their types."],
  ['query', 'Athena SQL, read-only, up to 1,000 rows a query.'],
]

/** The MCP server: its address and the forms Claude and Claude Code take, as on the data pages' Connect box. */
function McpView() {
  return (
    <div className="sr-api">
      <Call label="Address" text={MCP} copy="Copy address" />
      <Call label="Claude" text={`${MCP}?key=YOUR_KEY`} copy="Copy">
        <p className="sr-note">Settings, Connectors, Add custom connector. Paste this address with your key.</p>
      </Call>
      <Call label="Claude Code" text={`claude mcp add --transport http nysgpt-data ${MCP} --header "X-Api-Key: YOUR_KEY"`} copy="Copy" />
      <div className="sr-lbl">Tools</div>
      <dl className="sr-tools">
        {MCP_TOOLS.map(([name, what]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const DAY = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const cell = (v: string | number | boolean | null) =>
  v == null ? '' : typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: Number.isInteger(v) ? 0 : 2 }) : String(v)
const heading = (c: string) => c.replace(/_/g, ' ')

/** A question's answer from its stored run: one figure large, one row as pairs, or the short table; then its date and
 *  tables, so it is never taken for a live call. */
function AnswerView({ a }: { a: StoredAnswer }) {
  const one = a.r.length === 1
  const on = DAY.format(new Date(`${a.on}T00:00:00Z`))
  return (
    <div className="sr-ans">
      {one && a.c.length === 1 ? (
        <div className="sr-fig">
          <span className="sr-fig-n">{cell(a.r[0][0])}</span>
          <span className="sr-fig-l">{heading(a.c[0])}</span>
        </div>
      ) : one ? (
        <dl className="sr-pairs">
          {a.c.map((c, i) => (
            <div key={i}>
              <dt>{heading(c)}</dt>
              <dd>{cell(a.r[0][i])}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <Grid columns={a.c.map(heading)} rows={a.r.map((row) => row.map((v) => (v == null ? null : cell(v))))} />
      )}
      <p className="sr-ans-on">
        Run on {on} against {a.tables.join(', ')}
      </p>
    </div>
  )
}

function TableTry({ stored, sql, answer, view, onView, worker }: { stored: string; sql?: string; answer?: StoredAnswer; view: TryView; onView: (v: TryView) => void; worker: Worker }) {
  const [t, setT] = useState<FullTable | null | 'loading'>('loading')
  const [home, setHome] = useState<Table | null>(null)
  // The SQL lives here so the cURL tab follows edits made in the API view.
  const fresh = sql || `SELECT * FROM ${stored} LIMIT 5`
  const [query, setQuery] = useState(fresh)
  useEffect(() => setQuery(fresh), [fresh])
  useEffect(() => {
    let live = true
    setT('loading')
    void ask(worker, { type: 'table', stored }, 'table').then((m) => live && setT(m.table))
    return () => {
      live = false
    }
  }, [stored, worker])
  // The home catalog's copy of the table, where it has one, for its shipped sample rows (TableDetail's Data view).
  useEffect(() => {
    if (!t || t === 'loading') return
    let live = true
    void loadCatalog().then((c) => {
      if (!live) return
      setHome(c?.tables.find((x) => x.table === t.plain) ?? null)
    })
    return () => {
      live = false
    }
  }, [t])
  const asTable: Table | null = useMemo(() => {
    if (!t || t === 'loading') return null
    return home ?? { database: t.topic, table: t.plain, rows: t.rows, about: t.about, years: t.years, fields: t.fields.map((f) => ({ name: f.name, type: f.type, desc: f.desc, sample: f.sample })) }
  }, [t, home])
  if (t === 'loading') return <p className="sr-note">Loading the table…</p>
  if (!t || !asTable) return <p className="sr-note">That table is not in the index.</p>
  return (
    <div className="sr-table">
      {answer && <AnswerView a={answer} />}
      <div className="sr-tabs" role="tablist">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={view === v.id ? 'sr-tab sr-tab-on' : 'sr-tab'} onClick={() => onView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>
      {view === 'api' || view === 'curl' || view === 'mcp' ? (
        <>
          <div hidden={view !== 'api'}>
            <ApiView table={t} home={home} sql={query} onSql={setQuery} fresh={fresh} />
          </div>
          {view === 'curl' && <CurlView sql={query} />}
          {view === 'mcp' && <McpView />}
        </>
      ) : <TableDetail t={asTable} rows={view === 'data'} onRows={() => {}} panel view={view} onView={(v) => onView(v)} stored={t.stored} />}
    </div>
  )
}

function DbTry({ topic, worker, onPick }: { topic: string; worker: Worker; onPick: (p: Picked) => void }) {
  const [tables, setTables] = useState<TableHit[] | null>(null)
  useEffect(() => {
    let live = true
    setTables(null)
    void ask(worker, { type: 'topic', topic }, 'topic').then((m) => live && setTables(m.tables))
    return () => {
      live = false
    }
  }, [topic, worker])
  return (
    <div className="sr-db">
      <h3 className="sr-h">{topic}</h3>
      <p className="sr-sub">{tables ? `${compactNum(tables.length)} tables, largest first. Pick one to see its fields, rows and API.` : 'Loading its tables…'}</p>
      {tables?.map((t) => (
        <button key={t.stored} type="button" className="sr-row" onClick={() => onPick({ kind: 'table', stored: t.stored })}>
          <span className="sr-rt">
            <span className="sr-r1">{t.label}</span>
            <span className="sr-r2">{t.stored}</span>
          </span>
          <span className="sr-rm">{t.rows != null ? `${compactNum(t.rows)} records` : ''}</span>
        </button>
      ))}
    </div>
  )
}

/** A source box's public API address, where the source has one that needs no key. */
function publicApi(b: Box): string | null {
  if (b.kind.startsWith('gh-') && /^[\w.-]+\/[\w.-]+$/.test(b.title)) return `https://api.github.com/repos/${b.title}`
  if (b.kind === 'hf-models') return `https://huggingface.co/api/models/${b.title}`
  if (b.kind === 'hf-datasets') return `https://huggingface.co/api/datasets/${b.title}`
  if (b.kind === 'hf-spaces') return `https://huggingface.co/api/spaces/${b.title}`
  return null
}

/* the sources whose API needs a key, by source (brief 59 split each into four sets) */
const KEYED_BY: Record<string, string> = { aa: 'Artificial Analysis', kaggle: 'Kaggle', llmstats: 'LLM Stats' }
const keyedName = (b: Box) => KEYED_BY[brandOf(b.kind) ?? ''] ?? null

function BoxTry({ box }: { box: Box }) {
  const url = publicApi(box)
  const facts = (SET_INFO as Record<string, { table: string; about: string; fields: { name: string; desc: string }[] }[] | undefined>)[box.kind]?.find((e) => e.table === box.title)
  const [out, setOut] = useState<{ text: string; ms: number } | { error: string } | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => setOut(null), [box])
  const run = async () => {
    if (!url) return
    setBusy(true)
    const t0 = performance.now()
    try {
      const r = await fetch(url)
      if (!r.ok) setOut({ error: `${new URL(url).host} refused the call (${r.status}${r.status === 403 || r.status === 429 ? ', likely its rate limit for calls without a key' : ''}).` })
      else setOut({ text: JSON.stringify(await r.json(), null, 2).slice(0, 20000), ms: Math.round(performance.now() - t0) })
    } catch {
      setOut({ error: `The browser could not reach ${new URL(url).host}: it refused the call or is not reachable from here.` })
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="sr-box">
      <h3 className="sr-h">{box.title}</h3>
      <p className="sr-sub">{[KIND_NOUN[box.kind] ?? box.kind, box.group, box.foot].filter(Boolean).join(' · ')}</p>
      {box.body && <p className="sr-body-text">{box.body}</p>}
      {url ? (
        <>
          <div className="sr-lbl">Public API, no key</div>
          <div className="sr-call">
            <code>GET {url}</code>
            <Copy text={url} label="Copy address" />
          </div>
          <button type="button" className="sr-run" onClick={run} disabled={busy}>
            {busy ? 'Running…' : 'Run'}
          </button>
          {out && ('error' in out ? <p className="sr-err">{out.error}</p> : <pre className="sr-json">{out.text}</pre>)}
        </>
      ) : keyedName(box) ? (
        <p className="sr-hint">A live call to {keyedName(box)} needs that service’s own key, which this page does not hold. Its stored facts are below as the sample.</p>
      ) : null}
      {facts?.fields?.length ? (
        <>
          <div className="sr-lbl">{url ? 'Stored facts' : 'Facts'}</div>
          <Grid columns={['fact', 'value']} rows={facts.fields.map((f) => [f.name, f.desc])} />
        </>
      ) : null}
    </div>
  )
}

/** A Data or Tables box from the home page, found in the index by name. */
function Resolve({ box, worker, onPick }: { box: Box; worker: Worker; onPick: (p: Picked) => void }) {
  useEffect(() => {
    let live = true
    void ask(worker, { type: 'query', q: box.title, limit: { dbs: 5, tables: 20, fields: 0 } }, 'results').then((m) => {
      if (!live) return
      const exact = m.tables.items.find((t) => t.label === box.title && (box.kind !== 'tables' || !box.group || t.topic === box.group)) ?? m.tables.items.find((t) => t.label === box.title)
      const db = m.dbs.items.find((d) => d.label === box.title)
      if (box.kind === 'data' && db) onPick({ kind: 'db', topic: db.label })
      else if (exact) onPick({ kind: 'table', stored: exact.stored })
      else if (db) onPick({ kind: 'db', topic: db.label })
      else if (m.tables.items[0]) onPick({ kind: 'table', stored: m.tables.items[0].stored })
      else onPick({ kind: 'box', box })
    })
    return () => {
      live = false
    }
  }, [box, worker, onPick])
  return <p className="sr-note">Finding {box.title} in the index…</p>
}

export function TryPanel({ picked, view, onView, worker, ready, onPick }: { picked: Picked; view: TryView; onView: (v: TryView) => void; worker: Worker | null; ready: boolean; onPick: (p: Picked) => void }) {
  if (picked.kind === 'box') return <BoxTry box={picked.box} />
  if (!worker || !ready) return <p className="sr-note">Loading the table index…</p>
  if (picked.kind === 'resolve') return <Resolve box={picked.box} worker={worker} onPick={onPick} />
  if (picked.kind === 'db') return <DbTry topic={picked.topic} worker={worker} onPick={onPick} />
  return <TableTry stored={picked.stored} sql={picked.sql} answer={picked.answer} view={view} onView={onView} worker={worker} />
}
