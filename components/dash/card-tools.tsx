"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { CheckIcon, ChevronsDownUpIcon, CopyIcon, DownloadIcon, EllipsisVerticalIcon, LayoutGridIcon, LayoutListIcon, MessagesSquareIcon, PinIcon, RectangleHorizontalIcon, RectangleVerticalIcon, RefreshCwIcon, StarIcon, Trash2Icon } from "lucide-react"

import { CardTitle } from "@/components/nova/card"
import { usePinTop } from "@/components/dash/block-order"
import { KebabMenu, MenuFlyout, MenuFoot, MenuRow, MenuSeparator } from "@/components/kebab-menu"
import { AddToNoteRow } from "@/components/notes/add-to-note"
import { useCollectMark } from "@/components/notes/gather"
import type { BasketKind } from "@/lib/note-basket"
import { useShellPanel } from "@/components/shell"
import { useHiddenBlocks, useShelf } from "@/lib/home-blocks"
import { useNavFavorites } from "@/lib/nav-favorites"
import { whiteButton } from "@/components/white-button"
import { cn } from "@/lib/utils"

// Two things every Admin card carries (Brendan, 2026-09-06): a title that
// copies its own address when clicked — the page's URL with the card's
// anchor — and the standard three-dot menu in the top right, with whatever
// control the card already had sitting to its left.

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

export function CardAnchor({ children, id, className }: { children: string; id?: string; className?: string }) {
  const anchor = id ?? slug(children)
  const [copied, setCopied] = React.useState(false)
  const copy = () => {
    void navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}${window.location.search}#${anchor}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <CardTitle id={anchor} className={cn("scroll-mt-20", className)}>
      {/* hq's copy chip (app/ui/copy-code.tsx), reworked as Brendan asked on 2026-10-19: plain at
          rest; on hover the title keeps its own color on the muted ground and the copy icon
          surfaces where the check lands once copied, as lucide.dev's icon titles do. */}
      <button
        type="button"
        onClick={copy}
        title="Copy link to this card"
        className={cn(
          "group/anchor inline-flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 text-left transition-colors select-none focus-visible:outline-1 focus-visible:outline-ring",
          copied ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "text-foreground hover:bg-muted"
        )}
      >
        {children}
        {copied ? <CheckIcon className="size-3.5 text-green-600" /> : <CopyIcon className="size-3.5 opacity-0 transition-opacity group-hover/anchor:opacity-100" />}
      </button>
    </CardTitle>
  )
}

/** A block outside MainBlock and the ordered columns: gone from its page once its menu's Delete puts it on
 *  the Blocks shelf, back when it is opened there. */
export function UnlessDeleted({ anchor, children }: { anchor: string; children: React.ReactNode }) {
  const path = usePathname()
  const { hidden } = useHiddenBlocks()
  return hidden.includes(`${path}#${anchor}`) ? null : children
}

/** Opens the side panel's chat with the block around `from` as its context: the block's content, read off
 *  the screen at the click. */
function useAskBlock(from: React.RefObject<HTMLElement | null>, title?: string) {
  const { askAbout } = useShellPanel()
  const path = usePathname()
  return () => {
    const card = from.current?.closest<HTMLElement>('[data-slot="card"], [data-block]')
    const name = title ?? card?.querySelector('[data-slot="card-title"]')?.textContent ?? "this block"
    const text = (card?.innerText ?? "").replace(/\n{3,}/g, "\n\n").slice(0, 8000)
    askAbout({ context: () => `ACTIVE CONTEXT — the user is asking about the block "${name}" on ${path}. What the block shows on screen:\n${text}` })
  }
}

/** Every block's PAX/AI chip (Brendan, 2026-10-23): the home page's white button in small, PAX in navy and
 *  /AI in red in the curtain face, shadowed only on hover, in the header just before the chevron. It opens
 *  the side panel's chat with the block as its context. */
export function AskPaxChip({ title }: { title?: string }) {
  const self = React.useRef<HTMLButtonElement>(null)
  const ask = useAskBlock(self, title)
  return (
    <button ref={self} type="button" onClick={ask} aria-label={`Ask PAX about ${title ?? "this block"}`} className={whiteButton("md", "h-7 px-3 py-0 shadow-none hover:shadow-md")}>
      <span className="font-bold leading-none" style={{ fontFamily: "'PAX Curtain', monospace", fontSize: 14 }}>
        <span className="text-pax2-blue">PAX</span>
        <span className="text-pax2-red">/AI</span>
      </span>
    </button>
  )
}

/** A refresh icon: re-reads the page's data on the server. */
export function RefreshButton() {
  const router = useRouter()
  const [pending, start] = React.useTransition()
  return (
    <button type="button" aria-label="Refresh" title="Refresh" onClick={() => start(() => router.refresh())} className="inline-flex size-8 items-center justify-center rounded-md text-slate-800 hover:bg-muted hover:text-foreground">
      <RefreshCwIcon className={cn("size-3.5", pending && "animate-spin")} />
    </button>
  )
}

function download(rows: readonly Record<string, unknown>[], name: string, kind: "csv" | "json") {
  const body =
    kind === "json"
      ? JSON.stringify(rows, null, 2)
      : [Object.keys(rows[0] ?? {}), ...rows.map((r) => Object.values(r))].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, "\"\"")}"`).join(",")).join("\n")
  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob([body], { type: kind === "json" ? "application/json" : "text/csv" }))
  a.download = `${name}.${kind}`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** The card's controls: whatever it had, then the standard three-dot menu (Brendan, 2026-10-23), the same
 *  rows on every block in this order: Pin to top, Favorite, Add to Blocks, Ask PAX, Refresh, then the
 *  three sizes: Collapse, Half View, Full View.
 *  A block's own entries (View, Download, extras) follow below a separator. Pin to top works where the
 *  block sits in an ordered column and is greyed where it is already first or the page has no order. */
/** The address Blocks opens a card at: the page with its query, so a card on /survey?s=surveys opens there and not
 *  on /survey's list (the shelf compares the path alone, so a query means a navigation, which lands on the anchor). */
const here = (path: string) => (typeof window === "undefined" ? path : path + window.location.search)

/** Add to Blocks for a menu of its own (a question card's, a list row's): the right panel's Blocks section keeps the
 *  card's title and its address, the page with its query. The key carries the query too, so the same question on
 *  two of /survey's pages is two blocks. */
export function AddToBlocksRow({ title, anchor, kind, question }: { title: string; anchor: string; kind?: BasketKind; question?: { text: string; options: string[] } }) {
  const path = usePathname()
  const shelf = useShelf()
  const key = `${here(path)}#${anchor}`
  const on = shelf.has(key)
  return (
    <>
      <MenuRow icon={<LayoutGridIcon />} label={on ? "Remove from Blocks" : "Add to Blocks"} checked={on} onClick={() => (on ? shelf.remove(key) : shelf.add({ key, title, path: here(path), anchor }))} />
      {/* Its sibling while a note collects (Brendan, 2026-11-02). */}
      <AddToNoteRow title={title} anchor={anchor} kind={kind} question={question} />
    </>
  )
}

export function CardTools({
  children,
  className,
  views,
  view,
  onView,
  rows,
  name = "card",
  size,
  onSize,
  panel = false,
  menuItems,
  title,
  anchor,
  copy,
  collect,
}: {
  children?: React.ReactNode
  /** Extra entries for the three-dot menu (a Narrative, an Explain), after the standard ones. */
  menuItems?: React.ReactNode
  className?: string
  /** The views the card's slot can hold; the menu switches between them. */
  views?: readonly { value: string; label: string }[]
  view?: string
  onView?: (value: string) => void
  /** What Download writes. */
  rows?: readonly Record<string, unknown>[]
  name?: string
  /** The block's size: collapsed (header only), half (420px) or full (840px). */
  size?: "collapsed" | "half" | "full"
  onSize?: (size: "collapsed" | "half" | "full") => void
  /** A side panel's menu (Brendan, 2026-10-29): it fills its column and has no place in an order or the
   *  favorites, so no Pin to top, no Favorite and no sizes. */
  panel?: boolean
  /** The block's title and anchor: Favorite and Add to Blocks key on them, the foot shows the title. */
  title?: string
  anchor?: string
  /** The card's contents as text: present, the menu's Copy puts them on the clipboard (Brendan, 2026-11-02: every
   *  card's menu carries Copy and Add to Blocks). */
  copy?: string
  /** What the card is to a note's basket (Add to the note, beside Add to Blocks while a note collects): a block unless
   *  said, a value or a model card where it is one. */
  collect?: { kind: BasketKind; question?: { text: string; options: string[] } }
}) {
  const router = useRouter()
  const path = usePathname()
  const pinTop = usePinTop()
  const { favs, toggle: toggleFav } = useNavFavorites()
  const shelf = useShelf()
  const { hide } = useHiddenBlocks()
  const root = React.useRef<HTMLDivElement>(null)
  const key = anchor ? `${path}#${anchor}` : null
  const fav = !!key && favs.includes(key)
  const onShelf = !!key && shelf.has(key)
  // Ask PAX: the side panel's chat opens with the block's content, read off the screen at the click.
  const ask = useAskBlock(root, title)
  // The card's root carries what its Add to the note adds, for Option and a right-click while a note collects.
  useCollectMark(root, key && title && anchor ? { kind: collect?.kind ?? "block", title, anchor, question: collect?.question } : null)
  const extras = (views && views.length > 1) || !!menuItems || (rows && rows.length > 0)
  return (
    <div ref={root} className={cn("flex items-center gap-1", className)}>
      {children}
      {/* Code/hq's row kebab, in PAX's light dress (components/kebab-menu.tsx). Its hover is a touch of the ink
          over whatever it sits on (Brendan, 2026-10-31): a step down on the lights, up on the darks, and seen on
          any ground; bg-muted, the tint, vanished on the tint frames of /models' cards. */}
      <KebabMenu label="Block options" trigger={<EllipsisVerticalIcon className="size-4" />} triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-slate-800 outline-none hover:bg-foreground/8 hover:text-foreground aria-expanded:bg-foreground/8">
        {!panel && <MenuRow icon={<PinIcon />} label="Pin to top" disabled={!pinTop || pinTop.first} onClick={() => pinTop?.pin()} />}
        {!panel && <MenuRow icon={<StarIcon className={fav ? "fill-amber-400 text-amber-400" : undefined} />} label={fav ? "Unfavorite" : "Favorite"} disabled={!key} onClick={() => key && toggleFav(key)} />}
        {copy != null && <MenuRow icon={<CopyIcon />} label="Copy" onClick={() => void navigator.clipboard?.writeText(copy)} />}
        <MenuRow icon={<LayoutGridIcon />} label={onShelf ? "Remove from Blocks" : "Add to Blocks"} checked={onShelf} disabled={!key || !title} onClick={() => key && title && anchor && (onShelf ? shelf.remove(key) : shelf.add({ key, title, path: here(path), anchor }))} />
        {key && title && anchor && <AddToNoteRow title={title} anchor={anchor} kind={collect?.kind ?? "block"} question={collect?.question} />}
        <MenuRow icon={<MessagesSquareIcon />} label="Ask PAX" onClick={ask} />
        <MenuRow icon={<RefreshCwIcon />} label="Refresh" onClick={() => router.refresh()} />
        {!panel && (
          <>
            <MenuSeparator />
            <MenuRow icon={<ChevronsDownUpIcon />} label="Collapse" checked={size === "collapsed"} disabled={!onSize} onClick={() => onSize?.("collapsed")} />
            <MenuRow icon={<RectangleHorizontalIcon />} label="Half View" checked={size === "half"} disabled={!onSize} onClick={() => onSize?.("half")} />
            <MenuRow icon={<RectangleVerticalIcon />} label="Full View" checked={size === "full"} disabled={!onSize} onClick={() => onSize?.("full")} />
          </>
        )}
        {extras && <MenuSeparator />}
        {views && views.length > 1 && (
          <MenuFlyout id="view" icon={<LayoutListIcon />} label="View" hint={views.find((v) => v.value === view)?.label}>
            {views.map((v) => (
              <MenuRow key={v.value} label={v.label} checked={v.value === view} onClick={() => onView?.(v.value)} />
            ))}
          </MenuFlyout>
        )}
        {menuItems}
        {rows && rows.length > 0 && (
          <MenuFlyout id="download" icon={<DownloadIcon />} label="Download" hint={`${rows.length} rows`}>
            <MenuRow label="CSV" onClick={() => download(rows, name, "csv")} />
            <MenuRow label="JSON" onClick={() => download(rows, name, "json")} />
          </MenuFlyout>
        )}
        <MenuSeparator />
        {/* Delete: off this page, onto the Blocks shelf, where opening it puts it back. */}
        <MenuRow icon={<Trash2Icon />} label="Delete" danger disabled={!pinTop && (!key || !title)} onClick={() => (pinTop ? pinTop.hide() : key && title && anchor && (shelf.add({ key, title, path: here(path), anchor }), hide(key)))} />
        {title && (
          <>
            <MenuSeparator />
            <MenuFoot title={title} sub={path} />
          </>
        )}
      </KebabMenu>
    </div>
  )
}
