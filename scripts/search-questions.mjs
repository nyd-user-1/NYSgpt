#!/usr/bin/env node
// Builds /search's question list (brief 57) from scripts/search-questions.txt, checked against the table finder's
// index (lib/library-index.json). Run: node scripts/search-questions.mjs
//
// Source, one question a line:   kind | db.table[, db.table] | the question | SQL (empty when not sure)
//   kind: count, total, rank, change, compare, lookup, first, last, share, list. A leading * puts the question on the
//   first screen, in the order written. Lines starting with # are notes.
//
// Checks: every table is in the index (the index holds only the tables the query API reaches); every year named in
// the question is inside the first table's years where the index gives them; the SQL, when given, is one SELECT that
// names only the question's tables; no two questions the same or nearly so (lower-cased, numbers and capitalised
// names taken out). Rejected lines are listed and left out.
//
// Output, public/search-questions/: manifest.json { count, chunks, first, built, topics, kinds, answered } and
// q-000.json … (250 a file), each an array of [question, [[stored, plain, rows]], topic, kind, sql, answer?]. The
// first-screen questions come first; the rest follow in an order where neighbours differ in topic and kind.
//
// Answers (brief 58): scripts/search-answers.json holds each query's result from one free run (DuckDB on the lake's
// Parquet files), keyed by the first 12 hex of the SQL's SHA-1, so an edited query loses its answer until it is run
// again. A question whose stored result has rows gets { c: columns, r: at most 10 rows, on: the date run } as its
// sixth element. Queries that returned no rows, or one row of empty values, are listed for their authors to fix.

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")
const SRC = path.join(ROOT, "scripts", "search-questions.txt")
const OUT = path.join(ROOT, "public", "search-questions")
const CHUNK = 250
const KINDS = new Set(["count", "total", "rank", "change", "compare", "lookup", "first", "last", "share", "list"])

const idx = JSON.parse(fs.readFileSync(path.join(ROOT, "lib", "library-index.json"), "utf8"))
const tables = new Map(idx.tables.map((t) => [t.s, t]))

const years = (y) => {
  const m = String(y || "").match(/(1[89]\d\d|20\d\d)/g)
  return m ? [Math.min(...m.map(Number)), Math.max(...m.map(Number))] : null
}
const norm = (q) =>
  q
    .replace(/\b[A-Z][A-Za-z.&'-]*(?:\s+[A-Z][A-Za-z.&'-]*)*/g, " ")
    .toLowerCase()
    .replace(/[0-9]+/g, " ")
    .replace(/[^a-z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const rejects = []
const seen = new Map()
const first = []
const rest = []
// scripts/search-questions.txt first, then any further source files (search-questions-<name>.txt), so writers in the
// shared tree each keep their own file (nysgpt-1, 2026-11-19)
const lines = [SRC, ...fs.readdirSync(path.dirname(SRC)).filter((f) => /^search-questions-.+\.txt$/.test(f)).sort().map((f) => path.join(path.dirname(SRC), f))].flatMap((f) => fs.readFileSync(f, "utf8").split("\n"))
lines.forEach((line, n) => {
  const raw = line.trim()
  if (!raw || raw.startsWith("#")) return
  const parts = raw.split(" | ")
  if (parts.length < 3) return rejects.push([n + 1, "not kind | tables | question | sql", raw])
  let [kind, tbl, q, ...sqlParts] = parts
  const sql = sqlParts.join(" | ").trim()
  const star = kind.startsWith("*")
  kind = kind.replace(/^\*/, "").trim()
  q = q.trim()
  if (!KINDS.has(kind)) return rejects.push([n + 1, `unknown kind ${kind}`, q])
  const stored = tbl.split(",").map((s) => s.trim()).filter(Boolean)
  const missing = stored.filter((s) => !tables.has(s))
  if (!stored.length || missing.length) return rejects.push([n + 1, `not in the index: ${missing.join(", ") || "(none named)"}`, q])
  const t0 = tables.get(stored[0])
  const range = years(t0.y)
  if (range) {
    const named = (q.match(/\b(1[89]\d\d|20\d\d)\b/g) || []).map(Number)
    const out = named.filter((y) => y < range[0] || y > range[1])
    if (out.length) return rejects.push([n + 1, `year ${out.join(", ")} outside ${range[0]}–${range[1]}`, q])
  }
  if (sql) {
    if (!/^\s*(select|with)\b/i.test(sql) || /;\s*\S/.test(sql)) return rejects.push([n + 1, "SQL is not one SELECT", q])
    const named = [...sql.matchAll(/\b(?:from|join)\s+([a-z0-9_]+\.[a-z0-9_]+)/gi)].map((m) => m[1].toLowerCase())
    const foreign = named.filter((s) => !stored.includes(s))
    if (foreign.length) return rejects.push([n + 1, `SQL names a table the question does not: ${foreign.join(", ")}`, q])
  }
  const key = norm(q)
  if (seen.has(key)) return rejects.push([n + 1, `same as line ${seen.get(key)}`, q])
  seen.set(key, n + 1)
  const rec = [q, stored.map((s) => [s, tables.get(s).p, tables.get(s).n ?? null]), idx.topics[t0.t] ?? "", kind, sql]
  ;(star ? first : rest).push(rec)
})

// Neighbours differ in topic and kind: a seeded shuffle, then each next question the first one left whose topic and
// kind both differ from the last one placed (falling back to topic alone, then to anything).
let seed = 20261119
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
const pool = rest.map((r) => [rand(), r]).sort((a, b) => a[0] - b[0]).map((x) => x[1])
const ordered = []
let prev = first.at(-1) ?? null
while (pool.length) {
  let i = pool.findIndex((r) => !prev || (r[2] !== prev[2] && r[3] !== prev[3]))
  if (i < 0) i = pool.findIndex((r) => !prev || r[2] !== prev[2])
  if (i < 0) i = 0
  prev = pool.splice(i, 1)[0]
  ordered.push(prev)
}
const all = [...first, ...ordered]

const ANSWERS = path.join(ROOT, "scripts", "search-answers.json")
const answers = fs.existsSync(ANSWERS) ? JSON.parse(fs.readFileSync(ANSWERS, "utf8")).answers ?? {} : {}
const hashOf = (sql) => crypto.createHash("sha1").update(sql).digest("hex").slice(0, 12)
const flagged = []
for (const r of all) {
  const a = r[4] ? answers[hashOf(r[4])] : null
  if (a?.st === "ok") r.push({ c: a.c, r: a.r, on: a.on })
  else if (a && (a.st === "empty" || a.st === "null")) flagged.push([a.st === "empty" ? "no rows" : "one row, all empty", r[0]])
}

fs.mkdirSync(OUT, { recursive: true })
for (const f of fs.readdirSync(OUT)) if (/^q-\d+\.json$/.test(f)) fs.unlinkSync(path.join(OUT, f))
const chunks = Math.ceil(all.length / CHUNK)
for (let c = 0; c < chunks; c++) fs.writeFileSync(path.join(OUT, `q-${String(c).padStart(3, "0")}.json`), JSON.stringify(all.slice(c * CHUNK, (c + 1) * CHUNK)))
const count = (k) => Object.fromEntries([...all.reduce((m, r) => m.set(r[k], (m.get(r[k]) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1]))
const manifest = { count: all.length, chunks, chunk: CHUNK, first: first.length, built: new Date().toISOString(), withSql: all.filter((r) => r[4]).length, answered: all.filter((r) => r[5]).length, topics: count(2), kinds: count(3) }
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1))

console.log(`questions: ${all.length} (${first.length} first screen, ${manifest.withSql} with SQL), ${chunks} files, ${Object.keys(manifest.topics).length} topics`)
console.log("by kind:", JSON.stringify(manifest.kinds))
console.log(`answers stored: ${manifest.answered}; queries to fix (their free run found nothing): ${flagged.length}`)
for (const [why, q] of flagged) console.log(`  ${why}: ${q}`)
if (rejects.length) {
  console.log(`rejected ${rejects.length}:`)
  for (const [n, why, q] of rejects) console.log(`  line ${n}: ${why}: ${q}`)
}
