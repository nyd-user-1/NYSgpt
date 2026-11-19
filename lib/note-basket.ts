"use client"

import * as React from "react"

import type { Collectible } from "@/lib/note-collect"

// A note's Collect shape (Brendan, 2026-11-02): a basket that follows the reader from page to page. While a note is
// open in Collect, every card's menu offers Add to the note beside Add to Blocks; what is collected (questions,
// values, clips, model cards, blocks) lists in the note, kept in this browser until it is emptied. From there it all
// goes to Blocks at once, or its questions become a survey draft (lib/consensus/draft.ts).

export type BasketKind = "question" | "value" | "clip" | "model" | "block"

export type BasketItem = {
  /** One item once: the page with its query and the card's anchor, or a clip's id. */
  key: string
  kind: BasketKind
  title: string
  /** Where it lives, and its card there. */
  path: string
  anchor: string
  /** A question's wording and answer options, as the survey draft takes them. */
  question?: { text: string; options: string[] }
  added: string
}

const KEY = "pax2-note-basket"
const EVENT = "pax2-note-basket"

const read = (): BasketItem[] => {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) ?? "[]") as BasketItem[]
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}
const write = (items: BasketItem[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {}
  window.dispatchEvent(new Event(EVENT))
}

// How many notes are open in Collect right now: the menus offer Add to the note while any is.
let collecting = 0

/** A note in Collect says so while it is open; the cleanup says it closed. */
export function openCollect(): () => void {
  collecting += 1
  window.dispatchEvent(new Event(EVENT))
  return () => {
    collecting = Math.max(0, collecting - 1)
    window.dispatchEvent(new Event(EVENT))
  }
}

export function useBasket() {
  const [items, setItems] = React.useState<BasketItem[]>([])
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const on = () => {
      setItems(read())
      setOpen(collecting > 0)
    }
    on()
    window.addEventListener(EVENT, on)
    window.addEventListener("storage", on)
    return () => {
      window.removeEventListener(EVENT, on)
      window.removeEventListener("storage", on)
    }
  }, [])
  const add = React.useCallback((item: Omit<BasketItem, "added">) => addToBasket(item), [])
  const remove = React.useCallback((key: string) => write(read().filter((x) => x.key !== key)), [])
  const clear = React.useCallback(() => write([]), [])
  const has = React.useCallback((key: string) => items.some((x) => x.key === key), [items])
  return { items, open, add, remove, clear, has }
}

/** The address a card is collected under: the page with its query, and its anchor. */
export const basketKey = (path: string, anchor: string) => `${path}#${anchor}`

/** Into the basket, once: an item added again keeps one copy. */
export function addToBasket(item: Omit<BasketItem, "added">) {
  write([...read().filter((x) => x.key !== item.key), { ...item, added: new Date().toISOString() }])
}

/** Whether a note is open in Collect right now. */
export const isCollecting = () => collecting > 0

/** A card's payload (lib/note-collect.ts) as the basket keeps it, gathered on the page `here` (its path with its query). */
export function itemOf(c: Collectible, here: string): Omit<BasketItem, "added"> {
  const path = c.path ?? here
  return { key: c.key ?? basketKey(path, c.anchor), kind: c.kind, title: c.title, path, anchor: c.anchor, ...(c.question ? { question: c.question } : {}) }
}
