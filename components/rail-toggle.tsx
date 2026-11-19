"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

// Ported from govblock (apps/web/components/rail-toggle.tsx) on 2026-11-07: the docs panel wears it
// (components/docs/DocsNav.tsx), pinned to the panel's edge with right-0 and a lower top.

// The tab on a rail's hairline (Brendan, 2026-09-11): the collapsed dev
// toolbar's tab, to the pixel — 16 by 32, rgb(24,24,27), a 10px radius on the
// side away from the line and flat on the side that meets it, a 16px chevron
// in zinc-500, and its 0 4px 16px shadow. It sits on the page side of the
// separator, flush against it, about 200px from the top of the viewport, and
// opens or closes its rail. The state
// is an attribute on <html> — data-rail-left / data-rail-right = "closed" —
// which the rail, its content and the page grid read through CSS, so no
// context has to reach the three layouts that mount the left rail. Remembered
// per browser.

// "right-2" (Brendan, 2026-09-14) is the sheet inside the right rail's sheet: a second overlay, with its own strip, tab and memory. "right-3" and "right-4" (2026-09-15) repeat it twice more, each inside the last.
type Side = "left" | "right" | "right-2" | "right-3" | "right-4"

const attr = (side: Side) => `data-rail-${side}`
const key = (side: Side) => `rail:${side}`

/** What this browser remembers for a rail: closed, open, or nothing yet. */
function remembered(side: Side): "closed" | "open" | null {
  try {
    const v = localStorage.getItem(key(side))
    return v === "closed" || v === "open" ? v : null
  } catch {
    return null
  }
}


function apply(side: Side, closed: boolean) {
  const root = document.documentElement
  if (closed) root.setAttribute(attr(side), "closed")
  else root.removeAttribute(attr(side))
  try {
    localStorage.setItem(key(side), closed ? "closed" : "open")
  } catch {}
}

// One store per side, so the tab on the hairline and the mark in the header
// (2026-09-12) agree on whether the rail is open.
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const isClosed = (side: Side) => (typeof document === "undefined" ? false : document.documentElement.getAttribute(attr(side)) === "closed")

// The rails a reader opened this visit (Brendan, 2026-11-11): a page that mounts again on a route change (the Elpis book's
// steppers and rail rows change the route on every click) leaves an opened rail open; a fresh load still starts closed.
const openedThisVisit = new Set<Side>()

export function setRail(side: Side, closed: boolean) {
  if (closed) openedThisVisit.delete(side)
  else openedThisVisit.add(side)
  apply(side, closed)
  listeners.forEach((l) => l())
}

export function toggleRail(side: Side) {
  setRail(side, !isClosed(side))
}

/**
 * True from the first moment every one of these rails is open at once, and
 * from then on: a sheet that reads the API mounts what it holds when a reader
 * first reaches it, not on every load of every page that wears the frame.
 * Reads <html> directly, which the pre-paint script has already set.
 */
export function useReached(sides: Side[]) {
  const key = sides.join(",")
  const [reached, setReached] = React.useState(false)
  React.useEffect(() => {
    if (reached) return
    const check = () => {
      if ((key.split(",") as Side[]).every((side) => !isClosed(side))) setReached(true)
    }
    check()
    const unsubscribe = subscribe(check)
    return () => {
      unsubscribe()
    }
  }, [key, reached])
  return reached
}

/**
 * Rails closed for as long as the page that calls this is mounted, without changing what this browser remembers
 * (Brendan, 2026-11-08: /graph opens with both inset panels closed, and /docs, which shares the left rail, keeps its own
 * memory). Call it in the page's top component: the first render closes them, so its rails paint closed and never slide
 * shut; leaving the page puts the remembered state back. A rail opened on the page is remembered as usual.
 */
export function useRailsClosedWhileMounted(sides: Side[]) {
  const key = sides.join(",")
  React.useState(() => {
    if (typeof document !== "undefined") for (const side of sides) document.documentElement.setAttribute(attr(side), "closed")
    return null
  })
  React.useLayoutEffect(() => {
    const set = (closed: (side: Side) => boolean) => {
      for (const side of key.split(",") as Side[]) {
        if (closed(side)) document.documentElement.setAttribute(attr(side), "closed")
        else document.documentElement.removeAttribute(attr(side))
      }
      listeners.forEach((l) => l())
    }
    set(() => true)
    return () => set((side) => remembered(side) === "closed")
  }, [key])
}

/** Whether a rail is closed, live. Every page with a rail tab loads with the rail closed (Brendan, 2026-11-11), whatever
 *  this browser remembers; the tab opens it, and that is remembered for the rest of the visit as before. */
export function useRailClosed(side: Side) {
  const closed = React.useSyncExternalStore(subscribe, () => isClosed(side), () => true)
  React.useEffect(() => {
    if (!isClosed(side) && !openedThisVisit.has(side)) setRail(side, true)
  }, [side])
  return closed
}

/** The tab on the paper's panels (/docs, /graph's inset panels): paper ground, ink chevron and the paper's hover tint, so
 *  it reads in every theme (Brendan, 2026-11-08; the dark-blue chevron on the ink ground was lost in the light themes).
 *  22 px wide at rest, 30.25 px on hover, as if pulling the panel. The caller adds its edge. */
export const PAPER_TAB =
  "top-24 w-[22px] border border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-text)] shadow-md hover:w-[30.25px] hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)]"

export function RailToggle({ side, className }: { side: Side; className?: string }) {
  const closed = useRailClosed(side)
  const toggle = () => toggleRail(side)

  // Pointing at the rail means "close it"; pointing away means "open it".
  const towardRail = side === "left" ? ChevronLeft : ChevronRight
  const awayFromRail = side === "left" ? ChevronRight : ChevronLeft
  const Icon = closed ? awayFromRail : towardRail

  return (
    <button
      type="button"
      data-rail-tab=""
      onClick={toggle}
      aria-label={closed ? `Open the ${side} rail` : `Close the ${side} rail`}
      aria-expanded={!closed}
      className={cn(
        // Hover (Brendan, 2026-09-13): the tab grows about a tenth away from the line, the way the rail will.
        "absolute top-[calc(200px-var(--header-height)-0.6rem)] z-40 flex h-8 w-4 items-center justify-center bg-[#18181b] text-zinc-500 shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-[width,color] duration-200 ease-out select-none hover:w-[17.5px] hover:text-zinc-50",
        // A hovered strip (RailStrip, an earlier sibling of the rail) lights the tab the same way.
        "[[data-rail-strip]:hover~*_&]:w-[17.5px] [[data-rail-strip]:hover~*_&]:text-zinc-50",
        // On the far side of the hairline (right-2 / left-2 is the line): flat where it meets the line, round on the side facing the page.
        side === "left" ? "right-2 translate-x-full rounded-r-[10px]" : "left-2 -translate-x-full rounded-l-[10px]",
        className
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}

/**
 * The strip between a closed rail's hairline and the edge of the viewport,
 * made clickable (Brendan, 2026-09-13): the whole height opens the rail, and
 * hovering it lights the tab. Only there while the rail is closed, and only
 * in the sheet frame, where it is placed just before the rail so the tab can
 * see it hovered. 24px wide: the hairline sits 24px in from the viewport's
 * edge (the frame's 8px gutter plus the 16px of strip), and the tab starts
 * at the hairline.
 */
export function RailStrip({ side }: { side: Side }) {
  return (
    <button
      type="button"
      data-rail-strip=""
      aria-label={`Open the ${side} rail`}
      onClick={() => setRail(side, false)}
      className={cn(
        "absolute inset-y-0 z-40 hidden w-6 cursor-pointer",
        {
          left: "right-2 [[data-rail-left=closed]_&]:block",
          right: "left-2 [[data-rail-right=closed]_&]:block",
          "right-2": "left-2 [[data-rail-right-2=closed]_&]:block",
          "right-3": "left-2 [[data-rail-right-3=closed]_&]:block",
          "right-4": "left-2 [[data-rail-right-4=closed]_&]:block",
        }[side]
      )}
    />
  )
}
