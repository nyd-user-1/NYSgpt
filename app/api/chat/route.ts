import { BedrockRuntimeClient, ConverseStreamCommand, type Message } from "@aws-sdk/client-bedrock-runtime"

import { currentUser } from "@/lib/auth"
import { MODEL_IDS } from "@/lib/model-options"

// The /chat answer, ported with the page from trinity (2026-11-03): a system prompt, then the
// reply streamed back as plain text. The mechanics are trinity's — the model picker's id when it
// is on the list, a PDF as a document block on the last user message, the caller's systemContext
// after the base prompt, the first chunk read before the response goes out so a call that fails at
// once still answers 500. The prompt itself is a placeholder until NYSgpt writes its own.

const client = new BedrockRuntimeClient({ region: process.env.NYSGPT_BEDROCK_REGION ?? "us-east-1" })
const MODEL = process.env.NYSGPT_CHAT_MODEL ?? "us.anthropic.claude-sonnet-4-6"

const BASE_SYSTEM_PROMPT = `You are the assistant inside NYSgpt. This deployment's system prompt is a placeholder: answer plainly and helpfully from the conversation alone, and when a question needs records this placeholder does not carry, say so rather than estimating.

Speak as I, in the first person singular: "I", "me", "my". Never "we" or "our", never "NYSgpt" or "the platform" as a stand-in for I, and never name the model behind the answers.

A video script you draft goes alone in a \`\`\`pax-script code block (that tag, nothing else inside); the page shows it as a script card. Right after its code block add a \`\`\`pax-cite\`\`\` block: a JSON array with one entry per line that leans on evidence, each {"quote": "<a few exact words from that line>", "note": "<one sentence: why the line is written this way>", "ids": ["<ids>"]}. Never mention the block in prose. Real code goes in an ordinary code block tagged with its language.

A conversational fork goes out as a \`\`\`pax-choices\`\`\` block: a JSON array of 3 or 4 short strings; the page draws them as tappable chips. Structured intake goes out as a \`\`\`pax-fields\`\`\` block: a JSON array of one or two fields, kinds "text", "textarea", and "choice" with "options". Never mention either block in prose.

When the user's message carries a PDF, answer from it: quote its numbers, cite its pages as (p. N), and say plainly what it does not cover.`

export async function POST(req: Request) {
  if (!(await currentUser())) {
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
  const modelId = model && MODEL_IDS.has(model) ? model : MODEL
  // Extra context from the caller: record mode's guide, the onboarding, a skill, a mention.
  const extra = typeof systemContext === "string" && systemContext.trim() ? `\n\n${systemContext.slice(0, 80_000)}` : ""
  const system = BASE_SYSTEM_PROMPT + extra
  const turns = messages
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.content.trim())
    .map(({ m, i }): Message => ({ role: m.role, content: pdf && i === lastUserAt ? [{ document: { format: "pdf", name: pdfName, source: { bytes: pdf } } }, { text: m.content }] : [{ text: m.content }] }))
  const inferenceConfig = { maxTokens: 2000, temperature: 0.3 }
  const texts: AsyncIterable<string> = (async function* () {
    const r = await client.send(new ConverseStreamCommand({ modelId, system: [{ text: system }], messages: turns, inferenceConfig }))
    for await (const ev of r.stream ?? []) {
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
        if (!first.done) controller.enqueue(encoder.encode(first.value))
        for (let r = first.done ? first : await it.next(); !r.done; r = await it.next()) controller.enqueue(encoder.encode(r.value))
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } })
}
