"use client"

import * as React from "react"
import { ArrowLeft, CornerDownLeft } from "lucide-react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { boxKey, getHome, home } from "@/lib/home-store"

import { ASK_AT, ITEMS, KINDS, SECTIONS, setNavigate, suggested, type CommandItem } from "./command-data"
import { NysgptMark as PaxMark } from "./nysgpt-mark"
import "./command-k.css"

// From pax-trinity's src/components/command/command-k.tsx (2026-11-19, brief 47), as written: only the
// imports, the catalog (command-data.ts) and what choosing a row does are NYSgpt's. Opened from an empty
// Blocks slot (`slot`), choosing a box puts it in that slot; opened by the keys, it opens the box.
// The pax2 tokens the classes name are set, with pax-trinity's light values, in command-k.css.
//
// ⌘K (Brendan, 2026-10-29): Raycast's palette in the chat's figure. The outer shape is the chat block's
// <figure> (rounded-2xl, slate-200 rule, slate-50 ground); inside, Raycast's anatomy: the one big field
// with Ask PAX on Tab at its right, named sections of rows (a tile, the title, its muted line, the kind at
// the right), the picked row raised, and the foot naming what Enter does and that ⌘K opens the actions.
// Tab, or Ask PAX, turns the palette into the ask view; @ there lists the surfaces to point at. Unwired:
// the catalog is command-data.ts's stand-ins; a page or a report opens, anything else only closes.

type Row = { key: string; item?: CommandItem; ask?: string; at?: (typeof ASK_AT)[number] }
type Action = { label: string; keys: string[]; run: () => void }

const KBD = "inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-slate-300 bg-pax2-surface px-1.5 text-[12px] font-medium text-slate-600"

/** Every token of the query in the row's words; the title's own matches rank first. */
function score(item: CommandItem, q: string) {
  const title = item.title.toLowerCase()
  const hay = `${title} ${item.subtitle ?? ""} ${item.keywords ?? ""} ${KINDS[item.kind].label}`.toLowerCase()
  const tokens = q.split(/\s+/).filter(Boolean)
  if (!tokens.every((t) => hay.includes(t))) return 0
  return title.startsWith(q) ? 3 : title.includes(q) ? 2 : 1
}

function Tile({ icon: Icon, tint, size = 28, logo }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; tint: string; size?: number; logo?: string }) {
  // A box with its own logo: the logo on white in a tile ringed in its set's colour (NYSgpt's boxes, 2026-11-19).
  if (logo)
    return (
      <span className="flex shrink-0 items-center justify-center rounded-lg bg-white" style={{ width: size, height: size, boxShadow: `inset 0 0 0 1.5px ${tint}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" className={size > 40 ? "size-7 object-contain" : "size-4 object-contain"} />
      </span>
    )
  return (
    <span className="flex shrink-0 items-center justify-center rounded-lg text-white shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)]" style={{ width: size, height: size, background: tint }}>
      <Icon className={size > 40 ? "size-7" : "size-4"} strokeWidth={2} />
    </span>
  )
}

export function CommandK({ onClose, slot }: { onClose: () => void; slot?: number }) {
  const router = useRouter()
  React.useEffect(() => setNavigate((href) => router.push(href)), [router])
  const [mode, setMode] = React.useState<"search" | "ask">("search")
  const [q, setQ] = React.useState("")
  const [asked, setAsked] = React.useState("")
  const [at, setAt] = React.useState(0)
  const [actions, setActions] = React.useState(false)
  const [actionAt, setActionAt] = React.useState(0)
  const input = React.useRef<HTMLInputElement>(null)
  const list = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => input.current?.focus(), [mode])

  // The rows on screen, by section: suggestions and the two short lists before anything is typed; the
  // matches by section after; and, under the matches, the query handed to Ask PAX or a surface's search.
  const groups = React.useMemo((): { title: string; rows: Row[] }[] => {
    if (mode === "ask") {
      if (!asked.trimStart().startsWith("@")) return []
      const needle = asked.trim().slice(1).toLowerCase()
      return [{ title: "Ask about", rows: ASK_AT.filter((a) => a.label.toLowerCase().includes(needle)).map((a) => ({ key: `at:${a.label}`, at: a })) }]
    }
    const needle = q.trim().toLowerCase()
    if (!needle) {
      const picks = suggested().map((id) => ITEMS.find((i) => i.id === id)).filter((i): i is CommandItem => !!i)
      return [
        // The reader's favourite and pinned boxes; the heading only when there are some.
        ...(picks.length ? [{ title: "Suggestions", rows: picks.map((item) => ({ key: `s:${item.id}`, item })) }] : []),
        { title: "Pages", rows: ITEMS.filter((i) => i.kind === "page").map((item) => ({ key: item.id, item })) },
        { title: "Commands", rows: ITEMS.filter((i) => i.kind === "command").map((item) => ({ key: item.id, item })) },
      ]
    }
    const hits = ITEMS.map((item) => ({ item, s: score(item, needle) })).filter((x) => x.s > 0)
    const out: { title: string; rows: Row[] }[] = SECTIONS.map((title) => ({
      title,
      rows: hits
        .filter((x) => KINDS[x.item.kind].section === title)
        .sort((a, b) => b.s - a.s)
        .slice(0, 8)
        .map((x) => ({ key: x.item.id, item: x.item })),
    })).filter((g) => g.rows.length)
    out.push({ title: `Use “${q.trim()}” with…`, rows: [{ key: "ask", ask: q.trim() }] })
    return out
  }, [mode, q, asked])
  const rows = React.useMemo(() => groups.flatMap((g) => g.rows), [groups])
  const current = rows[Math.min(at, rows.length - 1)]

  React.useEffect(() => setAt(0), [q, asked, mode])
  React.useEffect(() => {
    list.current?.querySelector('[data-picked="true"]')?.scrollIntoView({ block: "nearest" })
  }, [at])

  const open = (row: Row | undefined) => {
    if (!row) return
    if (row.ask != null) {
      setAsked(row.ask)
      setMode("ask")
      return
    }
    if (row.at) {
      setAsked(`@${row.at.label} `)
      input.current?.focus()
      return
    }
    const item = row.item
    if (item?.box && slot != null) {
      // From an empty Blocks slot: onto the shelf if it is not there, then into that slot.
      const key = boxKey(item.box)
      if (!getHome().shelf.some((s) => s.key === key)) home.toggleShelf(item.box)
      home.placeShelf(key, slot)
    } else if (item?.run) item.run()
    else if (item?.href) router.push(item.href)
    onClose()
  }

  const primary = mode === "ask" ? (groups[0]?.rows.length ? "Ask About" : "Ask NYSgpt") : current?.ask != null ? "Ask NYSgpt" : current?.item ? (current.item.box && slot != null ? "Add to Blocks" : KINDS[current.item.kind].action) : "Open"
  const actionList: Action[] = current?.item
    ? [
        { label: KINDS[current.item.kind].action, keys: ["↵"], run: () => open(current) },
        {
          label: "Open in New Tab",
          keys: ["⌘", "↵"],
          run: () => {
            if (current.item?.href) window.open(current.item.href, "_blank", "noopener")
            onClose()
          },
        },
        {
          label: "Copy Link",
          keys: ["⌘", "C"],
          run: () => {
            if (current.item?.href) void navigator.clipboard.writeText(`${window.location.origin}${current.item.href}`)
            onClose()
          },
        },
        {
          label: "Add to Blocks",
          keys: ["⌘", "B"],
          run: () => {
            const b = current.item?.box
            if (b && !getHome().shelf.some((s) => s.key === boxKey(b))) home.toggleShelf(b)
            onClose()
          },
        },
        {
          label: "Ask NYSgpt About This",
          keys: ["⌘", "J"],
          run: () => {
            setAsked(`About “${current.item!.title}”: `)
            setMode("ask")
            setActions(false)
          },
        },
      ]
    : [{ label: "Ask NYSgpt", keys: ["↵"], run: () => open(current) }]

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault()
      e.stopPropagation()
      setActions((v) => !v)
      setActionAt(0)
      return
    }
    if (actions) {
      if (!["Escape", "ArrowDown", "ArrowUp", "Enter"].includes(e.key)) return
      e.preventDefault()
      if (e.key === "Escape") setActions(false)
      else if (e.key === "ArrowDown") setActionAt((i) => Math.min(i + 1, actionList.length - 1))
      else if (e.key === "ArrowUp") setActionAt((i) => Math.max(i - 1, 0))
      else actionList[actionAt]?.run()
      return
    }
    if (e.key === "Escape") {
      e.preventDefault()
      if (mode === "ask") setMode("search")
      else onClose()
      return
    }
    if (e.key === "Tab" && mode === "search") {
      e.preventDefault()
      setAsked(q)
      setMode("ask")
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setAt((i) => Math.min(i + 1, rows.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setAt((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (mode === "ask" && !groups[0]?.rows.length) onClose()
      else open(current)
    }
  }

  return (
    <div data-cmdk className="fixed inset-0 z-[100] flex items-start justify-center bg-night-900/15 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()} onKeyDown={onKey}>
      <figure role="dialog" aria-label="Search" className="relative w-full max-w-[780px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-e3 animate-in fade-in slide-in-from-top-1 duration-200">
        {/* The field */}
        <div className="flex h-[62px] items-center gap-3 border-b border-slate-200 px-5">
          {mode === "ask" && (
            <button type="button" aria-label="Back to search" onClick={() => setMode("search")} className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-200/70 text-slate-700 transition-colors hover:bg-slate-200">
              <ArrowLeft className="size-4" />
            </button>
          )}
          <input
            ref={input}
            value={mode === "ask" ? asked : q}
            onChange={(e) => (mode === "ask" ? setAsked(e.target.value) : setQ(e.target.value))}
            placeholder={mode === "ask" ? "Ask me anything…" : "Search everything…"}
            aria-label={mode === "ask" ? "Ask NYSgpt" : "Search everything"}
            className="min-w-0 flex-1 bg-transparent text-[19px] text-slate-900 outline-none placeholder:text-slate-400"
          />
          {mode === "search" && (
            <button
              type="button"
              onClick={() => {
                setAsked(q)
                setMode("ask")
              }}
              className="flex shrink-0 items-center gap-2.5 text-[15px] text-slate-500 transition-colors hover:text-slate-800">
              Ask NYSgpt <span className={KBD}>Tab</span>
            </button>
          )}
        </div>

        {/* The rows, or the ask view */}
        <div ref={list} className="no-scrollbar h-[440px] overflow-y-auto py-1.5">
          {mode === "ask" && !groups[0]?.rows.length ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 pb-6 text-center">
              <p className="text-[26px] font-semibold tracking-tight text-slate-900">Ask anything</p>
              <p className="text-[15px] text-slate-500">Type @ to ask about a page</p>
              <div className="mt-5 flex items-center gap-2.5">
                {ASK_AT.slice(0, 7).map((a, i) => (
                  <span key={a.label} title={a.label} className={cn("transition-transform", i === 3 ? "scale-110" : "opacity-80")}>
                    <Tile icon={a.icon} tint={a.tint} size={i === 3 ? 56 : 46} />
                  </span>
                ))}
              </div>
            </div>
          ) : rows.length === 0 ? (
            <p className="flex h-full items-center justify-center text-[15px] text-slate-500">No results</p>
          ) : (
            groups.map((g) => (
              <section key={g.title}>
                <h3 className="px-5 pt-3 pb-1.5 text-[13px] font-semibold text-slate-500">{g.title}</h3>
                {g.rows.map((row) => {
                  const i = rows.indexOf(row)
                  const picked = i === at
                  const k = row.item ? KINDS[row.item.kind] : null
                  return (
                    <button
                      key={row.key}
                      type="button"
                      data-picked={picked}
                      onMouseMove={() => at !== i && setAt(i)}
                      onClick={() => open(row)}
                      className={cn("mx-2 flex h-12 w-[calc(100%-16px)] items-center gap-3 rounded-xl px-3 text-left transition-colors", picked ? "bg-pax2-surface shadow-e1" : "hover:bg-pax2-surface/60")}
                    >
                      {row.item && k ? <Tile icon={row.item.icon ?? k.icon} tint={k.tint} logo={row.item.logo} /> : row.at ? <Tile icon={row.at.icon} tint={row.at.tint} /> : <PaxMark size={18} className="mx-[5px] shrink-0" />}
                      <span className="flex min-w-0 flex-1 items-baseline gap-3">
                        <span className="truncate text-[15px] font-medium text-slate-900">{row.item?.title ?? (row.at ? `@${row.at.label}` : "Ask NYSgpt")}</span>
                        <span className="truncate text-[14px] text-slate-500">{row.item?.subtitle ?? (row.at ? "Ask about this page" : `“${row.ask}”`)}</span>
                      </span>
                      <span className="ml-3 shrink-0 text-[13px] text-slate-500">{k?.label ?? (row.at ? "Page" : "Ask")}</span>
                    </button>
                  )
                })}
              </section>
            ))
          )}
        </div>

        {/* The foot */}
        <div className="flex h-[52px] items-center gap-3 border-t border-slate-200 bg-pax2-surface/70 px-4">
          <PaxMark size={18} />
          {mode === "ask" && <span className="text-[14px] text-slate-600">Ask NYSgpt</span>}
          <span className="ml-auto flex items-center gap-2.5 text-[14px]">
            <span className="font-medium text-slate-900">{primary}</span>
            <span className={KBD}>
              <CornerDownLeft className="size-3.5" />
            </span>
            <span aria-hidden className="mx-1 h-4 w-px bg-slate-300" />
            <button
              type="button"
              onClick={() => {
                setActions((v) => !v)
                setActionAt(0)
              }}
              className="flex items-center gap-2 text-slate-500 transition-colors hover:text-slate-800"
            >
              Actions <span className={KBD}>⌘</span>
              <span className={KBD}>K</span>
            </button>
          </span>
        </div>

        {/* The actions, over the foot's right corner */}
        {actions && (
          <div className="absolute right-3 bottom-[58px] w-80 overflow-hidden rounded-xl border border-slate-200 bg-pax2-surface p-1.5 shadow-e3 animate-in fade-in slide-in-from-bottom-1 duration-150">
            <p className="truncate px-2.5 pt-1 pb-2 text-[12px] font-semibold text-slate-500">{current?.item?.title ?? "Ask NYSgpt"}</p>
            {actionList.map((a, i) => (
              <button
                key={a.label}
                type="button"
                onMouseMove={() => setActionAt(i)}
                onClick={a.run}
                className={cn("flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[14px] text-slate-800", i === actionAt && "bg-slate-100")}
              >
                <span className="flex-1 truncate">{a.label}</span>
                <span className="flex gap-1">
                  {a.keys.map((key) => (
                    <span key={key} className={KBD}>
                      {key === "↵" ? <CornerDownLeft className="size-3.5" /> : key}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        )}
      </figure>
    </div>
  )
}
