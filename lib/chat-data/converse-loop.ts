import "server-only"

import { ConverseStreamCommand, type ContentBlock, type ConverseStreamCommandInput, type ConverseStreamCommandOutput, type Message, type Tool, type ToolUseBlock } from "@aws-sdk/client-bedrock-runtime"

// /chat's tool loop (Brendan, 2026-11-02, with the data tools of ./tools.ts). /chat streams plain text,
// one Bedrock call per answer; with tools, a turn the model ends asking for one runs it here, appends the
// call and its result to the conversation, and streams the next call's text on after it, up to a few
// rounds. The reader sees one answer. The system prompt and the tool list carry cache points, so a second
// round reads them at a tenth of the input rate, as the agents' loop does (lib/agents/bedrock.ts).

const CACHE_POINT = { type: "default" as const }

export type RunTool = (name: string, input: Record<string, unknown>) => Promise<{ ok: boolean; payload: unknown }>

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
  /** NYSgpt (brief 49): each model call's token counts, from the stream's metadata, for the chat's log. */
  onUsage?: (usage: { inputTokens?: number; outputTokens?: number; cacheReadInputTokens?: number; cacheWriteInputTokens?: number }) => void
}

/** The answer's text as it streams, across as many tool rounds as the model asks for (within maxRounds). */
export async function* streamWithTools(args: LoopArgs): AsyncGenerator<string, { rounds: number; tools: string[] }, void> {
  const maxRounds = args.maxRounds ?? 4
  const messages = [...args.messages]
  const called: string[] = []
  let ended = ""
  for (let round = 1; ; round++) {
    const r = await args.send(
      new ConverseStreamCommand({
        modelId: args.modelId,
        system: [{ text: args.system }, { cachePoint: CACHE_POINT }],
        messages,
        inferenceConfig: args.inferenceConfig,
        toolConfig: { tools: [...args.tools, { cachePoint: CACHE_POINT }] },
      }),
    )
    const texts = new Map<number, string>()
    const starts = new Map<number, { toolUseId: string; name: string }>()
    const inputs = new Map<number, string>()
    const blocks: ContentBlock[] = []
    let stop = "end_turn"
    for await (const ev of r.stream ?? []) {
      if (ev.contentBlockStart?.start?.toolUse) {
        const { toolUseId, name } = ev.contentBlockStart.start.toolUse
        const i = ev.contentBlockStart.contentBlockIndex ?? 0
        if (toolUseId && name) starts.set(i, { toolUseId, name }), inputs.set(i, "")
      } else if (ev.contentBlockDelta?.delta) {
        const i = ev.contentBlockDelta.contentBlockIndex ?? 0
        const d = ev.contentBlockDelta.delta
        if (d.text) {
          texts.set(i, (texts.get(i) ?? "") + d.text)
          ended = d.text
          yield d.text
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
      }
      else {
        const failure = ev.internalServerException ?? ev.modelStreamErrorException ?? ev.validationException ?? ev.throttlingException ?? ev.serviceUnavailableException
        if (failure) throw new Error(failure.message ?? "Bedrock stream error")
      }
    }

    const uses = blocks.flatMap((b) => (b.toolUse ? [b.toolUse] : []))
    // Done: an answer, or a call on the last round (which the last results asked it not to make).
    if (stop !== "tool_use" || !uses.length || round >= maxRounds) return { rounds: round, tools: called }

    // Run the calls (in parallel: they are reads), answer each, and go round again.
    messages.push({ role: "assistant", content: blocks })
    const results = await Promise.all(
      uses.map(async (u) => {
        called.push(u.name as string)
        const out = await args.run(u.name as string, (u.input ?? {}) as Record<string, unknown>).catch(() => ({ ok: false, payload: { error: "The lookup failed." } }))
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
