// NYSgpt stand-in for pax-trinity's src/lib/agents/registry.ts (brief 46): the same exports the chat imports, without pax-trinity's
// services. What it would do there is said beside each export.

// pax-trinity's three agents (with their tools, prompts and starters) are what @ reaches in the chat.
// Placeholder until NYSgpt's are named.

export type AgentDefinition = { slug: string; name: string; speciality: string }

export const AGENTS: AgentDefinition[] = [{ slug: "placeholder-agent", name: "Placeholder agent", speciality: "Placeholder: an NYSgpt agent goes here." }]
