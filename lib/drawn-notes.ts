"use client"

import * as React from "react"

// Drawn notes (Brendan, 2026-10-31): Shift and a drag anywhere draws a note's card (components/notes/draw-notes.tsx);
// it keeps itself as one of the reader's own notes (app/note-actions.ts), listed in the Inbox under My notes.
// NYSgpt (brief 61): kept in this browser (lib/notes-store.ts), and its keys and events are NYSgpt's own.

/** Told when a drawn note is kept or deleted, so My notes reads again. */
export const NOTES_CHANGED = "nysgpt-notes-changed"
/** Asks the shell to open a kept note as a card. */
export const NOTE_OPEN = "nysgpt-note-open"

export function openDrawnNote(id: string) {
  window.dispatchEvent(new CustomEvent(NOTE_OPEN, { detail: { id } }))
}

// The notes starred from a note's menu, kept in this browser as the sidebar's favorites are (lib/nav-favorites.ts):
// My notes lists them first.
const FAV_KEY = "nysgpt-note-favorites"
const FAV_EVENT = "nysgpt-note-favorites"
const readFavs = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]") as string[]
  } catch {
    return []
  }
}

export function useNoteFavorites() {
  const [favs, setFavs] = React.useState<string[]>([])
  React.useEffect(() => {
    const on = () => setFavs(readFavs())
    on()
    window.addEventListener(FAV_EVENT, on)
    window.addEventListener("storage", on)
    return () => {
      window.removeEventListener(FAV_EVENT, on)
      window.removeEventListener("storage", on)
    }
  }, [])
  const toggle = React.useCallback((id: string) => {
    const now = readFavs()
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(now.includes(id) ? now.filter((x) => x !== id) : [...now, id]))
    } catch {}
    window.dispatchEvent(new Event(FAV_EVENT))
  }, [])
  return { favs, toggle }
}

// The card's shapes (Brendan, 2026-11-02): what a drawn note can be, switched from its header. The reader's default,
// kept in this browser, is the shape a card opens on.
export type NoteShape = "note" | "chat" | "compose" | "collect" | "team" | "watch"
const SHAPE_KEY = "nysgpt-note-default-shape"
const SHAPE_EVENT = "nysgpt-note-default-shape"

export function readDefaultShape(): NoteShape | null {
  try {
    return (localStorage.getItem(SHAPE_KEY) as NoteShape | null) ?? null
  } catch {
    return null
  }
}

export function useDefaultShape() {
  const [shape, setShape] = React.useState<NoteShape | null>(null)
  React.useEffect(() => {
    const on = () => setShape(readDefaultShape())
    on()
    window.addEventListener(SHAPE_EVENT, on)
    window.addEventListener("storage", on)
    return () => {
      window.removeEventListener(SHAPE_EVENT, on)
      window.removeEventListener("storage", on)
    }
  }, [])
  const choose = React.useCallback((next: NoteShape) => {
    try {
      localStorage.setItem(SHAPE_KEY, next)
    } catch {}
    window.dispatchEvent(new Event(SHAPE_EVENT))
  }, [])
  return { shape, choose }
}
