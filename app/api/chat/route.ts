import { currentUser } from "@/lib/auth"
import { converseStream, docBytes } from "@/lib/chat-data/bedrock"
import { streamWithTools } from "@/lib/chat-data/converse-loop"
import { dataToolSpecs, isDataTool, nsrPrompt, nsrWired, runDataTool } from "@/lib/chat-data/tools"
import { MODEL_IDS } from "@/lib/model-options"

// The /chat answer, trinity's mechanics on NYSgpt's stack (2026-11-04): a system prompt, then the
// reply streamed back as plain text — the picker's model id when it is on the list, a PDF as a
// document block on the last user message, the caller's systemContext after the base prompt, the
// first chunk read before the response goes out so a call that fails at once still answers 500.
// With the NSR corpus wired (NSR_DATABASE_URL) and an Anthropic model, the answer runs the tool
// loop: the model may look the corpus up mid-answer, a few rounds at most, one visible answer.
// Bedrock itself rides lib/chat-data/bedrock.ts: a bearer token on the worker, the SDK elsewhere.

const MODEL = () => process.env.NYSGPT_CHAT_MODEL ?? "us.anthropic.claude-sonnet-4-6"

const BASE_SYSTEM_PROMPT = `You are the assistant inside NYSgpt — a records platform: New York legislative data, a research-paper corpus, a catalog of retrieval models, and a public API at api.nysgpt.com. Much of that is still being wired to this chat; answer from the conversation and the tools you actually have, and when a question needs records this deployment does not carry, say so rather than estimating.

Speak as I, in the first person singular: "I", "me", "my". Never "we" or "our", never "NYSgpt" or "the platform" as a stand-in for I, and never name the model behind the answers.

Every figure carries its scope: say what the number counts and where it is from. When the record has a number, use that exact number; when it does not, say so plainly.

A script you draft goes alone in a \`\`\`pax-script code block (that tag, nothing else inside); the page shows it as a script card. Right after its code block add a \`\`\`pax-cite\`\`\` block: a JSON array with one entry per line that leans on evidence, each {"quote": "<a few exact words from that line>", "note": "<one sentence: why the line is written this way>", "ids": ["<ids>"]}. Never mention the block in prose. Real code goes in an ordinary code block tagged with its language.

A conversational fork goes out as a \`\`\`pax-choices\`\`\` block: a JSON array of 3 or 4 short strings; the page draws them as tappable chips. Structured intake goes out as a \`\`\`pax-fields\`\`\` block: a JSON array of one or two fields, kinds "text", "textarea", and "choice" with "options". Never mention either block in prose.

When the user's message carries a PDF, answer from it: quote its numbers, cite its pages as (p. N), and say plainly what it does not cover.`

export async function POST(req: Request) {
  // NYSGPT_CHAT_OPEN=1 (the workers.dev build): the chat answers without a session, so the page
  // works where Cognito sign-in is not wired. Unset it to require sign-in again.
  if (process.env.NYSGPT_CHAT_OPEN !== "1" && !(await currentUser())) {
    return new Response(JSON.stringify({ error: "Sign in to chat." }), { status: 402, headers: { "Content-Type": "application/json" } })
  }
  const { messages, systemContext, model, document } = (await req.json()) as { messages: { role: "user" | "assistant"; content: string }[]; systemContext?: string; model?: string; record?: boolean; document?: { name?: string; data?: string } }
  // A PDF the user attached in /chat: read by the model itself, as a document block on the last
  // user message, re-sent with every question in that conversation. Capped at 3.5 MB.
  const pdf = document?.data ? Buffer.from(document.data, "base64") : null
  if (pdf && (pdf.length > 3_700_000 || pdf.subarray(0, 4).toString() !== "%PDF")) return new Response(JSON.stringify({ error: "That file is not a PDF under 3.5 MB." }), { status: 400 })
  const pdfName = (document?.name ?? "document").replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9()[\] -]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) || "document"
  const lastUserAt = messages.map((m) => m.role).lastIndexOf("user")
  // The picker's choice when it is one of the models this account answers on (lib/model-options); else the default.
  const modelId = model && MODEL_IDS.has(model) ? model : MODEL()
  // Extra context from the caller: record mode's guide, the onboarding, a skill, a mention.
  const extra = typeof systemContext === "string" && systemContext.trim() ? `\n\n${systemContext.slice(0, 80_000)}` : ""
  // The data tools ride Anthropic models alone (the loop's tool_use protocol).
  const tools = nsrWired() && modelId.includes("anthropic.")
  const system = BASE_SYSTEM_PROMPT + (tools ? `\n\n${nsrPrompt()}` : "") + extra
  const turns = messages
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.content.trim())
    .map(({ m, i }) => ({ role: m.role, content: pdf && i === lastUserAt ? [{ document: { format: "pdf", name: pdfName, source: { bytes: docBytes(pdf) } } }, { text: m.content }] : [{ text: m.content }] }))
  const inferenceConfig = { maxTokens: 3000, temperature: 0.3 }
  const texts: AsyncIterable<string> = tools
    ? streamWithTools({
        modelId,
        system,
        messages: turns,
        tools: dataToolSpecs(),
        run: async (name, input) => {
          if (!isDataTool(name)) return { ok: false, payload: { error: `No tool is called ${name}.` } }
          const started = Date.now()
          const out = await runDataTool(name, input)
          // One line per lookup: which tool, its input, how long, and whether it found anything.
          console.info(`chat tool ${name} ${JSON.stringify(input).slice(0, 160)} ${Date.now() - started}ms ${out.ok ? "ok" : "miss"} ${JSON.stringify(out.payload).length}c`)
          return out
        },
        inferenceConfig,
      })
    : (async function* () {
        for await (const ev of converseStream({ modelId, system: [{ text: system }], messages: turns, inferenceConfig })) {
          const text = ev.contentBlockDelta?.delta?.text
          if (text) yield text
        }
      })()
  // The first piece is read before the response goes out, so a call that fails at once still answers 500.
  const it = texts[Symbol.asyncIterator]()
  const first = await it.next()
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!first.done) controller.enqueue(encoder.encode(first.value as string))
        for (let r = first.done ? first : await it.next(); !r.done; r = await it.next()) controller.enqueue(encoder.encode(r.value as string))
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } })
}
