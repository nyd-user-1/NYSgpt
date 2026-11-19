import { BedrockRuntimeClient, ConverseCommand, type Message } from "@aws-sdk/client-bedrock-runtime"
import { NextResponse } from "next/server"

import { CAPS, modelCost, spent, writeLog } from "@/lib/chat-library/log"

// /api/chat/follow-ups: nsrgpt's app/api/chat/follow-ups/route.ts (brief 62), the orb's follow-ups, trinity's pattern:
// clicking the settled orb asks for exactly three short prompts the user would plausibly send next, from the tail of
// the conversation. Generated on the first click alone (the client caches per message), on the fast model, a few
// hundred tokens.
//
// NYSgpt's changes: the chat's own switch stands in front (app/api/chat/route.ts): outside the dev server, or once the
// night's caps are reached (lib/chat-library/log.ts), it answers with no suggestions and calls no model, so the orb
// shows without chips until the budget is back. In place of nsrgpt's sign-in check and lib/chat-data/bedrock's
// converseText, the Bedrock call is made here, in the chat's region, and its tokens are written to the chat's log
// so the night's cap counts them.

const MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0"

const SYSTEM = `From the conversation, propose exactly three follow-up prompts the user would plausibly send next: each a single short imperative or question in the user's own voice, under 72 characters, concrete to what was just discussed (its numbers, its names), never generic ("tell me more"), never repeating what was already asked. Answer with a JSON array of three strings and nothing else.`

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const REGION = process.env.NYSGPT_CHAT_REGION ?? "us-east-2"
const g = globalThis as typeof globalThis & { __followUpsBedrock?: BedrockRuntimeClient }
const client = () => (g.__followUpsBedrock ??= new BedrockRuntimeClient({ region: REGION }))

export async function POST(request: Request) {
  // The chat's switch: off, there are no follow-ups and no model call.
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ suggestions: [] })
  const night = await spent()
  if (night.model >= CAPS.model || night.athena >= CAPS.athena) return NextResponse.json({ suggestions: [] })

  const body = (await request.json().catch(() => null)) as { messages?: { role: string; content: string }[]; context?: string } | null
  const tail: Message[] = (body?.messages ?? []).slice(-8).map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
    content: [{ text: String(m.content ?? "").slice(0, 2400) }],
  }))
  if (!tail.length) return NextResponse.json({ error: "Nothing to follow up." }, { status: 400 })
  if (tail[tail.length - 1].role === "assistant") tail.push({ role: "user", content: [{ text: "Propose the three follow-ups now." }] })
  const started = Date.now()
  try {
    const out = await client().send(
      new ConverseCommand({
        modelId: MODEL,
        system: [{ text: body?.context ? `${SYSTEM}\n\nContext bound to the conversation:\n${body.context.slice(0, 1200)}` : SYSTEM }],
        messages: tail,
        inferenceConfig: { maxTokens: 300, temperature: 0.7 },
      }),
    )
    const text = (out.output?.message?.content ?? []).map((c) => c.text ?? "").join("")
    const tokens = { input: out.usage?.inputTokens ?? 0, output: out.usage?.outputTokens ?? 0, cacheRead: out.usage?.cacheReadInputTokens ?? 0, cacheWrite: out.usage?.cacheWriteInputTokens ?? 0 }
    await writeLog({ at: new Date().toISOString(), question: "(follow-ups)", scope: null, tables: [], queries: [], refused: null, tokens, modelCost: modelCost(tokens), athenaCost: 0, ms: Date.now() - started, error: null }).catch(() => {})
    const start = text.indexOf("[")
    const end = text.lastIndexOf("]")
    let suggestions: string[] = []
    if (start >= 0 && end > start) {
      try { suggestions = (JSON.parse(text.slice(start, end + 1)) as unknown[]).map(String) } catch { /* falls through */ }
    }
    if (!suggestions.length) suggestions = text.split("\n").map((l) => l.replace(/^[\s\d.\-*"]+|["\s,]+$/g, "")).filter((l) => l.length > 4)
    suggestions = suggestions.slice(0, 3)
    if (!suggestions.length) return NextResponse.json({ error: "No follow-ups came back." }, { status: 502 })
    return NextResponse.json({ suggestions })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "follow-ups failed" }, { status: 500 })
  }
}
