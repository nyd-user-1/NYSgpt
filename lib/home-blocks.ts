"use client"

import * as React from "react"

// The Blocks shelf in the discussion panel. It holds a handful of shorts, and any block on any page can
// be added to it from the block's menu. Pressing a block opens its page; pressing a short opens its drawer.
// Added blocks live in this browser (localStorage), and every open view hears the list change.

export type ShelfVideo = { id: string; title: string; channel: string; ratio: number; duration: string }

// Hand-picked from home-feed.json: reform shorts with files on hand, strongest against their own
// channel's median first.
export const SHELF: ShelfVideo[] = [
  { id: "u98EznmnpGg", title: "More debate, not less", channel: "Open Primaries", ratio: 13.98, duration: "0:12" },
  { id: "H0m1eql9Uqk", title: "Just Join A Party To Vote", channel: "Open Primaries", ratio: 8.26, duration: "0:57" },
  { id: "M97WyXecL_A", title: "young voters shut out of system in NYC", channel: "Open Primaries", ratio: 5.96, duration: "0:59" },
  { id: "mV0zO4WIWWc", title: "What are Open Primaries?", channel: "Courageous Colorado", ratio: 4.89, duration: "0:45" },
  { id: "4HJT8ZzXvRE", title: "How We Can Fix Our Broken Elections", channel: "FairVote", ratio: 4.48, duration: "1:28" },
  { id: "THihu1i6k8Q", title: "Are Elections Rigged?", channel: "Courageous Colorado", ratio: 4.44, duration: "0:46" },
  // The three with the most measured behind their pages, for testing the chat: Fix American Politics is
  // in all five sources (composition, coded traits, thumbnail, transcript features, viometrics); the
  // other two in four.
  { id: "Eg8mPYYr9OU", title: "Fix American Politics", channel: "Unite America", ratio: 2.77, duration: "1:22" },
  { id: "zuq_oPyuRnY", title: "Make Congress Work Better with the Ranked Choice Voting Act", channel: "FairVote", ratio: 53.41, duration: "0:31" },
  { id: "A8fnhDBLfnQ", title: "Who's In Charge?", channel: "Unite America", ratio: 1.88, duration: "1:11" },
]

/** A block put on the shelf: where it lives (its page and anchor) and what it's called. */
export type ShelfBlock = { key: string; title: string; path: string; anchor: string; added: string }

const KEY = "pax2-shelf-blocks"
const EVENT = "pax2-shelf"

const read = (): ShelfBlock[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as ShelfBlock[]
  } catch {
    return []
  }
}
const write = (blocks: ShelfBlock[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(blocks))
  } catch {}
  window.dispatchEvent(new Event(EVENT))
}

// The shelf's order, dragged by hand: item keys, "b:" + a block's key or "v:" + a short's id.
const ORDER = "pax2-shelf-order"
const readOrder = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(ORDER) ?? "[]") as string[]
  } catch {
    return []
  }
}

export type ShelfItem = { key: string; block: ShelfBlock; video?: never } | { key: string; video: ShelfVideo; block?: never }

// Blocks deleted from their page (Brendan, 2026-10-23): hidden there and kept on the shelf. Opening one from
// the shelf, or taking it off the shelf, puts it back on its page.
const HIDDEN = "pax2-hidden-blocks"
const readHidden = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN) ?? "[]") as string[]
  } catch {
    return []
  }
}
const writeHidden = (keys: string[]) => {
  try {
    localStorage.setItem(HIDDEN, JSON.stringify(keys))
  } catch {}
  window.dispatchEvent(new Event(EVENT))
}
export function useHiddenBlocks() {
  const [hidden, setHidden] = React.useState<string[]>([])
  React.useEffect(() => {
    const on = () => setHidden(readHidden())
    on()
    window.addEventListener(EVENT, on)
    window.addEventListener("storage", on)
    return () => {
      window.removeEventListener(EVENT, on)
      window.removeEventListener("storage", on)
    }
  }, [])
  const hide = React.useCallback((key: string) => writeHidden([...readHidden().filter((k) => k !== key), key]), [])
  const show = React.useCallback((key: string) => writeHidden(readHidden().filter((k) => k !== key)), [])
  return { hidden, hide, show }
}

// The page's own blocks (Brendan, 2026-10-23): every block in an ordered column registers here while its
// page is open, so the shelf lists the whole layout, on the page or deleted from it.
export type PageBlock = { page: string; id: string; label: string }
const pageBlocks = new Map<string, PageBlock>()
export function registerPageBlock(b: PageBlock) {
  const k = `${b.page}/${b.id}`
  pageBlocks.set(k, b)
  window.dispatchEvent(new Event(EVENT))
  return () => {
    pageBlocks.delete(k)
    window.dispatchEvent(new Event(EVENT))
  }
}

// The page's own shorts (Brendan, 2026-10-23): a video page lists its channel's shorts on the shelf, after
// the saved items, for as long as the page is open.
let pageShorts: ShelfVideo[] = []
/** Rendered by a page to put its shorts on the shelf; takes them off when the page goes. */
export function PageShorts({ videos }: { videos: ShelfVideo[] }) {
  const ids = videos.map((v) => v.id).join(",")
  React.useEffect(() => {
    pageShorts = videos
    window.dispatchEvent(new Event(EVENT))
    return () => {
      pageShorts = []
      window.dispatchEvent(new Event(EVENT))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])
  return null
}

/** Everything on the shelf in its dragged order. Items the order hasn't met yet go where they belong
 *  by default: a newly added block first, a short last. */
function arrange(blocks: ShelfBlock[], order: string[], extra: ShelfVideo[] = []): ShelfItem[] {
  const shorts = [...SHELF, ...extra.filter((v) => !SHELF.some((s) => s.id === v.id))]
  const all: ShelfItem[] = [...blocks.map((b) => ({ key: `b:${b.key}`, block: b })), ...shorts.map((v) => ({ key: `v:${v.id}`, video: v }))]
  const byKey = new Map(all.map((i) => [i.key, i]))
  const placed = order.filter((k) => byKey.has(k))
  const fresh = all.filter((i) => !placed.includes(i.key))
  return [...fresh.filter((i) => i.block).map((i) => i.key), ...placed, ...fresh.filter((i) => i.video).map((i) => i.key)].map((k) => byKey.get(k)!)
}

/** The shelf: its items in order, and the ways to add, remove and move them. */
export function useShelf() {
  const [blocks, setBlocks] = React.useState<ShelfBlock[]>([])
  const [order, setOrder] = React.useState<string[]>([])
  const [extra, setExtra] = React.useState<ShelfVideo[]>([])
  const [layout, setLayout] = React.useState<PageBlock[]>([])
  React.useEffect(() => {
    const on = () => {
      setBlocks(read())
      setOrder(readOrder())
      setExtra(pageShorts)
      setLayout([...pageBlocks.values()])
    }
    on()
    window.addEventListener(EVENT, on)
    window.addEventListener("storage", on)
    return () => {
      window.removeEventListener(EVENT, on)
      window.removeEventListener("storage", on)
    }
  }, [])
  const add = React.useCallback((b: Omit<ShelfBlock, "added">) => {
    const now = read().filter((x) => x.key !== b.key)
    write([{ ...b, added: new Date().toISOString() }, ...now])
  }, [])
  // Taking a block off the shelf also puts it back on its page, so a deleted block is never lost.
  const remove = React.useCallback((key: string) => {
    writeHidden(readHidden().filter((k) => k !== key))
    write(read().filter((x) => x.key !== key))
  }, [])
  const items = React.useMemo(() => arrange(blocks, order, extra), [blocks, order, extra])
  /** Moves an item to where another sits (null: to the end). */
  const move = React.useCallback(
    (from: string, to: string | null) => {
      if (from === to) return
      const keys = items.map((i) => i.key).filter((k) => k !== from)
      const at = to == null ? keys.length : keys.indexOf(to)
      keys.splice(at < 0 ? keys.length : at, 0, from)
      try {
        localStorage.setItem(ORDER, JSON.stringify(keys))
      } catch {}
      window.dispatchEvent(new Event(EVENT))
    },
    [items],
  )
  return { blocks, items, layout, add, remove, move, has: (key: string) => blocks.some((b) => b.key === key) }
}
