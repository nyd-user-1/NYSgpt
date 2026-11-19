// /api/chat on NYSgpt (brief 46). pax-trinity's route streams Bedrock ConverseStream (us.anthropic.claude-sonnet-4-6
// by default, 2,000 output tokens) with its own data tools and system prompt. No model is connected here until
// Brendan approves one: this streams a stub reply, as plain text in chunks, the way the chat reads the real one.

export const runtime = "nodejs"

const STUB = (asked: string) =>
  [
    "**This is a stub reply.** No model is connected to NYSgpt's chat yet, so nothing was sent anywhere.",
    "",
    asked ? `You asked: "${asked.slice(0, 200)}"` : "",
    "",
    "When a model is connected, the answer streams here, with:",
    "",
    "- markdown, tables and code",
    "- follow-up questions from the orb under the answer",
    "- the response footer's actions",
  ].join("\n")

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { messages?: { role: string; content: string }[] } | null
  const last = [...(body?.messages ?? [])].reverse().find((m) => m.role === "user")?.content ?? ""
  const words = STUB(last.trim()).split(/(?<=\s)/)
  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < words.length; i += 3) {
        controller.enqueue(enc.encode(words.slice(i, i + 3).join("")))
        await new Promise((r) => setTimeout(r, 40))
      }
      controller.close()
    },
  })
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } })
}
