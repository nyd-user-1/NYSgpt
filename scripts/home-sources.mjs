#!/usr/bin/env node
/**
 * Builds lib/home-sources.ts: the home page boxes for the five outside sources
 * (Brendan, 2026-11-19). One box per item, all to one pattern:
 *
 *   Artificial Analysis  top 50 language models by its Intelligence Index
 *   GitHub               top 100 repositories by stars for each of: Skills, Design, API, MCP
 *   Hugging Face         top 100 models by downloads
 *   Kaggle               top 100 datasets by votes
 *   LLM Stats            top 50 benchmarks by the number of models scored
 *
 * Run from the repo root:  node scripts/home-sources.mjs
 * Keys: Artificial Analysis, LLM Stats and Kaggle read their keys from an env
 * file (default ~/Code/44b/.env.local; pass another path as the first
 * argument). GitHub uses the gh CLI's sign-in. Hugging Face needs no key.
 * Keys are never written to the output or printed.
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'child_process'

const envFile = process.argv[2] ?? path.join(os.homedir(), 'Code/44b/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envFile, 'utf8').split('\n').map(l => /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(l.trim())).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]),
)
const UA = { 'user-agent': 'NYSgpt-home-sources/1.0 (+https://nysgpt.com)' }

const compact = n => {
  if (n == null || !Number.isFinite(+n)) return ''
  const a = Math.abs(n)
  const f = (v, s) => `${+v.toFixed(v >= 100 ? 0 : 1)}${s}`
  return a >= 1e9 ? f(n / 1e9, 'B') : a >= 1e6 ? f(n / 1e6, 'M') : a >= 1e3 ? f(n / 1e3, 'K') : String(Math.round(n))
}
const clip = (s, n = 150) => {
  s = String(s ?? '').replace(/\s+/g, ' ').trim()
  return s.length > n ? `${s.slice(0, n - 1).replace(/[\s,;:.]+\S*$/, '')}…` : s
}
const sentence = s => (s && !/[.!?…]$/.test(s) ? `${s}.` : s)
const getJson = async (url, headers = {}) => {
  const r = await fetch(url, { headers: { accept: 'application/json', ...UA, ...headers } })
  if (!r.ok) throw new Error(`${new URL(url).host}${new URL(url).pathname} -> HTTP ${r.status}`)
  return r.json()
}

/** One box and its facts for the side panel and the overlay. */
const out = { boxes: [], info: {}, notes: [] }
const add = (kind, icon, { title, group, body, foot, facts }) => {
  out.boxes.push({ kind, title, group, body: sentence(clip(body)), foot: String(foot ?? ''), accent: '', icon })
  ;(out.info[kind] ??= []).push({ database: group, table: title, about: sentence(clip(body, 300)), fields: Object.entries(facts).filter(([, v]) => v != null && v !== '').map(([name, v]) => ({ name, desc: String(v) })) })
}
const run = async (name, fn) => {
  try {
    const n = await fn()
    console.log(`${name}: ${n} boxes`)
  } catch (e) {
    out.notes.push(`${name}: ${e.message}`)
    console.log(`${name}: FAILED: ${e.message}`)
  }
}

await run('Hugging Face', async () => {
  const models = await getJson('https://huggingface.co/api/models?sort=downloads&direction=-1&limit=100')
  for (const m of models) {
    const task = m.pipeline_tag ? m.pipeline_tag.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase()) : 'Model'
    add('hf', 'hf', {
      title: m.id,
      group: task,
      body: `${task}, ${compact(m.downloads)} downloads in the last month, ${compact(m.likes)} likes`,
      foot: compact(m.downloads),
      facts: { Task: task, Downloads: m.downloads?.toLocaleString('en-US'), Likes: m.likes?.toLocaleString('en-US'), Library: m.library_name, Link: `https://huggingface.co/${m.id}` },
    })
  }
  return models.length
})

await run('Kaggle', async () => {
  const key = env.KAGGLE_API_TOKEN
  if (!key) throw new Error('KAGGLE_API_TOKEN is not set')
  const all = []
  for (let page = 1; page <= 5 && all.length < 100; page++) {
    const list = await getJson(`https://www.kaggle.com/api/v1/datasets/list?sortBy=votes&page=${page}`, { authorization: `Bearer ${key}` })
    if (!Array.isArray(list) || !list.length) break
    all.push(...list)
  }
  for (const d of all.slice(0, 100)) {
    const votes = d.voteCount ?? d.totalVotes
    const dl = d.downloadCount ?? d.totalDownloads
    add('kaggle', 'kaggle', {
      title: d.title ?? d.ref,
      group: 'Dataset',
      body: d.subtitle || `${compact(votes)} votes, ${compact(dl)} downloads`,
      foot: compact(votes),
      facts: { Owner: d.ownerName ?? d.creatorName, Votes: votes?.toLocaleString('en-US'), Downloads: dl?.toLocaleString('en-US'), Size: d.totalBytes ? `${compact(d.totalBytes)}B` : '', Licence: d.licenseName, Updated: (d.lastUpdated ?? '').slice(0, 10), Link: d.url ?? (d.ref ? `https://www.kaggle.com/datasets/${d.ref}` : '') },
    })
  }
  return Math.min(all.length, 100)
})

await run('GitHub', async () => {
  // Each group: repositories carrying any of these topics, merged, top 100 by stars.
  const GROUPS = {
    Skills: ['claude-skills', 'agent-skills', 'claude-code-skills', 'skills'],
    Design: ['design-system', 'design', 'ui-design'],
    API: ['api', 'rest-api'],
    MCP: ['mcp', 'mcp-server', 'model-context-protocol'],
  }
  let total = 0
  for (const [group, topics] of Object.entries(GROUPS)) {
    const seen = new Map()
    for (const t of topics) {
      const raw = execFileSync('gh', ['api', '-X', 'GET', 'search/repositories', '-f', `q=topic:${t}`, '-f', 'sort=stars', '-f', 'order=desc', '-f', 'per_page=100'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      for (const r of JSON.parse(raw).items ?? []) if (!seen.has(r.full_name)) seen.set(r.full_name, r)
    }
    const top = [...seen.values()].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 100)
    for (const r of top)
      add('github', 'github', {
        title: r.full_name,
        group,
        body: r.description || `${compact(r.stargazers_count)} stars`,
        foot: compact(r.stargazers_count),
        facts: { Stars: r.stargazers_count.toLocaleString('en-US'), Forks: r.forks_count?.toLocaleString('en-US'), Language: r.language, Licence: r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : '', Updated: (r.pushed_at ?? '').slice(0, 10), Link: r.html_url },
      })
    total += top.length
  }
  return total
})

await run('Artificial Analysis', async () => {
  const key = env.Analysis_API_Key
  if (!key) throw new Error('Analysis_API_Key is not set')
  // The free list (the legacy /data/ address was retired on 4 Nov 2026), page by page.
  const data = []
  for (let page = 1; page <= 20; page++) {
    const j = await getJson(`https://artificialanalysis.ai/api/v2/language/models/free?page=${page}`, { 'x-api-key': key })
    if (page === 1) console.log('  Artificial Analysis pagination:', JSON.stringify(j.pagination))
    const fresh = (j.data ?? []).filter(m => !data.some(d => d.id === m.id))
    data.push(...fresh)
    const p = j.pagination ?? {}
    if (!fresh.length || p.has_more === false || (p.total_pages != null && page >= p.total_pages)) break
  }
  const idx = m => m.evaluations?.artificial_analysis_intelligence_index
  const models = data.filter(m => Number.isFinite(idx(m))).sort((a, b) => idx(b) - idx(a)).slice(0, 50)
  for (const m of models) {
    const maker = m.model_creator?.name ?? ''
    const pin = m.pricing?.price_1m_input_tokens
    const pout = m.pricing?.price_1m_output_tokens
    const price = pin != null && pout != null ? (3 * pin + pout) / 4 : null
    const speed = m.performance?.median_output_tokens_per_second
    add('aa', 'aa', {
      title: m.name,
      group: maker || 'Model',
      body: [maker, `Intelligence Index ${+idx(m).toFixed(1)}`, price != null ? `${+price.toFixed(2)} per million tokens (3 to 1 input to output)` : '', speed ? `${Math.round(speed)} tokens a second` : ''].filter(Boolean).join(', '),
      foot: String(+idx(m).toFixed(1)),
      facts: { Maker: maker, 'Intelligence Index': +idx(m).toFixed(1), 'Coding Index': m.evaluations?.artificial_analysis_coding_index, 'Price per 1M input tokens': pin != null ? `${pin}` : '', 'Price per 1M output tokens': pout != null ? `${pout}` : '', 'Output tokens a second': speed ? Math.round(speed) : '', Released: m.release_date, Link: m.slug ? `https://artificialanalysis.ai/models/${m.slug}` : 'https://artificialanalysis.ai' },
    })
  }
  return models.length
})

await run('LLM Stats', async () => {
  const key = env.LLM_STATS_API_KEY
  if (!key) throw new Error('LLM_STATS_API_KEY is not set')
  const j = await getJson('https://api.llm-stats.com/stats/v1/benchmarks', { authorization: `Bearer ${key}` })
  const list = j.benchmarks ?? []
  if (list[0]) console.log('  LLM Stats benchmark fields:', Object.keys(list[0]).join(', '))
  const count = b => b.model_count ?? b.models_count ?? b.num_models ?? b.score_count ?? b.scores_count ?? 0
  const top = [...list].sort((a, b) => count(b) - count(a)).slice(0, 50)
  for (const b of top) {
    const name = b.name ?? b.benchmark_id ?? b.id
    const cats = Array.isArray(b.categories) ? b.categories.join(', ') : (b.category ?? '')
    add('llmstats', 'llmstats', {
      title: name,
      group: (Array.isArray(b.categories) ? b.categories[0] : b.category) || 'Benchmark',
      body: b.description || [cats, count(b) ? `${count(b)} models scored` : ''].filter(Boolean).join(', ') || 'Benchmark',
      foot: count(b) ? String(count(b)) : '',
      facts: { Categories: cats, 'Models scored': count(b) || '', Modality: b.modality, 'Max score': b.max_score, Link: b.id ? `https://llm-stats.com/benchmarks/${b.id}` : 'https://llm-stats.com' },
    })
  }
  return top.length
})

/* the two brand marks not already in the icon set, from Simple Icons (CC0) */
const marks = {}
for (const slug of ['huggingface', 'kaggle']) {
  try {
    const r = await fetch(`https://cdn.simpleicons.org/${slug}`, { headers: UA })
    const svg = await r.text()
    marks[slug] = /<path d="([^"]+)"/.exec(svg)?.[1] ?? ''
  } catch {
    marks[slug] = ''
  }
  console.log(`mark ${slug}: ${marks[slug].length} characters`)
}

const banner = `/**
 * The home page boxes for the five outside sources. GENERATED by
 * scripts/home-sources.mjs on ${new Date().toISOString().slice(0, 10)}; do not edit by hand, run the script again.
 * Counts are as the sources reported them on that day.
 */
import type { Box, SetEntry } from './home-boxes'

export const SOURCE_MARKS: Record<string, string> = ${JSON.stringify(marks, null, 1)}

export const SOURCE_BOXES: Box[] = ${JSON.stringify(out.boxes, null, 1)}

export const SOURCE_INFO: Record<'aa' | 'github' | 'hf' | 'kaggle' | 'llmstats', SetEntry[]> = ${JSON.stringify({ aa: [], github: [], hf: [], kaggle: [], llmstats: [], ...out.info }, null, 1)}
`
fs.writeFileSync('lib/home-sources.ts', banner)
const by = {}
for (const b of out.boxes) by[b.kind] = (by[b.kind] ?? 0) + 1
console.log('written lib/home-sources.ts', JSON.stringify(by), out.notes.length ? `NOTES: ${out.notes.join(' | ')}` : '')
