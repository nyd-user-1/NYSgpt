"use server"

// NYSgpt stand-in for pax-trinity's src/app/chat-actions.ts (brief 46): the same exports the chat imports, without pax-trinity's
// services. What it would do there is said beside each export.

// pax-trinity keeps each signed-in reader's chats in DynamoDB (lib/chats.ts). NYSgpt keeps none yet.

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string; model?: string }
export type ChatMeta = { id: string; title: string; favorite: boolean; pinned: boolean; hidden: boolean; archived: boolean; createdAt: string; updatedAt: string }

/** Saves a chat (pax-trinity: DynamoDB). Here: nothing is kept. */
export async function saveChat(id: string, messages: ChatMessage[]): Promise<ChatMeta | null> {
  void id
  void messages
  return null
}

/** Opens a saved chat for the page's server render. Here: none are kept. */
export async function openChat(id: string): Promise<{ meta: ChatMeta; messages: ChatMessage[] } | null> {
  void id
  return null
}

/** The saved chats, newest first, for the inset right rail on /chat (components/chat/ChatInsetPanel.tsx; pax-trinity: DynamoDB). Here: none are kept. */
export async function listChats(): Promise<ChatMeta[]> {
  return []
}

/** One citation's evidence, as the citations panel reads it (components/chat/script-citations.tsx). */
type Cite = { finding: string; research: { label: string; diff: number; low: number; high: number; ads: number; outcome: "votechoice" | "favorability" } | null; channel: { label: string; points: number; low: number; high: number; channels: number; scope: string } | null; source: { label: string; href: string } | null }

/** The evidence behind a chat script's citations (pax-trinity: its evidence library). Here: none. */
export async function citeEvidence(ids: string[]): Promise<{ cites: Record<string, Cite>; facts: string[] }> {
  void ids
  return { cites: {}, facts: [] }
}
