import type { BasketKind } from "@/lib/note-basket"

// What a card is to a note's basket (Brendan, 2026-11-02): the payload its menu's Add to the note adds, carried on the
// card's root as data-collect so Option and a right-click can gather it while a note is open in Collect
// (components/notes/gather.tsx). No "use client": a server-drawn card (Survey's cards) marks its root too.

/** Without a path it is the page it is gathered on; without a key, the page and the anchor (lib/note-basket.ts basketKey). */
export type Collectible = { kind: BasketKind; title: string; anchor: string; path?: string; key?: string; question?: { text: string; options: string[] } }

export const COLLECT_ATTR = "data-collect"

/** Spread on a card's root: `<li {...collectAttr(item)}>`. Nothing without a title, as the menu row shows none. */
export const collectAttr = (c: Collectible | null | undefined): { "data-collect"?: string } => (c?.title ? { [COLLECT_ATTR]: JSON.stringify(c) } : {})

/** A clip: by its id, at its address. Its menu's Add to the note adds it, and a tile or a feed item carries it. Here,
 *  not beside the menu, so the grid doesn't load the menu to mark its tiles. */
export const clipCollect = (clip: { id: string; title: string }): Collectible => ({ kind: "clip", key: `clip:${clip.id}`, title: clip.title, path: `/clips?c=${encodeURIComponent(clip.id)}`, anchor: "" })
