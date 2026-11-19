"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { House, LibraryBig, MessageSquare, Search, type LucideIcon } from "lucide-react"

import { ITEMS } from "@/components/command/command-data"
import { GoToMenu, useShiftNav } from "@/components/go-to-menu"
import { useShellPanel } from "@/components/shell"
import { NOTES_AND_RIGHT_CLICK } from "@/lib/features"
import { recordVisit } from "@/lib/nav-recents"
import { isEmbedded, isPanePath } from "@/lib/pane"

import { DrawNotes } from "./draw-notes"
import { useGather } from "./gather"
import "./notes.css"

// The Shift note and the right-click family (brief 61), as pax-trinity's shell mounts them (components/shell.tsx):
//   Shift and a drag     draws a note (draw-notes.tsx)
//   right-click a link   to one of the app's own pages opens it in the second panel, not the browser's menu
//   right-click a header's empty run (the page's or the second panel's) opens the Nav there (shell.tsx headerMenu)
//   Shift and right-click anywhere opens the Nav at the pointer (go-to-menu.tsx useShiftNav)
//   Option and right-click on a card, while a note is in Collect, adds the card to the note (gather.tsx)
// Mounted once, inside NYSgpt's shell in the root layout, so a note stays open across pages as pax-trinity's does.
// Off with NEXT_PUBLIC_NOTES_AND_RIGHT_CLICK=off (lib/features.ts).

/** The Nav's pages, from the ⌘K palette's (components/command/command-data.ts): its pages, by address once, and the
 *  pages its commands open. */
const ICONS: Record<string, LucideIcon> = { "/": House, "/data": LibraryBig, "/chat": MessageSquare, "/search": Search }
const LABELS: Record<string, string> = { "/": "Home", "/chat": "Chat", "/search": "Search" }
export const NAV_PAGES: { href: string; label: string; icon: LucideIcon }[] = [
  ...new Map(
    [...ITEMS.filter((i) => i.kind === "page" && i.href).map((i) => [i.href!, i.title] as const), ["/chat", "Chat"] as const, ["/search", "Search"] as const].map(([href, title]) => [
      href,
      { href, label: LABELS[href] ?? title, icon: ICONS[href] ?? House },
    ]),
  ).values(),
]
const titleOf = (href: string) => NAV_PAGES.find((p) => p.href === href.split(/[?#]/)[0])?.label ?? href.split(/[?#]/)[0]

export function NotesAndRightClick() {
  if (!NOTES_AND_RIGHT_CLICK) return null
  return <Mounted />
}

function Mounted() {
  const { openPane, paneHref, nav, openNav, closeNav, goTo, mainHere } = useShellPanel()
  const path = usePathname()

  // The pages lately arrived on, in the page and in the panel: the Nav's Recent.
  React.useEffect(() => {
    if (isEmbedded()) return
    recordVisit(mainHere())
  }, [path, mainHere])
  React.useEffect(() => {
    if (paneHref) recordVisit(paneHref)
  }, [paneHref])

  // Shift and a right-click anywhere opens the Nav at the pointer: over the second panel, for the panel; inside the
  // panel's frame, the frame's own shell opens it for the panel it is; anywhere else, for the page.
  useShiftNav(openNav, (target) => {
    if (isEmbedded()) return { side: "pane", here: window.location.pathname + window.location.search }
    if (paneHref && target?.closest("[data-pane-host]")) return { side: "pane", here: paneHref }
    return { side: "main", here: mainHere() }
  })

  // Option and a right-click, while a note is open in Collect, gathers the card under the pointer into it.
  useGather()

  // What a click opens in the main container a right-click opens in the second panel: any of this app's links,
  // anywhere around the panel. With Shift a link keeps the browser's own menu (the Nav's gesture leaves links alone).
  // Inside the panel's frame the browser's menu stays.
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

  return (
    <>
      <DrawNotes />
      {nav && <GoToMenu at={nav} side={nav.side} here={nav.here} pages={NAV_PAGES} titleOf={titleOf} onOpen={goTo} onClose={closeNav} />}
    </>
  )
}
