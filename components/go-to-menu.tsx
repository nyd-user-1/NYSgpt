"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { ArrowUpLeft, ArrowUpRight, EllipsisVertical, GripVertical, History, Link2, Search, Star, Trash2, X, type LucideIcon } from "lucide-react"

import { isPanePath } from "@/lib/pane"
import { useNavFavorites } from "@/lib/nav-favorites"
import { clearRecents, useNavRecents } from "@/lib/nav-recents"
import { KebabMenu, MenuRow, MenuSeparator } from "@/components/kebab-menu"
import { PARTNERS } from "@/lib/roles"
import { cn } from "@/lib/utils"

// Nav (Brendan, 2026-10-31): a right-click on a header's empty run, the page's or the second panel's, opens a
// page switcher at the pointer. Since 2026-11-02 Shift and a right-click opens it anywhere (useShiftNav). Type
// to find; Recent, Favorites and the pages otherwise. One rule on both: Enter (or a click) opens the page in
// the panel the menu was opened over; ⌥ Enter, or a row's arrow, in the other one, as a right-click on a link
// sends it to the second panel.

/** The page's own column, or the second panel. */
export type Side = "main" | "pane"

/** A text field or a select, whose menu is the browser's under every gesture (its spelling, its paste). */
export const FIELD = "input, textarea, select, [contenteditable]:not([contenteditable='false'])"

/** What keeps its own menu, the browser's, even with Shift: a link, a control, a text field, an open menu or dialog. */
export const NATIVE_MENU = `a, button, ${FIELD}, [role=button], [role=combobox], [role=menu], [role=dialog]`

export type GoToAt = { x: number; y: number; side: Side; here: string }

/**
 * Shift and a right-click anywhere in the app opens the Nav at the pointer (Brendan, 2026-11-02): `where`
 * says which side the point is on and the address there. A link, a control, a text field, or an open menu
 * or dialog keeps the browser's menu, as does a right-click a page has already taken (defaultPrevented).
 * The plain right-click keeps every meaning it had. Firefox never hands a page Shift and a right-click (it
 * shows its own menu by design), so there the gesture is Chrome's and Safari's; nothing to be done about it.
 */
export function useShiftNav(open: (at: GoToAt) => void, where: (target: Element | null) => { side: Side; here: string }) {
  const latest = React.useRef({ open, where })
  latest.current = { open, where }
  React.useEffect(() => {
    const on = (e: MouseEvent) => {
      if (!e.shiftKey || e.defaultPrevented) return
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest(NATIVE_MENU)) return
      e.preventDefault()
      latest.current.open({ x: e.clientX, y: e.clientY, ...latest.current.where(target) })
    }
    window.addEventListener("contextmenu", on)
    return () => window.removeEventListener("contextmenu", on)
  }, [])
}

type Page = { href: string; label: string; icon: LucideIcon }
type Entry = { href: string; label: string; sub?: string; icon: LucideIcon }

const WIDTH = 296
const RECENT = 5

/** What an address's query names, read as words: a partner by its name, any other value with its dashes as spaces. */
function querySub(query: string): string | undefined {
  const params = new URLSearchParams(query.replace(/^[?]/, "").split("#")[0])
  const words = [...params].map(([k, v]) => (k === "partner" ? (PARTNERS.find((p) => p.id === v)?.name ?? v) : v.replace(/[-_]+/g, " ")))
  return words.length ? words.join(" · ") : undefined
}

/** A search's order: the label starting with it, then a word in it starting with it, then anywhere in it. */
function rank(e: Entry, needle: string) {
  const l = e.label.toLowerCase()
  if (l.startsWith(needle)) return 0
  if (l.split(/\s+/).some((w) => w.startsWith(needle))) return 1
  return 2
}

export function GoToMenu({ at, side, here, pages, titleOf, onOpen, onClose }: { at: { x: number; y: number }; side: Side; here: string; pages: Page[]; titleOf: (href: string) => string; onOpen: (href: string, to: Side) => void; onClose: () => void }) {
  const other: Side = side === "main" ? "pane" : "main"
  const recents = useNavRecents()
  const { favs } = useNavFavorites()
  const [q, setQ] = React.useState("")
  const input = React.useRef<HTMLInputElement>(null)
  const [active, setActive] = React.useState(0)
  const box = React.useRef<HTMLDivElement>(null)
  const [pos, setPos] = React.useState({ left: at.x, top: at.y })

  // A page's entry: its sidebar icon, its title, and the query when there is one (two Dashboards differ by it).
  const entry = React.useCallback(
    (href: string, icon?: LucideIcon): Entry => {
      const path = href.split(/[?#]/)[0]
      const page = pages.find((p) => p.href === path)
      const query = href.slice(path.length)
      return { href, label: page?.label ?? titleOf(href), sub: query ? querySub(query) : undefined, icon: icon ?? page?.icon ?? History }
    },
    [pages, titleOf],
  )

  const sections = React.useMemo(() => {
    const needle = q.trim().toLowerCase()
    // The page in the clicked panel, its query included, is where the reader already is.
    const recent = recents.filter((h) => h !== here).slice(0, RECENT).map((h) => entry(h))
    const fav = favs.map((h) => entry(h, Star))
    const all = pages.map((p) => entry(p.href))
    if (needle) {
      const seen = new Set<string>()
      const hits = [...all, ...recent, ...fav].filter((e) => (e.label.toLowerCase().includes(needle) || (e.sub ?? "").toLowerCase().includes(needle)) && !seen.has(e.href) && seen.add(e.href))
      return [{ label: null, entries: hits.sort((a, b) => rank(a, needle) - rank(b, needle)) }]
    }
    return [
      { label: "Recent", entries: recent },
      { label: "Favorites", entries: fav },
      { label: "Pages", entries: all },
    ].filter((s) => s.entries.length)
  }, [q, recents, favs, pages, here, entry])
  const flat = sections.flatMap((s) => s.entries)
  React.useEffect(() => setActive(0), [q])

  // Held inside the window: a right-click near an edge opens the menu toward the room.
  React.useLayoutEffect(() => {
    const h = box.current?.offsetHeight ?? 0
    setPos({ left: Math.max(8, Math.min(at.x, window.innerWidth - WIDTH - 8)), top: Math.max(8, Math.min(at.y, window.innerHeight - h - 8)) })
  }, [at])

  React.useEffect(() => {
    // A second Shift and right-click moves the card to its point (useShiftNav), so its press doesn't close it.
    const down = (e: MouseEvent) => !(e.button === 2 && e.shiftKey) && !box.current?.contains(e.target as Node) && !(e.target as Element).closest?.("[role=menu]") && onClose()
    const away = () => onClose()
    // Escape closes it wherever focus is; with the kebab's menu open, Escape closes that first.
    const key = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("body > [role=menu]") && onClose()
    document.addEventListener("keydown", key)
    document.addEventListener("mousedown", down)
    window.addEventListener("resize", away)
    window.addEventListener("blur", away)
    return () => {
      document.removeEventListener("keydown", key)
      document.removeEventListener("mousedown", down)
      window.removeEventListener("resize", away)
      window.removeEventListener("blur", away)
    }
  }, [onClose])

  // The grip moves the card: pressed, it follows the pointer, held inside the window.
  const drag = React.useRef<{ dx: number; dy: number } | null>(null)
  const grip = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      drag.current = { dx: e.clientX - pos.left, dy: e.clientY - pos.top }
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!drag.current) return
      const h = box.current?.offsetHeight ?? 0
      setPos({ left: Math.max(8, Math.min(e.clientX - drag.current.dx, window.innerWidth - WIDTH - 8)), top: Math.max(8, Math.min(e.clientY - drag.current.dy, window.innerHeight - h - 8)) })
    },
    onPointerUp: () => (drag.current = null),
  }

  const go = (href: string, toOther = false) => {
    onClose()
    const to = toOther ? other : side
    onOpen(href, to === "pane" && !isPanePath(href) ? "main" : to)
  }

  const onKey = (e: React.KeyboardEvent) => {
    // The kebab and its menu keep their own keys.
    if ((e.target as HTMLElement).closest("button, [role=menu]")) return
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      const n = flat.length
      if (n) setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + n) % n)
    }
    if (e.key === "Enter" && flat[active]) {
      e.preventDefault()
      go(flat[active].href, e.altKey)
    }
  }

  // Keep the active row in view as the arrows walk the list.
  React.useEffect(() => {
    box.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" })
  }, [active])

  let i = -1
  return createPortal(
    <div
      ref={box}
      role="dialog"
      aria-label="Go to"
      onKeyDown={onKey}
      onContextMenu={(e) => e.preventDefault()}
      style={{ left: pos.left, top: pos.top, width: WIDTH }}
      // The model card's shape (settings/blocks.tsx Block, Brendan, 2026-10-31): the tinted frame titled Nav, as a
      // question card is titled by what it is, with the inbox rows' grip before it and the three-dot menu opposite;
      // the search and the rows in the white card inside.
      className="fixed z-[60] rounded-[18px] border border-slate-200 bg-slate-50 p-1 shadow-e3"
    >
      <div className="flex items-center gap-1.5 pt-1.5 pr-1.5 pb-2 pl-2">
        <span {...grip} aria-label="Move" title="Move" className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center text-slate-400 active:cursor-grabbing">
          <GripVertical className="size-4" />
        </span>
        <h3 className="min-w-0 flex-1 text-[15px] font-semibold text-slate-900">Nav</h3>
        <KebabMenu label="Nav options" width="w-52" trigger={<EllipsisVertical className="size-4" />} triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-slate-800 outline-none hover:bg-foreground/8 hover:text-foreground aria-expanded:bg-foreground/8">
          <MenuRow icon={<Link2 />} label="Copy this page's link" onClick={() => (void navigator.clipboard.writeText(`${window.location.origin}${here}`), input.current?.focus())} />
          <MenuRow icon={<Trash2 />} label="Clear recent pages" disabled={!recents.length} onClick={() => (clearRecents(), input.current?.focus())} />
          <MenuSeparator />
          <MenuRow icon={<X />} label="Close" onClick={onClose} />
        </KebabMenu>
      </div>
      <div className="overflow-hidden rounded-[14px] border border-slate-200 bg-pax2-surface shadow-e1">
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5">
          <Search className="size-4 shrink-0 text-slate-400" />
          <input ref={input} autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Go to…" aria-label="Go to a page" className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
        </div>
      <div className="no-scrollbar max-h-[min(380px,64vh)] overflow-y-auto p-1.5" role="listbox">
        {!flat.length && <p className="px-2.5 py-3 text-sm text-slate-500">No page matches.</p>}
        {sections.map((s) => (
          <div key={s.label ?? "hits"} className="pb-1">
            {s.label && <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-slate-400 uppercase">{s.label}</p>}
            {s.entries.map((e) => {
              i += 1
              const me = i
              const on = me === active
              return (
                <div
                  key={`${s.label}:${e.href}`}
                  role="option"
                  aria-selected={on}
                  data-active={on}
                  onMouseMove={() => setActive(me)}
                  onClick={(ev) => go(e.href, ev.altKey)}
                  className={cn("group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm", on ? "bg-pax2-lift text-pax2-blue shadow-e1" : "text-slate-700")}
                >
                  <e.icon className={cn("size-4 shrink-0", on ? "text-pax2-blue" : "text-slate-400", e.icon === Star && "fill-amber-400 text-amber-400")} />
                  <span className="min-w-0 flex-1 truncate">
                    {e.label}
                    {e.sub && <span className="ml-1.5 text-xs text-slate-400">{e.sub}</span>}
                  </span>
                  {(other === "main" || isPanePath(e.href)) && (
                    <button
                      type="button"
                      aria-label={`Open ${e.label} in ${other === "pane" ? "the second panel" : "the main page"}`}
                      title={other === "pane" ? "Panel 2" : "Main page"}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        go(e.href, true)
                      }}
                      className={cn("flex size-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-foreground/8 hover:text-pax2-blue", !on && "opacity-0 group-hover:opacity-100")}
                    >
                      {other === "pane" ? <ArrowUpRight className="size-3.5" /> : <ArrowUpLeft className="size-3.5" />}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      </div>
    </div>,
    document.body,
  )
}
