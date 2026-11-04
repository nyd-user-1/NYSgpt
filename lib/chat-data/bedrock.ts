import "server-only"

// Bedrock for the chat, two roads with one shape (2026-11-04):
// - AWS_BEARER_TOKEN_BEDROCK set (the Cloudflare worker): plain fetch against the Bedrock runtime
//   HTTP API with the Bearer header — no SigV4, no SDK — parsing the vnd.amazon.eventstream frames
//   ourselves. This is the only road workerd is proven on.
// - otherwise (Amplify, a dev box with AWS creds): the AWS SDK's ConverseStreamCommand.
// Both yield the SDK's event shapes ({ contentBlockStart | contentBlockDelta | ... }), so the tool
// loop (converse-loop.ts) reads one stream no matter the road.

export type ConverseInput = {
  modelId: string
  system: unknown[]
  messages: unknown[]
  inferenceConfig?: Record<string, unknown>
  toolConfig?: Record<string, unknown>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StreamEvent = Record<string, any>

const region = () => process.env.NYSGPT_BEDROCK_REGION ?? "us-east-1"
const bearer = () => process.env.AWS_BEARER_TOKEN_BEDROCK

/** Document bytes as the active road wants them: base64 over HTTP, raw bytes through the SDK. */
export const docBytes = (buf: Buffer): unknown => (bearer() ? buf.toString("base64") : new Uint8Array(buf))

/* ---------- the eventstream wire format ----------
   Each frame: u32 total length, u32 headers length, u32 prelude CRC; headers; payload; u32 CRC.
   Each header: u8 name length, name, u8 value type (7 = string), u16 value length, value.
   The payload is JSON; :event-type names the member the SDK would have put it under. */
function* frames(buf: Uint8Array): Generator<{ headers: Record<string, string>; payload: Uint8Array }, number> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let at = 0
  while (at + 12 <= buf.length) {
    const total = dv.getUint32(at)
    if (at + total > buf.length) break
    const headersLen = dv.getUint32(at + 4)
    let h = at + 12
    const headers: Record<string, string> = {}
    const hEnd = h + headersLen
    while (h < hEnd) {
      const nameLen = dv.getUint8(h)
      const name = new TextDecoder().decode(buf.subarray(h + 1, h + 1 + nameLen))
      const type = dv.getUint8(h + 1 + nameLen)
      h += 2 + nameLen
      if (type === 7) {
        const vLen = dv.getUint16(h)
        headers[name] = new TextDecoder().decode(buf.subarray(h + 2, h + 2 + vLen))
        h += 2 + vLen
      } else if (type === 0 || type === 1) {
        /* bool true/false: no value bytes */
      } else if (type === 2) h += 1
      else if (type === 3) h += 2
      else if (type === 4) h += 4
      else if (type === 5) h += 8
      else if (type === 6 || type === 8) h += 2 + dv.getUint16(h)
      else if (type === 9) h += 16
      else break
    }
    yield { headers, payload: buf.subarray(at + 12 + headersLen, at + total - 4) }
    at += total
  }
  return at
}

async function* bearerStream(input: ConverseInput): AsyncGenerator<StreamEvent> {
  const res = await fetch(`https://bedrock-runtime.${region()}.amazonaws.com/model/${encodeURIComponent(input.modelId)}/converse-stream`, {
    method: "POST",
    headers: { Authorization: `Bearer ${bearer()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ system: input.system, messages: input.messages, inferenceConfig: input.inferenceConfig, ...(input.toolConfig ? { toolConfig: input.toolConfig } : {}) }),
  })
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "")
    throw new Error(`Bedrock ${res.status}: ${text.slice(0, 300)}`)
  }
  const reader = res.body.getReader()
  let buf = new Uint8Array(0)
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const next = new Uint8Array(buf.length + value.length)
    next.set(buf)
    next.set(value, buf.length)
    buf = next
    const it = frames(buf)
    let consumed = 0
    for (let r = it.next(); ; r = it.next()) {
      if (r.done) {
        consumed = r.value
        break
      }
      const { headers, payload } = r.value
      const json = payload.length ? JSON.parse(decoder.decode(payload)) : {}
      if (headers[":message-type"] === "exception" || headers[":message-type"] === "error") {
        throw new Error(json.message ?? headers[":exception-type"] ?? headers[":error-code"] ?? "Bedrock stream error")
      }
      const kind = headers[":event-type"]
      if (kind) yield { [kind]: json }
    }
    buf = buf.subarray(consumed)
  }
}

async function* sdkStream(input: ConverseInput): AsyncGenerator<StreamEvent> {
  const { BedrockRuntimeClient, ConverseStreamCommand } = await import("@aws-sdk/client-bedrock-runtime")
  const client = new BedrockRuntimeClient({ region: region() })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await client.send(new ConverseStreamCommand(input as any))
  for await (const ev of r.stream ?? []) yield ev as StreamEvent
}

/** The Converse stream as SDK-shaped events, by whichever road this deployment has. */
export function converseStream(input: ConverseInput): AsyncGenerator<StreamEvent> {
  return bearer() ? bearerStream(input) : sdkStream(input)
}

/** One non-streaming Converse call; the reply's text. For the follow-ups. */
export async function converseText(input: ConverseInput): Promise<string> {
  if (bearer()) {
    const res = await fetch(`https://bedrock-runtime.${region()}.amazonaws.com/model/${encodeURIComponent(input.modelId)}/converse`, {
      method: "POST",
      headers: { Authorization: `Bearer ${bearer()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ system: input.system, messages: input.messages, inferenceConfig: input.inferenceConfig }),
    })
    const json = (await res.json().catch(() => null)) as { output?: { message?: { content?: { text?: string }[] } }; Message?: string; message?: string } | null
    if (!res.ok) throw new Error(json?.Message ?? json?.message ?? `Bedrock ${res.status}`)
    return json?.output?.message?.content?.map((c) => c.text ?? "").join("") ?? ""
  }
  const { BedrockRuntimeClient, ConverseCommand } = await import("@aws-sdk/client-bedrock-runtime")
  const client = new BedrockRuntimeClient({ region: region() })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await client.send(new ConverseCommand(input as any))
  return r.output?.message?.content?.map((c) => ("text" in c ? (c.text ?? "") : "")).join("") ?? ""
}
