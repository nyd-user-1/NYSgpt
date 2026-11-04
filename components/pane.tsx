"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Columns2, Columns3, Maximize2, X } from "lucide-react"

import { PANE_MESSAGE, PANE_PARAM, isEmbedded, isPanePath } from "@/lib/pane"
import type { PanelSize } from "@/components/shell"

// The second panel's frame (lib/pane.ts), ported from pax-trinity's components/pane.tsx in the paper dress:
// a header — the page's title, size, close — over the page in its frame. The frame's src is set once per
// opening; the page moves inside it on its own. A right-click on the header's empty run opens the Nav for
// this panel.

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const
const BTN =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--paper-rule)] bg-[var(--paper)] shadow-md outline-none transition-colors hover:bg-[var(--paper-quiet)]"

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
  onMenu,
  frameRef,
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
  onMenu: (e: React.MouseEvent) => void
  frameRef: React.RefObject<HTMLIFrameElement | null>
}) {
  const [title, setTitle] = React.useState(() => pageTitle(null, href))
  // Next sets the title a beat after a client navigation, so read it again shortly after each move.
  React.useEffect(() => {
    const read = () => setTitle(pageTitle(frameRef.current?.contentDocument, href))
    read()
    const t = window.setTimeout(read, 400)
    return () => window.clearTimeout(t)
  }, [href, frameRef])
  return (
    <section
      data-pane-host
      style={{ "--pane-w": width, "--pane-r": offsetRight ?? "18px" } as React.CSSProperties}
      className={`nysgpt-app fixed inset-0 z-40 flex flex-col overflow-hidden bg-[var(--paper)] sm:inset-y-[18px] sm:left-auto sm:right-[var(--pane-r)] sm:w-[var(--pane-w)] sm:rounded-2xl sm:border sm:border-[var(--paper-rule)] sm:shadow-header ${dragging ? "" : "transition-[width,right] duration-300 ease-in-out"}`}
    >
      <div onContextMenu={onMenu} className="flex shrink-0 items-center gap-3 px-5 pt-5 pb-5">
        <p className="min-w-0 flex-1 truncate text-[22px] leading-none text-[var(--paper-text)]" style={{ ...SERIF, letterSpacing: "-0.02em" }}>
          {title}
        </p>
        {/* The icon shows the size the next press goes to: a third, half, then the whole area. */}
        <button type="button" onClick={onSize} className={`${BTN} hidden sm:flex`} aria-label={nextSize === "half" ? "Half the page" : nextSize === "full" ? "Full page" : "A third of the page"}>
          {nextSize === "half" ? <Columns2 className="h-4 w-4 text-[#033882]" /> : nextSize === "full" ? <Maximize2 className="h-4 w-4 text-[#033882]" /> : <Columns3 className="h-4 w-4 text-[#033882]" />}
        </button>
        <button type="button" onClick={onClose} className={BTN} aria-label="Close the panel">
          <X className="h-4 w-4 text-[#033882]" />
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
