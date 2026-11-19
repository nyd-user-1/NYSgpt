// Column profiles (brief 55 part 2, nysgpt-1): for each table the query API reaches, a profile of every column drawn
// from the catalog's 1,000-row sample (scripts/column-profiles.mjs writes public/profiles/<db>.<table>.json). Every
// figure describes the sample, not the whole table; `basis` says so in words a page can show. Browser-safe.

import { fig, type ColumnProfile as ExplorerColumn, type Kind as ExplorerKind } from '@/app/table-profile'

export type ColumnKind = 'number' | 'date' | 'text' | 'identifier' | 'yes/no' | 'empty' | 'hidden'
export type ColumnProfile = {
  name: string
  type: string
  kind: ColumnKind
  filled: number
  empty: number
  distinct?: number
  // numbers
  min?: number
  max?: number
  mean?: number
  sd?: number
  q1?: number
  median?: number
  q3?: number
  histogram?: { scale: 'linear' | 'log'; edges: number[]; counts: number[] }
  // dates
  earliest?: string
  latest?: string
  by?: 'year' | 'month'
  counts?: Record<string, number>
  // yes/no
  yes?: number
  no?: number
  // text and identifiers with few values; other text
  top?: { value: string; count: number }[]
  other?: number
  length?: { min: number; median: number; max: number }
  examples?: string[]
  note?: string
}
export type TableProfile = { table: string; basis: string; sampleRows: number; tableRows: number | null; columnsByKind: Partial<Record<ColumnKind, number>>; columns: ColumnProfile[] }

const cache = new Map<string, Promise<TableProfile | null>>()

/** A table's column profiles by its stored name (database.table), or null when it has no sample. */
export function loadProfile(stored: string): Promise<TableProfile | null> {
  if (!cache.has(stored))
    cache.set(
      stored,
      fetch(`/profiles/${encodeURIComponent(stored)}.json`)
        .then((r) => (r.ok ? (r.json() as Promise<TableProfile>) : null))
        .catch(() => null),
    )
  return cache.get(stored)!
}

// ---- the table explorer's shape (app/table-profile.ts), so its charts read the 1,000-row profile unchanged ----

const KIND: Record<ColumnKind, ExplorerKind> = { number: 'number', date: 'date', text: 'text', identifier: 'key', 'yes/no': 'yesno', empty: 'empty', hidden: 'text' }

/** A column profile in the explorer's shape: bins, ends, top values and statistics from the 1,000-row sample. */
export function explorerColumn(c: ColumnProfile): ExplorerColumn {
  const base: ExplorerColumn = { name: c.name, kind: KIND[c.kind], filled: c.filled, empty: c.empty, different: c.distinct ?? 0 }
  if (c.kind === 'number' && c.histogram && c.min != null && c.max != null) {
    const e = c.histogram.edges
    return {
      ...base,
      bins: c.histogram.counts.map((n, i) => ({ label: `${fig(e[i])} to ${fig(e[i + 1])}`, n })),
      ends: [fig(c.min), fig(c.max)],
      log: c.histogram.scale === 'log',
      stats: { mean: c.mean ?? 0, sd: c.sd ?? 0, min: c.min, q1: c.q1 ?? c.min, median: c.median ?? c.min, q3: c.q3 ?? c.max, max: c.max },
    }
  }
  if (c.kind === 'date' && c.counts && c.earliest && c.latest)
    return { ...base, bins: Object.keys(c.counts).sort().map((label) => ({ label, n: c.counts![label] })), ends: [c.earliest, c.latest] }
  if (c.kind === 'yes/no') return { ...base, top: [['yes', c.yes ?? 0], ['no', c.no ?? 0]] }
  if (c.top) return { ...base, top: c.top.map((t) => [t.value, t.count] as [string, number]) }
  return base
}

let names: Promise<Map<string, string> | null> | null = null
/** The stored name (database.table) of a table by its topic and plain name, from the scope picker's list. */
export function storedName(topic: string, plain: string): Promise<string | null> {
  names ??= fetch('/library-topics.json')
    .then((r) => (r.ok ? (r.json() as Promise<{ topic: string; tables: { stored: string; plain: string }[] }[]>) : null))
    .then((l) => (l ? new Map(l.flatMap((t) => t.tables.map((x) => [`${t.topic}|${x.plain}`, x.stored] as [string, string]))) : null))
    .catch(() => null)
  return names.then((m) => m?.get(`${topic}|${plain}`) ?? null)
}
