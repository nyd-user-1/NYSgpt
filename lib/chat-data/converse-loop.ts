import "server-only"

import { ConverseStreamCommand, type ContentBlock, type ConverseStreamCommandInput, type ConverseStreamCommandOutput, type Message, type Tool, type ToolUseBlock } from "@aws-sdk/client-bedrock-runtime"

// /chat's tool loop (Brendan, 2026-11-02, with the data tools of ./tools.ts). /chat streams plain text,
// one Bedrock call per answer; with tools, a turn the model ends asking for one runs it here, appends the
// call and its result to the conversation, and streams the next call's text on after it, up to a few
// rounds. The reader sees one answer. The system prompt and the tool list carry cache points, so a second
// round reads them at a tenth of the input rate, as the agents' loop does (lib/agents/bedrock.ts).
//
// NYSgpt (brief 49), three additions to pax-trinity's loop:
//   - onUsage: each call's token counts, for the chat's log and the night's caps;
//   - summaries: a tool may return a short summary beside its result; once a later round has its own results, the
//     earlier ones are replaced by their summaries, so a long schema is not re-sent on every round;
//   - held text: a round's text is held back until it is plainly an answer (HOLD characters, or the round ends
//     without a tool call); text a round writes before calling a tool ("Let me search…") is dropped;
//   - the last round answers: it is sent with the conversation as plain text and no tools, so it cannot end in a
//     tool call and leave the reader with nothing.

const CACHE_POINT = { type: "default" as const }

/** Characters of a round's text held back before it streams. */
const HOLD = 240

export type RunTool = (name: string, input: Record<string, unknown>) => Promise<{ ok: boolean; payload: unknown; summary?: string }>

export type LoopArgs = {
  send: (command: ConverseStreamCommand) => Promise<Pick<ConverseStreamCommandOutput, "stream">>
  modelId: string
  system: string
  messages: Message[]
  tools: Tool[]
  run: RunTool
  inferenceConfig?: ConverseStreamCommandInput["inferenceConfig"]
  /** Model calls in all, the answering one included. */
  maxRounds?: number
  /** NYSgpt (brief 49): asked before every model call; false stops the loop there (the night's cap, checked per round). */
  beforeRound?: () => boolean | Promise<boolean>
  /** NYSgpt (brief 49): each model call's token counts, from the stream's metadata, for the chat's log. */
  onUsage?: (usage: { inputTokens?: number; outputTokens?: number; cacheReadInputTokens?: number; cacheWriteInputTokens?: number }) => void
}

/** The conversation as plain text, tool calls and results written out, for a call made without tools. */
function flatten(messages: Message[]): Message[] {
  const out: Message[] = []
  for (const m of messages) {
    const text = (m.content ?? [])
      .map((b) =>
        b.text ??
        (b.toolUse ? `(Earlier I used ${b.toolUse.name} on ${JSON.stringify(b.toolUse.input)}.)` : b.toolResult ? `(What it returned: ${(b.toolResult.content ?? []).map((c) => c.text ?? JSON.stringify(c.json ?? "")).join(" ")})` : ""),
      )
      .filter(Boolean)
      .join("\n")
    if (!text) continue
    const prev = out[out.length - 1]
    if (prev && prev.role === m.role) prev.content = [{ text: `${prev.content?.[0]?.text ?? ""}\n${text}` }]
    else out.push({ role: m.role, content: [{ text }] })
  }
  // The closing instruction: no tools are left, so the answer is written now, in words.
  const close = "There are no more tools. Write the answer to the reader now, in plain words, from what was returned above. Do not write tool calls or SQL. If it does not answer the question, say what I could not find."
  const last = out[out.length - 1]
  if (last?.role === "user") last.content = [{ text: `${last.content?.[0]?.text ?? ""}\n\n${close}` }]
  else out.push({ role: "user", content: [{ text: close }] })
  return out
}

/** The answer's text as it streams, across as many tool rounds as the model asks for (within maxRounds). */
export async function* streamWithTools(args: LoopArgs): AsyncGenerator<string, { rounds: number; tools: string[] }, void> {
  const maxRounds = args.maxRounds ?? 4
  const messages = [...args.messages]
  const called: string[] = []
  /** Each earlier tool result's summary, by its call's id. */
  const summaries = new Map<string, string>()
  let ended = ""
  for (let round = 1; ; round++) {
    if (args.beforeRound && !(await args.beforeRound())) {
      yield `${ended && !ended.endsWith("\n") ? "\n\n" : ""}I stopped before finishing: tonight's spending cap for the chat is reached.`
      return { rounds: round - 1, tools: called }
    }
    const final = round >= maxRounds && round > 1
    const r = await args.send(
      new ConverseStreamCommand({
        modelId: args.modelId,
        system: [{ text: args.system }, { cachePoint: CACHE_POINT }],
        messages: final ? flatten(messages) : messages,
        inferenceConfig: args.inferenceConfig,
        ...(final ? {} : { toolConfig: { tools: [...args.tools, { cachePoint: CACHE_POINT }] } }),
      }),
    )
    const texts = new Map<number, string>()
    const starts = new Map<number, { toolUseId: string; name: string }>()
    const inputs = new Map<number, string>()
    const blocks: ContentBlock[] = []
    let stop = "end_turn"
    let held = ""
    let streaming = false
    let sawTool = false
    for await (const ev of r.stream ?? []) {
      if (ev.contentBlockStart?.start?.toolUse) {
        const { toolUseId, name } = ev.contentBlockStart.start.toolUse
        const i = ev.contentBlockStart.contentBlockIndex ?? 0
        if (toolUseId && name) starts.set(i, { toolUseId, name }), inputs.set(i, "")
        sawTool = true
        held = ""
      } else if (ev.contentBlockDelta?.delta) {
        const i = ev.contentBlockDelta.contentBlockIndex ?? 0
        const d = ev.contentBlockDelta.delta
        if (d.text) {
          texts.set(i, (texts.get(i) ?? "") + d.text)
          if (sawTool) continue
          if (streaming) {
            ended = d.text
            yield d.text
          } else {
            held += d.text
            if (held.length >= HOLD) {
              streaming = true
              ended = held
              yield held
              held = ""
            }
          }
        } else if (d.toolUse?.input !== undefined) inputs.set(i, (inputs.get(i) ?? "") + d.toolUse.input)
      } else if (ev.contentBlockStop) {
        const i = ev.contentBlockStop.contentBlockIndex ?? 0
        const start = starts.get(i)
        if (start) {
          let input: ToolUseBlock["input"] = {}
          try {
            const raw = inputs.get(i) ?? ""
            if (raw.trim()) input = JSON.parse(raw)
          } catch {
            input = {}
          }
          blocks.push({ toolUse: { toolUseId: start.toolUseId, name: start.name, input } })
        } else if (texts.get(i)) blocks.push({ text: texts.get(i) as string })
      } else if (ev.messageStop?.stopReason) stop = ev.messageStop.stopReason
      else if (ev.metadata) {
        if (ev.metadata.usage) args.onUsage?.(ev.metadata.usage)
      } else {
        const failure = ev.internalServerException ?? ev.modelStreamErrorException ?? ev.validationException ?? ev.throttlingException ?? ev.serviceUnavailableException
        if (failure) throw new Error(failure.message ?? "Bedrock stream error")
      }
    }
    // A short answer that never reached HOLD, from a round that called no tool.
    if (held && !sawTool) {
      ended = held
      yield held
    }

    const uses = blocks.flatMap((b) => (b.toolUse ? [b.toolUse] : []))
    // Done: an answer, or a call on the last round (which the last results asked it not to make).
    if (stop !== "tool_use" || !uses.length || round >= maxRounds) return { rounds: round, tools: called }

    // Earlier rounds' results give way to their summaries before this round's results go in.
    for (const m of messages) {
      if (m.role !== "user" || !m.content) continue
      for (const b of m.content) {
        const id = b.toolResult?.toolUseId
        if (id && summaries.has(id)) b.toolResult!.content = [{ text: summaries.get(id)! }]
      }
    }

    // Run the calls (in parallel: they are reads), answer each, and go round again.
    messages.push({ role: "assistant", content: blocks })
    const results = await Promise.all(
      uses.map(async (u) => {
        called.push(u.name as string)
        const out: { ok: boolean; payload: unknown; summary?: string } = await args.run(u.name as string, (u.input ?? {}) as Record<string, unknown>).catch(() => ({ ok: false, payload: { error: "The lookup failed." } }))
        if (out.summary) summaries.set(u.toolUseId as string, out.summary)
        return { toolResult: { toolUseId: u.toolUseId as string, content: [{ text: JSON.stringify(out.payload) }], ...(out.ok ? {} : { status: "error" as const }) } }
      }),
    )
    const last = round + 1 >= maxRounds
    messages.push({ role: "user", content: [...results, ...(last ? [{ text: "Answer now from what the lookups returned; no more lookups." }] : [])] })
    // A sentence before the lookup and the answer after it read as two paragraphs, not one run-on line.
    if (ended && !ended.endsWith("\n")) yield "\n\n"
    ended = ""
  }
}
