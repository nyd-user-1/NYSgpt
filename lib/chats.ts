import "server-only"

import { get, put, query, remove, type Item } from "@/lib/ledger"

// /chat's conversations, kept per reader in the ledger table (DynamoDB) so they survive a reload and
// list in the sidebar. Two rows per chat, so the sidebar's list reads the small one alone:
//
//   pk               sk          item
//   CHATS#<reader>   <chat id>   the list row: title, favorite, pinned, hidden, archived, createdAt, updatedAt
//   CHAT#<reader>    <chat id>   the messages
//
// These are views of the reader's own work, rewritten in place (like BOOSTED#), not ledger decisions.

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string; model?: string }
export type ChatMeta = { id: string; title: string; favorite: boolean; pinned: boolean; hidden: boolean; archived: boolean; createdAt: string; updatedAt: string }

type MetaRow = Item & Omit<ChatMeta, "id">
type BodyRow = Item & { messages: ChatMessage[] }

// DynamoDB refuses an item over 400 KB; a chat past that keeps its newest turns.
const MAX_BYTES = 350_000

const metaOf = (r: MetaRow): ChatMeta => ({ id: r.sk, title: r.title, favorite: !!r.favorite, pinned: !!r.pinned, hidden: !!r.hidden, archived: !!r.archived, createdAt: r.createdAt, updatedAt: r.updatedAt })

/** Newest first. */
export async function listChats(who: string): Promise<ChatMeta[]> {
  return (await query<MetaRow>(`CHATS#${who}`)).map(metaOf).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function readChat(who: string, id: string): Promise<{ meta: ChatMeta; messages: ChatMessage[] } | null> {
  const [m, b] = await Promise.all([get<MetaRow>(`CHATS#${who}`, id), get<BodyRow>(`CHAT#${who}`, id)])
  return m ? { meta: metaOf(m), messages: b?.messages ?? [] } : null
}

/** The first question, on one line, until the reader renames it. */
const titleFrom = (messages: ChatMessage[]) => (messages.find((m) => m.role === "user")?.content ?? "New chat").replace(/\s+/g, " ").trim().slice(0, 120)

export async function writeChat(who: string, id: string, messages: ChatMessage[]): Promise<ChatMeta> {
  let kept = messages
  while (kept.length > 2 && JSON.stringify(kept).length > MAX_BYTES) kept = kept.slice(2)
  const prev = await get<MetaRow>(`CHATS#${who}`, id)
  const at = new Date().toISOString()
  const row: MetaRow = { pk: `CHATS#${who}`, sk: id, title: prev?.title ?? titleFrom(messages), favorite: !!prev?.favorite, pinned: !!prev?.pinned, hidden: !!prev?.hidden, archived: !!prev?.archived, createdAt: prev?.createdAt ?? at, updatedAt: at }
  await Promise.all([put({ pk: `CHAT#${who}`, sk: id, messages: kept }), put(row)])
  return metaOf(row)
}

export async function patchChat(who: string, id: string, patch: Partial<Pick<ChatMeta, "title" | "favorite" | "pinned" | "hidden" | "archived">>): Promise<ChatMeta | null> {
  const prev = await get<MetaRow>(`CHATS#${who}`, id)
  if (!prev) return null
  const title = patch.title?.replace(/\s+/g, " ").trim()
  // A rename is not activity: the chat keeps its place in the list.
  const row: MetaRow = { ...prev, ...patch, title: title || prev.title }
  await put(row)
  return metaOf(row)
}

export async function deleteChat(who: string, id: string) {
  await Promise.all([remove(`CHATS#${who}`, id), remove(`CHAT#${who}`, id)])
}
