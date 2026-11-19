#!/usr/bin/env node
/**
 * Builds lib/home-sources.ts: the home page boxes for the six outside sources
 * (Brendan, 2026-11-19; brief 59). One box per item, all to one pattern. Each
 * source is a masthead page of four cells, A to Z:
 *
 *   Artificial Analysis  Language: top 50 by its Intelligence Index; Image, Video, Speech: top 50 of each
 *                        arena by Elo (the free tier's media lists; Video has 40)
 *   GitHub               top 100 repositories by stars for each of: Skills, Design, API, MCP
 *   Hugging Face         top 100 models, datasets and spaces, and the 100 most upvoted recent papers
 *   Kaggle               top 100 datasets, notebooks and models by votes, and competitions by teams
 *   LLM Stats            top 50 benchmarks by models scored, the 100 newest models, the latest 100
 *                        scores, and its overall ranking (category general, top 50)
 *   OpenRouter           the 100 newest models (the list carries no usage ranking; no key needed), every
 *                        embedding model, every provider, and every model free to call
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
  const auth = { authorization: `Bearer ${key}` }
  const api = 'https://www.kaggle.com/api/v1'
  let total = 0
  // Datasets: top 100 by votes (20 a page)
  const sets = []
  for (let page = 1; page <= 6 && sets.length < 100; page++) {
    const list = await getJson(`${api}/datasets/list?sortBy=votes&page=${page}`, auth)
    if (!Array.isArray(list) || !list.length) break
    sets.push(...list)
  }
  for (const d of sets.slice(0, 100)) {
    const votes = d.voteCount ?? d.totalVotes
    const dl = d.downloadCount ?? d.totalDownloads
    total += add('kaggle-datasets', 'kaggle', {
      title: d.title ?? d.ref,
      group: 'Dataset',
      body: d.subtitle || `${compact(votes)} votes, ${compact(dl)} downloads`,
      foot: compact(votes),
      facts: { Owner: d.ownerName ?? d.creatorName, Votes: votes?.toLocaleString('en-US'), Downloads: dl?.toLocaleString('en-US'), Size: d.totalBytes ? `${compact(d.totalBytes)}B` : '', Licence: d.licenseName, Updated: (d.lastUpdated ?? '').slice(0, 10), Link: d.url ?? (d.ref ? `https://www.kaggle.com/datasets/${d.ref}` : '') },
    })
  }
  // Competitions: top 100 by number of teams. The general list holds only the open competitions (about 20), so the
  // community list (20 a page) is added and the two are ranked together.
  const comps = []
  for (const group of ['general', 'community'])
    for (let page = 1; page <= (group === 'general' ? 3 : 10); page++) {
      const list = await getJson(`${api}/competitions/list?sortBy=numberOfTeams&group=${group}&page=${page}`, auth)
      if (!Array.isArray(list) || !list.length) break
      comps.push(...list)
    }
  let nComp = 0
  for (const c of comps.sort((a, b) => (b.teamCount ?? 0) - (a.teamCount ?? 0))) {
    if (nComp >= 100) break
    nComp += add('kaggle-competitions', 'kaggle', {
      title: c.title,
      group: c.category || 'Competition',
      body: c.description || `${compact(c.teamCount)} teams`,
      foot: compact(c.teamCount),
      facts: { Host: c.organizationName, Category: c.category, Reward: c.reward, Teams: c.teamCount?.toLocaleString('en-US'), Metric: c.evaluationMetric, Deadline: (c.deadline ?? '').slice(0, 10), Link: c.url ?? c.ref },
    })
  }
  total += nComp
  // Notebooks: top 100 by votes
  const kernels = await getJson(`${api}/kernels/list?sortBy=voteCount&pageSize=100`, auth)
  for (const k of (Array.isArray(kernels) ? kernels : []).slice(0, 100))
    total += add('kaggle-notebooks', 'kaggle', {
      title: k.title,
      group: k.author || 'Notebook',
      body: `${k.author ? `By ${k.author}, ` : ''}${compact(k.totalVotes)} votes`,
      foot: compact(k.totalVotes),
      facts: { Author: k.author, Votes: k.totalVotes?.toLocaleString('en-US'), 'Last run': (k.lastRunTime ?? '').slice(0, 10), Link: k.ref ? `https://www.kaggle.com/code/${k.ref}` : '' },
    })
  // Models: top 100 by votes (50 a page, by page token)
  const models = []
  let token = ''
  for (let page = 0; page < 4 && models.length < 150; page++) {
    const j = await getJson(`${api}/models/list?sortBy=voteCount&pageSize=50${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`, auth)
    models.push(...(j.models ?? []))
    token = j.nextPageToken
    if (!token) break
  }
  let nModel = 0
  for (const m of models) {
    if (nModel >= 100) break
    nModel += add('kaggle-models', 'kaggle', {
      title: m.title,
      group: m.author || 'Model',
      body: m.subtitle || `${compact(m.voteCount)} votes`,
      foot: compact(m.voteCount),
      facts: { Author: m.author, Votes: m.voteCount?.toLocaleString('en-US'), Updated: (m.updateTime ?? '').slice(0, 10), Link: m.url ? (m.url.startsWith('http') ? m.url : `https://www.kaggle.com${m.url}`) : m.ref ? `https://www.kaggle.com/models/${m.ref}` : '' },
    })
  }
  total += nModel
  return total
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
  const auth = { 'x-api-key': key }
  const aa = 'https://artificialanalysis.ai'
  // The free tier allows 100 requests a day: the language list's pages and one request for each media list.
  const data = []
  for (let page = 1; page <= 20; page++) {
    const j = await getJson(`${aa}/api/v2/language/models/free?page=${page}`, auth)
    const fresh = (j.data ?? []).filter(m => !data.some(d => d.id === m.id))
    data.push(...fresh)
    const p = j.pagination ?? {}
    if (!fresh.length || p.has_more === false || (p.total_pages != null && page >= p.total_pages)) break
  }
  const idx = m => m.evaluations?.artificial_analysis_intelligence_index
  const models = data.filter(m => Number.isFinite(idx(m))).sort((a, b) => idx(b) - idx(a)).slice(0, 50)
  let total = 0
  // Language: top 50 by the Intelligence Index
  for (const m of models) {
    const maker = m.model_creator?.name ?? ''
    const pin = m.pricing?.price_1m_input_tokens
    const pout = m.pricing?.price_1m_output_tokens
    const price = pin != null && pout != null ? (3 * pin + pout) / 4 : null
    const speed = m.performance?.median_output_tokens_per_second
    total += add('aa-language', 'aa', {
      title: m.name,
      group: maker || 'Model',
      body: [maker, `Intelligence Index ${+idx(m).toFixed(1)}`, price != null ? `${+price.toFixed(2)} per million tokens (3 to 1 input to output)` : '', speed ? `${Math.round(speed)} tokens a second` : ''].filter(Boolean).join(', '),
      foot: String(+idx(m).toFixed(1)),
      facts: { Maker: maker, 'Intelligence Index': +idx(m).toFixed(1), 'Price per 1M input tokens': pin != null ? `${pin}` : '', 'Price per 1M output tokens': pout != null ? `${pout}` : '', 'Output tokens a second': speed ? Math.round(speed) : '', Released: m.release_date, Link: m.slug ? `${aa}/models/${m.slug}` : aa },
    })
  }
  // Image, Video, Speech: each arena's ranked models, top 50 by Elo
  for (const [kind, path, word] of [['aa-image', 'text-to-image', 'Text to image'], ['aa-video', 'text-to-video', 'Text to video'], ['aa-speech', 'text-to-speech', 'Text to speech']]) {
    const j = await getJson(`${aa}/api/v2/media/${path}/models/free`, auth)
    const ranked = (j.data ?? []).filter(m => Number.isFinite(m.elo)).sort((a, b) => b.elo - a.elo).slice(0, 50)
    ranked.forEach((m, i) => {
      const maker = m.model_creator?.name ?? ''
      total += add(kind, 'aa', {
        title: m.name,
        group: maker || word,
        body: [maker, `${word} arena Elo ${Math.round(m.elo)}${m.ci_95 != null ? ` (within ${m.ci_95} either way)` : ''}`, `rank ${i + 1}`].filter(Boolean).join(', '),
        foot: String(Math.round(m.elo)),
        facts: { Maker: maker, Arena: word, Elo: Math.round(m.elo), '95% interval': m.ci_95 != null ? `±${m.ci_95}` : '', Rank: i + 1, Link: `${aa}/${path}` },
      })
    })
  }
  return total
})

await run('LLM Stats', async () => {
  const key = env.LLM_STATS_API_KEY
  if (!key) throw new Error('LLM_STATS_API_KEY is not set')
  const auth = { authorization: `Bearer ${key}` }
  const api = 'https://api.llm-stats.com/stats/v1'
  const num = v => (v == null || !Number.isFinite(+v) ? '' : Math.abs(+v) >= 1000 ? compact(+v) : String(+(+v).toFixed(2)))
  let total = 0
  // Benchmarks: top 50 by the number of models scored
  const list = (await getJson(`${api}/benchmarks`, auth)).benchmarks ?? []
  const count = b => b.model_count ?? b.models_count ?? b.num_models ?? b.score_count ?? b.scores_count ?? 0
  for (const b of [...list].sort((a, b) => count(b) - count(a)).slice(0, 50)) {
    const name = b.name ?? b.benchmark_id ?? b.id
    const cats = Array.isArray(b.categories) ? b.categories.join(', ') : (b.category ?? '')
    total += add('llmstats-benchmarks', 'llmstats', {
      title: name,
      group: (Array.isArray(b.categories) ? b.categories[0] : b.category) || 'Benchmark',
      body: b.description || [cats, count(b) ? `${count(b)} models scored` : ''].filter(Boolean).join(', ') || 'Benchmark',
      foot: count(b) ? String(count(b)) : '',
      facts: { Categories: cats, 'Models scored': count(b) || '', Modality: b.modality, 'Max score': b.max_score, Link: b.id ? `https://llm-stats.com/benchmarks/${b.id}` : 'https://llm-stats.com' },
    })
  }
  // Models: the 100 most recently released (50 a page, by cursor)
  const models = []
  let cursor = ''
  for (let page = 0; page < 12; page++) {
    const j = await getJson(`${api}/models${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, auth)
    models.push(...(j.models ?? []))
    cursor = j.next_cursor
    if (!cursor || !(j.models ?? []).length) break
  }
  let nLm = 0
  for (const m of models.filter(m => m.name).sort((a, b) => String(b.release_date ?? '').localeCompare(String(a.release_date ?? '')))) {
    if (nLm >= 100) break
    const org = m.organization?.name ?? m.organization?.id ?? ''
    nLm += add('llmstats-models', 'llmstats', {
      title: m.name,
      group: org || 'Model',
      body: m.description || [org, m.release_date ? `released ${m.release_date}` : ''].filter(Boolean).join(', '),
      foot: m.param_count ? compact(m.param_count) : (m.release_date ?? '').slice(0, 7),
      facts: { Organization: org, Released: m.release_date, Parameters: m.param_count ? compact(m.param_count) : '', 'Context window': m.context_window ? compact(m.context_window) : '', 'Open weights': m.open_weight == null ? '' : m.open_weight ? 'Yes' : 'No', Licence: m.license, Link: m.url ?? 'https://llm-stats.com' },
    })
  }
  total += nLm
  // Scores: the latest 100 scores reported, one per model and benchmark (100 a page, by cursor)
  let nScore = 0
  let sc = ''
  for (let page = 0; page < 8 && nScore < 100; page++) {
    const j = await getJson(`${api}/scores${sc ? `?cursor=${encodeURIComponent(sc)}` : ''}`, auth)
    for (const s of j.scores ?? []) {
      if (nScore >= 100) break
      nScore += add('llmstats-scores', 'llmstats', {
      title: `${s.model_name} on ${s.benchmark_name}`,
      group: s.category ? s.category.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : 'Score',
      body: `${s.model_name} scored ${num(s.score)}${s.max_score != null ? ` of ${num(s.max_score)}` : ''} on ${s.benchmark_name}${s.verified ? ', verified' : s.is_self_reported ? ', reported by its maker' : ''}`,
      foot: num(s.score),
      facts: { Model: s.model_name, Benchmark: s.benchmark_name, Score: num(s.score), 'Max score': num(s.max_score), Verified: s.verified ? 'Yes' : 'No', 'Reported by its maker': s.is_self_reported ? 'Yes' : 'No', Scored: (s.scored_at ?? '').slice(0, 10), Link: s.url ?? 'https://llm-stats.com' },
      })
    }
    sc = j.next_cursor
    if (!sc) break
  }
  total += nScore
  // Rankings: its overall ranking (category general), top 50
  const rk = (await getJson(`${api}/rankings?category=general&limit=50`, auth)).models ?? []
  for (const r of rk)
    total += add('llmstats-rankings', 'llmstats', {
      title: r.model_name,
      group: r.organization ? r.organization.replace(/^\w/, c => c.toUpperCase()) : 'Model',
      body: `Rank ${r.rank} overall, rating ${num(r.conservative_rating)}, across ${r.benchmarks_evaluated} benchmarks${r.open_weight ? ', open weights' : ''}`,
      foot: `#${r.rank}`,
      facts: { Rank: r.rank, Rating: num(r.conservative_rating), 'Benchmarks evaluated': r.benchmarks_evaluated, 'Open weights': r.open_weight ? 'Yes' : 'No', 'Lowest input price per 1M tokens': r.min_input_price ?? '', Link: r.url ?? 'https://llm-stats.com' },
    })
  return total
})

await run('OpenRouter', async () => {
  const api = 'https://openrouter.ai/api/v1'
  const perM = v => (v != null && Number.isFinite(+v) ? +(+v * 1e6).toFixed(2) : null)
  const modelBox = (kind, m) => {
    const [maker, ...rest] = String(m.name ?? m.id).split(': ')
    const pin = perM(m.pricing?.prompt)
    const pout = perM(m.pricing?.completion)
    return add(kind, 'openrouter', {
      title: m.name ?? m.id,
      group: rest.length ? maker : String(m.id).split('/')[0],
      body: m.description || [m.context_length ? `${compact(m.context_length)} tokens of context` : '', pin != null ? `${pin} per million input tokens` : ''].filter(Boolean).join(', ') || 'Model',
      foot: m.context_length ? compact(m.context_length) : '',
      facts: { Id: m.id, 'Context length': m.context_length, 'Price per 1M input tokens': pin, 'Price per 1M output tokens': pout, Modality: m.architecture?.modality, Added: m.created ? new Date(m.created * 1000).toISOString().slice(0, 10) : '', Link: `https://openrouter.ai/${m.id}` },
    })
  }
  const all = [...((await getJson(`${api}/models`)).data ?? [])].sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
  let total = 0
  // Models: the 100 newest (the list carries no usage ranking)
  for (const m of all.slice(0, 100)) total += modelBox('or-models', m)
  // Embeddings: every embedding model
  for (const m of [...((await getJson(`${api}/embeddings/models`)).data ?? [])].sort((a, b) => (b.created ?? 0) - (a.created ?? 0))) total += modelBox('or-embeddings', m)
  // Providers: every provider, A to Z
  for (const p of [...((await getJson(`${api}/providers`)).data ?? [])].sort((a, b) => String(a.name).localeCompare(String(b.name)))) {
    const dcs = Array.isArray(p.datacenters) ? p.datacenters : []
    total += add('or-providers', 'openrouter', {
      title: p.name,
      group: p.headquarters || 'Provider',
      body: [p.headquarters ? `Headquartered in ${p.headquarters}` : '', dcs.length ? `data centres in ${dcs.join(', ')}` : ''].filter(Boolean).join(', ') || 'Provider',
      foot: p.headquarters ?? '',
      facts: { Headquarters: p.headquarters, 'Data centres': dcs.join(', '), 'Privacy policy': p.privacy_policy_url, Terms: p.terms_of_service_url, 'Status page': p.status_page_url, Link: p.slug ? `https://openrouter.ai/provider/${p.slug}` : 'https://openrouter.ai' },
    })
  }
  // Free: every model priced at zero for input and output, newest first
  for (const m of all.filter(m => +m.pricing?.prompt === 0 && +m.pricing?.completion === 0)) total += modelBox('or-free', m)
  return total
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
/* a source that fails must not wipe the others' boxes: nothing is written unless every source answered (brief 59) */
if (out.notes.length) {
  console.log(`NOT WRITTEN: ${out.notes.join(' | ')}`)
  process.exit(1)
}
const banner = `/**
 * The home page boxes for the six outside sources. GENERATED by
 * scripts/home-sources.mjs on ${new Date().toISOString().slice(0, 10)}; do not edit by hand, run the script again.
 * Counts are as the sources reported them on that day.
 */
import type { Box, SetEntry, SourceKind } from './home-boxes'

export const SOURCE_MARKS: Record<string, string> = ${JSON.stringify(marks, null, 1)}

/* as text: 1,200 boxes written as a literal are more than the type checker will take */
export const SOURCE_BOXES: Box[] = JSON.parse(${JSON.stringify(JSON.stringify(out.boxes))})

export const SOURCE_INFO: Record<SourceKind, SetEntry[]> = ${JSON.stringify({ ...Object.fromEntries(['aa-language', 'aa-image', 'aa-video', 'aa-speech', 'gh-skills', 'gh-design', 'gh-api', 'gh-mcp', 'hf-models', 'hf-datasets', 'hf-spaces', 'hf-papers', 'kaggle-datasets', 'kaggle-competitions', 'kaggle-notebooks', 'kaggle-models', 'llmstats-benchmarks', 'llmstats-models', 'llmstats-scores', 'llmstats-rankings', 'or-models', 'or-embeddings', 'or-providers', 'or-free'].map(k => [k, []])), ...out.info }, null, 1)}
`
fs.writeFileSync('lib/home-sources.ts', banner)
const by = {}
for (const b of out.boxes) by[b.kind] = (by[b.kind] ?? 0) + 1
console.log('written lib/home-sources.ts', JSON.stringify(by), out.notes.length ? `NOTES: ${out.notes.join(' | ')}` : '')
