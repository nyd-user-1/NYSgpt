#!/usr/bin/env node
// The morning report for /chat over the library (brief 49): two letter pages in the one-sheet design
// (docs/sketches/2026-11-16-holdings-one-sheet.html), written from a judge run's results.json.
//
//   node scripts/chat-eval-report.mjs [--run <dir with results.json>] [--out <report.html>]
//
// The examples, the figures and the misses come from the run; the list of what is needed before the chat
// is public is written here, below, and changes only by hand.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`)
  return i > 0 ? process.argv[i + 1] : d
}
const DIR = join(homedir(), 'Code/NYSgpt/docs/reports/2026-11-19-chat-eval')
const last = readdirSync(DIR).filter(d => /^run-\d+$/.test(d)).sort().pop()
const RUN = arg('run', join(DIR, last))
const OUT = arg('out', join(DIR, 'NYSgpt-Chat-Over-The-Library-2026-11-19.html'))
const { summary: S, results: R } = JSON.parse(readFileSync(join(RUN, 'results.json'), 'utf8'))

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const money = v => (v < 0.1 ? `$${v.toFixed(3)}` : `$${v.toFixed(2)}`)
const cmp = v => (v >= 1e9 ? `${+(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${+(v / 1e3).toFixed(1)}K` : String(v))
/** The answer itself: its sentences that state a figure, without the model's narration or markdown. */
const NARRATION = /^(I need|I'll|I will|Let me|Now|Perfect|I can see|I notice|I found (the|a|two|several)\b|The query returned|I apologize|First|Next)/i
const brief = (s, n = 230) => {
  const all = String(s ?? '').replace(/\*\*|__|`/g, '').replace(/\|[^\n]*\|/g, '').replace(/\s+/g, ' ').trim()
  // sentences end at a full stop before a capital, so 14.4 million stays whole; narration before a colon is dropped
  const sent = all.split(/(?<=[.!?])\s+(?=[A-Z"“])/).map(x => x.replace(/^.*?:\s*(?=I found|There (are|were|is))/, '').trim())
  const keep = sent.filter(x => !NARRATION.test(x) && /\d/.test(x))
  const t = (keep.length ? keep.slice(0, 2) : sent.slice(-2)).join(' ')
  return t.length > n ? t.slice(0, t.lastIndexOf(' ', n)) + '…' : t
}
const plainTable = t => String(t).split('.').pop().replace(/_/g, ' ')

/* five examples: right answers with a query behind them first, then right ones from the catalog, then answered */
const ex = [
  // an answer that says it could not do part of the question is not an example, even when its figure matched
  ...R.filter(r => r.verdict === 'right' && r.queryRan && !/cannot|could not|couldn['’]t|unable/i.test(r.answer ?? '')),
  ...R.filter(r => r.verdict === 'right' && !r.queryRan),
  ...R.filter(r => r.verdict === 'answered-unchecked' && r.queryRan),
].slice(0, 5)

/* What went wrong. The reasons are read by hand from each miss's queries and answer (run-NN/unmatched.md);
   a miss with no reason written here falls back to the judge's verdict. */
const REASONS = {
  q01: 'It found the right contracts table, guessed a column it does not have, then filtered North Carolina instead of New York, and ran out of its three queries.',
  q02: 'It guessed the place-of-performance column, spent its queries finding the right one, and gave national totals instead of New York\'s.',
  q03: 'It filtered on "NYISO"; the data writes the New York ISO as "NYIS". It learned that on its third query and stopped.',
  q04: 'The same as above: it found "NYIS" on its last query and never ran the count.',
  q05: 'It counted patent publications, not granted patents, and found 2 against 2,146.',
  q06: 'It found no county field for contractors and said it could not answer; the contracts table holds the recipient\'s county.',
  q07: 'It counted one extract code rather than the November 2026 extract: 820,113 against 911,820.',
  q14: 'The table writes early years with two digits (75 for 1975) and later years with four; its filter kept only the two-digit years: 917,160 against 1,872,406.',
  q21: 'Its filter on a status code matched nothing, so it said the library lacks the count; the school directory holds it.',
}
/* what went wrong, by kind */
const missed = R.filter(r => !['right', 'refused-correctly', 'answered-unchecked'].includes(r.verdict) && !/cap reached/.test(r.error ?? ''))
const notRun = R.filter(r => /cap reached/.test(r.error ?? ''))
const checked = R.filter(r => r.expected && r.expected.value != null && !/cap reached/.test(r.error ?? ''))
const why = r => {
  if (REASONS[r.id]) return REASONS[r.id]
  if (r.verdict === 'error') return `It failed: ${r.error}`
  if (r.verdict === 'should-have-refused') return r.kind === 'too-large' ? 'It answered a question that needs a scan past the limit, instead of saying so.' : 'It answered a question the library cannot answer, instead of saying so.'
  if (r.verdict === 'refused-wrongly') return 'It said it could not answer, though the library holds the answer.'
  if (r.verdict === 'no-query') return 'It answered without running a query.'
  if (r.tableFound === false) return `It used ${r.tables?.length ? r.tables.map(plainTable).join(', ') : 'no table'}, not the table that holds the answer.`
  return 'It ran a query on the right table, but the figure it gave does not match.'
}

const tile = (v, label) => `<div class="num"><b>${esc(v)}</b><span>${esc(label)}</span></div>`
const page = (n, body) => `<section class="page"><div class="mast"><b>NYSgpt</b><span>NOVEMBER 2026</span></div><div class="body">${body}</div><div class="foot"><span>NYSgpt.com</span><span>${n}</span></div></section>`

const p1 = `
<h1>Chat over the library</h1><p class="sub">Overnight test • ${S.of} questions • ${new Date(S.at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
<p class="lead">The chat now finds the tables for a question among 6.7K, runs one read-only query through the Data Library API, and answers from the rows it gets back, naming the tables and showing the SQL.</p>
<p>I wrote ${S.of} test questions: 22 the library can answer (15 with a figure taken from the library beforehand), 5 it cannot, and 3 that would need a scan too large to run. Answers were checked by comparison, not by a model.${notRun.length ? ` The night's model budget ran out after ${S.of - notRun.length} questions, so the last ${notRun.length}, among them all 8 refusal tests, did not run.` : ''}</p>
<div class="nums">${tile(`${checked.filter(r => r.verdict === 'right').length} of ${checked.length}`, 'checked figures right, within 1 percent')}${tile(String(missed.length), 'wrong, or refused though the library holds it')}${tile(`${S.tableFound} of ${S.tableExpected}`, 'questions where it used the right table')}${tile(money((S.costModel + S.costAthena) / Math.max(1, S.asked - notRun.length)), 'average cost a message, model and query')}</div>
<hr>
<h2>Five answers from the run</h2>
<table><colgroup><col style="width:36%"><col style="width:64%"></colgroup><thead><tr><th>Question</th><th>Answer, and the table it read</th></tr></thead><tbody>
${ex.map(r => `<tr><td class="q">${esc(r.question)}</td><td class="a">${esc(brief(r.answer))}<span class="t">${esc((r.tables ?? []).map(plainTable).join(', ') || 'catalog row count')}</span></td></tr>`).join('\n')}
</tbody></table>
<h2>What it costs</h2>
<p>The run cost ${money(S.cost)} for ${S.asked - notRun.length} answered questions: ${money(S.costModel)} of model time on Claude Haiku 4.5 and ${money(S.costAthena)} of query scanning. A question answered with one query cost about $0.014. A question that took three queries cost $0.04 to $0.14, because every turn sends the shown tables' fields to the model again: 30K to 134K tokens of input. Fixing the column guessing above also cuts the cost.</p>`

const p2 = `
<h2>What it gets wrong, and why</h2>
<table class="tight"><colgroup><col style="width:36%"><col style="width:64%"></colgroup><thead><tr><th>Question</th><th>What happened</th></tr></thead><tbody>
${missed.slice(0, 9).map(r => `<tr><td class="q">${esc(r.question)}</td><td class="a">${esc(why(r))}</td></tr>`).join('\n')}
</tbody></table>
<h2>Before it is public</h2>
<table class="need"><colgroup><col style="width:30%"><col style="width:70%"></colgroup><tbody>
<tr><td class="k">Sign-in</td><td>The route answers only on the dev server today. Public use needs the reader signed in, so each message has an owner.</td></tr>
<tr><td class="k">Limits per reader</td><td>A daily message count and a daily scan budget per reader, enforced in the server, with the reader told how much is left.</td></tr>
<tr><td class="k">Its own key</td><td>The chat queries with a key made for it, with its own small limits, kept in the server's settings.</td></tr>
<tr><td class="k">The misses above</td><td>Better table finding for the questions it missed, and answers that run a query rather than reading the catalog's row count.</td></tr>
<tr><td class="k">A second run</td><td>The same questions and a held-out set, rerun after each fix, so a change that helps one question and hurts another shows.</td></tr>
</tbody></table>`

const css = readFileSync(join(homedir(), 'Code/NYSgpt/docs/sketches/2026-11-16-holdings-one-sheet.html'), 'utf8').match(/<style>([\s\S]*?)<\/style>/)[1]
const extra = `
td{white-space:normal}td.q{font-weight:600}td.a{font:400 9pt/1.42 'Source Serif 4',Georgia,serif}
td.a .t{display:block;margin-top:.03in;font:400 7.6pt/1.3 Inter,Helvetica,sans-serif;color:#6f6a5f}
.nums{margin:.14in 0 .1in}.num b{font-size:21pt}
table.need td{padding:.04in .1in .04in 0;font-size:9pt}
table.tight td.q{font-size:8.4pt;line-height:1.3}table.tight td.a{font-size:8.6pt;line-height:1.34}table.tight td{padding:.035in .1in .035in 0}
.page:nth-child(2) p{font-size:9.6pt;line-height:1.42;margin-bottom:.09in}
h2{margin-top:.12in}`
writeFileSync(OUT, `<!doctype html><html lang="en"><meta charset="utf-8"><title>NYSgpt: chat over the library</title><style>${css}${extra}</style><main>${page(1, p1)}${page(2, p2)}</main></html>\n`)
console.log(`wrote ${OUT} from ${RUN}`)
