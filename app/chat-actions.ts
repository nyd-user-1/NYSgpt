"use server"

import { currentUser } from "@/lib/auth"
import { listChats, patchChat, readChat, writeChat, type ChatMessage, type ChatMeta } from "@/lib/chats"

// The reader's saved /chat conversations, ported with the chat from trinity (2026-11-03). Signed
// out, nothing is kept. Where the chats' store (the nysgpt-ledger DynamoDB table, lib/ledger.ts)
// can't be reached — it does not exist yet — each action answers as if nothing were kept, quietly,
// instead of a 500 on every page.

async function reader(): Promise<string | null> {
  const u = await currentUser()
  return u ? u.email : null
}

const ID = /^[\w-]{8,64}$/

const quiet = <T, E>(work: Promise<T>, empty: E): Promise<T | E> => work.catch(() => empty)

export async function myChats(): Promise<ChatMeta[]> {
  const who = await reader()
  return who ? quiet(listChats(who), []) : []
}

export async function saveChat(id: string, messages: ChatMessage[]): Promise<ChatMeta | null> {
  const who = await reader()
  if (!who || !ID.test(id) || messages.length === 0) return null
  const clean = messages.map((m) => ({ id: String(m.id), role: m.role === "user" ? ("user" as const) : ("assistant" as const), content: String(m.content ?? ""), ...(m.model ? { model: String(m.model) } : {}) }))
  return quiet(writeChat(who, id, clean), null)
}

export async function updateChat(id: string, patch: { title?: string; favorite?: boolean; pinned?: boolean; hidden?: boolean; archived?: boolean }): Promise<ChatMeta | null> {
  const who = await reader()
  if (!who || !ID.test(id)) return null
  const p: typeof patch = {}
  if (typeof patch.title === "string") p.title = patch.title.slice(0, 120)
  for (const k of ["favorite", "pinned", "hidden", "archived"] as const) if (typeof patch[k] === "boolean") p[k] = patch[k]
  return quiet(patchChat(who, id, p), null)
}

/** For the /chat page's server render. */
export async function openChat(id: string) {
  const who = await reader()
  return who && ID.test(id) ? quiet(readChat(who, id), null) : null
}

/** The evidence behind a chat script's citations, by id. NYSgpt holds no evidence base yet:
 *  every id answers empty, so the citations panel shows the quotes alone. */
export async function citeEvidence(_ids: string[]): Promise<{ cites: Record<string, { finding: string }>; facts: string[] }> {
  return { cites: {}, facts: [] }
}
