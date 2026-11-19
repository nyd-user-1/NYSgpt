'use client'

/**
 * Blocks that carry a payload (brief 52, nysgpt-1): the pieces a website could be assembled from. A plain Block
 * points at a box; these five carry a typed object with them, kept with the shelf in this browser:
 *   design  Material Design 3's baseline tokens (lib/blocks-material.json, read from Google's published token files)
 *   table   one table: stored and plain name, what a row is, rows, years, fields, and the shipped sample rows
 *   api     the query API call for a table: endpoint, method, headers (key shown as YOUR_KEY), SQL, MCP address,
 *           and a sample response built from the same sample rows; never a real key
 *   page    a landing page as an ordered list of sections and what each binds to
 *   brief   what the site is for: name, purpose, audience, pages, tone (placeholder text, editable)
 * A model or a site builder could read these; nothing here renders a website.
 */

import MATERIAL from './blocks-material.json'
import { BOXES, type Box } from './home-boxes'
import { boxKey, getHome, home, type ShelfItem } from './home-store'
import { loadCatalog, loadSample } from './home-catalog'

export type BlockType = 'design' | 'table' | 'api' | 'page' | 'brief'
export type DesignPayload = typeof MATERIAL
export type TablePayload = {
  stored: string | null
  plain: string
  topic: string
  rowIs: string
  about: string
  rows: number | null
  years: string
  fields: { name: string; type: string; description: string }[]
  sample: { columns: string[]; rows: string[][] } | null
}
export type ApiPayload = {
  table: string | null
  plain: string
  endpoint: string
  method: 'POST'
  headers: Record<string, string>
  body: { sql: string }
  sql: string
  mcp: string
  sampleResponse: { columns: string[]; rows: string[][]; truncated: boolean; bytes_scanned: number | null }
}
export type PageSection = { type: 'header' | 'hero' | 'table' | 'figures' | 'footer'; label: string; binds: string }
export type PagePayload = { name: string; sections: PageSection[] }
export type BriefPayload = { siteName: string; purpose: string; audience: string; pages: string; tone: string }
export type Payload = DesignPayload | TablePayload | ApiPayload | PagePayload | BriefPayload

export const ENDPOINT = 'https://data.nysgpt.com/query'
export const MCP = 'https://data.nysgpt.com/mcp'

/** The three demo blocks with fixed payloads, by their box keys (lib/home-boxes.ts BLOCK_BOXES). */
export const DEMO: Record<string, { type: BlockType; payload: () => Payload }> = {
  'design:Material Design 3': { type: 'design', payload: () => MATERIAL },
  'page:Landing page': {
    type: 'page',
    payload: (): PagePayload => ({
      name: 'Landing page',
      sections: [
        { type: 'header', label: 'Header', binds: 'brief: site name' },
        { type: 'hero', label: 'Hero', binds: 'brief: one-line purpose' },
        { type: 'table', label: 'Table section', binds: 'a table block' },
        { type: 'figures', label: 'Live figures', binds: 'an API block' },
        { type: 'footer', label: 'Footer', binds: 'brief: site name and pages' },
      ],
    }),
  },
  'brief:Site brief': {
    type: 'brief',
    payload: (): BriefPayload => ({
      siteName: '[Placeholder: the site’s name]',
      purpose: '[Placeholder: what the site is for, in one line]',
      audience: '[Placeholder: who it is for]',
      pages: '[Placeholder: the pages wanted, for example Home, Data, About]',
      tone: '[Placeholder: how it should read, for example plain and direct]',
    }),
  },
}

/** Whether a shelf item carries a payload to show (a stored one, a demo block, an API block). */
export const hasPayload = (s: Pick<ShelfItem, 'key' | 'set' | 'payload'>) => !!s.payload || !!DEMO[s.key] || s.set === 'api'

/** What kind of payload a shelf item carries, or null for a plain Block. */
export function blockType(s: Pick<ShelfItem, 'key' | 'set'> & { type?: string }): BlockType | null {
  if (s.type) return s.type as BlockType
  if (DEMO[s.key]) return DEMO[s.key].type
  if (s.set === 'tables') return 'table'
  return null
}

type Stored = Record<string, { stored: string; rowIs: string; fields: [string, string, string][] }>
let storedP: Promise<Stored | null> | null = null
const loadStored = () => (storedP ??= fetch('/blocks/stored.json').then(r => (r.ok ? (r.json() as Promise<Stored>) : null)).catch(() => null))

/** A Tables box's payload: the catalog's table, its stored name and fields from the reconciled catalog, its sample rows. */
export async function tablePayload(b: Pick<Box, 'title' | 'group'>): Promise<TablePayload> {
  const [cat, st] = await Promise.all([loadCatalog(), loadStored()])
  const t = cat?.tables.find(x => x.database === b.group && x.table === b.title) ?? null
  const s = st?.[`${b.group}|${b.title}`]
  const sample = t ? await loadSample(t) : null
  const fields = s?.fields.length
    ? s.fields.map(([name, type, description]) => ({ name, type, description }))
    : (t?.fields ?? []).map(f => ({ name: f.name, type: f.type, description: f.desc }))
  return {
    stored: s?.stored ?? null,
    plain: b.title,
    topic: b.group,
    rowIs: s?.rowIs ?? '',
    about: t?.about ?? '',
    rows: t?.rows ?? null,
    years: t?.years ?? '',
    fields,
    sample: sample ? { columns: sample.c, rows: sample.r } : null,
  }
}

/** The query API call for a table, with a sample response from the shipped rows. The key is always YOUR_KEY. */
export function apiPayload(t: TablePayload): ApiPayload {
  const cols = t.sample?.columns.slice(0, 6) ?? t.fields.slice(0, 6).map(f => f.name)
  const sql = `SELECT ${cols.length ? cols.join(', ') : '*'} FROM ${t.stored ?? '<database.table>'} LIMIT 10`
  return {
    table: t.stored,
    plain: t.plain,
    endpoint: ENDPOINT,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': 'YOUR_KEY' },
    body: { sql },
    sql,
    mcp: `${MCP}?key=YOUR_KEY`,
    sampleResponse: {
      columns: cols,
      rows: (t.sample?.rows ?? []).slice(0, 10).map(r => cols.map(c => r[t.sample!.columns.indexOf(c)] ?? '')),
      truncated: false,
      bytes_scanned: null,
    },
  }
}

const tableBox = (title: string) => BOXES.find(b => b.kind === 'tables' && b.title === title)

/** Adds a Tables box to Blocks as a table block, with its payload. Returns the block's key. */
export async function addTableBlock(b: Box): Promise<string> {
  const key = boxKey(b)
  const payload = await tablePayload(b)
  home.addBlock({ key, title: b.title, set: 'tables', group: b.group, type: 'table', payload })
  return key
}

/** Adds the API block for a Tables box (a second block beside its table block). Returns the block's key. */
export async function addApiBlock(b: Box): Promise<string> {
  const key = `api:${b.title}`
  const payload = apiPayload(await tablePayload(b))
  home.addBlock({ key, title: `${b.title} API`, set: 'api', group: b.group, type: 'api', payload })
  return key
}

/** A block's payload: stored with it, or (for a demo block, or a table added before payloads) made now. */
export async function payloadOf(s: ShelfItem): Promise<Payload | null> {
  if (s.payload) return s.payload as Payload
  if (DEMO[s.key]) return DEMO[s.key].payload()
  if (s.set === 'tables') {
    const b = tableBox(s.title)
    return b ? tablePayload(b) : null
  }
  return null
}

/** A block as plain text, for the chat to hand the model (attached blocks). */
export async function blockText(s: ShelfItem): Promise<string> {
  const type = blockType(s)
  const p = await payloadOf(s)
  if (!type || !p) return `Block: ${s.title} (${s.set})`
  if (type === 'design') {
    const d = p as DesignPayload
    const roles = Object.entries(d.typescale).map(([k, v]) => `${k} ${v.size}/${v.lineHeight} ${v.weight}`).join('; ')
    return [`Design system: ${d.name} (${d.publisher}, ${d.licence.name}; ${d.source.repository} at ${d.source.commit.slice(0, 7)}).`, `Light colours: ${Object.entries(d.color.light).map(([k, v]) => `${k} ${v}`).join(', ')}.`, `Dark colours: ${Object.entries(d.color.dark).map(([k, v]) => `${k} ${v}`).join(', ')}.`, `Typeface: ${d.typeface.brand}. Type scale: ${roles}.`, `Shape: ${Object.entries(d.shape).map(([k, v]) => `${k} ${v}`).join(', ')}.`, `Elevation: ${Object.entries(d.elevation).map(([k, v]) => `${k} ${v}`).join(', ')}.`, `Motion: ${Object.entries(d.motion).map(([k, v]) => `${k} ${v}`).join(', ')}.`].join('\n')
  }
  if (type === 'table') {
    const t = p as TablePayload
    return [`Table: ${t.plain} (${t.stored ?? 'stored name unknown'}), topic ${t.topic}; ${t.rows ?? '?'} rows${t.years ? `, ${t.years}` : ''}.`, t.rowIs && `One row is ${t.rowIs}.`, `Fields: ${t.fields.map(f => `${f.name} ${f.type}${f.description ? ` (${f.description})` : ''}`).join('; ')}.`].filter(Boolean).join('\n')
  }
  if (type === 'api') {
    const a = p as ApiPayload
    return `API block for ${a.plain}: ${a.method} ${a.endpoint} with header X-Api-Key: YOUR_KEY and body ${JSON.stringify(a.body)}. MCP: ${a.mcp}.`
  }
  if (type === 'page') {
    const g = p as PagePayload
    return `Page: ${g.name}. Sections in order: ${g.sections.map(x => `${x.label} (binds ${x.binds})`).join('; ')}.`
  }
  const b = p as BriefPayload
  return `Site brief: name ${b.siteName}; purpose ${b.purpose}; audience ${b.audience}; pages ${b.pages}; tone ${b.tone}.`
}

/** The brief block's fields, edited in the panel and kept with the block. */
export function saveBrief(key: string, payload: BriefPayload) {
  const s = getHome().shelf.find(x => x.key === key)
  if (s) home.setPayload(key, payload)
}
