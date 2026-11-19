"use client"

import * as React from "react"
import { ArrowLeft, CornerDownLeft } from "lucide-react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { boxKey, getHome, home } from "@/lib/home-store"
import { TypeIcon } from "@/app/HomeIcons"
import type { BoxIcon } from "@/lib/home-boxes"

import { ASK_AT, ITEMS, KINDS, SECTIONS, boxActions, preloadForCommands, setNavigate, suggested, type CommandItem, type RunCtx } from "./command-data"
import { useSwitchboard } from "@/components/SwitchboardPanel"
import { useShellPanel } from "@/components/shell"
import { NysgptMark as PaxMark } from "./nysgpt-mark"
import "./command-k.css"
// brief 50: a picked row plays its icon's govblock or animate-ui motion (the keys pick a row as the mouse does)
import { AnimateIcon } from "@/components/animate-ui/icons/icon"
import { useReducedMotion } from "motion/react"

// From pax-trinity's src/components/command/command-k.tsx (2026-11-19, brief 47), as written: only the
// imports, the catalog (command-data.ts) and what choosing a row does are NYSgpt's. Opened from an empty
// Blocks slot (`slot`), choosing a box puts it in that slot; opened by the keys, it opens the box.
// Restyled to NYSgpt's look (Brendan, 2026-11-19 05:45: "white with the clear lines"): the cmdk-* classes in
// command-k.css carry the paper ground, the rules, the type and the site-blue pick, through the paper
// tokens so the dark theme holds; the structure, keys and animations are the source's.
//
// ⌘K (Brendan, 2026-10-29): Raycast's palette in the chat's figure. The outer shape is the chat block's
// <figure> (rounded-2xl, slate-200 rule, slate-50 ground); inside, Raycast's anatomy: the one big field
// with Ask PAX on Tab at its right, named sections of rows (a tile, the title, its muted line, the kind at
// the right), the picked row raised, and the foot naming what Enter does and that ⌘K opens the actions.
// Tab, or Ask PAX, turns the palette into the ask view; @ there lists the surfaces to point at. Unwired:
// the catalog is command-data.ts's stand-ins; a page or a report opens, anything else only closes.

type Row = { key: string; item?: CommandItem; ask?: string; at?: (typeof ASK_AT)[number] }
type Action = { label: string; keys: string[]; run: () => void }

const KBD = "cmdk-kbd inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 text-[12px] font-medium"

/** Every token of the query in the row's words; the title's own matches rank first. */
function score(item: CommandItem, q: string) {
  const title = item.title.toLowerCase()
  const hay = `${title} ${item.subtitle ?? ""} ${item.keywords ?? ""} ${KINDS[item.kind].label}`.toLowerCase()
  const tokens = q.split(/\s+/).filter(Boolean)
  if (!tokens.every((t) => hay.includes(t))) return 0
  return title.startsWith(q) ? 3 : title.includes(q) ? 2 : 1
}

function Tile({ icon: Icon, tint, size = 28, logo, mark, fg }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; tint: string; size?: number; logo?: string; mark?: BoxIcon; fg?: string }) {
  // A logo (a box's logo file, or a mark TypeIcon draws: GitHub, Hugging Face, the sources) sits on a white
  // tile with a 1px rule; every other tile is its set's colour with the icon in white (2026-11-19).
  if (logo || mark)
    return (
      <span className="cmdk-tile cmdk-logo flex shrink-0 items-center justify-center rounded-lg border bg-white" style={{ width: size, height: size }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className={size > 40 ? "size-7 object-contain" : "size-4 object-contain"} />
        ) : (
          <span className={cn("flex text-[#16181d] [&>img]:size-full [&>img]:object-contain [&>svg]:size-full", size > 40 ? "size-7" : "size-4")}>
            <TypeIcon icon={mark!} />
          </span>
        )}
      </span>
    )
  return (
    <span className="cmdk-tile flex shrink-0 items-center justify-center rounded-lg text-white shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)]" style={{ width: size, height: size, background: tint, color: fg }}>
      <Icon className={size > 40 ? "size-7" : "size-4"} strokeWidth={2} />
    </span>
  )
}

export function CommandK({ onClose, slot }: { onClose: () => void; slot?: number }) {
  const router = useRouter()
  const reduce = useReducedMotion()
  React.useEffect(() => setNavigate((href) => router.push(href)), [router])
  // Run commands (brief 51): what they can reach, and the sentence a failed one leaves in the foot.
  const switchboard = useSwitchboard()
  const shell = useShellPanel()
  const ctx: RunCtx = { push: (href) => router.push(href), openBlocks: switchboard.openBlocks, openPane: shell.openPane, openResult: switchboard.openResult }
  const [note, setNote] = React.useState("")
  React.useEffect(() => preloadForCommands(), [])
  const runAct = async (act: NonNullable<CommandItem["act"]>) => {
    setNote("")
    try {
      const why = await act(ctx)
      if (typeof why === "string") {
        setNote(why)
        setActions(false)
        return
      }
      onClose()
    } catch (e) {
      setNote(`That did not work: ${(e as Error).message}.`)
      setActions(false)
    }
  }
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
  React.useEffect(() => setNote(""), [q, mode])
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
    } else if (item?.act) {
      void runAct(item.act)
      return
    } else if (item?.run) item.run()
    else if (item?.href) router.push(item.href)
    onClose()
  }

  const primary = mode === "ask" ? (groups[0]?.rows.length ? "Ask About" : "Ask NYSgpt") : current?.ask != null ? "Ask NYSgpt" : current?.item ? (current.item.box && slot != null ? "Add to Blocks" : KINDS[current.item.kind].action) : "Open"
  const actionList: Action[] = current?.item
    ? [
        { label: KINDS[current.item.kind].action, keys: ["↵"], run: () => open(current) },
        ...(current.item.href
          ? [
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
            ]
          : []),
        // A box's Run commands (brief 51): only those that can work for it.
        ...(current.item.box ? boxActions(current.item.box).map((a) => ({ label: a.label, keys: a.keys, run: () => void runAct(a.act) })) : []),
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
    <div data-cmdk className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()} onKeyDown={onKey}>
      <figure role="dialog" aria-label="Search" className="cmdk-box relative w-full max-w-[780px] overflow-hidden rounded-2xl border animate-in fade-in slide-in-from-top-1 duration-200">
        {/* The field */}
        <div className="cmdk-rule-b flex h-[62px] items-center gap-3 border-b px-5">
          {mode === "ask" && (
            <button type="button" aria-label="Back to search" onClick={() => setMode("search")} className="cmdk-back flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors">
              <ArrowLeft className="size-4" />
            </button>
          )}
          <input
            ref={input}
            value={mode === "ask" ? asked : q}
            onChange={(e) => (mode === "ask" ? setAsked(e.target.value) : setQ(e.target.value))}
            placeholder={mode === "ask" ? "Ask me anything…" : "Search everything…"}
            aria-label={mode === "ask" ? "Ask NYSgpt" : "Search everything"}
            className="cmdk-input min-w-0 flex-1 bg-transparent text-[19px] outline-none"
          />
          {mode === "search" && (
            <button
              type="button"
              onClick={() => {
                setAsked(q)
                setMode("ask")
              }}
              className="cmdk-quiet flex shrink-0 items-center gap-2.5 text-[15px] transition-colors">
              Ask NYSgpt <span className={KBD}>Tab</span>
            </button>
          )}
        </div>

        {/* The rows, or the ask view */}
        <div ref={list} className="no-scrollbar h-[440px] overflow-y-auto py-1.5">
          {mode === "ask" && !groups[0]?.rows.length ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 pb-6 text-center">
              <p className="cmdk-title text-[26px]">Ask anything</p>
              <p className="cmdk-muted text-[15px]">Type @ to ask about a page</p>
              <div className="mt-5 flex items-center gap-2.5">
                {ASK_AT.slice(0, 7).map((a, i) => (
                  <span key={a.label} title={a.label} className={cn("transition-transform", i === 3 ? "scale-110" : "opacity-80")}>
                    <Tile icon={a.icon} tint={a.tint} size={i === 3 ? 56 : 46} />
                  </span>
                ))}
              </div>
            </div>
          ) : rows.length === 0 ? (
            <p className="cmdk-faint flex h-full items-center justify-center text-[15px]">No results</p>
          ) : (
            groups.map((g) => (
              <section key={g.title}>
                <h3 className="cmdk-group px-5 pt-3 pb-1.5">{g.title}</h3>
                {g.rows.map((row) => {
                  const i = rows.indexOf(row)
                  const picked = i === at
                  const k = row.item ? KINDS[row.item.kind] : null
                  return (
                    <AnimateIcon key={row.key} asChild animate={picked && !reduce}>
                    <button
                      type="button"
                      data-picked={picked}
                      onMouseMove={() => at !== i && setAt(i)}
                      onClick={() => open(row)}
                      className={cn("cmdk-row flex h-12 w-full items-center gap-3 px-5 text-left transition-colors", picked && "cmdk-on")}
                    >
                      {row.item && k ? <Tile icon={row.item.icon ?? k.icon} tint={row.item.tint ?? k.tint} logo={row.item.logo} mark={row.item.mark} fg={row.item.fg} /> : row.at ? <Tile icon={row.at.icon} tint={row.at.tint} /> : <PaxMark size={18} className="mx-[5px] shrink-0" />}
                      <span className="flex min-w-0 flex-1 items-baseline gap-3">
                        <span className="cmdk-row-title truncate text-[15px] font-medium">{row.item?.title ?? (row.at ? `@${row.at.label}` : "Ask NYSgpt")}</span>
                        <span className="cmdk-row-sub truncate text-[14px]">{row.item?.subtitle ?? (row.at ? "Ask about this page" : `“${row.ask}”`)}</span>
                      </span>
                      <span className="cmdk-row-kind ml-3 shrink-0">{k?.label ?? (row.at ? "Page" : "Ask")}</span>
                    </button>
                    </AnimateIcon>
                  )
                })}
              </section>
            ))
          )}
        </div>

        {/* The foot */}
        <div className="cmdk-foot flex h-[52px] items-center gap-3 border-t px-4">
          <PaxMark size={18} />
          {mode === "ask" && <span className="cmdk-muted text-[14px]">Ask NYSgpt</span>}
          {note && <span role="status" className="cmdk-note min-w-0 truncate text-[13px]" title={note}>{note}</span>}
          <span className="ml-auto flex items-center gap-2.5 text-[14px]">
            <span className="cmdk-ink font-medium">{primary}</span>
            <span className={KBD}>
              <CornerDownLeft className="size-3.5" />
            </span>
            <span aria-hidden className="cmdk-sep mx-1 h-4 w-px" />
            <button
              type="button"
              onClick={() => {
                setActions((v) => !v)
                setActionAt(0)
              }}
              className="cmdk-quiet flex items-center gap-2 transition-colors"
            >
              Actions <span className={KBD}>⌘</span>
              <span className={KBD}>K</span>
            </button>
          </span>
        </div>

        {/* The actions, over the foot's right corner */}
        {actions && (
          <div className="cmdk-menu absolute right-3 bottom-[58px] w-80 overflow-hidden rounded-xl border p-1.5 animate-in fade-in slide-in-from-bottom-1 duration-150">
            <p className="cmdk-group truncate px-2.5 pt-1 pb-2">{current?.item?.title ?? "Ask NYSgpt"}</p>
            {actionList.map((a, i) => (
              <button
                key={a.label}
                type="button"
                onMouseMove={() => setActionAt(i)}
                onClick={a.run}
                className={cn("cmdk-act flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[14px]", i === actionAt && "cmdk-on")}
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
