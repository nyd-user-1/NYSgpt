#!/usr/bin/env node
// The judge for /chat over the library (brief 49, 2026-11-19). It sends each test-set question to the
// dev box's /api/chat, keeps what came back (the answer, the tables used, the SQL, bytes scanned,
// tokens) and scores it by comparison only, no model: the right table found, a query ran, the answer
// carries the expected figure (numbers within 1 percent, names exactly), and a refusal where one is due.
// Whatever it cannot match is listed for a person to read.
//
//   node scripts/chat-eval.mjs [--base http://18.188.148.0:3001] [--set <test-set.json>[,<another.json>]] [--out <dir>]
//                              [--only q01,q02] [--limit-model 1.00] [--limit-athena 0.50] [--note "..."]
//
// Each run writes <out>/run-NN/ (results.json, unmatched.md) and adds a row to <out>/README.md.

import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`)
  return i > 0 ? process.argv[i + 1] : d
}
const BASE = arg('base', 'http://18.188.148.0:3001')
const SET = arg('set', join(homedir(), 'Code/NYSgpt/docs/briefs/49-test-set.json'))
const OUT = arg('out', join(homedir(), 'Code/NYSgpt/docs/reports/2026-11-19-chat-eval'))
const ONLY = arg('only', '')?.split(',').filter(Boolean)
const NOTE = arg('note', '')
// The night's caps for the three lanes together (brief 49); the judge stops before passing them.
const LIMIT_MODEL = Number(arg('limit-model', '1.00'))
const LIMIT_ATHENA = Number(arg('limit-athena', '0.50'))
// Claude Haiku 4.5 on Bedrock through the US cross-region profile (the rates in nysgpt-3's meter, 2b8176b):
// $1.10 a million input tokens, $5.50 output, $1.375 to write the prompt cache, $0.11 to read it. Athena: $5 a
// terabyte scanned. Until 2026-11-19 06:50 the judge priced every input token at $1, cached reads included.
const PRICE_IN = 1.1 / 1e6
const PRICE_OUT = 5.5 / 1e6
const PRICE_CACHE_WRITE = 1.375 / 1e6
const PRICE_CACHE_READ = 0.11 / 1e6
const PRICE_BYTE = 5 / 1e12
const TIMEOUT_MS = 240_000

/* ── the test set ── */
// --set takes one file or several, comma-separated; with --only, the questions run in the order --only names them.
const all = SET.split(',').flatMap(f => {
  const j = JSON.parse(readFileSync(f.trim(), 'utf8'))
  return Array.isArray(j) ? j : j.questions
})
const questions = ONLY.length ? ONLY.map(id => all.find(q => q.id === id)).filter(Boolean) : all

/* ── the runs so far: their spend counts against the caps ── */
mkdirSync(OUT, { recursive: true })
const runs = readdirSync(OUT).filter(d => /^run-\d+$/.test(d)).sort()
let spentModel = 0
let spentAthena = 0
for (const r of runs) {
  const f = join(OUT, r, 'results.json')
  if (!existsSync(f)) continue
  const s = JSON.parse(readFileSync(f, 'utf8')).summary
  spentModel += s?.costModel ?? 0
  spentAthena += s?.costAthena ?? 0
}
const runName = `run-${String(runs.length + 1).padStart(2, '0')}`
const dir = join(OUT, runName)
mkdirSync(dir, { recursive: true })

/* ── asking ── */
async function ask(question) {
  const t0 = Date.now()
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: question }] }),
      signal: ctl.signal,
    })
    const type = res.headers.get('content-type') ?? ''
    const text = await res.text()
    const ms = Date.now() - t0
    if (!res.ok) return { error: `HTTP ${res.status}: ${text.slice(0, 300)}`, ms }
    if (type.includes('application/json')) {
      const j = JSON.parse(text)
      return { ...j, ms, format: 'json' }
    }
    // No JSON mode: read what the text holds (SQL in code blocks); tables and spend are unknown.
    const sql = [...text.matchAll(/```sql\s*([\s\S]*?)```/gi)].map(m => m[1].trim())
    return { answer: text, sql, tables: [], bytes: null, tokens: null, refused: null, error: null, ms, format: 'text' }
  } catch (e) {
    return { error: e.name === 'AbortError' ? `no reply in ${TIMEOUT_MS / 1000} s` : String(e.message ?? e), ms: Date.now() - t0 }
  } finally {
    clearTimeout(timer)
  }
}

/* ── scoring ── */
const norm = s => String(s ?? '').toLowerCase().trim()
const tableName = t => norm(t).replace(/^"|"$/g, '').replace(/"\."/g, '.')
const MULT = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9, t: 1e12, trillion: 1e12 }
/** Every number the answer states, with its scale word applied (1.2B, 3.4 million, 46%, $1,234). */
function numbers(text) {
  const out = []
  const re = /(-?)\$?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*(%|trillion|billion|million|thousand|bn|[kmbt])?(?![a-z])/gi
  for (const m of String(text ?? '').matchAll(re)) {
    let v = Number(m[2].replace(/,/g, '') + (m[3] ?? ''))
    if (m[1]) v = -v
    const w = (m[4] ?? '').toLowerCase()
    if (w && w !== '%') v *= MULT[w] ?? 1
    out.push(v)
  }
  return out
}
const within = (a, b) => (b === 0 ? Math.abs(a) < 1e-9 : Math.abs(a - b) / Math.abs(b) <= 0.01)
const REFUSE_LIB = /(does not|doesn['’]t|do not|don['’]t) (hold|have|contain|cover)|not in (the|my) library|no table|could not find|couldn['’]t find|can['’]t find|cannot find|isn['’]t in|is not in/i
const REFUSE_BIG = /too large|too big|byte limit|narrow(er)?|a smaller (question|range)|scan (too|more)/i

function score(q, r) {
  const want = (q.tables ?? []).map(tableName)
  // found: the tables the search showed the model (sent since run 2); a table counts as found if shown or used
  const got = [...(r.tables ?? []), ...(r.found ?? [])].map(tableName)
  const tableFound = want.length ? got.some(g => want.some(w => g === w || g.endsWith(`.${w}`) || w.endsWith(`.${g}`))) : null
  const queryRan = (r.sql ?? []).length > 0 && !r.error
  // The server sets `refused` to a label, or to true when it cannot say which (it also sets true when an
  // answer has no query behind it); then the answer's words decide.
  const label = typeof r.refused === 'string' ? r.refused : null
  const refusedLib = label === 'not-in-library' || (!label && REFUSE_LIB.test(r.answer ?? ''))
  const refusedBig = label === 'too-large' || (!label && REFUSE_BIG.test(r.answer ?? ''))
  const refused = !!label || refusedLib || refusedBig
  let answerMatch = null
  let verdict
  if (r.error) verdict = 'error'
  else if (q.kind === 'unanswerable') verdict = refusedLib || label === 'other' || (r.refused === true && !queryRan) ? 'refused-correctly' : 'should-have-refused'
  else if (q.kind === 'too-large') verdict = refusedBig ? 'refused-correctly' : 'should-have-refused'
  else {
    const e = q.expected
    if (e && e.value != null) {
      answerMatch = typeof e.value === 'number' ? numbers(r.answer).some(n => within(n, e.value)) : norm(r.answer).includes(norm(e.value))
      verdict = answerMatch ? 'right' : refused ? 'refused-wrongly' : 'wrong'
    } else verdict = refused ? 'refused-wrongly' : queryRan ? 'answered-unchecked' : 'no-query'
  }
  return { tableFound, queryRan, answerMatch, refused, verdict, fromCatalog: verdict === 'right' && !queryRan }
}

/* ── the run ── */
const results = []
let costModel = 0
let costAthena = 0
let stopped = null
for (const q of questions) {
  if (spentModel + costModel >= LIMIT_MODEL) { stopped = `model cap $${LIMIT_MODEL.toFixed(2)} reached`; break }
  if (spentAthena + costAthena >= LIMIT_ATHENA) { stopped = `Athena cap $${LIMIT_ATHENA.toFixed(2)} reached`; break }
  process.stdout.write(`${q.id} ${q.question.slice(0, 70)} … `)
  const r = await ask(q.question)
  const s = score(q, r)
  // tokens.input is plain input when the reply splits out cacheRead and cacheWrite (the server's meter since 2b8176b)
  const cm = r.tokens ? (r.tokens.input ?? 0) * PRICE_IN + (r.tokens.output ?? 0) * PRICE_OUT + (r.tokens.cacheWrite ?? 0) * PRICE_CACHE_WRITE + (r.tokens.cacheRead ?? 0) * PRICE_CACHE_READ : 0
  const ca = r.bytes ? r.bytes * PRICE_BYTE : 0
  costModel += cm
  costAthena += ca
  results.push({ id: q.id, question: q.question, subject: q.subject, kind: q.kind, expectedTables: q.tables ?? [], expected: q.expected ?? null, ...r, ...s, costModel: cm, costAthena: ca })
  console.log(`${s.verdict}${s.fromCatalog ? ' (from the catalog count, no query)' : ''}${s.tableFound === false ? ' (table missed)' : ''} ${(r.ms / 1000).toFixed(1)} s`)
}

const count = v => results.filter(r => r.verdict === v).length
const summary = {
  run: runName,
  at: new Date().toISOString(),
  base: BASE,
  note: NOTE,
  asked: results.length,
  of: questions.length,
  answered: results.filter(r => !r.error && r.verdict !== 'refused-correctly' && r.verdict !== 'refused-wrongly').length,
  right: count('right'),
  rightWithQuery: results.filter(r => r.verdict === 'right' && r.queryRan).length,
  rightFromCatalog: results.filter(r => r.fromCatalog).length,
  queried: results.filter(r => r.queryRan).length,
  wrong: count('wrong') + count('refused-wrongly') + count('should-have-refused') + count('no-query'),
  refusedCorrectly: count('refused-correctly'),
  unchecked: count('answered-unchecked'),
  errors: count('error'),
  tableFound: results.filter(r => r.tableFound === true).length,
  tableExpected: results.filter(r => r.tableFound !== null).length,
  costModel,
  costAthena,
  cost: costModel + costAthena,
  perMessage: results.length ? (costModel + costAthena) / results.length : 0,
  stopped,
  format: [...new Set(results.map(r => r.format).filter(Boolean))].join(', '),
}
writeFileSync(join(dir, 'results.json'), JSON.stringify({ summary, results }, null, 1))

/* the ones a person should read: every answer the comparison could not call right */
const un = results.filter(r => r.verdict !== 'right' && r.verdict !== 'refused-correctly')
writeFileSync(
  join(dir, 'unmatched.md'),
  `# ${runName}: answers to read\n\n${un.length ? '' : 'None.\n'}` +
    un
      .map(
        r =>
          `## ${r.id}: ${r.question}\n\n- Verdict: ${r.verdict}${r.tableFound === false ? '; expected table not used' : ''}\n- Expected: ${r.expected ? `${r.expected.value}${r.expected.unit ? ` ${r.expected.unit}` : ''}` : r.kind}\n- Tables used: ${(r.tables ?? []).join(', ') || 'none'}\n${r.error ? `- Error: ${r.error}\n` : ''}\n${(r.sql ?? []).map(s => '```sql\n' + s + '\n```\n').join('')}\n> ${String(r.answer ?? '').replace(/\n/g, '\n> ').slice(0, 1500)}\n`,
      )
      .join('\n'),
)

/* the README table */
const readme = join(OUT, 'README.md')
const head = `# /chat over the library: evaluation runs (brief 49)\n\nEach run asks the test set (docs/briefs/49-test-set.json) of the dev box's /api/chat and scores the replies by comparison: numbers within 1 percent, names exactly, refusals where due. A run's folder holds every reply (results.json) and the ones to read by hand (unmatched.md). Cost is model tokens at Claude Haiku 4.5's US cross-region Bedrock prices ($1.10 input, $5.50 output, $1.375 cache write, $0.11 cache read a million tokens) plus Athena bytes at $5 a terabyte.\n\n| Run | Asked | Answered | Right (with a query) | Wrong | Refused correctly | Table found | Cost | Per message | Note |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---|\n`
const fmt$ = v => `$${v.toFixed(v < 0.1 ? 4 : 2)}`
const row = `| ${runName} | ${summary.asked} of ${summary.of} | ${summary.answered} | ${summary.right} (${summary.rightWithQuery}) | ${summary.wrong} | ${summary.refusedCorrectly} | ${summary.tableFound} of ${summary.tableExpected} | ${fmt$(summary.cost)} | ${fmt$(summary.perMessage)} | ${[NOTE, stopped].filter(Boolean).join('; ')} |\n`
writeFileSync(readme, (existsSync(readme) ? readFileSync(readme, 'utf8') : head) + row)

console.log(`\n${runName}: asked ${summary.asked} of ${summary.of}; right ${summary.right}, wrong ${summary.wrong}, refused correctly ${summary.refusedCorrectly}, unchecked ${summary.unchecked}, errors ${summary.errors}; table found ${summary.tableFound} of ${summary.tableExpected}; cost ${fmt$(summary.cost)} (model ${fmt$(costModel)}, Athena ${fmt$(costAthena)}); night so far model ${fmt$(spentModel + costModel)}, Athena ${fmt$(spentAthena + costAthena)}${stopped ? `; stopped: ${stopped}` : ''}`)
console.log(`wrote ${dir}`)
