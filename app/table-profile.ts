/**
 * Column profiles for the table explorer (brief 56, 2026-11-19): what each column of a table's sample rows holds,
 * for the Detail headers, the Columns view and the summary. Computed in the browser from the sample rows the
 * site ships (20 a table) until the catalog's 1,000-row profiles have a loader; every figure describes the
 * sample rows only, never the whole table.
 *
 * A column's kind comes from its values (many tables store every field as text): yes or no (two values like
 * t/f), dates, numbers, keys (identifiers: a key-like name, or nearly every value different), text, or empty.
 */

export type Kind = 'number' | 'date' | 'text' | 'key' | 'yesno' | 'empty'
export type Bin = { label: string; n: number }
export type Stats = { mean: number; sd: number; min: number; q1: number; median: number; q3: number; max: number }
export type ColumnProfile = {
  name: string
  kind: Kind
  /** rows in the sample with a value, rows without, and the number of different values */
  filled: number
  empty: number
  different: number
  /** numbers and dates: the histogram, its ends, and whether the bins are on a log scale */
  bins?: Bin[]
  ends?: [string, string]
  log?: boolean
  /** text, keys and yes or no: the values, most common first */
  top?: [string, number][]
  stats?: Stats
}

export const KIND_LABEL: Record<Kind, string> = { number: 'Number', date: 'Date', text: 'Text', key: 'Key', yesno: 'Yes or no', empty: 'Empty' }

const MONTHS: Record<string, string> = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' }

/** Compact figures: 304K, 9.1M; whole numbers under 10,000 in full. */
export const fig = (v: number) => {
  const a = Math.abs(v)
  if (a >= 1e12) return `${+(v / 1e12).toFixed(1)}T`
  if (a >= 1e9) return `${+(v / 1e9).toFixed(1)}B`
  if (a >= 1e6) return `${+(v / 1e6).toFixed(1)}M`
  if (a >= 1e4) return `${+(v / 1e3).toFixed(1)}K`
  if (a >= 100 || Number.isInteger(v)) return Math.round(v).toLocaleString('en-US')
  if (a >= 1) return String(+v.toFixed(2))
  return String(+v.toPrecision(2))
}
export const share = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : '0%')

const num = (s: string) => {
  const t = s.replace(/[$,%\s]/g, '')
  return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? Number(t) : NaN
}

/** A date as "YYYY-MM-DD" (day 01 when only the month is known), from 2025-06-10, 20250610, 06/10/2025 or 10-JUN-2025. */
const day = (s: string): string | null => {
  let y = '', m = '', d = '01'
  let a = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(s)
  if (a) [, y, m, d = '01'] = a
  else if ((a = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s))) [y, m, d] = [a[3], a[1].padStart(2, '0'), a[2].padStart(2, '0')]
  else if ((a = /^(\d{1,2})[- ]?([A-Za-z]{3})[- ]?(\d{4})/.exec(s)) && MONTHS[a[2].toUpperCase()]) [y, m, d] = [a[3], MONTHS[a[2].toUpperCase()], a[1].padStart(2, '0')]
  else if ((a = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) [, y, m, d] = a
  else return null
  const Y = Number(y), M = Number(m)
  return Y >= 1600 && Y <= 2100 && M >= 1 && M <= 12 ? `${y}-${m}-${d}` : null
}

const KEY_NAME = /(^id$|_id$|_key$|_uei$|_duns$|piid|_code$|_number$|^uuid|_uuid$)/i

function dateBins(days: string[]): { bins: Bin[]; ends: [string, string] } {
  const sorted = [...days].sort()
  const years = sorted.map(x => Number(x.slice(0, 4)))
  const byMonth = years[years.length - 1] - years[0] < 3
  const key = (x: string) => (byMonth ? x.slice(0, 7) : x.slice(0, 4))
  const count = new Map<string, number>()
  for (const x of sorted) count.set(key(x), (count.get(key(x)) ?? 0) + 1)
  const all: string[] = []
  if (byMonth) {
    let [y, mo] = key(sorted[0]).split('-').map(Number)
    const end = key(sorted[sorted.length - 1])
    for (let i = 0; i < 48; i++) {
      const k = `${y}-${String(mo).padStart(2, '0')}`
      all.push(k)
      if (k === end) break
      if (++mo > 12) {
        mo = 1
        y++
      }
    }
    return { bins: all.map(k => ({ label: k, n: count.get(k) ?? 0 })), ends: [sorted[0], sorted[sorted.length - 1]] }
  }
  const a = years[0], b = years[years.length - 1]
  const step = Math.max(1, Math.ceil((b - a + 1) / 30))
  const bins: Bin[] = []
  for (let y = a; y <= b; y += step) {
    let n = 0
    for (let k = y; k < y + step; k++) n += count.get(String(k)) ?? 0
    bins.push({ label: step > 1 ? `${y} to ${y + step - 1}` : String(y), n })
  }
  return { bins, ends: [sorted[0], sorted[sorted.length - 1]] }
}

function numberBins(n: number[]): { bins: Bin[]; ends: [string, string]; log: boolean } {
  const lo = n[0], hi = n[n.length - 1]
  const nonzero = n.map(Math.abs).filter(x => x > 0)
  // a span of a thousandfold or more is binned on a signed log scale, so one huge value does not flatten the rest
  const log = nonzero.length > 1 && Math.max(...nonzero) / Math.max(Math.min(...nonzero), 1) >= 1000
  const f = (v: number) => (log ? Math.sign(v) * Math.log10(1 + Math.abs(v)) : v)
  const g = (y: number) => (log ? Math.sign(y) * (10 ** Math.abs(y) - 1) : y)
  const B = Math.min(12, Math.max(4, Math.ceil(Math.sqrt(n.length)) + 2))
  const a = f(lo), w = (f(hi) - a) / B || 1
  const bins: Bin[] = Array.from({ length: B }, (_, i) => ({ label: `${fig(g(a + i * w))} to ${fig(g(a + (i + 1) * w))}`, n: 0 }))
  for (const v of n) bins[Math.min(B - 1, Math.max(0, Math.floor((f(v) - a) / w)))].n++
  return { bins, ends: [fig(lo), fig(hi)], log }
}

export function profileColumn(name: string, col: (string | null | undefined)[]): ColumnProfile {
  const rows = col.length
  const vals = col.map(v => String(v ?? '').trim()).filter(v => v !== '' && v.toLowerCase() !== 'null')
  const filled = vals.length
  const distinct = new Map<string, number>()
  for (const v of vals) distinct.set(v, (distinct.get(v) ?? 0) + 1)
  const base = { name, filled, empty: rows - filled, different: distinct.size }
  if (!filled) return { ...base, kind: 'empty' }
  const top = [...distinct.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  if (distinct.size <= 2 && [...distinct.keys()].every(v => /^(t|f|true|false|y|n|yes|no)$/i.test(v))) return { ...base, kind: 'yesno', top }

  const days = vals.map(day)
  if (days.filter(Boolean).length >= filled * 0.8) return { ...base, kind: 'date', ...dateBins(days.filter(Boolean) as string[]) }

  const nums = vals.map(num)
  if (nums.filter(Number.isFinite).length >= filled * 0.8 && !KEY_NAME.test(name) && distinct.size > 2) {
    const n = nums.filter(Number.isFinite).sort((a, b) => a - b)
    const mean = n.reduce((s, v) => s + v, 0) / n.length
    const sd = Math.sqrt(n.reduce((s, v) => s + (v - mean) ** 2, 0) / n.length)
    const q = (p: number) => {
      const i = p * (n.length - 1), lo = Math.floor(i)
      return n[lo] + (n[Math.min(n.length - 1, lo + 1)] - n[lo]) * (i - lo)
    }
    return { ...base, kind: 'number', ...numberBins(n), stats: { mean, sd, min: n[0], q1: q(0.25), median: q(0.5), q3: q(0.75), max: n[n.length - 1] } }
  }

  const isKey = KEY_NAME.test(name) || (filled >= 5 && distinct.size >= filled * 0.9 && vals.every(v => v.length <= 64 && !/\s{1}\S+\s\S+\s/.test(v)))
  return { ...base, kind: isKey ? 'key' : 'text', top }
}

/** Every column of a sample, profiled. */
export const profileSample = (s: { c: string[]; r: (string | null)[][] }) => s.c.map((c, j) => profileColumn(c, s.r.map(r => r[j])))

/** A column with at least half its sample rows empty gets the warning. */
export const mostlyEmpty = (p: ColumnProfile) => p.kind !== 'empty' && p.empty * 2 >= p.filled + p.empty
