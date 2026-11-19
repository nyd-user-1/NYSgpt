"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import type { ChipOffer } from "@/lib/question-resolver"
import { PANE_MAIN, PANE_MESSAGE, PANE_PARAM, PANE_SECOND, SEED_PREFIX, VIZ_POINT, isEmbedded, isPanePath } from "@/lib/pane"
import { PaneFrame, PaneSync } from "@/components/pane"
import { useSwitchboard } from "@/components/SwitchboardPanel"
import { useProductStatus } from "@/components/ProductStatus"

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
  /** A click on a header's empty space opens the Nav for that header's side; spread on the header. */
  headerMenu: (side: Side) => { onMouseDown: () => void; onClick: (e: React.MouseEvent) => void }
  /** Opens a page on a side: the main page navigates; the second panel opens or moves. */
  goTo: (href: string, to: Side) => void
  /** The main page's address, without the second panel's ?pane. */
  mainHere: () => string
  /** The main card's corner close, while a panel stands beside it (trinity's "Close the page", 2026-11-05):
   *  the panel beside it takes the whole area and the page keeps the slim bar. Null when nothing is beside it. */
  closePage: (() => void) | null
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
  headerMenu: () => ({ onMouseDown: noop, onClick: noop }),
  goTo: noop,
  mainHere: () => "/",
  closePage: null,
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
  // The reader, from NYSgpt's ProductStatusProvider: its email only; NYSgpt has no admin roles.
  const status = useProductStatus()
  const reader = { email: status.email, admin: false, superAdmin: false }
  // The second panel: the page it opened on (its frame's src, fixed per opening), where it is now, and `n`,
  // which reloads the frame when a page is opened into it again.
  const [pane, setPane] = React.useState<{ src: string; href: string; n: number } | null>(null)
  const paneRef = React.useRef<HTMLIFrameElement>(null)
  // The THIRD panel (Brendan, 2026-11-04): opened by a pane's own openPane (PANE_SECOND). While it
  // lives, the page keeps only the slim bar and the two panes split the rest. Not in the URL — a
  // working surface, not an address.
  const [pane2, setPane2] = React.useState<{ src: string; href: string; n: number } | null>(null)
  const pane2Ref = React.useRef<HTMLIFrameElement>(null)
  // The second panel opens at a third (Brendan, 2026-11-19; nsrgpt opened it at the half); its button walks third → half → full.
  const [size, setSize] = React.useState<PanelSize>("third")
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
      // Framed, a pane's openPane asks the shell around it for the THIRD panel (2026-11-04) —
      // it used to move itself; now the chart keeps its panel and the table gets its own.
      if (isEmbedded()) {
        window.parent.postMessage({ type: PANE_SECOND, href }, window.location.origin)
        return
      }
      sbClose()
      // Every page opens at the third (Brendan, 2026-11-19).
      setSize("third")
      setPane({ src: href, href, n: Date.now() })
    },
    [router, sbClose],
  )
  // The second panel slides in and out over 500 ms, with its handle and the page's push (Brendan, 2026-11-19):
  // it mounts off the right edge and moves in on the next frame; closing slides it out, then it unmounts.
  const [shown, setShown] = React.useState(false)
  const shutTimer = React.useRef<number | undefined>(undefined)
  const shutPane = React.useCallback(() => {
    setShown(false)
    window.clearTimeout(shutTimer.current)
    shutTimer.current = window.setTimeout(() => {
      setPane(null)
      setPane2(null)
    }, 500)
  }, [])
  const paneN = pane?.n
  React.useEffect(() => {
    if (paneN === undefined) return
    window.clearTimeout(shutTimer.current)
    let r = requestAnimationFrame(() => {
      r = requestAnimationFrame(() => setShown(true))
    })
    return () => cancelAnimationFrame(r)
  }, [paneN])

  // One right panel at a time: the switchboard opening shuts the second panel.
  React.useEffect(() => {
    if (sbOpen) shutPane()
  }, [sbOpen, shutPane])

  const goTo = React.useCallback(
    (href: string, to: Side) => {
      if (isEmbedded()) {
        if (to === "pane") router.push(href)
        else window.parent.postMessage({ type: PANE_MAIN, href }, window.location.origin)
        return
      }
      if (to === "pane" && isPanePath(href)) openPane(href)
      else {
        const path = href.split(/[?#]/)[0]
        if (path === "/" || path === window.location.pathname) router.push(href)
        else router.push(href) // NYSgpt has no chart-forward transition (nsrgpt lib/viz-grow)
      }
    },
    [openPane, router],
  )

  // One click on a header's empty space opens the Nav (Brendan, 2026-11-06); a click anywhere outside it closes
  // it, the header included. The press closes it first (ShiftNav), so the click after it mustn't open it again:
  // the press notes whether it was open, before the close lands.
  const navOpen = React.useRef(false)
  navOpen.current = nav !== null
  const pressedOpen = React.useRef(false)
  const headerMenu = React.useCallback(
    (side: Side) => ({
      onMouseDown: () => {
        pressedOpen.current = navOpen.current
      },
      onClick: (e: React.MouseEvent) => {
        if (pressedOpen.current || (e.target as Element).closest(NATIVE_MENU)) return
        setNav({ x: e.clientX, y: e.clientY, side, here: side === "pane" ? (pane?.href ?? "") : mainHereNow() })
      },
    }),
    [pane?.href],
  )

  // The panel's frame says where its page has gone; the address follows (PaneSync). Its Nav may ask for a
  // page in the main container (PANE_MAIN).
  React.useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      const fromPane = e.source === paneRef.current?.contentWindow
      const fromPane2 = e.source === pane2Ref.current?.contentWindow
      if (!fromPane && !fromPane2) return
      const d = e.data as { type?: string; href?: string } | null
      if (d?.type === PANE_MESSAGE && typeof d.href === "string") {
        if (fromPane2) setPane2((p) => (p && p.href !== d.href ? { ...p, href: d.href! } : p))
        else setPane((p) => (p && p.href !== d.href ? { ...p, href: d.href! } : p))
      }
      if (d?.type === PANE_MAIN && typeof d.href === "string" && isPanePath(d.href)) router.push(d.href)
      // Either pane may ask for the third panel; from pane2 it replaces pane2's own page.
      if (d?.type === PANE_SECOND && typeof d.href === "string" && isPanePath(d.href)) setPane2({ src: d.href, href: d.href, n: Date.now() })
      // A table row pointing at its datum: relay to every chart that might hold it — the main
      // page (as an event) and the OTHER pane (as a message); the sender already knows.
      if (d?.type === VIZ_POINT) {
        window.dispatchEvent(new CustomEvent(VIZ_POINT, { detail: d }))
        const other = fromPane2 ? paneRef.current?.contentWindow : pane2Ref.current?.contentWindow
        other?.postMessage(d, window.location.origin)
      }
    }
    window.addEventListener("message", on)
    return () => window.removeEventListener("message", on)
  }, [router])


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

  // At FULL the page doesn't vanish — it collapses to a slim bar, the codespaces way (Brendan,
  // 2026-11-04): the pane takes all but ~124px, and the app card beneath keeps only its two
  // chrome buttons, stacked. The sidebar leaves the screen entirely.
  const width = size === "third" ? "420px" : size === "half" ? "50vw" : size === "custom" ? `${(split * 100).toFixed(2)}vw` : "calc(100vw - 124px)"
  const full = !!pane && size === "full"
  // The third panel: both panes split what the slim bar leaves (124px page + 18px between them).
  const second = !!pane && !!pane2
  const half2 = "calc((100vw - 142px)/2)"
  // The switchboard's full (the corner close's, 2026-11-05) slims the page the same way.
  // NYSgpt's switchboard has no full of its own, so only the second panel slims the page.
  const slim = full || second
  const closePage = React.useMemo(() => (pane && !slim ? () => setSize("full") : null), [pane, slim])

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
        // The chat in the second panel reads the stored context and asks the seed's question, if it has one (brief 50).
        openPane(`/chat?seed=${storeSeed(s.context())}${s.ask ? `&prompt=${encodeURIComponent(s.ask.ask)}` : ""}`)
      },
      discussSeed: seed,
      signedIn: reader.email !== null,
      admin: reader.admin,
      superAdmin: reader.superAdmin,
      openPane,
      paneHref: pane?.href ?? null,
      nav,
      openNav: setNav,
      closeNav: () => setNav(null),
      headerMenu,
      goTo,
      mainHere: mainHereNow,
      closePage,
    }),
    [size, nextSize, pane, seed, openPane, nav, headerMenu, goTo, closePage, reader.email, reader.admin, reader.superAdmin],
  )

  return (
    <PanelCtx.Provider value={panel}>
      <React.Suspense>
        <PaneSync href={pane?.href ?? null} onOpen={openPane} />
      </React.Suspense>
      {/* The page narrows beside the panel, as SwitchboardShell narrows it beside the switchboard. */}
      <div
        style={{ "--pane-w": second ? "calc(100vw - 124px)" : width } as React.CSSProperties}
        data-page-slim={slim || undefined}
        className={`${dragging ? "" : "transition-[padding] duration-500 ease-in-out"} ${pane && shown ? "sm:pr-[calc(var(--pane-w)+18px)]" : ""}`}
      >
        {children}
      </div>
      {/* The slim bar: at FULL — or while the third panel lives — the app card hides its page and
          its header stacks to a column of the two round buttons; the sidebar leaves the screen.
          (NYSgpt: the padded container is [data-app-shell]; its [data-app-frame] is the card.) */}
      {slim && (
        <style>{`@media (min-width: 640px) {
          [data-page-slim] [data-app-shell] > [data-chrome]:first-child { width: 0 !important; margin-right: 0 !important; }
          [data-page-slim] [data-app-card] > :not([data-chrome]) { display: none; }
          [data-page-slim] [data-app-card] > [data-chrome] { flex-direction: column; align-items: center; gap: 14px; padding: 14px 0; }
          [data-page-slim] [data-app-card] > [data-chrome] > .flex-1 { display: none; }
          [data-page-slim] [data-app-card] > [data-chrome] button { margin: 0 !important; }
        }`}</style>
      )}
      {pane && (
        <>
          {!slim && (
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
              style={{ right: shown ? `calc(${width} + 18px)` : "-18px" }}
              className={`${dragging ? "" : "transition-[right] duration-500 ease-in-out"} group fixed top-1/2 z-40 hidden h-16 w-[18px] -translate-y-1/2 cursor-col-resize touch-none items-center justify-center outline-none sm:flex`}
            >
              <span className={`h-8 w-1 rounded-full transition-colors group-hover:bg-[#033882] group-focus-visible:bg-[#033882] ${dragging ? "bg-[#033882]" : "bg-[rgba(22,24,29,0.18)] dark:bg-[rgba(240,233,216,0.2)]"}`} />
            </div>
          )}
          <PaneFrame
            key={pane.n}
            src={pane.src}
            href={pane.href}
            width={second ? half2 : width}
            offsetRight={second ? `calc(((100vw - 142px)/2) + 36px)` : undefined}
            dragging={dragging}
            nextSize={nextSize}
            onSize={second ? () => {} : () => setSize(nextSize)}
            onClose={() => {
              // Closing panel 2 while panel 3 lives promotes the third into its place.
              if (pane2) { setPane(pane2); setPane2(null) } else shutPane()
            }}
            menu={headerMenu("pane")}
            frameRef={paneRef}
            paired={!slim}
            shown={shown}
          />
          {second && pane2 && (
            <PaneFrame
              key={pane2.n}
              src={pane2.src}
              href={pane2.href}
              width={half2}
              dragging={dragging}
              nextSize={nextSize}
              onSize={() => {}}
              onClose={() => setPane2(null)}
              menu={headerMenu("pane")}
              frameRef={pane2Ref}
              shown={shown}
            />
          )}
        </>
      )}
    </PanelCtx.Provider>
  )
}
