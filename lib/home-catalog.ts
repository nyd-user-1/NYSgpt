'use client'

/**
 * The catalog the home page's overlay and side panel read (2026-11-19, brief
 * 43): a static copy in public/home-catalog/, written by a script from the
 * catalog files the option 3 sketch read off the Mac. catalog.json holds the
 * tables, their fields and one sample a field; samples/<n>.json holds up to
 * 20 sample rows a table for database n. Fetched once, when first needed.
 */

export type Field = { name: string; type: string; desc: string; sample: string }
export type Table = { database: string; table: string; rows: number | null; about: string; years: string; fields: Field[] }
export type Sample = { c: string[]; r: string[][]; n: number }

type Raw = { dbs: string[]; tables: { d: string; t: string; r: number | null; a: string; y: string; f: [string, string, string, string][] }[] }

let cat: Promise<{ dbs: string[]; tables: Table[] } | null> | null = null
const samples = new Map<number, Promise<Record<string, Sample> | null>>()

export function loadCatalog() {
  if (!cat)
    cat = fetch('/home-catalog/catalog.json')
      .then(r => (r.ok ? (r.json() as Promise<Raw>) : null))
      .then(j =>
        j
          ? {
              dbs: j.dbs,
              tables: j.tables.map(t => ({
                database: t.d,
                table: t.t,
                rows: t.r,
                about: t.a,
                years: t.y,
                fields: t.f.map(([name, type, desc, sample]) => ({ name, type, desc, sample })),
              })),
            }
          : null,
      )
      .catch(() => null)
  return cat
}

/** One table's sample rows, or null when none were shipped. */
export async function loadSample(t: Table): Promise<Sample | null> {
  const c = await loadCatalog()
  if (!c) return null
  const i = c.dbs.indexOf(t.database)
  if (i < 0) return null
  if (!samples.has(i))
    samples.set(
      i,
      fetch(`/home-catalog/samples/${i}.json`)
        .then(r => (r.ok ? (r.json() as Promise<Record<string, Sample>>) : null))
        .catch(() => null),
    )
  const s = await samples.get(i)!
  return s?.[t.table] ?? null
}

export const compactNum = (v: number) =>
  v >= 1e9 ? `${+(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${+(v / 1e3).toFixed(1)}K` : String(v)
