"use client"

import * as React from "react"

import { FIELD } from "@/components/go-to-menu"
import { addToBasket, isCollecting, itemOf } from "@/lib/note-basket"
import { COLLECT_ATTR, type Collectible } from "@/lib/note-collect"

// The right-click's family (Brendan, 2026-11-02): a right-click opens a link in the second panel, Shift and a
// right-click opens the Nav, and Option and a right-click gathers. While a note is open in Collect, Option and a
// right-click anywhere on a card adds the card to the note, the payload its menu's Add to the note adds; each card's
// root carries it as data-collect (lib/note-collect.ts). The menu row stays: this is its accelerator. Out of
// Collect, off a card, or in a text field, nothing changes and the browser's menu shows.

/** The card a right-click gathers, or null when the gesture isn't Collect's: Option without Shift (Shift's is the
 *  Nav), a note collecting, not in a text field, on a card's root or inside one (the innermost, a row in a block). */
export function gatherable(e: MouseEvent): { root: HTMLElement; item: Collectible } | null {
  if (!e.altKey || e.shiftKey || e.defaultPrevented || !isCollecting()) return null
  const target = e.target instanceof Element ? e.target : null
  if (!target || target.closest(FIELD)) return null
  const root = target.closest<HTMLElement>(`[${COLLECT_ATTR}]`)
  if (!root) return null
  try {
    const item = JSON.parse(root.getAttribute(COLLECT_ATTR) ?? "") as Collectible
    return item?.kind && item.title ? { root, item } : null
  } catch {
    return null
  }
}

/** The card's press played once (pax2.css .press:active), so the reader sees it taken. */
const flash = (el: HTMLElement) => el.animate?.([{ transform: "scale(1)" }, { transform: "scale(0.97)" }, { transform: "scale(1)" }], { duration: 260, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" })

/** The shell's listener. It listens first (capture) and, when it gathers, alone: the row's own right-click (a question
 *  opening in the second panel) and the link's don't also run. */
export function useGather() {
  React.useEffect(() => {
    const on = (e: MouseEvent) => {
      const hit = gatherable(e)
      if (!hit) return
      e.preventDefault()
      e.stopPropagation()
      addToBasket(itemOf(hit.item, window.location.pathname + window.location.search))
      flash(hit.root)
    }
    window.addEventListener("contextmenu", on, true)
    return () => window.removeEventListener("contextmenu", on, true)
  }, [])
}

/** A block's card or a settings block: the root a mark inside it belongs to. */
const CARD_ROOT = '[data-slot="card"], [data-block]'

/** For a card whose root another component draws (CardTools in a block's header, a question card's menu): puts the
 *  payload on the nearest card root around `ref`, and takes it off again. */
export function useCollectMark(ref: React.RefObject<HTMLElement | null>, item: Collectible | null) {
  const value = item?.title ? JSON.stringify(item) : null
  React.useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(CARD_ROOT)
    if (!root || !value) return
    root.setAttribute(COLLECT_ATTR, value)
    return () => {
      if (root.getAttribute(COLLECT_ATTR) === value) root.removeAttribute(COLLECT_ATTR)
    }
  }, [ref, value])
}

/** useCollectMark for a component without an element of its own to start from (a menu): a hidden span. */
export function CollectMark({ item }: { item: Collectible | null }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  useCollectMark(ref, item)
  return <span ref={ref} hidden />
}
