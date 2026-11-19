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
 *   OpenRouter           the 50 newest models on its public list (the list carries no usage ranking; no key needed)
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
/* The plate keys a box by its source and name, so a name appears once per source. A repeat is skipped: on the
   page, two boxes with one key left stray boxes behind and pushed the plate to a third row (2026-11-19). */
const taken = new Set()
const add = (kind, icon, { title, group, body, foot, facts }) => {
  const k = `${kind}:${title}`
  if (taken.has(k)) return false
  taken.add(k)
  out.boxes.push({ kind, title, group, body: sentence(clip(body)), foot: String(foot ?? ''), accent: '', icon })
  ;(out.info[kind] ??= []).push({ database: group, table: title, about: sentence(clip(body, 300)), fields: Object.entries(facts).filter(([, v]) => v != null && v !== '').map(([name, v]) => ({ name, desc: String(v) })) })
  return true
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
  const hf = 'https://huggingface.co'
  const task = t => (t ? t.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase()) : '')
  let n = 0
  // Models: top 100 by downloads in the last month
  for (const m of await getJson(`${hf}/api/models?sort=downloads&direction=-1&limit=100`))
    n += add('hf-models', 'cpu', {
      title: m.id,
      group: task(m.pipeline_tag) || 'Model',
      body: `${task(m.pipeline_tag) || 'Model'}, ${compact(m.downloads)} downloads in the last month, ${compact(m.likes)} likes`,
      foot: compact(m.downloads),
      facts: { Task: task(m.pipeline_tag), Downloads: m.downloads?.toLocaleString('en-US'), Likes: m.likes?.toLocaleString('en-US'), Library: m.library_name, Link: `${hf}/${m.id}` },
    })
  // Datasets: top 100 by downloads in the last month
  for (const d of await getJson(`${hf}/api/datasets?sort=downloads&direction=-1&limit=100`))
    n += add('hf-datasets', 'db', {
      title: d.id,
      group: 'Dataset',
      body: `${compact(d.downloads)} downloads in the last month, ${compact(d.likes)} likes`,
      foot: compact(d.downloads),
      facts: { Downloads: d.downloads?.toLocaleString('en-US'), Likes: d.likes?.toLocaleString('en-US'), Updated: (d.lastModified ?? '').slice(0, 10), Link: `${hf}/datasets/${d.id}` },
    })
  // Spaces: top 100 by likes
  for (const sp of await getJson(`${hf}/api/spaces?sort=likes&direction=-1&limit=100`))
    n += add('hf-spaces', 'layers', {
      title: sp.id,
      group: sp.sdk ? sp.sdk.replace(/^\w/, c => c.toUpperCase()) : 'Space',
      body: `${compact(sp.likes)} likes${sp.sdk ? `, built with ${sp.sdk}` : ''}`,
      foot: compact(sp.likes),
      facts: { Likes: sp.likes?.toLocaleString('en-US'), Built: sp.sdk, Updated: (sp.lastModified ?? '').slice(0, 10), Link: `${hf}/spaces/${sp.id}` },
    })
  // Papers: the 100 most upvoted of the recent daily papers
  const papers = (await getJson(`${hf}/api/daily_papers?limit=100`)).map(x => ({ ...x.paper, when: x.publishedAt })).filter(p => p.id && p.title)
  for (const p of papers.sort((x, y) => (y.upvotes ?? 0) - (x.upvotes ?? 0)).slice(0, 100))
    n += add('hf-papers', 'file', {
      title: p.title,
      group: 'Paper',
      body: p.ai_summary || p.summary || `${p.upvotes ?? 0} upvotes`,
      foot: String(p.upvotes ?? ''),
      facts: { Upvotes: p.upvotes, Published: (p.publishedAt ?? p.when ?? '').slice(0, 10), arXiv: p.id, Link: `${hf}/papers/${p.id}` },
    })
  return n
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
  // a repository belongs to the first group that lists it
  const ghTaken = new Set()
  for (const [group, topics] of Object.entries(GROUPS)) {
    const seen = new Map()
    for (const t of topics) {
      const raw = execFileSync('gh', ['api', '-X', 'GET', 'search/repositories', '-f', `q=topic:${t}`, '-f', 'sort=stars', '-f', 'order=desc', '-f', 'per_page=100'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      for (const r of JSON.parse(raw).items ?? []) if (!seen.has(r.full_name)) seen.set(r.full_name, r)
    }
    const ranked = [...seen.values()].sort((a, b) => b.stargazers_count - a.stargazers_count)
    let n = 0
    for (const r of ranked) {
      if (n >= 100) break
      if (ghTaken.has(r.full_name)) continue
      if (add(`gh-${group.toLowerCase()}`, { Skills: 'sparkles', Design: 'palette', API: 'braces', MCP: 'plug' }[group], {
        title: r.full_name,
        group,
        body: r.description || `${compact(r.stargazers_count)} stars`,
        foot: compact(r.stargazers_count),
        facts: { Stars: r.stargazers_count.toLocaleString('en-US'), Forks: r.forks_count?.toLocaleString('en-US'), Language: r.language, Licence: r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : '', Updated: (r.pushed_at ?? '').slice(0, 10), Link: r.html_url },
      })) {
        n++
        ghTaken.add(r.full_name)
      }
    }
    total += n
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

await run('OpenRouter', async () => {
  const j = await getJson('https://openrouter.ai/api/v1/models')
  const perM = v => (v != null && Number.isFinite(+v) ? +(+v * 1e6).toFixed(2) : null)
  const top = [...(j.data ?? [])].sort((a, b) => (b.created ?? 0) - (a.created ?? 0)).slice(0, 50)
  for (const m of top) {
    const [maker, ...rest] = String(m.name ?? m.id).split(': ')
    const pin = perM(m.pricing?.prompt)
    const pout = perM(m.pricing?.completion)
    add('openrouter', 'openrouter', {
      title: m.name ?? m.id,
      group: rest.length ? maker : String(m.id).split('/')[0],
      body: m.description || [m.context_length ? `${compact(m.context_length)} tokens of context` : '', pin != null ? `${pin} per million input tokens` : ''].filter(Boolean).join(', ') || 'Model',
      foot: m.context_length ? compact(m.context_length) : '',
      facts: { Id: m.id, 'Context length': m.context_length, 'Price per 1M input tokens': pin, 'Price per 1M output tokens': pout, Modality: m.architecture?.modality, Added: m.created ? new Date(m.created * 1000).toISOString().slice(0, 10) : '', Link: `https://openrouter.ai/${m.id}` },
    })
  }
  return top.length
})

/* the two brand marks not already in the icon set, from Simple Icons (CC0) */
const marks = {}
for (const slug of ['huggingface']) {
  try {
    const r = await fetch(`https://cdn.simpleicons.org/${slug}`, { headers: UA })
    const svg = await r.text()
    marks[slug] = /<path d="([^"]+)"/.exec(svg)?.[1] ?? ''
  } catch {
    marks[slug] = ''
  }
  console.log(`mark ${slug}: ${marks[slug].length} characters`)
}

marks.kaggle =
  'M18.825 23.859c-.022.092-.117.141-.281.141h-3.139c-.187 0-.351-.082-.492-.248l-5.178-6.589-1.448 1.374v5.111c0 .235-.117.352-.351.352H5.505c-.236 0-.354-.117-.354-.352V.353c0-.233.118-.353.354-.353h2.431c.234 0 .351.12.351.353v14.343l6.203-6.272c.165-.165.33-.246.495-.246h3.239c.144 0 .236.06.285.18.046.149.034.255-.036.315l-6.555 6.344 6.836 8.507c.095.104.117.208.07.336'
for (const k of [...new Set(out.boxes.map(b => b.kind))]) {
  const mine = out.boxes.filter(b => b.kind === k)
  if (mine.length % 2) out.boxes.splice(out.boxes.lastIndexOf(mine[mine.length - 1]), 1)
}
const dupes = out.boxes.length - new Set(out.boxes.map(b => `${b.kind}:${b.title}`)).size
if (dupes) throw new Error(`${dupes} boxes share a source and name`)
const banner = `/**
 * The home page boxes for the five outside sources. GENERATED by
 * scripts/home-sources.mjs on ${new Date().toISOString().slice(0, 10)}; do not edit by hand, run the script again.
 * Counts are as the sources reported them on that day.
 */
import type { Box, SetEntry, SourceKind } from './home-boxes'

export const SOURCE_MARKS: Record<string, string> = ${JSON.stringify(marks, null, 1)}

/* as text: 1,200 boxes written as a literal are more than the type checker will take */
export const SOURCE_BOXES: Box[] = JSON.parse(${JSON.stringify(JSON.stringify(out.boxes))})

export const SOURCE_INFO: Record<SourceKind, SetEntry[]> = ${JSON.stringify({ aa: [], kaggle: [], llmstats: [], openrouter: [], 'gh-skills': [], 'gh-design': [], 'gh-api': [], 'gh-mcp': [], 'hf-models': [], 'hf-datasets': [], 'hf-spaces': [], 'hf-papers': [], ...out.info }, null, 1)}
`
fs.writeFileSync('lib/home-sources.ts', banner)
const by = {}
for (const b of out.boxes) by[b.kind] = (by[b.kind] ?? 0) + 1
console.log('written lib/home-sources.ts', JSON.stringify(by), out.notes.length ? `NOTES: ${out.notes.join(' | ')}` : '')
