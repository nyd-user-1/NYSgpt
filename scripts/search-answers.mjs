#!/usr/bin/env node
// Merges one free run's results (brief 58) into scripts/search-answers.json, which the question build
// (scripts/search-questions.mjs) reads. Run: node scripts/search-answers.mjs <answers.jsonl> [more.jsonl …]
//
// Each input line is one query's run, from the run on a box beside the lake (DuckDB 1.1.3 reading the lake's Parquet
// files in us-east-1; runner and rules in the brief's State): { h, st, c, r, on, ms, req, scan, err, rules, sql_run }.
// h is the first 12 hex of the SHA-1 of the question's SQL. st: ok, empty (no rows), null (one row of empty values),
// notrun (DuckDB refused the query; err says why), toolarge (over 120 s or over memory), skipped (the table cannot be
// read there). A later line for the same h replaces the earlier one. Only ok results are shown on /search.

import fs from "node:fs"
import path from "node:path"

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")
const OUT = path.join(ROOT, "scripts", "search-answers.json")
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { answers: {} }
const answers = prev.answers ?? {}
let n = 0
for (const f of process.argv.slice(2)) {
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    if (!line.trim()) continue
    const a = JSON.parse(line)
    const keep = { st: a.st, on: a.on }
    if (a.st === "ok") Object.assign(keep, { c: a.c, r: a.r, ...(a.more ? { more: true } : {}) })
    if (a.err) keep.err = a.err
    if (a.rules) keep.rules = a.rules
    for (const k of ["ms", "req", "scan"]) if (a[k] != null) keep[k] = a[k]
    answers[a.h] = keep
    n++
  }
}
const sorted = Object.fromEntries(Object.entries(answers).sort(([a], [b]) => a.localeCompare(b)))
const by = Object.values(sorted).reduce((m, a) => ((m[a.st] = (m[a.st] ?? 0) + 1), m), {})
fs.writeFileSync(OUT, JSON.stringify({ how: "DuckDB 1.1.3 reading the lake's Parquet files in us-east-1, one run per query (brief 58)", counts: by, answers: sorted }, null, 0) + "\n")
console.log(`merged ${n} lines; ${Object.keys(sorted).length} queries stored:`, JSON.stringify(by))
