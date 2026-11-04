import { NextResponse } from "next/server"

import { currentUser } from "@/lib/auth"
import { converseText } from "@/lib/chat-data/bedrock"

// The orb's follow-ups, trinity's pattern: clicking the settled orb asks for exactly three short
// prompts the user would plausibly send next, from the tail of the conversation. Generated on the
// first click alone (the client caches per message), on the fast model, a few hundred tokens.

const MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0"

const SYSTEM = `From the conversation, propose exactly three follow-up prompts the user would plausibly send next: each a single short imperative or question in the user's own voice, under 72 characters, concrete to what was just discussed (its numbers, its names), never generic ("tell me more"), never repeating what was already asked. Answer with a JSON array of three strings and nothing else.`

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (process.env.NYSGPT_CHAT_OPEN !== "1" && !(await currentUser())) return NextResponse.json({ error: "Sign in." }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { messages?: { role: string; content: string }[]; context?: string } | null
  const tail = (body?.messages ?? []).slice(-8).map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
    content: [{ text: String(m.content ?? "").slice(0, 2400) }],
  }))
  if (!tail.length) return NextResponse.json({ error: "Nothing to follow up." }, { status: 400 })
  if (tail[tail.length - 1].role === "assistant") tail.push({ role: "user", content: [{ text: "Propose the three follow-ups now." }] })
  try {
    const text = await converseText({
      modelId: MODEL,
      system: [{ text: body?.context ? `${SYSTEM}\n\nContext bound to the conversation:\n${body.context.slice(0, 1200)}` : SYSTEM }],
      messages: tail,
      inferenceConfig: { maxTokens: 300, temperature: 0.7 },
    })
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
