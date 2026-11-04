"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import type { ChipOffer } from "@/lib/question-resolver"
import { PANE_MAIN, PANE_MESSAGE, PANE_PARAM, SEED_PREFIX, isEmbedded, isPanePath } from "@/lib/pane"
import { PaneFrame, PaneSync } from "@/components/pane"
import { useSwitchboard } from "@/components/SwitchboardPanel"

// The shell, made real (2026-11-04, ported from pax-trinity's components/shell.tsx). It holds trinity's
// panel contract — the chat tree and the note card call it unchanged — and the second panel: a page of
// this app opened beside the main one in a frame (lib/pane.ts), pushing the page aside as the switchboard
// does. It also holds the Nav's opening point, so Shift and a right-click anywhere (ShiftNav) and a plain
// right-click on a header's empty run open the same menu, each for the side it opened over.
//
// Mounted once in the root layout around the page tree, the switchboard's wrapper, the notes and the
// Nav, so the panel survives navigation. Framed, it hosts no panel: openPane moves the frame itself.

export type PanelSize = "third" | "half" | "full" | "custom"
/** `nonce` makes asking the same thing twice a second ask. */
export type DiscussSeed = { context: () => string; chipVideo?: string; ask?: ChipOffer | null; nonce: number }
/** `key` names the content's owner, so it can tell whether the panel still shows it. */
export type Aside = { key: string; title: string; body: React.ReactNode; back?: () => void; flush?: boolean }
/** Which panel the Nav drives: the main page, or the second panel. */
export type Side = "main" | "pane"
export type NavAt = { x: number; y: number; side: Side; here: string }

type PanelState = {
  setOpen: (open: boolean) => void
  wide: boolean
  setWide: (wide: boolean) => void
  size: PanelSize
  nextSize: PanelSize
  cycleSize: () => void
  panelOpen: boolean
  sidebarOpen: boolean
  toggleSidebar: () => void
  discuss: boolean
  toggleDiscuss: () => void
  openAside: (aside: Aside | null) => void
  asideKey: string | null
  /** Opens the chat in the second panel with this context riding every message. */
  askAbout: (seed: Omit<DiscussSeed, "nonce">) => void
  discussSeed: DiscussSeed | null
  signedIn: boolean
  admin: boolean
  superAdmin: boolean
  /** Opens a page in the second panel, beside the main one (lib/pane.ts). */
  openPane: (href: string) => void
  /** Where the second panel is now, or null when it is shut. */
  paneHref: string | null
  /** The Nav's card, open at a point for a side. */
  nav: NavAt | null
  openNav: (at: NavAt) => void
  closeNav: () => void
  /** A plain right-click on a header's empty run opens the Nav for that header's side. */
  headerMenu: (side: Side) => (e: React.MouseEvent) => void
  /** Opens a page on a side: the main page navigates; the second panel opens or moves. */
  goTo: (href: string, to: Side) => void
  /** The main page's address, without the second panel's ?pane. */
  mainHere: () => string
}

const noop = () => {}
const PanelCtx = React.createContext<PanelState>({
  setOpen: noop,
  wide: false,
  setWide: noop,
  size: "half",
  nextSize: "full",
  cycleSize: noop,
  panelOpen: false,
  sidebarOpen: false,
  toggleSidebar: noop,
  discuss: false,
  toggleDiscuss: noop,
  openAside: noop,
  asideKey: null,
  askAbout: noop,
  discussSeed: null,
  signedIn: false,
  admin: false,
  superAdmin: false,
  openPane: noop,
  paneHref: null,
  nav: null,
  openNav: noop,
  closeNav: noop,
  headerMenu: () => noop,
  goTo: noop,
  mainHere: () => "/",
})

export const useShellPanel = () => React.useContext(PanelCtx)

/** What keeps its own menu, the browser's, under every right-click (trinity's NATIVE_MENU). */
const FIELD = "input, textarea, select, [contenteditable]:not([contenteditable='false'])"
export const NATIVE_MENU = `a, button, ${FIELD}, [role=button], [role=combobox], [role=menu], [role=dialog]`

const GAP = 18
const MIN_PANE = 320
const SPLIT_KEY = "nysgpt:split"

const mainHereNow = () => {
  if (typeof window === "undefined") return "/"
  const sp = new URLSearchParams(window.location.search)
  sp.delete(PANE_PARAM)
  const q = sp.toString()
  return window.location.pathname + (q ? `?${q}` : "")
}

/** Keeps the chat seed store small: the newest few, the rest dropped. */
function storeSeed(text: string): string {
  const id = Math.random().toString(36).slice(2, 10)
  try {
    const old = Object.keys(localStorage).filter((k) => k.startsWith(SEED_PREFIX))
    for (const k of old.slice(0, Math.max(0, old.length - 9))) localStorage.removeItem(k)
    localStorage.setItem(SEED_PREFIX + id, text)
  } catch {
    /* the chat opens unseeded */
  }
  return id
}

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const switchboard = useSwitchboard()
  // The second panel: the page it opened on (its frame's src, fixed per opening), where it is now, and `n`,
  // which reloads the frame when a page is opened into it again.
  const [pane, setPane] = React.useState<{ src: string; href: string; n: number } | null>(null)
  const paneRef = React.useRef<HTMLIFrameElement>(null)
  // The second panel opens at the half (trinity, 2026-10-31); its button walks third → half → full.
  const [size, setSize] = React.useState<PanelSize>("half")
  const [split, setSplit] = React.useState(0.5)
  const [dragging, setDragging] = React.useState(false)
  const nextSize: PanelSize = size === "third" ? "half" : size === "half" ? "full" : size === "full" ? "third" : split < 0.5 ? "half" : "full"
  const [seed, setSeed] = React.useState<DiscussSeed | null>(null)
  const [nav, setNav] = React.useState<NavAt | null>(null)

  const sbOpen = switchboard.open
  const sbClose = switchboard.close
  const openPane = React.useCallback(
    (href: string) => {
      if (!isPanePath(href)) return
      // Framed, the frame is the panel: it moves itself.
      if (isEmbedded()) return router.push(href)
      sbClose()
      setSize("half")
      setPane({ src: href, href, n: Date.now() })
    },
    [router, sbClose],
  )
  // One right panel at a time: the switchboard opening shuts the second panel.
  React.useEffect(() => {
    if (sbOpen) setPane(null)
  }, [sbOpen])

  const goTo = React.useCallback(
    (href: string, to: Side) => {
      if (isEmbedded()) {
        if (to === "pane") router.push(href)
        else window.parent.postMessage({ type: PANE_MAIN, href }, window.location.origin)
        return
      }
      if (to === "pane" && isPanePath(href)) openPane(href)
      else router.push(href)
    },
    [openPane, router],
  )

  const headerMenu = React.useCallback(
    (side: Side) => (e: React.MouseEvent) => {
      // Shift is ShiftNav's gesture, which opens the same menu here.
      if (e.shiftKey) return
      if ((e.target as Element).closest(NATIVE_MENU)) return
      e.preventDefault()
      setNav({ x: e.clientX, y: e.clientY, side, here: side === "pane" ? (pane?.href ?? "") : mainHereNow() })
    },
    [pane?.href],
  )

  // The panel's frame says where its page has gone; the address follows (PaneSync). Its Nav may ask for a
  // page in the main container (PANE_MAIN).
  React.useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== paneRef.current?.contentWindow) return
      const d = e.data as { type?: string; href?: string } | null
      if (d?.type === PANE_MESSAGE && typeof d.href === "string") setPane((p) => (p && p.href !== d.href ? { ...p, href: d.href! } : p))
      if (d?.type === PANE_MAIN && typeof d.href === "string" && isPanePath(d.href)) router.push(d.href)
    }
    window.addEventListener("message", on)
    return () => window.removeEventListener("message", on)
  }, [router])

  // What a click opens in the main page a right-click opens in the second panel (trinity, 2026-10-31): any of
  // this app's links. With Shift a link keeps the browser's menu; inside the panel's frame the browser's
  // menu stays.
  React.useEffect(() => {
    if (isEmbedded()) return
    const on = (e: MouseEvent) => {
      if (e.shiftKey || e.defaultPrevented) return
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.getAttribute("href")?.startsWith("#")) return
      const url = new URL(a.href, window.location.href)
      const href = url.pathname + url.search + url.hash
      if (url.origin !== window.location.origin || !isPanePath(href)) return
      e.preventDefault()
      openPane(href)
    }
    document.addEventListener("contextmenu", on)
    return () => document.removeEventListener("contextmenu", on)
  }, [openPane])

  // The dragged split is remembered between visits; a panel still opens at the half.
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SPLIT_KEY) ?? "null") as { split?: number } | null
      if (typeof saved?.split === "number") setSplit(saved.split)
    } catch {}
  }, [])
  React.useEffect(() => {
    if (dragging || size !== "custom") return
    try {
      localStorage.setItem(SPLIT_KEY, JSON.stringify({ split }))
    } catch {}
  }, [size, split, dragging])
  React.useEffect(() => {
    if (!dragging) return
    const s = document.body.style
    const prev = [s.cursor, s.userSelect]
    s.cursor = "col-resize"
    s.userSelect = "none"
    return () => {
      s.cursor = prev[0]
      s.userSelect = prev[1]
    }
  }, [dragging])
  // The divider sits where the pointer is, leaving each side at least MIN_PANE.
  const resizeTo = (x: number) => {
    const vw = window.innerWidth
    const w = Math.max(MIN_PANE, Math.min(vw - GAP - x - GAP / 2, vw - GAP * 3 - MIN_PANE))
    setSplit(w / vw)
    setSize("custom")
  }

  const panel = React.useMemo<PanelState>(
    () => ({
      setOpen: noop,
      wide: size !== "third",
      setWide: (w: boolean) => setSize(w ? "half" : "third"),
      size,
      nextSize,
      cycleSize: () => setSize(nextSize),
      panelOpen: !!pane,
      sidebarOpen: false,
      toggleSidebar: noop,
      discuss: false,
      toggleDiscuss: noop,
      openAside: noop,
      asideKey: null,
      askAbout: (s: Omit<DiscussSeed, "nonce">) => {
        setSeed({ ...s, nonce: Date.now() })
        openPane(`/chat?seed=${storeSeed(s.context())}`)
      },
      discussSeed: seed,
      signedIn: false,
      admin: false,
      superAdmin: false,
      openPane,
      paneHref: pane?.href ?? null,
      nav,
      openNav: setNav,
      closeNav: () => setNav(null),
      headerMenu,
      goTo,
      mainHere: mainHereNow,
    }),
    [size, nextSize, pane, seed, openPane, nav, headerMenu, goTo],
  )

  const width = size === "third" ? "420px" : size === "half" ? "50vw" : size === "custom" ? `${(split * 100).toFixed(2)}vw` : "100vw"
  const full = !!pane && size === "full"
  return (
    <PanelCtx.Provider value={panel}>
      <React.Suspense>
        <PaneSync href={pane?.href ?? null} onOpen={openPane} />
      </React.Suspense>
      {/* The page narrows beside the panel, as SwitchboardShell narrows it beside the switchboard. */}
      <div
        style={{ "--pane-w": width } as React.CSSProperties}
        className={`${dragging ? "" : "transition-[padding] duration-300 ease-in-out"} ${pane && !full ? "sm:pr-[calc(var(--pane-w)+18px)]" : ""} ${full ? "sm:invisible" : ""}`}
      >
        {children}
      </div>
      {pane && (
        <>
          {!full && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize the panels"
              tabIndex={0}
              onPointerDown={(e) => {
                if (e.button !== 0) return
                e.preventDefault()
                e.currentTarget.setPointerCapture(e.pointerId)
                setDragging(true)
              }}
              onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && resizeTo(e.clientX)}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
              onLostPointerCapture={() => setDragging(false)}
              onDoubleClick={() => setSize("half")}
              onKeyDown={(e) => {
                if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
                e.preventDefault()
                const left = window.innerWidth - GAP - (paneRef.current?.parentElement?.getBoundingClientRect().width ?? 0)
                resizeTo(left - GAP / 2 + (e.key === "ArrowLeft" ? -24 : 24))
              }}
              style={{ right: `calc(${width} + 18px)` }}
              className="group fixed top-1/2 z-40 hidden h-16 w-[18px] -translate-y-1/2 cursor-col-resize touch-none items-center justify-center outline-none sm:flex"
            >
              <span className={`h-8 w-1 rounded-full transition-colors group-hover:bg-[#033882] group-focus-visible:bg-[#033882] ${dragging ? "bg-[#033882]" : "bg-[rgba(22,24,29,0.18)] dark:bg-[rgba(240,233,216,0.2)]"}`} />
            </div>
          )}
          <PaneFrame
            key={pane.n}
            src={pane.src}
            href={pane.href}
            width={full ? "calc(100vw - 36px)" : width}
            dragging={dragging}
            nextSize={nextSize}
            onSize={() => setSize(nextSize)}
            onClose={() => setPane(null)}
            onMenu={headerMenu("pane")}
            frameRef={paneRef}
          />
        </>
      )}
    </PanelCtx.Provider>
  )
}
