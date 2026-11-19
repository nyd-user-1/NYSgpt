import { BedrockRuntimeClient, type Message } from "@aws-sdk/client-bedrock-runtime"

import { streamWithTools } from "@/lib/chat-data/converse-loop"
import { findTables, type FoundTable, type Scope } from "@/lib/find-tables"
import { CAPS, modelCost, spent, writeLog, type LogLine, type Tokens } from "@/lib/chat-library/log"
import { MAX_DESCRIBED, MAX_QUERIES, MAX_SEARCHES, systemPrompt, TOOLS } from "@/lib/chat-library/prompt"
import { athenaCost, ROWS_TO_MODEL, runQuery, tablesIn } from "@/lib/chat-library/query"

// /api/chat on NYSgpt (brief 49): the chat answers from the library in three steps the model drives with tools,
// in pax-trinity's tool loop (lib/chat-data/converse-loop.ts): find tables (a search over the catalog), query
// (one read-only statement through the Data Library query API), answer from the returned rows. Claude Haiku 4.5
// on Bedrock, with the dev box's own role. The text streams to the page as pax-trinity's route streams it; when a
// query ran, the tables used and the SQL follow in a ```pax-basis``` block, which the page draws as the answer's
// footer (components/chat/measured.tsx).
//
// Guards, in this server whatever the model writes: SELECT only and a LIMIT of at most 200 (query.ts); at most 3
// queries a message; a query that hits the scan limit is not run again, and the chat says the question is too
// large; 60 seconds a query; the model sees at most 50 rows; only tables the search returned may be queried; the
// night's caps ($1.00 of model calls, $0.50 of Athena) are read from the log before each message.
//
// Not public: it answers only under `next dev` (the dev box). Any other build streams the stub's "not connected"
// reply. Every message is one line in ~/.nysgpt-chat/messages.jsonl on the box (lib/chat-library/log.ts).
//
// `Accept: application/json` (the judge, scripts/chat-eval.mjs) gets one JSON object in place of the stream:
// { answer, tables, found, sql, bytes, tokens, queries, noQuery, refused, error }: `found` is every table the search showed
// the model, `noQuery` an answer with no query behind it.

export const runtime = "nodejs"
export const maxDuration = 300

const MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
const REGION = process.env.NYSGPT_CHAT_REGION ?? "us-east-2"
const MAX_ROUNDS = 6

const g = globalThis as typeof globalThis & { __chatBedrock?: BedrockRuntimeClient }
const client = () => (g.__chatBedrock ??= new BedrockRuntimeClient({ region: REGION }))

const enc = new TextEncoder()

/** A reply streamed in small pieces, as the page reads a model's. */
function streamText(text: string): Response {
  const words = text.split(/(?<=\s)/)
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < words.length; i += 3) {
        controller.enqueue(enc.encode(words.slice(i, i + 3).join("")))
        await new Promise((r) => setTimeout(r, 30))
      }
      controller.close()
    },
  })
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } })
}

const NOT_CONNECTED = "**This chat is not connected here.** It answers from the library on NYSgpt's development server only, while it is being built."

const bytesText = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : b >= 1024 ** 2 ? `${(b / 1024 ** 2).toFixed(1)} MB` : b > 0 ? `${Math.max(1, Math.round(b / 1024))} KB` : "no data")

/** A table's full field list from the Data Library's /table endpoint (the schema, not a query: no Athena cost), with
 *  the index's sample values laid on where it has them. The index keeps at most 32 fields a table; a wide table
 *  (usaspending_contracts has 297) needs the rest. Kept for the server's life. */
const API = process.env.NYSGPT_QUERY_API ?? "https://data.nysgpt.com"
const gf = globalThis as typeof globalThis & { __chatSchemas?: Map<string, Promise<FoundTable["fields"] | null>> }
const schemas = (gf.__chatSchemas ??= new Map())
function schemaOf(stored: string): Promise<FoundTable["fields"] | null> {
  const kept = schemas.get(stored)
  if (kept) return kept
  const [database, table] = stored.split(".")
  const p = fetch(`${API}/table?database=${encodeURIComponent(database)}&table=${encodeURIComponent(table)}`, { headers: { "x-api-key": process.env.NYSGPT_CHAT_QUERY_KEY ?? "" }, signal: AbortSignal.timeout(15_000), cache: "no-store" })
    .then((x) => (x.ok ? x.json() : null))
    .then((b: { fields?: { name: string; type: string; description?: string }[] } | null) => (b?.fields?.length ? b.fields.map((f) => ({ name: f.name, type: f.type, ...(f.description ? { description: f.description } : {}) })) : null))
    .catch(() => null)
  schemas.set(stored, p)
  return p
}
/** The table with every field: the schema's list, each with the index's samples where it has them. */
async function withAllFields(t: FoundTable): Promise<FoundTable> {
  const all = await schemaOf(t.stored)
  if (!all) return t
  // The schema gives every field its type; the index gives the first fields their samples and descriptions.
  const known = new Map(t.fields.map((f) => [f.name, f]))
  return { ...t, fields: all.map((f) => ({ ...f, ...(known.get(f.name)?.samples ? { samples: known.get(f.name)!.samples } : {}), ...(known.get(f.name)?.description && !f.description ? { description: known.get(f.name)!.description } : {}) })) }
}

/** The words of a question or a search, for choosing which of a table's fields a card shows. */
const termsOf = (s: string) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 2))

/** A table's 12 fields that best match the words (name parts first, then the description), in the table's order. */
function likelyFields(t: FoundTable, terms: Set<string>, limit = 12) {
  const scored = t.fields.map((f, i) => {
    const parts = f.name.toLowerCase().split(/[^a-z0-9]+/)
    const desc = termsOf(f.description ?? "")
    let score = 0
    for (const w of terms) {
      if (parts.some((p) => p === w || (w.length > 3 && p.startsWith(w.slice(0, 4))))) score += 2
      else if (desc.has(w)) score += 1
    }
    return { f, i, score }
  })
  const top = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.i - b.i).slice(0, limit)
  const rest = scored.filter((x) => !top.includes(x)).slice(0, limit - top.length)
  return [...top, ...rest].sort((a, b) => a.i - b.i).map((x) => x.f)
}

/** A found table as a search shows it: a short card with the 12 fields that best match the question, one short
 *  sample each. describe_table gives the rest. */
const card = (t: FoundTable, terms: Set<string>) => ({
  stored: t.stored,
  plain: t.plain,
  topic: t.topic,
  about: t.about.slice(0, 160),
  row_is: t.rowIs.slice(0, 80),
  rows: t.rows,
  years: t.years,
  fields: likelyFields(t, terms).map((f) => `${f.name} ${f.type}${f.samples?.length ? ` = ${String(f.samples[0]).slice(0, 32)}` : ""}`),
  fields_in_all: t.fields.length,
})

/** One table's fields as describe_table shows them, 40 at a time, one short sample each. */
const PAGE = 40
const fieldsOf = (t: FoundTable, rest: boolean, terms: Set<string>) => {
  const from = rest ? PAGE : 0
  // The fields that match the question first, then the table's order.
  const first = likelyFields(t, terms, PAGE)
  const ordered = [...first, ...t.fields.filter((f) => !first.includes(f))]
  const shown = ordered.slice(from, from + (rest ? 120 : PAGE))
  return {
    table: t.stored,
    plain: t.plain,
    row_is: t.rowIs,
    fields: shown.map((f) => ({ name: f.name, type: f.type, ...(f.description ? { about: f.description.slice(0, 80) } : {}), ...(f.samples?.length ? { sample: String(f.samples[0]).slice(0, 40) } : {}) })),
    shown: `${from + 1} to ${from + shown.length} of ${t.fields.length}`,
    ...(!rest && t.fields.length > PAGE ? { more: `${t.fields.length - PAGE} more fields: call describe_table with rest: true` } : {}),
  }
}

function scopeOf(v: unknown): Scope | null {
  const s = v as { db?: unknown; table?: unknown } | null
  const db = typeof s?.db === "string" && s.db.trim() ? s.db.slice(0, 200) : null
  const table = typeof s?.table === "string" && s.table.trim() ? s.table.slice(0, 200) : null
  return db || table ? { db, table } : null
}

/** The page sends earlier answers with their footer blocks; the model reads the prose. */
const prose = (s: string) => s.replace(/```pax-basis[\s\S]*?```/g, "").trim()

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { messages?: { role: string; content: string }[]; scope?: unknown; systemContext?: unknown } | null
  const wantJson = (req.headers.get("accept") ?? "").includes("application/json")
  if (process.env.NODE_ENV !== "development") return streamText(NOT_CONNECTED)

  const started = Date.now()
  const history = (body?.messages ?? []).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && prose(m.content))
  const question = [...history].reverse().find((m) => m.role === "user")?.content.trim().slice(0, 2000) ?? ""
  const scope = scopeOf(body?.scope)
  const tokens: Tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  const state = {
    found: new Map<string, string>(),
    tables: new Map<string, FoundTable>(),
    searches: 0,
    described: new Set<string>(),
    used: new Set<string>(),
    queries: [] as LogLine["queries"],
    refused: null as string | null,
    tooLarge: false,
  }

  const finish = async (answer: string, error: string | null) => {
    // An answer written with no query behind it is a refusal, whether or not the model recorded one.
    if (!state.refused && !error && answer.trim() && !state.queries.some((q) => q.ok)) state.refused = state.tooLarge ? "too-large" : "not-in-library"
    const athena = state.queries.reduce((s, q) => s + athenaCost(q.bytes), 0)
    const line: LogLine = { at: new Date().toISOString(), question, scope, tables: [...state.used], queries: state.queries, refused: state.refused, tokens, modelCost: modelCost(tokens), athenaCost: athena, ms: Date.now() - started, error }
    await writeLog({ ...line, answer: answer.slice(0, 4000) }).catch(() => {})
    return line
  }
  const json = (answer: string, line: LogLine) =>
    Response.json({ answer, tables: line.tables, found: [...state.found.keys()], sql: line.queries.map((q) => q.sql), bytes: line.queries.reduce((s, q) => s + q.bytes, 0), tokens: { input: tokens.input + tokens.cacheRead + tokens.cacheWrite, output: tokens.output }, queries: line.queries.length, noQuery: !line.queries.some((q) => q.ok), refused: line.refused, error: line.error })

  if (!question) return wantJson ? Response.json({ answer: "", tables: [], sql: [], bytes: 0, tokens: { input: 0, output: 0 }, queries: 0, refused: null, error: "No question." }, { status: 400 }) : streamText("Ask me about the records.")

  const night = await spent()
  if (night.model >= CAPS.model || night.athena >= CAPS.athena) {
    const msg = `I have stopped answering for tonight: the spending cap is reached (model $${night.model.toFixed(2)} of $${CAPS.model.toFixed(2)}, queries $${night.athena.toFixed(2)} of $${CAPS.athena.toFixed(2)}).`
    const line = await finish(msg, "cap reached")
    return wantJson ? json(msg, line) : streamText(msg)
  }

  const turns: Message[] = history.map((m) => ({ role: m.role as "user" | "assistant", content: [{ text: m.role === "assistant" ? prose(m.content) : m.content.slice(0, 4000) }] }))

  const run = async (name: string, input: Record<string, unknown>): Promise<{ ok: boolean; payload: unknown; summary?: string }> => {
    if (name === "find_tables") {
      if (state.searches >= MAX_SEARCHES) return { ok: false, payload: { error: `The limit of ${MAX_SEARCHES} searches for this question is reached. Work with the tables already found.` } }
      state.searches++
      const words = String(input.question ?? question).slice(0, 500)
      let found = await findTables(words, 6, scope ?? undefined)
      // Nothing within the reader's chosen database or table (a name the index does not use, or a database the
      // query service cannot reach): the whole library, said so.
      const widened = !!scope && !found.length
      if (widened) found = await findTables(words, 6)
      found = await Promise.all(found.map(withAllFields))
      for (const t of found) {
        state.found.set(t.stored.toLowerCase(), t.plain)
        state.tables.set(t.stored.toLowerCase(), t)
      }
      const summary = found.length ? `find_tables("${words.slice(0, 80)}") showed: ${found.map((t) => `${t.stored} (${t.plain})`).join("; ")}` : `find_tables("${words.slice(0, 80)}") found nothing.`
      const nudge = state.searches >= 2 && !state.queries.length ? { next: "Choose the best of the tables found so far and query it now." } : {}
      return { ok: true, summary, payload: found.length ? { tables: found.map((t) => card(t, termsOf(`${question} ${words}`))), ...nudge, ...(widened ? { note: "Nothing matched inside the reader's chosen database or table; these are from the whole library." } : {}) } : { tables: [], note: "No table in the catalog matched." } }
    }
    if (name === "describe_table") {
      const key = String(input.table ?? "").trim().toLowerCase()
      const t = state.tables.get(key)
      if (!t) return { ok: false, payload: { error: "Describe only a table that find_tables returned, by its stored name database.table." } }
      if (!state.described.has(key) && state.described.size >= MAX_DESCRIBED) return { ok: false, payload: { error: `The limit of ${MAX_DESCRIBED} described tables for this question is reached.` } }
      state.described.add(key)
      const out = fieldsOf(t, input.rest === true, termsOf(`${question} ${String(input.table ?? "")}`))
      return { ok: true, payload: out, summary: `describe_table(${t.stored}) showed fields ${out.shown}: ${out.fields.slice(0, 60).map((f) => f.name).join(", ")}` }
    }
    if (name === "run_query") {
      if (state.tooLarge) return { ok: false, payload: { error: "The last query hit the scan limit. Do not run another; call cannot_answer with too-large and suggest a narrower question." } }
      if (state.queries.length >= MAX_QUERIES) return { ok: false, payload: { error: `The limit of ${MAX_QUERIES} queries for this question is reached. Answer from the rows you have, or say what you could not find.` } }
      const sql = String(input.sql ?? "")
      const refs = tablesIn(sql)
      const unknown = refs.filter((r) => !state.found.has(r))
      if (!refs.length) return { ok: false, payload: { error: "Name each table as database.table, using the stored names find_tables returned." } }
      if (unknown.length) return { ok: false, payload: { error: `Use only tables that find_tables returned. Not returned: ${unknown.join(", ")}.` } }
      const r = await runQuery(sql)
      state.queries.push({ sql: r.sql, ok: r.ok, bytes: r.bytes, rows: r.ok ? r.rowCount : 0, ms: r.ms, ...(r.ok ? {} : { error: r.error }) })
      if (r.ok) {
        for (const t of refs) state.used.add(t)
        return { ok: true, payload: { columns: r.columns, rows: r.rows.slice(0, ROWS_TO_MODEL), row_count: r.rowCount, ...(r.rowCount > ROWS_TO_MODEL ? { note: `Only the first ${ROWS_TO_MODEL} rows are shown.` } : {}) } }
      }
      if (r.tooLarge) {
        state.tooLarge = true
        state.refused = "too-large"
        return { ok: false, payload: { error: "This query is too large: it hit the scan limit and was stopped. Do not retry it bigger. Call cannot_answer with too-large and suggest a narrower question (a year, a state, an agency, a company)." } }
      }
      return { ok: false, payload: { error: r.error } }
    }
    if (name === "cannot_answer") {
      state.refused ??= input.reason === "too-large" ? "too-large" : "not-in-library"
      return { ok: true, payload: { recorded: true } }
    }
    return { ok: false, payload: { error: `No tool is called ${name}.` } }
  }

  const texts = streamWithTools({
    send: (command) => client().send(command),
    modelId: MODEL,
    system: systemPrompt(scope) + (typeof body?.systemContext === "string" && body.systemContext.trim() ? `\n\nContext from the page:\n${body.systemContext.slice(0, 4000)}` : ""),
    messages: turns,
    tools: TOOLS,
    run,
    inferenceConfig: { maxTokens: 1500, temperature: 0 },
    maxRounds: MAX_ROUNDS,
    onUsage: (u) => {
      tokens.input += u.inputTokens ?? 0
      tokens.output += u.outputTokens ?? 0
      tokens.cacheRead += u.cacheReadInputTokens ?? 0
      tokens.cacheWrite += u.cacheWriteInputTokens ?? 0
    },
  })

  /** The footer block: the tables by their plain names, the bytes scanned, and each statement that ran. */
  const footer = () => {
    const ran = state.queries.filter((q) => q.ok)
    if (!ran.length) return ""
    const names = [...state.used].map((t) => state.found.get(t) ?? t)
    const bytes = ran.reduce((s, q) => s + q.bytes, 0)
    const basis = { basis: `From ${names.join(", ")} · ${ran.length === 1 ? "1 query" : `${ran.length} queries`}, ${bytesText(bytes)} scanned`, citation: ran.map((q) => q.sql.replace(/\s+/g, " ").trim()).join("  ·  "), videoId: "" }
    return `\n\n\`\`\`pax-basis\n${JSON.stringify(basis)}\n\`\`\``
  }

  if (wantJson) {
    let answer = ""
    let error: string | null = null
    try {
      for await (const t of texts) answer += t
    } catch (e) {
      error = (e as Error).message.slice(0, 300)
    }
    const line = await finish(answer, error)
    return json(answer, line)
  }

  // The first piece is read before the response goes out, so a call that fails at once still answers.
  const it = texts[Symbol.asyncIterator]()
  let first: IteratorResult<string, unknown>
  try {
    first = await it.next()
  } catch (e) {
    const msg = "I could not reach the model just now. Please try again in a moment."
    await finish(msg, (e as Error).message.slice(0, 300))
    return streamText(msg)
  }
  let answer = ""
  const stream = new ReadableStream({
    async start(controller) {
      let error: string | null = null
      try {
        if (!first.done) {
          answer += first.value
          controller.enqueue(enc.encode(first.value))
        }
        for (let r = first.done ? first : await it.next(); !r.done; r = await it.next()) {
          answer += r.value
          controller.enqueue(enc.encode(r.value))
        }
        const f = footer()
        if (f) controller.enqueue(enc.encode(f))
      } catch (e) {
        error = (e as Error).message.slice(0, 300)
        controller.enqueue(enc.encode("\n\nThe answer stopped before it finished. Please try again."))
      } finally {
        await finish(answer, error)
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } })
}
