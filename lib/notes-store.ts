"use client"

// The reader's drawn notes, kept in this browser (brief 61). pax-trinity keeps them on its server (app/note-actions.ts
// over lib/notes.ts, a DynamoDB table per reader); NYSgpt has no store for a signed-in reader's notes, so the same
// functions, with the same names and answers, keep them in localStorage under NYSgpt's own key. A note is kept once
// there is something in it, the note or its chat; its title is its first line.

export type Note = { id: string; videoId: string; title: string; bodyMd: string; chatMd?: string; createdAt: string; updatedAt: string }

const KEY = "nysgpt-notes"
// pax-trinity's cap (DynamoDB refuses an item over 400 KB); localStorage holds about 5 MB in all.
const MAX_BYTES = 350_000
const ID = /^[\w-]{8,64}$/

/** First non-empty line of the markdown, its syntax stripped: the note's title. */
const titleOf = (md: string) =>
  (md.split("\n").map((l) => l.replace(/<[^>]+>/g, "").replace(/^[#>\-*+\s]+|\d+\.\s+/g, "").replace(/[*_`]/g, "").trim()).find(Boolean) ?? "Untitled note").slice(0, 120)

const read = (): Note[] => {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Note[]
    return Array.isArray(all) ? all : []
  } catch {
    return []
  }
}
/** Throws when the browser refuses (storage full or off), so the card says it wasn't saved. */
const write = (all: Note[]) => localStorage.setItem(KEY, JSON.stringify(all))

function put(id: string, patch: { title: string; bodyMd: string; chatMd?: string }): Note {
  const all = read()
  const prev = all.find((n) => n.id === id)
  const at = new Date().toISOString()
  const bodyMd = patch.bodyMd.slice(0, MAX_BYTES)
  const chatMd = (patch.chatMd ?? prev?.chatMd)?.slice(0, MAX_BYTES - bodyMd.length)
  const note: Note = { id, videoId: "", title: patch.title.slice(0, 200), bodyMd, chatMd, createdAt: prev?.createdAt ?? at, updatedAt: at }
  write([note, ...all.filter((n) => n.id !== id)])
  return note
}

/** The reader's own notes, newest edit first. kept is false when this browser keeps nothing. */
export async function myNotes(): Promise<{ notes: Note[]; kept: boolean }> {
  try {
    return { notes: read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), kept: true }
  } catch {
    return { notes: [], kept: false }
  }
}

/** A drawn note's first save: it is kept once there is something in it, the note or its chat. A note with nothing
 *  written takes its title from the chat. */
export async function createMyNote(bodyMd: string, chatMd = ""): Promise<Note | null> {
  const body = String(bodyMd)
  const chat = String(chatMd)
  if (!(body.trim() || chat.trim())) return null
  return put(crypto.randomUUID(), { title: titleOf(body.trim() ? body : chat), bodyMd: body, chatMd: chat })
}

export async function openNote(id: string): Promise<Note | null> {
  if (!ID.test(id)) return null
  return read().find((n) => n.id === id) ?? null
}

/** chatMd is a drawn note's chat; left out, the chat there is stays. */
export async function saveNote(id: string, bodyMd: string, chatMd?: string): Promise<Note | null> {
  if (!ID.test(id)) return null
  const prev = read().find((n) => n.id === id)
  if (!prev) return null
  const body = String(bodyMd)
  const chat = chatMd === undefined ? undefined : String(chatMd)
  return put(id, { title: titleOf(body.trim() ? body : (chat ?? prev.chatMd ?? "")), bodyMd: body, chatMd: chat })
}

export async function removeNote(id: string): Promise<boolean> {
  if (!ID.test(id)) return false
  write(read().filter((n) => n.id !== id))
  return true
}
