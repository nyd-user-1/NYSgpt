"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, ChevronsDownUp, EllipsisVertical, LayoutGrid, Link2, Loader2, MessagesSquare, Pin, RectangleHorizontal, RectangleVertical, RefreshCw, Star } from "lucide-react"

import { KebabMenu, MenuFoot, MenuRow, MenuSeparator } from "@/components/kebab-menu"
import { AddToNoteRow } from "@/components/notes/add-to-note"
import { useShellPanel } from "@/components/shell"
import { useNavFavorites } from "@/lib/nav-favorites"
import { COLLECT_ATTR, collectAttr } from "@/lib/note-collect"

import { useShelf } from "@/lib/home-blocks"
import { cn } from "@/lib/utils"

// A block the chat answers with: the reply names it as [[block:/path#anchor]], and it renders here as the
// block stands on its page right now (read through /api/block-context), framed with its way back to the
// page and onto the Blocks shelf. A snapshot: the block's text, tables and drawn charts show; a chart
// painted on a canvas waits for the page. The block's own header works: the title copies its link, the
// chevron folds it, the info circle opens it on its page (where its tour runs), and a live three-dot menu
// stands over the pictured one.

export const BLOCK_REF = /\[\[block:(\/[^\]#\s]*)#([\w-]+)\]\]/g

export function ChatBlock({ path, anchor }: { path: string; anchor: string }) {
  const router = useRouter()
  const { add, remove, has } = useShelf()
  const { askAbout } = useShellPanel()
  const { favs, toggle: toggleFav } = useNavFavorites()
  const [state, setState] = React.useState<{ html?: string; error?: string }>({})
  const [size, setSize] = React.useState<"collapsed" | "half" | "full">("full")
  const collapsed = size === "collapsed"
  const [nonce, setNonce] = React.useState(0)
  const snap = React.useRef<HTMLDivElement>(null)
  const frame = React.useRef<HTMLDivElement>(null)
  const [kebab, setKebab] = React.useState<{ top: number; left: number } | null>(null)
  React.useEffect(() => {
    let alive = true
    fetch("/api/block-context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, anchor, html: true }) })
      .then((r) => r.json() as Promise<{ html?: string; error?: string }>)
      .then((j) => alive && setState(j))
      .catch((e) => alive && setState({ error: (e as Error).message }))
    return () => {
      alive = false
    }
  }, [path, anchor, nonce])
  // Where the pictured three-dot button sits, so the live menu can stand on it. The picture's own cards lose their
  // Add to the note marks: Option and a right-click gathers the block itself, at its own page.
  React.useLayoutEffect(() => {
    snap.current?.querySelectorAll(`[${COLLECT_ATTR}]`).forEach((el) => el.removeAttribute(COLLECT_ATTR))
    const dead = snap.current?.querySelector<HTMLElement>('button[aria-label="Block options"]')
    const box = frame.current?.getBoundingClientRect()
    if (!dead || !box) return setKebab(null)
    const r = dead.getBoundingClientRect()
    setKebab({ top: r.top - box.top, left: r.left - box.left })
  }, [state.html, collapsed])
  const link = () => `${window.location.origin}${path}#${anchor}`
  // The header's own buttons, by what they say they are.
  const onSnapClick = (e: React.MouseEvent) => {
    const b = (e.target as HTMLElement).closest("button")
    if (!b) return
    const label = b.getAttribute("aria-label") ?? ""
    if (/^(Half|Full) view /.test(label)) setSize((s) => (s === "half" ? "full" : "half"))
    else if (/^Ask PAX about /.test(label)) {
      const text = (snap.current?.innerText ?? "").replace(/\n{3,}/g, "\n\n").slice(0, 8000)
      askAbout({ context: () => `ACTIVE CONTEXT — the user is asking about the block "${title}" on ${path}. What the block shows on screen:\n${text}` })
    }
    else if (/How to read|End the tour/.test(label)) router.push(`${path}#${anchor}`)
    else if (b.closest('[data-slot="card-title"]')) navigator.clipboard.writeText(link())
  }
  const key = `${path}#${anchor}`
  const title = anchor.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase())
  const onShelf = has(key)
  return (
    <figure className="my-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 animate-in fade-in slide-in-from-bottom-1 duration-300" {...collectAttr({ kind: "block", title, anchor, path })}>
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-[12px] text-slate-500">
        <LayoutGrid className="size-3.5 text-pax2-blue" />
        <span className="font-mono">{key}</span>
        <span className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => add({ key, title, path, anchor })} disabled={onShelf} className="rounded-md px-2 py-1 font-medium text-slate-600 transition-colors hover:bg-pax2-surface hover:text-pax2-blue disabled:text-slate-400">
            {onShelf ? "On the shelf" : "Add to Blocks"}
          </button>
          <button type="button" onClick={() => router.push(`${path}#${anchor}`)} className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-slate-600 transition-colors hover:bg-pax2-surface hover:text-pax2-blue">
            Open <ArrowUpRight className="size-3.5" />
          </button>
        </span>
      </div>
      <div className={cn("p-3 text-sm", !state.html && "flex items-center justify-center py-10")}>
        {state.html ? (
          <div ref={frame} className="relative">
            <div
              ref={snap}
              onClick={onSnapClick}
              className={cn(
                "[&_[data-slot=card]]:!h-auto [&_[data-slot=card-footer]]:hidden [&_button[aria-label='Block_options']]:invisible",
                size === "full" ? "[&_[data-slot=card]]:max-h-[840px]" : "[&_[data-slot=card]]:max-h-[420px]",
                size === "full" && "[&_[data-slot=card-header]_.lucide-chevron-down]:rotate-180",
                collapsed && "[&_[data-slot=card-content]]:hidden [&_[data-slot=card-header]_.lucide-chevron-down]:!rotate-0 [&_[data-slot=card-header]]:!border-b-0",
              )}
              dangerouslySetInnerHTML={{ __html: state.html }}
            />
            {kebab && (
              <span className="absolute" style={{ top: kebab.top, left: kebab.left }}>
                <KebabMenu label="Block options" trigger={<EllipsisVertical className="size-4" />} triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-slate-800 outline-none hover:bg-muted hover:text-foreground aria-expanded:bg-muted">
                  <MenuRow icon={<Pin />} label="Pin to top" disabled onClick={() => {}} />
                  <MenuRow icon={<Star className={favs.includes(key) ? "fill-amber-400 text-amber-400" : undefined} />} label={favs.includes(key) ? "Unfavorite" : "Favorite"} onClick={() => toggleFav(key)} />
                  <MenuRow icon={<LayoutGrid />} label={onShelf ? "Remove from Blocks" : "Add to Blocks"} checked={onShelf} onClick={() => (onShelf ? remove(key) : add({ key, title, path, anchor }))} />
                  <AddToNoteRow title={title} anchor={anchor} path={path} />
                  <MenuRow icon={<MessagesSquare />} label="Ask PAX" onClick={() => { const text = (snap.current?.innerText ?? "").replace(/\n{3,}/g, "\n\n").slice(0, 8000); askAbout({ context: () => `ACTIVE CONTEXT — the user is asking about the block "${title}" on ${path}. What the block shows on screen:\n${text}` }) }} />
                  <MenuRow icon={<RefreshCw />} label="Refresh" onClick={() => setNonce((n) => n + 1)} />
                  <MenuSeparator />
                  <MenuRow icon={<ChevronsDownUp />} label="Collapse" checked={size === "collapsed"} onClick={() => setSize("collapsed")} />
                  <MenuRow icon={<RectangleHorizontal />} label="Half View" checked={size === "half"} onClick={() => setSize("half")} />
                  <MenuRow icon={<RectangleVertical />} label="Full View" checked={size === "full"} onClick={() => setSize("full")} />
                  <MenuSeparator />
                  <MenuRow icon={<ArrowUpRight />} label="Open on its page" onClick={() => router.push(`${path}#${anchor}`)} />
                  <MenuRow icon={<Link2 />} label="Copy link" onClick={() => navigator.clipboard.writeText(link())} />
                  <MenuSeparator />
                  <MenuFoot title={title} sub={path} />
                </KebabMenu>
              </span>
            )}
          </div>
        ) : state.error ? (
          <a href={path} onClick={(e) => (e.preventDefault(), router.push(path))} className="font-medium text-pax2-light-blue hover:underline">
            Open the page
          </a>
        ) : (
          <Loader2 className="size-5 animate-spin text-slate-400" />
        )}
      </div>
    </figure>
  )
}
