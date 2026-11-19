// The chat's model picker, after 44b's list (src/components/model-options.ts) and leuk's
// (lib/ai/model-options.ts), with the same provider marks. Every id here answered a Converse call on
// this account in us-east-1 on 2026-10-20; the newer profiles Bedrock lists (Claude 5.x, GPT-6, Grok 4.7,
// GLM-5.3) are not enabled here, and Nova Premier, Opus 4.1 and Palmyra X4 are retired or legacy. The chat
// route takes only ids in this list. Kept free of server imports: the picker and the route both read it.

export type ModelOption = { id: string; label: string; description: string; logo: string }

const L = (f: string) => `/logos/models/${f}`

export const MODEL_OPTIONS: ModelOption[] = [
  { id: "us.anthropic.claude-sonnet-4-6", label: "Claude Sonnet 4.6", description: "Fast and smart", logo: L("anthropic.webp") },
  { id: "us.anthropic.claude-haiku-4-5-20251001-v1:0", label: "Claude Haiku 4.5", description: "Fastest", logo: L("anthropic.webp") },
  { id: "us.anthropic.claude-opus-4-6-v1", label: "Claude Opus 4.6", description: "Most capable", logo: L("anthropic.webp") },
  { id: "us.anthropic.claude-opus-4-5-20251101-v1:0", label: "Claude Opus 4.5", description: "Anthropic", logo: L("anthropic.webp") },
  { id: "us.anthropic.claude-sonnet-4-5-20250929-v1:0", label: "Claude Sonnet 4.5", description: "Anthropic", logo: L("anthropic.webp") },
  { id: "openai.gpt-oss-120b-1:0", label: "gpt-oss 120B", description: "OpenAI, open weight", logo: L("openai.webp") },
  { id: "us.meta.llama4-maverick-17b-instruct-v1:0", label: "Llama 4 Maverick", description: "Meta, open weight", logo: L("meta_small.svg") },
  { id: "us.meta.llama4-scout-17b-instruct-v1:0", label: "Llama 4 Scout", description: "Meta, long context", logo: L("meta_small.svg") },
  { id: "us.meta.llama3-3-70b-instruct-v1:0", label: "Llama 3.3 70B", description: "Meta workhorse", logo: L("meta_small.svg") },
  { id: "us.mistral.pixtral-large-2502-v1:0", label: "Pixtral Large", description: "Mistral, vision", logo: L("mistral_small.png") },
  { id: "mistral.mistral-large-3-675b-instruct", label: "Mistral Large 3", description: "Mistral 675B", logo: L("mistral_small.png") },
  { id: "us.amazon.nova-pro-v1:0", label: "Nova Pro", description: "Amazon, fast", logo: L("amazon.webp") },
  { id: "us.amazon.nova-2-lite-v1:0", label: "Nova 2 Lite", description: "Amazon, light", logo: L("amazon.webp") },
  { id: "us.deepseek.r1-v1:0", label: "DeepSeek R1", description: "DeepSeek, reasoning", logo: L("deepseek_small.svg") },
  { id: "us.moonshotai.kimi-k3", label: "Kimi K3", description: "Moonshot, newest", logo: L("kimi.jpg") },
  { id: "moonshotai.kimi-k2.5", label: "Kimi K2.5", description: "Moonshot, open weight", logo: L("kimi.jpg") },
  { id: "moonshot.kimi-k2-thinking", label: "Kimi K2 Thinking", description: "Moonshot, reasoning", logo: L("kimi.jpg") },
  { id: "qwen.qwen3-next-80b-a3b", label: "Qwen3 Next 80B", description: "Alibaba, open weight", logo: L("alibaba_small.svg") },
  { id: "minimax.minimax-m2.5", label: "MiniMax M2.5", description: "MiniMax, open weight", logo: L("minimax_small.svg") },
  { id: "zai.glm-5", label: "GLM-5", description: "Z AI, open weight", logo: L("zai_small.svg") },
]

export const DEFAULT_MODEL_ID = MODEL_OPTIONS[0].id
export const MODEL_IDS = new Set(MODEL_OPTIONS.map((m) => m.id))
export const modelById = (id: string | undefined) => MODEL_OPTIONS.find((m) => m.id === id) ?? MODEL_OPTIONS[0]
