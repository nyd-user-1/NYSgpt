// findNames (brief 55, nysgpt-1): people, organisations and places named inside the records, for /search.
// Reads public/names/ (built by scripts/names-index.mjs): meta.json, one shard per name prefix, _current.json (members
// in office, for a query of office, state or party words alone) and _nicknames.json (an open list of English given-name
// nicknames, Apache 2.0, applied to the query so "chuck" also looks for Charles). Browser-safe; each file is fetched
// once and kept.

export type NameKind = 'congress' | 'candidate' | 'committee' | 'agency' | 'contractor' | 'company' | 'judge' | 'court' | 'place' | 'plant' | 'utility' | 'college' | 'district' | 'hospital' | 'nonprofit' | 'assignee' | 'reactor'
export type NameLink = { stored: string; field: string; value: string; /** false when the query API does not serve the table */ open?: boolean }
export type NameEntry = { id: string; label: string; qualifier: string; kind: NameKind; kindLabel: string; color: string; forms: string[]; links: NameLink[] }

type Row = [string, string, number, string, string[], [string, string, string, number?][], string, number]
type Meta = { kinds: { kind: NameKind; label: string; color: string; count: number }[]; shards: string[]; split: string[] }

const BASE = '/names/'
const files = new Map<string, Promise<unknown>>()
const get = <T>(f: string): Promise<T | null> => {
  if (!files.has(f)) files.set(f, fetch(BASE + f).then((r) => (r.ok ? r.json() : null)).catch(() => null))
  return files.get(f) as Promise<T | null>
}

const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const STOP = new Set(['from', 'of', 'the', 'for', 'in', 'a', 'an', 'and', 'us', 'u', 's', 'who', 'is', 'mr', 'mrs', 'ms', 'dr'])
const OFFICE: Record<string, string> = { sen: 'senator', senator: 'senator', senate: 'senator', rep: 'representative', representative: 'representative', congressman: 'representative', congresswoman: 'representative', house: 'representative', congress: 'congress', candidate: 'candidate', democrat: 'democrat', democratic: 'democrat', dem: 'democrat', republican: 'republican', gop: 'republican', independent: 'independent' }
const STATES = ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming', 'district of columbia', 'puerto rico', 'guam']
const ABBR = new Set('al ak az ar ca co ct de fl ga hi id il in ia ks ky la me md ma mi mn ms mo mt ne nv nh nj nm ny nc nd oh ok or pa ri sc sd tn tx ut vt va wa wv wi wy dc pr gu'.split(' '))

/** Splits a query into name words and the words that narrow by office, party or state. */
function parse(q: string) {
  let s = ` ${norm(q)} `
  const states: string[] = []
  for (const st of [...STATES].sort((a, b) => b.length - a.length)) if (s.includes(` ${st} `)) { states.push(st); s = s.replace(` ${st} `, ' ') }
  const office: string[] = []
  const names: string[] = []
  for (const w of s.trim().split(' ').filter(Boolean)) {
    if (STOP.has(w)) continue
    if (OFFICE[w]) office.push(OFFICE[w])
    else if (ABBR.has(w) && w.length === 2 && (states.length === 0)) states.push(w)
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
  const k = meta.kinds[r[2]]
  return { id: r[0], label: r[1], qualifier: r[3], kind: k.kind, kindLabel: k.label, color: k.color, forms: r[4], links: r[5].map(([stored, field, value, open]) => ({ stored, field, value, ...(open === 0 ? { open: false } : {}) })) }
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
    const lead = alts.reduce((a, b) => (b[0].length > a[0].length ? b : a))
    const keys = [...new Set(lead.map((w) => keyFor(meta, w)).filter((k): k is string => !!k))]
    const got = await Promise.all(keys.map((k) => get<Row[]>(`${k}.json`)))
    const seen = new Set<string>()
    for (const list of got) for (const r of list ?? []) if (!seen.has(r[0])) { seen.add(r[0]); rows.push(r) }
  }
  const scored: { r: Row; s: number }[] = []
  for (const r of rows) {
    const [wordsPart, qualPart] = r[6].split('|')
    const words = ` ${wordsPart} `, quals = ` ${qualPart} `
    let s = r[7], ok = true
    alts.forEach((group, i) => {
      if (!ok) return
      const w = group[0]
      if (words.includes(` ${w} `)) s += 20
      else if (words.includes(` ${w}`)) s += 10
      else if (group.slice(1).some((n) => words.includes(` ${n} `))) s += 8
      else ok = false
      void i
    })
    for (const o of office) {
      if (!ok) break
      if (quals.includes(` ${o}`)) s += 5
      else ok = false
    }
    for (const st of states) {
      if (!ok) break
      if (quals.includes(` ${st} `)) s += 5
      else ok = false
    }
    if (!ok) continue
    if (quals.includes(' senator ')) s += 1
    scored.push({ r, s })
  }
  scored.sort((a, b) => b.s - a.s || a.r[1].localeCompare(b.r[1]))
  return scored.slice(0, limit).map((x) => toEntry(meta, x.r))
}
