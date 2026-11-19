'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { TypeIcon } from '@/app/HomeIcons'
import { BOXES, KIND_NOUN, TYPE_COLOR, type Box, type BoxKind } from '@/lib/home-boxes'
import { boxKey } from '@/lib/home-store'
import { compactNum } from '@/lib/home-catalog'
import { findNames, type NameEntry, type NameKind } from '@/lib/find-names'
import { Atom, Briefcase, Building, Building2, Factory, Gavel, GraduationCap, HandHeart, Hospital, Landmark, Lightbulb, MapPin, Scale, School, Users, Vote, Zap, type LucideIcon } from 'lucide-react'

/** Each kind of name's icon, white on the kind's colour (brief 57: "each row with its kind's icon"). */
const NAME_ICON: Record<NameKind, LucideIcon> = {
  congress: Landmark, legislator: Landmark, candidate: Vote, judge: Gavel, committee: Users, agency: Building2, contractor: Briefcase, company: Building,
  court: Scale, place: MapPin, plant: Factory, utility: Zap, college: GraduationCap, district: School, hospital: Hospital, nonprofit: HandHeart, assignee: Lightbulb, reactor: Atom,
}

import type { DbHit, FieldHit, Match, Out, Results, TableHit } from './search-worker'
import { TryPanel, type Picked, type TryView } from './try-panel'
import { QuestionList, useQuestions, type Question } from './question-list'

// /search (brief 53): one page to find anything the site holds and try it. The search runs in a worker over the
// table finder's index (the databases, tables and fields) and on this thread over the boxes that are not tables
// (models, platforms, the outside sources), from the first keystroke. Results come grouped, capped at five a group
// with "Show all"; the try panel beside them shows what is picked. Keys: up and down through the results, right into
// the try panel and left back, Enter to try, Escape to clear. Built as parts the chat page can host later.
// Brief 57: while the field is empty the left side is an endless list of questions the library can answer
// (question-list.tsx); a click puts the question in the field, its answering tables first in the results and the
// first of them in the try panel, with its SQL where it has one. An x clears the field and the list comes back where
// it was left. Names of people, organisations and places (nysgpt-1's findNames) lead the results.

const CAP = 5
const ALL = 400
const ROW = 52

/** Boxes that are not tables: the models, the platforms and the five outside sources. */
const OTHER_KINDS = new Set<BoxKind>(['models', 'platforms', 'aa', 'kaggle', 'llmstats', 'gh-skills', 'gh-design', 'gh-api', 'gh-mcp', 'hf-models', 'hf-datasets', 'hf-spaces', 'hf-papers'])
const OTHER_BOXES = BOXES.filter((b) => OTHER_KINDS.has(b.kind))
const OTHER_LOW = OTHER_BOXES.map((b) => b.title.toLowerCase())

type BoxHit = { box: Box; m: Match }
type AnswerHit = { stored: string; label: string; topic: string; rows: number | null }
type GroupId = 'answers' | 'names' | 'dbs' | 'tables' | 'fields' | 'boxes'
type Row =
  | { group: 'answers'; hit: AnswerHit }
  | { group: 'names'; hit: NameEntry }
  | { group: 'dbs'; hit: DbHit }
  | { group: 'tables'; hit: TableHit }
  | { group: 'fields'; hit: FieldHit }
  | { group: 'boxes'; hit: BoxHit }

const GROUPS: { id: GroupId; label: string }[] = [
  { id: 'answers', label: 'Tables that answer it' },
  { id: 'names', label: 'People, organisations and places' },
  { id: 'dbs', label: 'Databases' },
  { id: 'tables', label: 'Tables' },
  { id: 'fields', label: 'Fields' },
  { id: 'boxes', label: 'Boxes' },
]

function scoreOf(s: string, q: string): [number, number] {
  const at = s.indexOf(q)
  if (at < 0) return [-1, -1]
  if (at === 0) return [3, 0]
  const re = /[^a-z0-9][a-z0-9]/g
  for (let m = re.exec(s); m; m = re.exec(s)) if (s.startsWith(q, m.index + 1)) return [2, m.index + 1]
  return [1, at]
}

function searchBoxes(raw: string, limit: number): { total: number; items: BoxHit[] } {
  const q = raw.trim().toLowerCase()
  if (!q) return { total: 0, items: [] }
  const hits: { i: number; s: number; at: number }[] = []
  for (let i = 0; i < OTHER_LOW.length; i++) {
    const [s, at] = scoreOf(OTHER_LOW[i], q)
    if (s > 0) hits.push({ i, s, at })
  }
  hits.sort((a, b) => b.s - a.s || OTHER_LOW[a.i].length - OTHER_LOW[b.i].length)
  return { total: hits.length, items: hits.slice(0, limit).map((h) => ({ box: OTHER_BOXES[h.i], m: [h.at, q.length] })) }
}

/** The label with the matched letters marked. */
function Marked({ text, m }: { text: string; m: Match }) {
  if (m[0] < 0 || !m[1]) return <>{text}</>
  return (
    <>
      {text.slice(0, m[0])}
      <mark>{text.slice(m[0], m[0] + m[1])}</mark>
      {text.slice(m[0] + m[1])}
    </>
  )
}

/** A row's tile: its set's colour with the icon in white, or the logo on a white tile, as the palette draws it. */
function Tile({ kind, icon, logo }: { kind: BoxKind; icon: Box['icon']; logo?: string }) {
  const mark = icon === 'github' || icon === 'hf' || icon === 'kaggle' || icon === 'aa' || icon === 'llmstats'
  if (logo || mark)
    return (
      <span className="sr-tile sr-logo" aria-hidden>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- a 16px logo from public/
          <img src={logo} alt="" />
        ) : (
          <TypeIcon icon={icon} />
        )}
      </span>
    )
  return (
    <span className="sr-tile" style={{ background: TYPE_COLOR[kind] }} aria-hidden>
      <TypeIcon icon={icon} />
    </span>
  )
}

function RowView({ row, on, onPick, onHover }: { row: Row; on: boolean; onPick: () => void; onHover: () => void }) {
  let tile: React.ReactNode
  let title: React.ReactNode
  let sub = ''
  let meta = ''
  if (row.group === 'answers') {
    tile = <Tile kind="tables" icon="table" />
    title = <>{row.hit.label}</>
    sub = [row.hit.topic, row.hit.stored].filter(Boolean).join(' · ')
    meta = row.hit.rows != null ? `${compactNum(row.hit.rows)} records` : ''
  } else if (row.group === 'names') {
    const KindIcon = NAME_ICON[row.hit.kind] ?? MapPin
    tile = (
      <span className="sr-tile sr-name" style={{ background: row.hit.color }} aria-hidden>
        <KindIcon width={15} height={15} strokeWidth={2} color="#fff" />
      </span>
    )
    title = <>{row.hit.label}</>
    sub = row.hit.qualifier
    meta = row.hit.kindLabel
  } else if (row.group === 'dbs') {
    tile = <Tile kind="data" icon="db" />
    title = <Marked text={row.hit.label} m={row.hit.m} />
    sub = `${compactNum(row.hit.tables)} ${row.hit.tables === 1 ? 'table' : 'tables'}`
    meta = row.hit.rows ? `${compactNum(row.hit.rows)} records` : ''
  } else if (row.group === 'tables') {
    tile = <Tile kind="tables" icon="table" />
    title = <Marked text={row.hit.label} m={row.hit.m} />
    sub = [row.hit.topic, row.hit.rowIs].filter(Boolean).join(' · ')
    meta = [row.hit.rows != null ? `${compactNum(row.hit.rows)} records` : '', row.hit.years].filter(Boolean).join(' · ')
  } else if (row.group === 'fields') {
    tile = <Tile kind="tables" icon="braces" />
    title = (
      <>
        <span className="sr-dim">{row.hit.table} · </span>
        <Marked text={row.hit.name} m={row.hit.m} />
      </>
    )
    sub = [row.hit.type, row.hit.sample ? `e.g. ${row.hit.sample}` : ''].filter(Boolean).join(' · ')
  } else {
    const b = row.hit.box
    tile = <Tile kind={b.kind} icon={b.icon} logo={b.logo} />
    title = <Marked text={b.title} m={row.hit.m} />
    sub = [KIND_NOUN[b.kind] ?? b.kind, b.group].filter(Boolean).join(' · ')
    meta = b.foot
  }
  return (
    <button type="button" role="option" aria-selected={on} className={`sr-row${on ? ' sr-on' : ''}`} onClick={onPick} onMouseMove={onHover} tabIndex={-1}>
      {tile}
      <span className="sr-rt">
        <span className="sr-r1">{title}</span>
        {sub && <span className="sr-r2">{sub}</span>}
      </span>
      {meta && <span className="sr-rm">{meta}</span>}
    </button>
  )
}

/** A windowed list: only the rows in view are drawn. */
function Windowed({ rows, at, render }: { rows: Row[]; at: number; render: (r: Row, i: number) => React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState(0)
  const [h, setH] = useState(600)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setH(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // Keep the picked row in view as the keys move it.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const y = at * ROW
    if (y < el.scrollTop) el.scrollTop = y
    else if (y + ROW > el.scrollTop + el.clientHeight) el.scrollTop = y + ROW - el.clientHeight
  }, [at])
  const from = Math.max(0, Math.floor(top / ROW) - 4)
  const to = Math.min(rows.length, Math.ceil((top + h) / ROW) + 4)
  return (
    <div ref={box} className="sr-win" onScroll={(e) => setTop(e.currentTarget.scrollTop)}>
      <div style={{ height: rows.length * ROW, position: 'relative' }}>
        {rows.slice(from, to).map((r, k) => (
          <div key={from + k} style={{ position: 'absolute', top: (from + k) * ROW, left: 0, right: 0, height: ROW }}>
            {render(r, from + k)}
          </div>
        ))}
      </div>
    </div>
  )
}

declare global {
  interface Window {
    __searchPerf?: number[]
  }
}

export function SearchApp({ pick, view }: { pick: string | null; view: TryView | null }) {
  const input = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const worker = useRef<Worker | null>(null)
  const [ready, setReady] = useState<{ tables: number; fields: number; dbs: number } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [res, setRes] = useState<Results | null>(null)
  const [expanded, setExpanded] = useState<GroupId | null>(null)
  const [at, setAt] = useState(0)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [tryView, setTryView] = useState<TryView>(view ?? 'fields')
  const questions = useQuestions()
  const [qAt, setQAt] = useState(0)
  /** The question the reader picked from the list, while the field still holds it. */
  const [asked, setAsked] = useState<Question | null>(null)
  const [names, setNames] = useState<NameEntry[]>([])
  const nameSeq = useRef(0)
  const seq = useRef(0)
  const typedAt = useRef<Map<number, number>>(new Map())
  const pending = useRef<number | null>(null)

  // The worker starts after the first paint, so the page shows at once and the boxes can be searched meanwhile.
  useEffect(() => {
    input.current?.focus()
    const start = () => {
      const w = new Worker(new URL('./search-worker.ts', import.meta.url), { type: 'module' })
      worker.current = w
      w.onmessage = (e: MessageEvent<Out>) => {
        const m = e.data
        if (m.type === 'ready') setReady({ tables: m.tables, fields: m.fields, dbs: m.dbs })
        else if (m.type === 'error') setFailed(m.message)
        else if (m.type === 'results') {
          if (m.id !== seq.current) return
          pending.current = m.id
          setRes(m)
        }
      }
      // A full address: inside the worker a bare path has no base to resolve against.
      w.postMessage({ type: 'load', url: new URL('/library-index.json', window.location.origin).href })
    }
    const t = window.setTimeout(start, 0)
    return () => {
      window.clearTimeout(t)
      worker.current?.terminate()
    }
  }, [])

  const ask = useCallback(
    (text: string, group: GroupId | null) => {
      const id = ++seq.current
      typedAt.current.set(id, performance.now())
      const lim = (g: GroupId) => (group === g ? ALL : group ? 0 : CAP)
      worker.current?.postMessage({ type: 'query', id, q: text, limit: { dbs: lim('dbs'), tables: lim('tables'), fields: lim('fields') } })
      if (!worker.current || !ready) setRes(null)
    },
    [ready],
  )

  useEffect(() => {
    ask(q, expanded)
    setAt(0)
  }, [q, expanded, ready, ask])

  const boxes = useMemo(() => searchBoxes(q, expanded === 'boxes' ? ALL : expanded ? 0 : CAP), [q, expanded])

  // Names (nysgpt-1's findNames, brief 55): people in public roles, organisations and places, each linked to a table.
  useEffect(() => {
    const id = ++nameSeq.current
    const text = q.trim()
    if (text.length < 2 || (asked && q === asked.q)) return void setNames([])
    void findNames(text, expanded === 'names' ? 50 : CAP)
      .then((list) => id === nameSeq.current && setNames(list))
      .catch(() => id === nameSeq.current && setNames([]))
  }, [q, expanded, asked])

  // Keystroke to painted results, for the speed check (window.__searchPerf, the last 200).
  useLayoutEffect(() => {
    const id = pending.current
    if (id == null) return
    pending.current = null
    const t0 = typedAt.current.get(id)
    typedAt.current.delete(id)
    if (t0 == null) return
    requestAnimationFrame(() => {
      const list = (window.__searchPerf ??= [])
      list.push(performance.now() - t0)
      if (list.length > 200) list.shift()
    })
  }, [res])

  const groups = useMemo(() => {
    const answers = asked && q === asked.q ? asked.tables.map((t) => ({ group: 'answers', hit: { stored: t.stored, label: t.plain, topic: asked.topic, rows: t.rows } }) as Row) : []
    const g: Record<GroupId, { total: number; rows: Row[] }> = {
      answers: { total: answers.length, rows: answers },
      names: { total: names.length, rows: names.map((hit) => ({ group: 'names', hit }) as Row) },
      dbs: { total: res?.dbs.total ?? 0, rows: (res?.dbs.items ?? []).map((hit) => ({ group: 'dbs', hit }) as Row) },
      tables: { total: res?.tables.total ?? 0, rows: (res?.tables.items ?? []).map((hit) => ({ group: 'tables', hit }) as Row) },
      fields: { total: res?.fields.total ?? 0, rows: (res?.fields.items ?? []).map((hit) => ({ group: 'fields', hit }) as Row) },
      boxes: { total: boxes.total, rows: boxes.items.map((hit) => ({ group: 'boxes', hit }) as Row) },
    }
    return g
  }, [res, boxes, names, asked, q])

  const flat = useMemo(() => (expanded ? groups[expanded].rows : GROUPS.flatMap((g) => groups[g.id].rows)), [groups, expanded])

  const pickRow = useCallback((r: Row) => {
    if (r.group === 'answers') {
      const sql = asked && asked.tables[0]?.stored === r.hit.stored ? asked.sql : ''
      setPicked({ kind: 'table', stored: r.hit.stored, ...(sql ? { sql } : {}) })
      if (sql) setTryView('api')
    } else if (r.group === 'names') {
      const link = r.hit.links.find((l) => l.open !== false) ?? r.hit.links[0]
      if (link) {
        setPicked({ kind: 'table', stored: link.stored, sql: `SELECT * FROM ${link.stored} WHERE ${link.field} = '${link.value.replace(/'/g, "''")}' LIMIT 50` })
        setTryView('api')
      }
    } else if (r.group === 'dbs') setPicked({ kind: 'db', topic: r.hit.label })
    else if (r.group === 'tables') setPicked({ kind: 'table', stored: r.hit.stored })
    else if (r.group === 'fields') setPicked({ kind: 'table', stored: r.hit.stored, field: r.hit.name })
    else setPicked({ kind: 'box', box: r.hit.box })
  }, [asked])

  /** A question from the list: into the field, its tables first in the results, the first in the try panel. */
  const askQuestion = useCallback((question: Question) => {
    setAsked(question)
    setQ(question.q)
    setExpanded(null)
    const t = question.tables[0]
    if (t) {
      setPicked({ kind: 'table', stored: t.stored, ...(question.sql ? { sql: question.sql } : {}) })
      setTryView(question.sql ? 'api' : 'fields')
    }
    input.current?.focus()
  }, [])
  const clear = () => {
    setQ('')
    setAsked(null)
    setExpanded(null)
    input.current?.focus()
  }

  // ?pick=<box key, table:<stored>, db:<topic>>&view=api: open on that thing (the home page's Try API, shared links).
  const picking = useRef(pick)
  useEffect(() => {
    const p = picking.current
    if (!p) return
    if (p.startsWith('table:')) return void ((picking.current = null), setPicked({ kind: 'table', stored: p.slice(6) }))
    if (p.startsWith('db:')) return void ((picking.current = null), setPicked({ kind: 'db', topic: p.slice(3) }))
    const box = BOXES.find((b) => boxKey(b) === p)
    if (!box) return void (picking.current = null)
    if (OTHER_KINDS.has(box.kind)) return void ((picking.current = null), setPicked({ kind: 'box', box }))
    // A Data or Tables box: its database or table in the index, found by name once the index is in.
    if (!ready || !worker.current) return
    picking.current = null
    setPicked({ kind: 'resolve', box })
  }, [ready])

  const onKey = (e: React.KeyboardEvent) => {
    // An empty field: the keys walk the question list, and Enter asks the one picked.
    if (!q && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
      e.preventDefault()
      if (e.key === 'ArrowDown') setQAt((v) => Math.min(questions.items.length - 1, v + 1))
      else if (e.key === 'ArrowUp') setQAt((v) => Math.max(0, v - 1))
      else if (questions.items[qAt]) askQuestion(questions.items[qAt])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAt((v) => Math.min(flat.length - 1, v + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAt((v) => Math.max(0, v - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const r = flat[at]
      if (r) pickRow(r)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (expanded) setExpanded(null)
      else clear()
    } else if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionStart === q.length && picked) {
      e.preventDefault()
      panel.current?.focus()
    }
  }

  const count = ready ? `${compactNum(ready.tables)} tables · ${compactNum(ready.dbs)} databases · ${compactNum(ready.fields)} fields · ${compactNum(OTHER_BOXES.length)} boxes` : `${compactNum(OTHER_BOXES.length)} boxes · loading the tables…`
  const nothing = q.trim() && flat.length === 0 && (ready || failed)

  return (
    <div className="sr">
      <div className="sr-head">
        <label className="sr-field">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              if (asked && e.target.value !== asked.q) setAsked(null)
            }}
            onKeyDown={onKey}
            placeholder="Search every table, field, database and API"
            aria-label="Search"
            aria-controls="sr-list"
            spellCheck={false}
            autoComplete="off"
          />
          {q ? (
            <button type="button" className="sr-x" aria-label="Clear the search" title="Clear the search" onMouseDown={(e) => e.preventDefault()} onClick={clear}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
          <span className="sr-count">{count}</span>
        </label>
      </div>
      <div className="sr-body">
        <div className="sr-list" id="sr-list" role="listbox" aria-label="Results">
          {failed && <p className="sr-note">The table index did not load: {failed}</p>}
          <QuestionList items={questions.items} at={qAt} onAt={setQAt} onPick={askQuestion} onNearEnd={questions.more} hidden={!!q} />
          {nothing && <p className="sr-note">Nothing matches “{q.trim()}”.</p>}
          {expanded ? (
            <>
              <div className="sr-gh">
                <button type="button" className="sr-back" onClick={() => setExpanded(null)}>
                  ← All results
                </button>
                <span>{GROUPS.find((g) => g.id === expanded)?.label}</span>
                <span className="sr-gt">{compactNum(groups[expanded].total)}</span>
              </div>
              <Windowed rows={groups[expanded].rows} at={at} render={(r, i) => <RowView row={r} on={i === at} onPick={() => (setAt(i), pickRow(r))} onHover={() => setAt(i)} />} />
            </>
          ) : (
            GROUPS.map((g) => {
              const grp = groups[g.id]
              if (!grp.rows.length) return null
              const offset = GROUPS.slice(0, GROUPS.findIndex((x) => x.id === g.id)).reduce((s, x) => s + groups[x.id].rows.length, 0)
              return (
                <section key={g.id} className="sr-group">
                  <div className="sr-gh">
                    <span>{g.label}</span>
                    <span className="sr-gt">{compactNum(grp.total)}</span>
                    {grp.total > grp.rows.length && (
                      <button type="button" className="sr-all" onClick={() => setExpanded(g.id)}>
                        Show all
                      </button>
                    )}
                  </div>
                  {grp.rows.map((r, k) => (
                    <RowView key={k} row={r} on={offset + k === at} onPick={() => (setAt(offset + k), pickRow(r))} onHover={() => setAt(offset + k)} />
                  ))}
                </section>
              )
            })
          )}
        </div>
        <div
          ref={panel}
          className="sr-try"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' && !(e.target as HTMLElement).closest('textarea, input')) {
              e.preventDefault()
              input.current?.focus()
            }
          }}
        >
          {picked ? (
            <TryPanel picked={picked} view={tryView} onView={setTryView} worker={worker.current} ready={!!ready} onPick={setPicked} />
          ) : (
            <p className="sr-note">Pick a result to see it here: its fields, sample rows, a chart of each column, and the API call to run it.</p>
          )}
        </div>
      </div>
    </div>
  )
}
