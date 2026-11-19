// findNames (brief 55, nysgpt-1): people, organisations and places named inside the records, for /search.
// Reads public/names/ (built by scripts/names-index.mjs): meta.json, one shard per name prefix, _current.json (members
// in office, for a query of office, state or party words alone) and _nicknames.json (an open list of English given-name
// nicknames, Apache 2.0, applied to the query so "chuck" also looks for Charles). Browser-safe; each file is fetched
// once and kept.

export type NameKind = 'congress' | 'legislator' | 'candidate' | 'judge' | 'committee' | 'agency' | 'contractor' | 'company' | 'court' | 'place' | 'plant' | 'utility' | 'college' | 'district' | 'hospital' | 'nonprofit' | 'assignee' | 'reactor'
export type NameLink = { stored: string; field: string; value: string; /** false when the query API does not serve the table */ open?: boolean }
export type NameEntry = { id: string; label: string; qualifier: string; kind: NameKind; kindLabel: string; color: string; forms: string[]; links: NameLink[] }

// a row: [label, kind, qualifier, forms or 0, links as [template, value], rank]; templates are [table, field, served] in meta
type Row = [string, number, string, string[] | 0, [number, string][], number]
type Meta = { kinds: { kind: NameKind; label: string; color: string; people: number; count: number }[]; links: [string, string, number][]; shards: string[]; split: string[] }

const BASE = '/names/'
const files = new Map<string, Promise<unknown>>()
const get = <T>(f: string): Promise<T | null> => {
  if (!files.has(f)) files.set(f, fetch(BASE + f).then((r) => (r.ok ? r.json() : null)).catch(() => null))
  return files.get(f) as Promise<T | null>
}

const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
// the index does not file entries under these words (scripts/names-index.mjs COMMON), so a query is filed by its other words
const COMMON = new Set('the of and for inc llc corp co company corporation ltd lp na assn association foundation fund trust services service group holdings international national american united states state county city school district college university hospital center centre committee pac to in on at by de la del los las new north south east west first us usa amp dba zip'.split(' '))
const STOP = new Set(['from', 'of', 'the', 'for', 'in', 'a', 'an', 'and', 'us', 'u', 's', 'who', 'is', 'mr', 'mrs', 'ms', 'dr'])
// office and party words narrow the results; each maps to the words (or starts of words) that show it in a qualifier
const OFFICE: Record<string, string[]> = { sen: ['senat'], senator: ['senat'], senate: ['senat'], rep: ['representative', 'house'], representative: ['representative', 'house'], congressman: ['representative', 'house'], congresswoman: ['representative', 'house'], congress: ['congress'], candidate: ['candidate'], judge: ['judge'], democrat: ['democrat'], democratic: ['democrat'], dem: ['democrat'], republican: ['republican'], gop: ['republican'], independent: ['independent'] }
const NAME_OF: Record<string, string> = {}
const ABBR_OF: Record<string, string> = { alabama: 'al', alaska: 'ak', arizona: 'az', arkansas: 'ar', california: 'ca', colorado: 'co', connecticut: 'ct', delaware: 'de', florida: 'fl', georgia: 'ga', hawaii: 'hi', idaho: 'id', illinois: 'il', indiana: 'in', iowa: 'ia', kansas: 'ks', kentucky: 'ky', louisiana: 'la', maine: 'me', maryland: 'md', massachusetts: 'ma', michigan: 'mi', minnesota: 'mn', mississippi: 'ms', missouri: 'mo', montana: 'mt', nebraska: 'ne', nevada: 'nv', 'new hampshire': 'nh', 'new jersey': 'nj', 'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd', ohio: 'oh', oklahoma: 'ok', oregon: 'or', pennsylvania: 'pa', 'rhode island': 'ri', 'south carolina': 'sc', 'south dakota': 'sd', tennessee: 'tn', texas: 'tx', utah: 'ut', vermont: 'vt', virginia: 'va', washington: 'wa', 'west virginia': 'wv', wisconsin: 'wi', wyoming: 'wy', 'district of columbia': 'dc', 'puerto rico': 'pr', guam: 'gu' }
for (const [name, abbr] of Object.entries(ABBR_OF)) NAME_OF[abbr] = name
const STATES = ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming', 'district of columbia', 'puerto rico', 'guam']
const ABBR = new Set('al ak az ar ca co ct de fl ga hi id il in ia ks ky la me md ma mi mn ms mo mt ne nv nh nj nm ny nc nd oh ok or pa ri sc sd tn tx ut vt va wa wv wi wy dc pr gu'.split(' '))

/** Splits a query into name words and the words that narrow by office, party or state. */
function parse(q: string) {
  const upper = new Set((q.match(/\b[A-Z]{2}\b/g) || []).map((x) => x.toLowerCase()))
  let s = ` ${norm(q)} `
  const states: string[] = []
  for (const st of [...STATES].sort((a, b) => b.length - a.length)) if (s.includes(` ${st} `)) { states.push(st); s = s.replace(` ${st} `, ' ') }
  const office: string[][] = []
  const names: string[] = []
  for (const w of s.trim().split(' ').filter(Boolean)) {
    if (STOP.has(w)) continue
    if (OFFICE[w]) office.push(OFFICE[w])
    // a two-letter state code counts only when typed in capitals ("NY"), so a name part like "de" or "or" is left alone
    else if (ABBR.has(w) && upper.has(w) && states.length === 0) states.push(NAME_OF[w] ?? w)
    else names.push(w)
  }
  return { names, office, states }
}

/** The shard that holds a word: the longest key that starts it (keys split down to five letters where a prefix is large). */
function keyFor(meta: Meta, w: string): string | null {
  const keys = new Set(meta.shards)
  for (let n = Math.min(5, w.length); n >= 2; n--) if (keys.has(w.slice(0, n))) return w.slice(0, n)
  return null
}

const toEntry = (meta: Meta, r: Row): NameEntry => {
  const k = meta.kinds[r[1]]
  const links = r[4].map(([t, value]) => { const [stored, field, open] = meta.links[t]; return { stored, field, value, ...(open === 0 ? { open: false } : {}) } })
  return { id: `${k.kind}:${links[0]?.value ?? r[0]}`, label: r[0], qualifier: r[2], kind: k.kind, kindLabel: k.label, color: k.color, forms: r[3] || [], links }
}

/** People, organisations and places for a query, best first. */
export async function findNames(query: string, limit = 8): Promise<NameEntry[]> {
  const meta = await get<Meta>('meta.json')
  if (!meta || norm(query).length < 2) return []
  const { names, office, states } = parse(query)
  let rows: Row[] = []
  const nick = names.length ? ((await get<Record<string, string[]>>('_nicknames.json')) ?? {}) : {}
  const alts = names.map((w) => [w, ...(nick[w] ?? [])])
  if (!names.length) rows = (await get<Row[]>('_current.json')) ?? []
  else {
    // the shard(s) of the longest name word, and of its nicknames
    const filed = alts.filter((g) => !COMMON.has(g[0]))
    const lead = (filed.length ? filed : alts).reduce((a, b) => (b[0].length > a[0].length ? b : a))
    const keys = [...new Set(lead.map((w) => keyFor(meta, w)).filter((k): k is string => !!k))]
    const got = await Promise.all(keys.map((k) => get<Row[]>(`${k}.json`)))
    const seen = new Set<string>()
    for (const list of got) for (const r of list ?? []) { const id = `${r[1]}|${r[0]}|${r[4][0]?.[1] ?? ''}`; if (!seen.has(id)) { seen.add(id); rows.push(r) } }
  }
  const scored: { r: Row; s: number }[] = []
  for (const r of rows) {
    const kind = meta.kinds[r[1]]
    const words = ` ${norm(`${r[0]} ${(r[3] || []).join(' ')}`)} `
    const quals = ` ${norm(`${r[2]} ${kind.label} ${r[0]}`)} `
    let s = r[5], ok = true
    for (const group of alts) {
      const w = group[0]
      if (words.includes(` ${w} `)) s += 20
      else if (words.includes(` ${w}`)) s += 10
      else if (kind.people && group.slice(1).some((n) => words.includes(` ${n} `))) s += 8
      else { ok = false; break }
    }
    for (const alt of office) {
      if (!ok) break
      if (alt.some((o) => quals.includes(` ${o}`))) s += 5
      else ok = false
    }
    for (const st of states) {
      if (!ok) break
      if (quals.includes(` ${st} `) || (ABBR_OF[st] && quals.includes(` ${ABBR_OF[st]} `))) s += 5
      else ok = false
    }
    if (!ok) continue
    if (quals.includes(' senator ')) s += 1
    scored.push({ r, s })
  }
  scored.sort((a, b) => b.s - a.s || a.r[0].localeCompare(b.r[0]))
  const out: NameEntry[] = [], shown = new Set<string>()
  for (const x of scored) {
    const key = `${x.r[1]}|${norm(x.r[0])}`
    if (shown.has(key)) continue
    shown.add(key)
    out.push(toEntry(meta, x.r))
    if (out.length >= limit) break
  }
  return out
}
