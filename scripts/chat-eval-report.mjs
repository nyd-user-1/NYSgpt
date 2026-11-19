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
/* Run 1 beside the latest run, when the latest is a later one. */
const FIRST = join(DIR, 'run-01')
const R1 = RUN === FIRST ? null : JSON.parse(readFileSync(join(FIRST, 'results.json'), 'utf8'))
const metrics = (rs) => {
  const ran = rs.filter(r => !/cap reached/.test(r.error ?? ''))
  const chk = ran.filter(r => r.expected && r.expected.value != null)
  const ref = ran.filter(r => r.kind === 'unanswerable' || r.kind === 'too-large')
  const held = ran.filter(r => /^h/.test(r.id))
  const cost = ran.reduce((n, r) => n + (r.costModel ?? 0) + (r.costAthena ?? 0), 0)
  return {
    checked: `${chk.filter(r => r.verdict === 'right').length} of 15`,
    refusals: ref.length ? `${ref.filter(r => r.verdict === 'refused-correctly').length} of 8` : 'not reached',
    held: held.length ? `${held.filter(r => r.tableFound).length} of 12` : 'not in this run',
    wrong: String(ran.filter(r => !['right', 'refused-correctly', 'answered-unchecked'].includes(r.verdict)).length),
    perMessage: money(cost / Math.max(1, ran.length)),
    cost: money(cost),
    asked: String(ran.length),
  }
}

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
].slice(0, R1 ? 4 : 5)

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
const REASONS2 = {
  q02: 'It summed each contract\'s award total on every one of its transactions, counting awards many times: $630.8M against $150.2M.',
  q03: 'It looked for New York by company and authority names, not by the code "NYIS": 24.9M MWh against 180M.',
  q04: 'It found the code "NYIS" this time, but counted sellers by FERC company id: 267 against 275, outside the 1 percent allowed.',
  q05: 'It wrote the class as "A47J31", without the "/00" the table uses, and found none.',
  q06: 'Its filter on the county name matched nothing, and it stopped there rather than checking how the county is written.',
  q07: 'It counted the entities updated in November 2026 (218), not every entity in the November extract (911,820).',
  q11: 'Counting 2025 alone hit the scan limit, so it refused; run 1 answered from the table\'s row count.',
  q14: 'It read the year as four digits; early years are two (75 for 1975): 955,246 against 1,872,406.',
  q30: 'The server let a count by year run, so it answered instead of saying the whole question is too large.',
  h02: 'It found no spending category called "Cancer" and said the data does not hold it.',
  h03: 'It found no reports dated 31 December 2025 and said the data stops earlier, without using the latest date it found.',
  h12: 'It found no 2025 rules and said the Federal Register data has not reached 2025.',
}
const SHORT = {
  q02: 'Plumbing contracts, total obligated, New York, FY2024–26', q03: 'Megawatt-hours sold into the New York ISO, 2025', q04: 'Sellers into the New York ISO, 2025',
  q05: 'Patents since 2016 in beverage-making class A47J31', q06: 'Contracting companies in Monroe County, FY2024–26', q07: 'Entities in the November 2026 SAM.gov extract',
  q11: 'Trademark applications in the 2025 annual files', q14: 'Fatal crashes, 1975 to 2024', q30: 'Every home-to-work flow, every block pair, 2002–2024',
  h02: 'NIH spending on cancer research, FY2024', h03: 'Largest banks in Ohio by assets, end of 2025', h12: 'Rules the EPA published in 2025',
}
/* what went wrong, by kind */
const missed = R.filter(r => !['right', 'refused-correctly', 'answered-unchecked'].includes(r.verdict) && !/cap reached/.test(r.error ?? ''))
const notRun = R.filter(r => /cap reached/.test(r.error ?? ''))
const checked = R.filter(r => r.expected && r.expected.value != null && !/cap reached/.test(r.error ?? ''))
const why = r => {
  if (R1 && REASONS2[r.id]) return REASONS2[r.id]
  if (!R1 && REASONS[r.id]) return REASONS[r.id]
  if (r.verdict === 'error') return `It failed: ${r.error}`
  if (r.verdict === 'should-have-refused') return r.kind === 'too-large' ? 'It answered a question that needs a scan past the limit, instead of saying so.' : 'It answered a question the library cannot answer, instead of saying so.'
  if (r.verdict === 'refused-wrongly') return 'It said it could not answer, though the library holds the answer.'
  if (r.verdict === 'no-query') return 'It answered without running a query.'
  if (r.tableFound === false) return `It used ${r.tables?.length ? r.tables.map(plainTable).join(', ') : 'no table'}, not the table that holds the answer.`
  return 'It ran a query on the right table, but the figure it gave does not match.'
}

const tile = (v, label) => `<div class="num"><b>${esc(v)}</b><span>${esc(label)}</span></div>`
const page = (n, body) => `<section class="page"><div class="mast"><b>NYSgpt</b><span>NOVEMBER 2026</span></div><div class="body">${body}</div><div class="foot"><span>NYSgpt.com</span><span>${n}</span></div></section>`

/* the cost section: on page 1 for one run, on page 2 when two runs share page 1 */
const COSTS = `<h2>What it costs</h2>
  ${R1 ? `<p>Run 1 cost $0.95 for 21 questions; run 2 cost ${money(S.cost)} for ${S.asked}. In run 1 a question answered with one query cost about $0.014, but a question that took three queries cost up to $0.14, because every turn sent the shown tables' fields to the model again (up to 134K tokens of input). Run 2's fix capped that: no message went past 40K tokens. But every message now starts with about 29K tokens of table fields, so the average fell only from $0.045 to $0.028. Showing fewer fields up front would bring it down further.</p>` : `<p>The run cost ${money(S.cost)} for ${S.asked - notRun.length} answered questions: ${money(S.costModel)} of model time on Claude Haiku 4.5 and ${money(S.costAthena)} of query scanning. A question answered with one query cost about $0.014. A question that took three queries cost $0.04 to $0.14, because every turn sends the shown tables' fields to the model again: 30K to 134K tokens of input. Fixing the column guessing above also cuts the cost.</p>`}`

const p1 = `
<h1>Chat over the library</h1><p class="sub">${R1 ? 'Overnight test • two runs' : `Overnight test • ${S.of} questions`} • ${new Date(S.at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
<p class="lead">The chat now finds the tables for a question among 6.7K, runs one read-only query through the Data Library API, and answers from the rows it gets back, naming the tables and showing the SQL.</p>
<p>${R1 ? 'I ran the chat twice overnight. ' : ''}I wrote ${R1 ? 30 : S.of} test questions: 22 the library can answer (15 with a figure taken from the library beforehand), 5 it cannot, and 3 that would need a scan too large to run. Answers were checked by comparison, not by a model.${R1 ? ' The model budget stopped run 1 after 21 questions, before the refusal tests. Run 2, after a fix to the cost, asked 12 new held-out questions (the test: does it find the right table), the 8 refusal tests and the 15 with a figure, and reached all 35. Run 2 did not repeat q16 to q22.' : notRun.length ? ` The night's model budget ran out after ${S.of - notRun.length} questions, so the last ${notRun.length}, among them all 8 refusal tests, did not run.` : ''}</p>
${R1 ? (() => { const a = metrics(R1.results), b = metrics(R); const row = (k, l) => `<tr><td class="k">${l}</td><td class="r">${a[k]}</td><td class="r">${b[k]}</td></tr>`; return `<table class="cmp"><colgroup><col style="width:60%"><col style="width:20%"><col style="width:20%"></colgroup><thead><tr><th></th><th class="r">Run 1</th><th class="r">Run 2</th></tr></thead><tbody>${row('checked', 'Checked figures right, within 1 percent')}${row('refusals', 'Refused where the library cannot answer')}${row('held', 'Held-out questions: right table found')}${row('wrong', 'Wrong, or refused though the library holds it')}${row('asked', 'Questions reached')}${row('perMessage', 'Average cost a message, model and query')}</tbody></table>` })() : ''}<div class="nums"${R1 ? ' style="display:none"' : ''}>${tile(`${checked.filter(r => r.verdict === 'right').length} of ${checked.length}`, 'checked figures right, within 1 percent')}${tile(String(missed.length), 'wrong, or refused though the library holds it')}${tile(`${S.tableFound} of ${S.tableExpected}`, 'questions where it used the right table')}${tile(money((S.costModel + S.costAthena) / Math.max(1, S.asked - notRun.length)), 'average cost a message, model and query')}</div>
<hr>
<h2>${R1 ? 'Four answers from run 2' : 'Five answers from the run'}</h2>
<table><colgroup><col style="width:36%"><col style="width:64%"></colgroup><thead><tr><th>Question</th><th>Answer, and the table it read</th></tr></thead><tbody>
${ex.map(r => `<tr><td class="q">${esc(r.question)}</td><td class="a">${esc(brief(r.answer))}<span class="t">${esc((r.tables ?? []).map(plainTable).join(', ') || 'catalog row count')}</span></td></tr>`).join('\n')}
</tbody></table>
${R1 ? '' : COSTS}`

const p2 = `
<h2>What it gets wrong, and why</h2>
<table class="tight"><colgroup><col style="width:36%"><col style="width:64%"></colgroup><thead><tr><th>Question</th><th>What happened</th></tr></thead><tbody>
${missed.slice(0, 12).map(r => `<tr><td class="q">${esc(R1 && SHORT[r.id] ? SHORT[r.id] : r.question)}</td><td class="a">${esc(why(r))}</td></tr>`).join('\n')}
</tbody></table>
${R1 ? COSTS : ''}
<h2>Before it is public</h2>
<table class="need"><colgroup><col style="width:30%"><col style="width:70%"></colgroup><tbody>
<tr><td class="k">Sign-in</td><td>The route answers only on the dev server today. Public use needs the reader signed in, so each message has an owner.</td></tr>
<tr><td class="k">Limits per reader</td><td>A daily message count and a daily scan budget per reader, enforced in the server, with the reader told how much is left.</td></tr>
<tr><td class="k">Its own key</td><td>The chat queries with a key made for it, with its own small limits, kept in the server's settings.</td></tr>
<tr><td class="k">The misses above</td><td>Better table finding for the questions it missed, and answers that run a query rather than reading the catalog's row count.</td></tr>
<tr><td class="k">More runs</td><td>The same questions and the held-out set, rerun after each fix, so a change that helps one question and hurts another shows (run 2 fixed q01 and lost q11).</td></tr>
</tbody></table>`

const css = readFileSync(join(homedir(), 'Code/NYSgpt/docs/sketches/2026-11-16-holdings-one-sheet.html'), 'utf8').match(/<style>([\s\S]*?)<\/style>/)[1]
const extra = `
td{white-space:normal}td.q{font-weight:600}td.a{font:400 9pt/1.42 'Source Serif 4',Georgia,serif}
td.a .t{display:block;margin-top:.03in;font:400 7.6pt/1.3 Inter,Helvetica,sans-serif;color:#6f6a5f}
.nums{margin:.14in 0 .1in}.num b{font-size:21pt}
table.need td{padding:.03in .1in .03in 0;font-size:8.8pt;line-height:1.36}
table.tight td.q{font-size:8.4pt;line-height:1.3}table.tight td.a{font-size:8.6pt;line-height:1.34}table.tight td{padding:.03in .1in .03in 0}
.page:nth-child(2) p{font-size:9.6pt;line-height:1.42;margin-bottom:.09in}
h2{margin-top:.12in}
table.cmp{margin:.12in 0 .06in}table.cmp td{white-space:nowrap}table.cmp td.r{font-weight:600}`
writeFileSync(OUT, `<!doctype html><html lang="en"><meta charset="utf-8"><title>NYSgpt: chat over the library</title><style>${css}${extra}</style><main>${page(1, p1)}${page(2, p2)}</main></html>\n`)
console.log(`wrote ${OUT} from ${RUN}`)
