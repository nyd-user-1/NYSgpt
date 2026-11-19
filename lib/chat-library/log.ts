import "server-only"

import { appendFile, mkdir, readFile } from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"

// One JSON line per chat message on the dev box (brief 49): the question, the tables and SQL, bytes scanned,
// model tokens, and the cost of each. The night's caps are read back from the same file before each message.

export const LOG_DIR = process.env.NYSGPT_CHAT_LOG_DIR || path.join(homedir(), ".nysgpt-chat")
const FILE = path.join(LOG_DIR, "messages.jsonl")

/** The night's caps (brief 49): model calls $1.00, Athena through the query API $0.50. */
export const CAPS = { model: 1.0, athena: 0.5 }

/** Claude Haiku 4.5 on Bedrock, dollars per million tokens. */
export const HAIKU_PRICE = { input: 1.0, output: 5.0, cacheRead: 0.1, cacheWrite: 1.25 }

export type Tokens = { input: number; output: number; cacheRead: number; cacheWrite: number }

export const modelCost = (t: Tokens) => (t.input * HAIKU_PRICE.input + t.output * HAIKU_PRICE.output + t.cacheRead * HAIKU_PRICE.cacheRead + t.cacheWrite * HAIKU_PRICE.cacheWrite) / 1e6

export type LogLine = {
  at: string
  question: string
  scope: { db: string | null; table: string | null } | null
  tables: string[]
  queries: { sql: string; ok: boolean; bytes: number; rows: number; ms: number; error?: string }[]
  refused: string | null
  tokens: Tokens
  modelCost: number
  athenaCost: number
  ms: number
  error: string | null
  /** The reply as written, cut at 4,000 characters. */
  answer?: string
}

export async function writeLog(line: LogLine) {
  await mkdir(LOG_DIR, { recursive: true })
  await appendFile(FILE, JSON.stringify(line) + "\n")
}

/** What the night has spent so far, from the log. */
export async function spent(): Promise<{ model: number; athena: number; messages: number }> {
  try {
    const lines = (await readFile(FILE, "utf8")).split("\n").filter(Boolean)
    let model = 0
    let athena = 0
    for (const l of lines) {
      try {
        const x = JSON.parse(l) as LogLine
        model += x.modelCost || 0
        athena += x.athenaCost || 0
      } catch {}
    }
    return { model, athena, messages: lines.length }
  } catch {
    return { model: 0, athena: 0, messages: 0 }
  }
}
