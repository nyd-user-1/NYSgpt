/// <reference lib="webworker" />

// /search's search, off the page's thread (brief 53): it loads the table finder's index (lib/library-index.json,
// nysgpt-1; served at /library-index.json) once, and answers each keystroke with the matching databases (the
// topics), tables and fields. Matching is on the letters typed: a name that starts with them first, then one with a
// word that starts with them, then one that holds them anywhere; shorter names first within each. Field names are
// searched once per distinct name, then expanded to the tables that have them.

type Raw = { s: string; p: string; t: number; a: string; r: string; n: number | null; y: string; v?: 1; f: (string | number | undefined)[][]; x?: number }
type Index = { topics: string[]; N: string[]; T: string[]; X: number[][]; tables: Raw[] }

export type Match = [number, number]
export type DbHit = { label: string; tables: number; rows: number; m: Match }
export type TableHit = { i: number; label: string; stored: string; topic: string; rowIs: string; rows: number | null; years: string; m: Match }
export type FieldHit = { i: number; table: string; stored: string; name: string; type: string; sample: string; m: Match }
export type Group<T> = { total: number; items: T[] }
export type Results = { id: number; q: string; ms: number; dbs: Group<DbHit>; tables: Group<TableHit>; fields: Group<FieldHit> }
export type FullTable = { stored: string; plain: string; topic: string; about: string; rowIs: string; rows: number | null; years: string; fields: { name: string; type: string; desc: string; sample: string }[] }

export type In = { type: "load"; url: string } | { type: "query"; id: number; q: string; limit: { dbs: number; tables: number; fields: number } } | { type: "table"; id: number; stored: string } | { type: "topic"; id: number; topic: string }
export type Out =
  | { type: "ready"; tables: number; fields: number; dbs: number; ms: number }
  | { type: "error"; message: string }
  | ({ type: "results" } & Results)
  | { type: "table"; id: number; table: FullTable | null }
  | { type: "topic"; id: number; tables: TableHit[] }

let J: Index | null = null
let tableLow: string[] = []
let topicLow: string[] = []
let topicTables: number[][] = []
let topicRows: number[] = []
let nameLow: string[] = []
/** For each distinct field name, the tables that have it, and the detailed field row where there is one. */
let occ: { t: Int32Array; f: Int32Array }[] = []
let fieldCount = 0

const ctx = self as unknown as DedicatedWorkerGlobalScope

function build(j: Index) {
  J = j
  tableLow = j.tables.map((t) => t.p.toLowerCase())
  topicLow = j.topics.map((t) => t.toLowerCase())
  topicTables = j.topics.map(() => [])
  topicRows = j.topics.map(() => 0)
  const lists: { t: number[]; f: number[] }[] = j.N.map(() => ({ t: [], f: [] }))
  fieldCount = 0
  j.tables.forEach((t, ti) => {
    topicTables[t.t]?.push(ti)
    topicRows[t.t] += t.n ?? 0
    t.f.forEach((f, fi) => {
      const n = f[0] as number
      if (lists[n]) (lists[n].t.push(ti), lists[n].f.push(fi), fieldCount++)
    })
    if (t.x !== undefined)
      for (const n of j.X[t.x] ?? []) if (lists[n]) (lists[n].t.push(ti), lists[n].f.push(-1), fieldCount++)
  })
  nameLow = j.N.map((n) => n.toLowerCase())
  // Each name's tables, larger tables first, sorted once here rather than on every keystroke.
  occ = lists.map((l) => {
    const order = l.t.map((_, k) => k).sort((a, b) => (j.tables[l.t[b]].n ?? 0) - (j.tables[l.t[a]].n ?? 0))
    return { t: Int32Array.from(order.map((k) => l.t[k])), f: Int32Array.from(order.map((k) => l.f[k])) }
  })
  last = null
}

/** The last query's matches in each list, so a query that only adds letters searches within them. */
let last: { q: string; topics: number[]; tables: number[]; names: number[] } | null = null

/** 3 when the name starts with q, 2 when a word in it does, 1 when it holds q; -1 otherwise. Also where. */
function scoreOf(s: string, q: string): [number, number] {
  const at = s.indexOf(q)
  if (at < 0) return [-1, -1]
  if (at === 0) return [3, 0]
  const re = /[^a-z0-9][a-z0-9]/g
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (s.startsWith(q, m.index + 1)) return [2, m.index + 1]
  }
  return [1, at]
}

/** The best `limit` of the items that match, and how many match in all. */
function rank(list: string[], q: string, limit: number, size: (i: number) => number = () => 0, cand?: number[]): { total: number; hits: { i: number; at: number }[]; all: number[] } {
  const buckets: { i: number; at: number }[][] = [[], [], []]
  const all: number[] = []
  const n = cand ? cand.length : list.length
  for (let k = 0; k < n; k++) {
    const i = cand ? cand[k] : k
    const [s, at] = scoreOf(list[i], q)
    if (s > 0) (buckets[3 - s].push({ i, at }), all.push(i))
  }
  const total = buckets[0].length + buckets[1].length + buckets[2].length
  const hits: { i: number; at: number }[] = []
  for (const b of buckets) {
    if (hits.length >= limit) break
    // Shorter names first; larger tables first among names of a length (only where the bucket is small enough to sort).
    if (b.length <= 20000) b.sort((x, y) => list[x.i].length - list[y.i].length || size(y.i) - size(x.i))
    for (const h of b) {
      if (hits.length >= limit) break
      hits.push(h)
    }
  }
  return { total, hits, all }
}

const tableHit = (i: number, at: number, q: string): TableHit => {
  const t = J!.tables[i]
  return { i, label: t.p, stored: t.s, topic: J!.topics[t.t] ?? "", rowIs: t.r, rows: t.n, years: t.y, m: [at, q.length] }
}

function query(id: number, raw: string, limit: { dbs: number; tables: number; fields: number }): Results {
  const started = performance.now()
  const q = raw.trim().toLowerCase()
  const empty = { total: 0, items: [] }
  if (!J || !q) return { id, q: raw, ms: 0, dbs: empty, tables: empty, fields: empty }
  const narrow = last && last.q && q.startsWith(last.q) ? last : null
  const d = rank(topicLow, q, limit.dbs, (i) => topicRows[i], narrow?.topics)
  const dbs = { total: d.total, items: d.hits.map(({ i, at }) => ({ label: J!.topics[i], tables: topicTables[i].length, rows: topicRows[i], m: [at, q.length] as Match })) }
  const t = rank(tableLow, q, limit.tables, (i) => J!.tables[i].n ?? 0, narrow?.tables)
  const tables = { total: t.total, items: t.hits.map(({ i, at }) => tableHit(i, at, q)) }
  // Fields: rank the distinct names, then list each name's tables, larger tables first, until the limit.
  const n = rank(nameLow, q, Math.max(limit.fields, 5), () => 0, narrow?.names)
  last = { q, topics: d.all, tables: t.all, names: n.all }
  // Every field that matches: each matching name counted once for each table that has it.
  let total = 0
  for (const i of n.all) total += occ[i].t.length
  const items: FieldHit[] = []
  for (const h of n.hits) {
    if (items.length >= limit.fields) break
    const o = occ[h.i]
    for (let k = 0; k < o.t.length; k++) {
      if (items.length >= limit.fields) break
      const tab = J!.tables[o.t[k]]
      const f = o.f[k] >= 0 ? tab.f[o.f[k]] : null
      items.push({ i: o.t[k], table: tab.p, stored: tab.s, name: J!.N[h.i], type: f ? (J!.T[f[1] as number] ?? "") : "", sample: f && typeof f[3] === "string" ? f[3] : "", m: [h.at, q.length] })
    }
  }
  return { id, q: raw, ms: performance.now() - started, dbs, tables, fields: { total, items } }
}

function full(stored: string): FullTable | null {
  if (!J) return null
  const t = J.tables.find((x) => x.s === stored)
  if (!t) return null
  const detailed = t.f.map((f) => ({ name: J!.N[f[0] as number] ?? "", type: J!.T[f[1] as number] ?? "", desc: (f[2] as string) ?? "", sample: typeof f[3] === "string" ? f[3] : "" }))
  const more = t.x === undefined ? [] : (J.X[t.x] ?? []).map((n) => ({ name: J!.N[n] ?? "", type: "", desc: "", sample: "" }))
  return { stored: t.s, plain: t.p, topic: J.topics[t.t] ?? "", about: t.a, rowIs: t.r, rows: t.n, years: t.y, fields: [...detailed, ...more] }
}

ctx.onmessage = async (e: MessageEvent<In>) => {
  const m = e.data
  try {
    if (m.type === "load") {
      const started = performance.now()
      const r = await fetch(m.url)
      if (!r.ok) throw new Error(`The index answered ${r.status}.`)
      build((await r.json()) as Index)
      ctx.postMessage({ type: "ready", tables: J!.tables.length, fields: fieldCount, dbs: J!.topics.length, ms: performance.now() - started } satisfies Out)
    } else if (m.type === "query") ctx.postMessage({ type: "results", ...query(m.id, m.q, m.limit) } satisfies Out)
    else if (m.type === "table") ctx.postMessage({ type: "table", id: m.id, table: full(m.stored) } satisfies Out)
    else if (m.type === "topic") {
      const i = J ? J.topics.indexOf(m.topic) : -1
      const list = i < 0 ? [] : [...topicTables[i]].sort((a, b) => (J!.tables[b].n ?? 0) - (J!.tables[a].n ?? 0)).map((ti) => tableHit(ti, 0, ""))
      ctx.postMessage({ type: "topic", id: m.id, tables: list } satisfies Out)
    }
  } catch (err) {
    ctx.postMessage({ type: "error", message: (err as Error).message } satisfies Out)
  }
}
