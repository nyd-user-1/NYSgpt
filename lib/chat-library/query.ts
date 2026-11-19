import "server-only"

// The chat's one way into the library (brief 49): the Data Library query API (data.nysgpt.com/query), with the
// chat's own key (NYSGPT_CHAT_QUERY_KEY, in .env.local on the dev box, never in the repository). The API already
// refuses writes, the closed databases and a scan over the key's byte limit; these guards sit in front of it, in
// the server, whatever the model writes:
//   - one statement, SELECT or WITH only;
//   - a LIMIT of at most 200 rows, added when missing and lowered when higher;
//   - 60 seconds a query;
//   - the model sees at most 50 rows back.

const API = process.env.NYSGPT_QUERY_API ?? "https://data.nysgpt.com"
export const ROW_LIMIT = 200
export const ROWS_TO_MODEL = 50
const TIMEOUT_MS = 60_000

export type QueryResult =
  | { ok: true; sql: string; columns: string[]; rows: (string | null)[][]; rowCount: number; truncated: boolean; bytes: number; ms: number }
  | { ok: false; sql: string; error: string; tooLarge: boolean; bytes: number; ms: number }

/** The statement as the server will run it, or why it will not run. */
export function guardSql(raw: string): { sql: string } | { error: string } {
  const s = (raw ?? "").replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, " ").trim().replace(/;+\s*$/, "").trim()
  if (!s) return { error: "No SQL was given." }
  if (s.includes(";")) return { error: "One statement only." }
  if (!/^(select|with)\b/i.test(s)) return { error: "Only SELECT (or WITH … SELECT) statements run here." }
  if (/\b(insert|update|delete|merge|create|drop|alter|unload|grant|revoke|msck|vacuum|optimize|call)\b/i.test(s)) return { error: "Read-only statements only." }
  // The outermost LIMIT: the last one in the statement that is not inside parentheses.
  let depth = 0
  let last: { at: number; n: number } | null = null
  const re = /[()]|\blimit\s+(\d+)\b/gi
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m[0] === "(") depth++
    else if (m[0] === ")") depth--
    else if (depth === 0) last = { at: m.index, n: Number(m[1]) }
  }
  if (!last) return { sql: `${s}\nLIMIT ${ROW_LIMIT}` }
  if (last.n > ROW_LIMIT) return { sql: s.slice(0, last.at) + s.slice(last.at).replace(/\blimit\s+\d+\b/i, `LIMIT ${ROW_LIMIT}`) }
  return { sql: s }
}

/** Every database.table the statement names after FROM or JOIN, lower case. */
export function tablesIn(sql: string): string[] {
  const out = new Set<string>()
  for (const m of sql.matchAll(/\b(?:from|join)\s+"?([a-z0-9_]+)"?\s*\.\s*"?([a-z0-9_]+)"?/gi)) out.add(`${m[1]}.${m[2]}`.toLowerCase())
  return [...out]
}

/** A failure that means the scan was over the key's byte limit (Athena's per-query cutoff). */
const TOO_LARGE = /bytes?\s*scanned|scan(ned)?\s+limit|data\s+scanned|cutoff|exceeded the (data|byte)|query exhausted/i

export async function runQuery(raw: string): Promise<QueryResult> {
  const started = Date.now()
  const g = guardSql(raw)
  if ("error" in g) return { ok: false, sql: raw, error: g.error, tooLarge: false, bytes: 0, ms: 0 }
  const key = process.env.NYSGPT_CHAT_QUERY_KEY
  if (!key) return { ok: false, sql: g.sql, error: "The chat's query key is not set on this server.", tooLarge: false, bytes: 0, ms: 0 }
  try {
    const r = await fetch(`${API}/query`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify({ sql: g.sql }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    })
    const body = (await r.json().catch(() => ({}))) as { columns?: string[]; rows?: (string | null)[][]; truncated?: boolean; bytes_scanned?: number | string; error?: string; message?: string }
    const ms = Date.now() - started
    if (!r.ok || body.error || !Array.isArray(body.rows)) {
      const error = String(body.error ?? body.message ?? `The query service answered ${r.status}.`).slice(0, 400)
      return { ok: false, sql: g.sql, error, tooLarge: TOO_LARGE.test(error), bytes: Number(body.bytes_scanned ?? 0) || 0, ms }
    }
    return { ok: true, sql: g.sql, columns: body.columns ?? [], rows: body.rows, rowCount: body.rows.length, truncated: !!body.truncated, bytes: Number(body.bytes_scanned ?? 0) || 0, ms }
  } catch (e) {
    const timedOut = (e as Error).name === "TimeoutError" || (e as Error).name === "AbortError"
    return { ok: false, sql: g.sql, error: timedOut ? "The query took longer than 60 seconds and was stopped." : `The query service could not be reached: ${(e as Error).message}`.slice(0, 300), tooLarge: timedOut, bytes: 0, ms: Date.now() - started }
  }
}

/** Athena's price: $5 a terabyte scanned, at least 10 MB for a query that scans anything. */
export const athenaCost = (bytes: number) => (bytes > 0 ? (Math.max(bytes, 10 * 1024 * 1024) / 1024 ** 4) * 5 : 0)
