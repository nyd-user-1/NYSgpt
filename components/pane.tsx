"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Columns2, Columns3, Maximize2, X } from "lucide-react"
import { TitleText } from "@/components/TitleText"
import { CopyTitle, HOVER } from "@/components/CopyTitle"

import { PANE_MESSAGE, PANE_PARAM, isEmbedded, isPanePath } from "@/lib/pane"
import type { PanelSize } from "@/components/shell"

// The second panel's frame (lib/pane.ts), ported from pax-trinity's components/pane.tsx in the paper dress:
// a header — the page's title, size, close — over the page in its frame. The frame's src is set once per
// opening; the page moves inside it on its own. A right-click on the header's empty run opens the Nav for
// this panel.

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const
const BTN =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border hover:border-2 border-[var(--paper-rule)] bg-[var(--paper)] shadow-md outline-none transition-colors hover:bg-[color-mix(in_oklab,var(--paper-text)_14%,var(--paper))]"

/** The framed page's own title (its metadata), less the site suffix; its path until it has loaded. */
function pageTitle(doc: Document | null | undefined, href: string) {
  const t = doc?.title?.replace(/\s+-\s+NYSgpt$/, "").trim()
  if (t) return t
  const p = href.split(/[?#]/)[0] || "/"
  return p === "/" ? "Home" : p.split("/").filter(Boolean).pop()!.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase())
}

export function PaneFrame({
  src,
  href,
  width,
  offsetRight,
  dragging,
  nextSize,
  onSize,
  onClose,
  menu,
  frameRef,
  paired,
}: {
  src: string
  href: string
  width: string
  /** Distance from the right edge — set when a third panel stands to this one's right (2026-11-04). */
  offsetRight?: string
  dragging: boolean
  nextSize: PanelSize
  onSize: () => void
  onClose: () => void
  /** The header's click opens the Nav (components/shell.tsx headerMenu). */
  menu: { onMouseDown: () => void; onClick: (e: React.MouseEvent) => void }
  frameRef: React.RefObject<HTMLIFrameElement | null>
  /** Beside the page (not FULL, no third panel): the corner bite carries a close, as in trinity's shell. */
  paired?: boolean
}) {
  const [title, setTitle] = React.useState(() => pageTitle(null, href))
  // nsrgpt names its charts from lib/header-titles.ts; NYSgpt has no such list, so the page's own title.
  const name = title
  // Next sets the title a beat after a client navigation, so read it again shortly after each move.
  React.useEffect(() => {
    const read = () => setTitle(pageTitle(frameRef.current?.contentDocument, href))
    read()
    const t = window.setTimeout(read, 400)
    return () => window.clearTimeout(t)
  }, [href, frameRef])
  return (
    <>
    <section
      data-pane-host
      style={{ "--pane-w": width, "--pane-r": offsetRight ?? "18px" } as React.CSSProperties}
      className={`nysgpt-app fixed inset-0 z-40 flex flex-col overflow-hidden bg-[var(--paper)] sm:inset-y-[18px] sm:left-auto sm:right-[var(--pane-r)] sm:w-[var(--pane-w)] sm:rounded-2xl sm:border sm:border-[var(--paper-rule)] sm:shadow-header ${dragging ? "" : "transition-[width,right] duration-300 ease-in-out"}`}
    >
      <div {...menu} className="relative z-10 flex shrink-0 items-center gap-3 border-b border-[var(--paper-rule)] px-5 pt-5 pb-5 shadow-header">
        {/* The title as panel 1's (Brendan, 2026-11-06): the ground on hover, and the copy button beside it. */}
        <span className="group/title flex min-w-0 items-center gap-1">
          <span className={`-ml-2 flex min-w-0 rounded-lg px-2 py-1 transition-colors ${HOVER}`}>
            <TitleText text={name} className="text-[22px] leading-none text-[var(--paper-text)]" style={{ ...SERIF, letterSpacing: "-0.02em" }} />
          </span>
          <CopyTitle title={name} />
        </span>
        {/* The empty space shows the hand: a click there opens the Nav, as on panel 1 (Brendan, 2026-11-06). */}
        <div className="-my-5 flex-1 cursor-pointer self-stretch" />
        {/* nsrgpt's previous and next chart buttons (lib/viz-charts) do not come across: NYSgpt has no chart sequence. */}
        {/* The icon shows the size the next press goes to: a third, half, then the whole area. */}
        <button type="button" onClick={onSize} className={`${BTN} hidden sm:flex`} aria-label={nextSize === "half" ? "Half the page" : nextSize === "full" ? "Full page" : "A third of the page"}>
          {nextSize === "half" ? <Columns2 className="h-4 w-4 text-[var(--paper-text)]" /> : nextSize === "full" ? <Maximize2 className="h-4 w-4 text-[var(--paper-text)]" /> : <Columns3 className="h-4 w-4 text-[var(--paper-text)]" />}
        </button>
        <button type="button" onClick={onClose} className={BTN} aria-label="Close the panel">
          <X className="h-4 w-4 text-[var(--paper-text)]" />
        </button>
      </div>
      {/* While the divider is dragged the frame gives up the pointer, or it would swallow the drag. */}
      <iframe
        ref={frameRef}
        data-pane
        src={src}
        title={title}
        onLoad={() => setTitle(pageTitle(frameRef.current?.contentDocument, href))}
        className={`min-h-0 w-full flex-1 border-0 bg-[var(--paper)] ${dragging ? "pointer-events-none" : ""}`}
      />
    </section>
    {/* The pane is fixed, so the bite rides a fixed box on its bottom-right corner (trinity's sits in the drawer beside the pane). */}
    {paired && (
      <div
        style={{ "--pane-r": offsetRight ?? "18px" } as React.CSSProperties}
        className={`nysgpt-app pointer-events-none fixed bottom-[18px] right-[var(--pane-r)] z-40 size-11 ${dragging ? "" : "transition-[right] duration-300 ease-in-out"}`}
      >
        <CornerClose label="Close" onClose={onClose} name="Panel 2" />
      </div>
    )}
    </>
  )
}

// Chrome's split-view tab, from trinity's shell (src/components/shell.tsx:678, 2026-11-04): a bite out of the
// pane's bottom-right corner holding its close. The pane's border runs around the bite, rounded out where it
// leaves the edges and in at its inner corner; the bite is painted the shell's ground so the pane reads as cut.
// NYSgpt's ground behind the panes is the body's (--background) and their border is --paper-rule, and they
// float from sm, not md.
/** The bite's edge, `w` wide: rounded out where it leaves the top edge, in at its inner corner, out at the foot. */
const biteEdge = (w: number) => `M${w - 0.5} 0V0.5A8 8 0 0 1 ${w - 8.5} 8.5H18.5A10 10 0 0 0 8.5 18.5V35.5A8 8 0 0 1 0.5 43.5H0`
/** `ground`: the fill class for what lies behind the corner — the body for the right-hand panels, the app
 *  frame's --bg for the main card (2026-11-05). `name`: the panel's page, shown beside the close as Chrome's
 *  split view shows each side's site (Brendan, 2026-11-06); the bite widens to hold it. */
export function CornerClose({ label, onClose, ground = "fill-background", name }: { label: string; onClose: () => void; ground?: string; name?: string }) {
  const text = React.useRef<HTMLSpanElement>(null)
  const [w, setW] = React.useState(44)
  React.useLayoutEffect(() => {
    const el = text.current
    if (!name || !el) return setW(44)
    const fit = () => setW(Math.ceil(18.5 + 16 + 6 + el.offsetWidth + 38))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [name])
  const edge = biteEdge(w)
  return (
    <div className="pointer-events-none absolute bottom-0 right-0 z-30 hidden h-11 sm:block" style={{ width: w }}>
      <svg aria-hidden viewBox={`0 0 ${w} 44`} className="absolute inset-0 size-full">
        <path d={`${edge}V44H${w}V0Z`} className={ground} />
        <path d={edge} fill="none" strokeWidth={1} className="stroke-[var(--paper-rule)]" />
      </svg>
      {name && (
        <span className="absolute bottom-0 left-[18.5px] flex h-[35px] items-center gap-1.5 text-[13px] text-[var(--paper-text)]">
          <img src="/favicon.svg" alt="" className="size-4 shrink-0" />
          <span ref={text} className="max-w-[240px] truncate">
            {name}
          </span>
        </span>
      )}
      <button type="button" onClick={onClose} aria-label={label} className="pointer-events-auto absolute bottom-1.5 right-1.5 flex size-6 items-center justify-center rounded-md text-[var(--paper-text)] transition-colors hover:bg-[color-mix(in_oklab,var(--paper-text)_14%,var(--paper))]">
        <X className="size-3.5" strokeWidth={2.25} />
      </button>
    </div>
  )
}

/**
 * Both halves of keeping the address. Around the panel: opens it from ?pane on a load, and puts ?pane back
 * whenever the main page's own navigation drops it (or takes it off once the panel closes). Inside the
 * frame: tells the shell around it where the page now is. Needs useSearchParams, so the shell renders it
 * under Suspense.
 */
export function PaneSync({ href, onOpen }: { href: string | null; onOpen: (href: string) => void }) {
  const path = usePathname()
  const params = useSearchParams()
  const query = params.toString()
  const read = React.useRef(false)
  const open = React.useRef(onOpen)
  open.current = onOpen
  React.useEffect(() => {
    if (isEmbedded()) {
      window.parent.postMessage({ type: PANE_MESSAGE, href: path + (query ? `?${query}` : "") }, window.location.origin)
      return
    }
    const sp = new URLSearchParams(query)
    if (!read.current) {
      read.current = true
      const p = sp.get(PANE_PARAM)
      if (p && isPanePath(p)) return open.current(p)
    }
    if (href) sp.set(PANE_PARAM, href)
    else sp.delete(PANE_PARAM)
    const q = sp.toString()
    if (q !== query) window.history.replaceState(null, "", path + (q ? `?${q}` : "") + window.location.hash)
  }, [path, query, href])
  return null
}
