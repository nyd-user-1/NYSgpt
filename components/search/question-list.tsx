'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { TYPE_COLOR } from '@/lib/home-boxes'

// /search's question list (brief 57): questions the library can answer, shown while the search field is empty, one a
// row, without end. They come from public/search-questions (built by scripts/search-questions.mjs from
// scripts/search-questions.txt), a file of 250 at a time as the reader nears the bottom. The order is the same for
// everyone on a given day: the hand-picked first screen, then the files in an order and with an inner shuffle seeded
// by the date; after the last file the list carries on from the start in a new order. Rows are drawn windowed, so
// 2,000 or 20,000 cost the same.

/** A query's result from its one free run (brief 58): columns, at most 10 rows, the date it was run. */
export type Answer = { c: string[]; r: (string | number | boolean | null)[][]; on: string }
/** [question, [[stored, plain, rows]], topic, kind, sql, answer?] as the build writes it. */
type Raw = [string, [string, string, number | null][], string, string, string, Answer?]
export type Question = { q: string; tables: { stored: string; plain: string; rows: number | null }[]; topic: string; kind: string; sql: string; answer?: Answer; key: string }
type Manifest = { count: number; chunks: number; first: number }

const BASE = '/search-questions'
export const Q_ROW = 72

function seeded(seed: number) {
  let s = seed >>> 0 || 1
  return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296)
}
function shuffle<T>(list: T[], seed: number): T[] {
  const r = seeded(seed)
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const daySeed = () => {
  const d = new Date()
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}

/** The questions loaded so far, in today's order, and a way to load the next file. */
export function useQuestions() {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [items, setItems] = useState<Question[]>([])
  const plan = useRef<{ file: number; cycle: number }[]>([])
  const step = useRef(0)
  const busy = useRef(false)
  const files = useRef(new Map<number, Promise<Raw[]>>())
  const seed = useRef(daySeed())

  const file = (n: number) => {
    let p = files.current.get(n)
    if (!p) {
      p = fetch(`${BASE}/q-${String(n).padStart(3, '0')}.json`).then((r) => (r.ok ? (r.json() as Promise<Raw[]>) : []))
      files.current.set(n, p)
    }
    return p
  }

  const more = useCallback(async () => {
    const m = manifest
    if (!m || busy.current || !m.chunks) return
    busy.current = true
    try {
      // The plan grows a cycle at a time: the first starts with file 0 (the first screen), later ones are all shuffled.
      if (step.current >= plan.current.length) {
        const cycle = plan.current.length ? plan.current[plan.current.length - 1].cycle + 1 : 0
        const rest = Array.from({ length: m.chunks }, (_, i) => i).filter((i) => cycle > 0 || i > 0)
        const order = cycle === 0 ? [0, ...shuffle(rest, seed.current)] : shuffle(rest, seed.current + cycle * 7919)
        plan.current.push(...order.map((f) => ({ file: f, cycle })))
      }
      const { file: f, cycle } = plan.current[step.current++]
      const raw = await file(f)
      const keep = cycle === 0 && f === 0 ? raw.slice(0, m.first) : []
      const mixed = shuffle(cycle === 0 && f === 0 ? raw.slice(m.first) : raw, seed.current + f * 31 + cycle * 7919)
      const next = [...keep, ...mixed].map((r, i) => ({ q: r[0], tables: r[1].map(([stored, plain, rows]) => ({ stored, plain, rows })), topic: r[2], kind: r[3], sql: r[4], ...(r[5] ? { answer: r[5] } : {}), key: `${cycle}:${f}:${i}` }))
      setItems((prev) => [...prev, ...next])
    } finally {
      busy.current = false
    }
  }, [manifest])

  useEffect(() => {
    void fetch(`${BASE}/manifest.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null))
      .then((m) => m && setManifest(m))
      .catch(() => {})
  }, [])
  useEffect(() => {
    if (manifest && !items.length) void more()
  }, [manifest, items.length, more])

  return { items, more, total: manifest?.count ?? 0 }
}

/** The list, windowed; asks for more when the reader is within two screens of the end. Keeps its place while hidden. */
export function QuestionList({ items, at, onAt, onPick, onNearEnd, hidden }: { items: Question[]; at: number; onAt: (i: number) => void; onPick: (q: Question) => void; onNearEnd: () => void; hidden: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState(0)
  const [h, setH] = useState(800)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setH(el.clientHeight || 800))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    if (top + h * 3 >= items.length * Q_ROW) onNearEnd()
  }, [top, h, items.length, onNearEnd])
  useEffect(() => {
    const el = box.current
    if (!el || hidden) return
    const y = at * Q_ROW
    if (y < el.scrollTop) el.scrollTop = y
    else if (y + Q_ROW > el.scrollTop + el.clientHeight) el.scrollTop = y + Q_ROW - el.clientHeight
  }, [at, hidden])
  const from = Math.max(0, Math.floor(top / Q_ROW) - 4)
  const to = Math.min(items.length, Math.ceil((top + h) / Q_ROW) + 4)
  return (
    <div ref={box} className="sr-qlist" style={hidden ? { display: 'none' } : undefined} onScroll={(e) => setTop(e.currentTarget.scrollTop)} role="listbox" aria-label="Questions the library can answer">
      <div style={{ height: items.length * Q_ROW, position: 'relative' }}>
        {items.slice(from, to).map((q, k) => {
          const i = from + k
          return (
            <button
              key={q.key}
              type="button"
              role="option"
              aria-selected={i === at}
              tabIndex={-1}
              className={`sr-qrow${i === at ? ' sr-on' : ''}`}
              style={{ top: i * Q_ROW }}
              onClick={() => (onAt(i), onPick(q))}
              onMouseMove={() => i !== at && onAt(i)}
            >
              <span className="sr-qt">{q.q}</span>
              <span className="sr-qs">
                <i style={{ background: TYPE_COLOR.data }} aria-hidden />
                {q.topic}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
