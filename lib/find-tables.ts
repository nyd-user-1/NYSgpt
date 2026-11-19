// The table finder (brief 49, nysgpt-1): ranks the Data Library's tables for a question, from the catalog alone.
// Reads lib/library-index.json (built by scripts/library-index.mjs from the reconciled catalog: only the tables the
// query API can reach). Plain word scoring, no embeddings and no paid service: each word of the question counts by
// how rare it is across the tables and by where it appears (plain or stored name, topic, what a row is and the
// description, field names, field descriptions, sample values); two words together in a name or description count
// extra; a year in the question is matched to the table's years. Server only (it reads the file).

import fs from "node:fs"
import path from "node:path"

export type FoundField = { name: string; type: string; description?: string; samples?: string[] }
export type FoundTable = {
  stored: string
  plain: string
  topic: string
  about: string
  rowIs: string
  rows: number | null
  years: string
  fields: FoundField[]
}
export type Scope = { db: string | null; table: string | null }

type Raw = { s: string; p: string; t: number; a: string; r: string; n: number | null; y: string; v?: 1; nf?: number; f: (string | undefined)[][] }
type Entry = { raw: Raw; topic: string; w: Map<string, number>; nameText: string; aboutText: string; y0: number | null; y1: number | null }
type Index = { topics: string[]; entries: Entry[]; idf: Map<string, number> }

const STOP = new Set(
  "a an and are as at be by can do does for from has have how i in into is it its me my of on or our show tell that the their there these this to was were what when where which who whom why will with would about all any each give list many much most number per than top total get find data table tables record records".split(" "),
)
// a few plain words for what the catalog names otherwise
const SAME: Record<string, string[]> = {
  donation: ["contribution"], donor: ["contributor", "contribution"], gave: ["contribution"], contribution: ["donation"],
  doctor: ["physician", "provider"], physician: ["provider"], hospital: ["hospital", "facility"],
  company: ["issuer", "registrant", "company"], firm: ["company"], salary: ["wage"], pay: ["wage", "payment"], wage: ["salary"],
  job: ["employment"], jobs: ["employment"], unemployment: ["unemployment"], county: ["county", "fips"],
  zip: ["zip", "zcta"], patent: ["patent"], inventor: ["inventor"], lawsuit: ["case", "litigation"], court: ["court"],
  grant: ["award", "assistance"], contract: ["award", "procurement"], vendor: ["recipient"], recipient: ["recipient"],
  crash: ["crash", "accident"], fatal: ["fatal", "fars"], emission: ["emission"], pollution: ["emission", "release"],
  school: ["school", "district"], college: ["institution", "college"], university: ["institution"], rent: ["rent", "fmr"],
  mortgage: ["loan", "hmda"], bank: ["bank", "institution"], electricity: ["electric", "power"], power: ["electric", "generation"],
  price: ["price", "lmp"], trade: ["import", "export"], import: ["import"], export: ["export"], trademark: ["trademark"],
  weekly: ["wkly"], average: ["avg"], carbon: ["co2"], dioxide: ["co2"], emitted: ["emission", "co2"], emit: ["emission"],
  megawatt: ["mwh"], star: ["rating"], population: ["popestimate"], estimated: ["estimate"], wholesale: ["eqr"],
}
// place words (state names, and a name just before "County" or "City") narrow a question; they say little about which table
const STATES = new Set("alabama alaska arizona arkansas california colorado connecticut delaware florida georgia hawaii idaho illinois indiana iowa kansas kentucky louisiana maine maryland massachusetts michigan minnesota mississippi missouri montana nebraska nevada new york jersey hampshire mexico north south carolina dakota ohio oklahoma oregon pennsylvania rhode island tennessee texas utah vermont virginia washington west wisconsin wyoming county counties city".split(" "))
function placeWords(q: string): Set<string> {
  const out = new Set<string>()
  for (const m of q.matchAll(/\b([A-Z][a-z]+)\s+(?:County|City)\b/g)) out.add(stem(m[1].toLowerCase()))
  for (const w of words(q)) if (STATES.has(w)) out.add(stem(w))
  return out
}
// dated snapshot copies, the publisher's reduced copy and raw database dumps sit below the main table
const COPY = /_20\d\d_\d\d_\d\d_|_subset_|\.usaspending_db_/

function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y"
  if (w.length > 4 && /(ses|xes|ches|shes)$/.test(w)) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) return w.slice(0, -1)
  return w
}
const words = (s: string) =>
  (s.toLowerCase().replace(/([a-z]{3,})((?:19|20)\d\d)\b/g, "$1 $2").match(/[a-z0-9]+/g) || []).filter((w) => !STOP.has(w))
const terms = (s: string) => words(s).map(stem)

function yearsOf(y: string): [number | null, number | null] {
  const m = (y || "").match(/(1[89]\d\d|20\d\d)/g)
  if (!m) return [null, null]
  const n = m.map(Number)
  return [Math.min(...n), Math.max(...n)]
}

let INDEX: Index | null = null
function load(): Index {
  if (INDEX) return INDEX
  const file = path.join(process.cwd(), "lib", "library-index.json")
  const j = JSON.parse(fs.readFileSync(file, "utf8")) as { topics: string[]; tables: Raw[] }
  const df = new Map<string, number>()
  const entries: Entry[] = j.tables.map((raw) => {
    const topic = j.topics[raw.t]
    const w = new Map<string, number>()
    const add = (text: string, weight: number) => {
      for (const t of terms(text)) if ((w.get(t) ?? 0) < weight) w.set(t, weight)
    }
    for (const f of raw.f) {
      add((f[3] ?? "") + " " + (f[4] ?? ""), 0.6)
      add(f[2] ?? "", 1)
      add((f[0] ?? "").replace(/_/g, " "), 2)
    }
    add(raw.a + " " + raw.r, 3)
    add(topic, 4)
    add(raw.s.replace(/^govblock_/, "").replace(/[._]/g, " "), 5)
    add(raw.p, 6)
    for (const t of w.keys()) df.set(t, (df.get(t) ?? 0) + 1)
    const [y0, y1] = yearsOf(raw.y)
    return { raw, topic, w, nameText: " " + words(raw.p + " " + raw.s.replace(/[._]/g, " ")).join(" ") + " ", aboutText: " " + words(raw.a + " " + raw.r + " " + topic).join(" ") + " ", y0, y1 }
  })
  const N = entries.length
  const idf = new Map<string, number>()
  for (const [t, d] of df) idf.set(t, Math.log(1 + N / d))
  INDEX = { topics: j.topics, entries, idf }
  return INDEX
}

function toFound(e: Entry): FoundTable {
  const r = e.raw
  return {
    stored: r.s,
    plain: r.p,
    topic: e.topic,
    about: r.a,
    rowIs: r.r,
    rows: r.n,
    years: r.y,
    fields: r.f.map((f) => {
      const out: FoundField = { name: f[0] ?? "", type: f[1] ?? "" }
      if (f[2]) out.description = f[2]
      const s = [f[3], f[4]].filter((x): x is string => !!x)
      if (s.length) out.samples = s
      return out
    }),
  }
}

/** The best `limit` tables for a question, best first. `scope` (a topic's and a table's plain names, as the
 *  composer's scope picker shows them) keeps the results to that topic or table. */
export function findTables(question: string, limit = 8, scope?: Scope): FoundTable[] {
  const ix = load()
  let pool = ix.entries
  if (scope?.db) pool = pool.filter((e) => e.topic === scope.db)
  if (scope?.table) pool = pool.filter((e) => e.raw.p === scope.table || e.raw.s === scope.table)
  const qw = words(question)
  const years = (question.match(/\b(1[89]\d\d|20\d\d)\b/g) || []).map(Number)
  const q = [...new Set(qw.filter((w) => !/^(1[89]\d\d|20\d\d)$/.test(w)).map(stem))]
  if (!q.length) return pool.slice(0, limit).map(toFound)
  const places = placeWords(question)
  const alts = q.map((t) => [t, ...(SAME[t] || []).map(stem).filter((x) => x !== t)])
  const pairs = qw.slice(1).map((w, i) => [qw[i], w]).filter(([a, b]) => !places.has(stem(a)) && !places.has(stem(b))).map(([a, b]) => ` ${a} ${b} `)
  const subjectTerms = q.filter((t) => !places.has(t)).length || 1
  const scored = pool.map((e) => {
    let s = 0
    let hit = 0
    alts.forEach((group, gi) => {
      const place = places.has(q[gi])
      let best = 0
      group.forEach((t, k) => {
        const w = e.w.get(t)
        if (w) best = Math.max(best, w * (ix.idf.get(t) ?? 0) * (k === 0 ? 1 : 0.6))
      })
      if (best > 0 && !place) hit++
      s += place ? best * 0.15 : best
    })
    if (!s) return { e, s: 0 }
    for (const p of pairs) {
      if (e.nameText.includes(p)) s += 6
      else if (e.aboutText.includes(p)) s += 3
    }
    s *= 0.4 + 0.6 * Math.min(1, hit / subjectTerms) ** 2
    if (COPY.test(e.raw.s)) s *= 0.6
    if (years.length && e.y0 !== null && e.y1 !== null) s += years.every((y) => y >= e.y0! && y <= e.y1!) ? 2 : -2
    if (e.raw.n) s += 0.4 * Math.log10(e.raw.n + 1)
    if (e.raw.v) s -= 0.5
    return { e, s }
  })
  return scored
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => toFound(x.e))
}

/** Every topic, A to Z, with its tables' stored and plain names (the scope picker). */
export function listTopics(): { topic: string; tables: { stored: string; plain: string }[] }[] {
  const ix = load()
  return ix.topics.map((topic) => ({
    topic,
    tables: ix.entries
      .filter((e) => e.topic === topic)
      .map((e) => ({ stored: e.raw.s, plain: e.raw.p }))
      .sort((a, b) => a.plain.localeCompare(b.plain)),
  }))
}
