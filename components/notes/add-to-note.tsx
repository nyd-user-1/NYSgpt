"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { StickyNote } from "lucide-react"

import { MenuRow } from "@/components/kebab-menu"
import { basketKey, useBasket, type BasketKind } from "@/lib/note-basket"

// Add to the note (Brendan, 2026-11-02): Add to Blocks' sibling in every card's menu, there only while a note is open
// in Collect (lib/note-basket.ts). The card goes into the note's basket under its page and anchor; a second pick
// takes it back out, as Add to Blocks does.

export function AddToNoteRow({ title, anchor, kind = "block", question, path }: { title: string; anchor: string; kind?: BasketKind; question?: { text: string; options: string[] }; path?: string }) {
  const pathname = usePathname()
  const basket = useBasket()
  if (!basket.open || !title) return null
  const where = path ?? `${pathname}${typeof window === "undefined" ? "" : window.location.search}`
  const key = basketKey(where, anchor)
  const on = basket.has(key)
  return <MenuRow icon={<StickyNote />} label={on ? "Remove from the note" : "Add to the note"} checked={on} onClick={() => (on ? basket.remove(key) : basket.add({ key, kind, title, path: where, anchor, question }))} />
}
