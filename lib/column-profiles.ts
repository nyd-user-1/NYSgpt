// Column profiles (brief 55 part 2, nysgpt-1): for each table the query API reaches, a profile of every column drawn
// from the catalog's 1,000-row sample (scripts/column-profiles.mjs writes public/profiles/<db>.<table>.json). Every
// figure describes the sample, not the whole table; `basis` says so in words a page can show. Browser-safe.

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
