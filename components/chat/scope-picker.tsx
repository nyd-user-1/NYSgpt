"use client"

import * as React from "react"
import { ArrowLeft, Check, ChevronDown } from "lucide-react"

import { TypeIcon } from "@/app/HomeIcons"
import { loadCatalog } from "@/lib/home-catalog"
import { cn } from "@/lib/utils"

// The composer's second picker on NYSgpt (Brendan, 2026-11-19, brief 49): what the chat searches. It takes the
// place of pax-trinity's video model picker (video-model-picker.tsx) in that picker's exact dress, the button,
// the list dropping up or down by the room there is, the rows and the check; the button names the choice.
// "All records", then every database A to Z with its table count, and inside one, its tables. The choice rides
// with each question (/api/chat's `scope`) and narrows the table search to that database or table. The list is
// the home page's catalog (public/home-catalog/catalog.json) until the chat's own index lands.

export type ChatScope = { db: string | null; table: string | null }
const ALL: ChatScope = { db: null, table: null }
const KEY = "nysgpt-chat-scope"

/** The chosen scope, kept in this browser. */
export function useScope() {
  const [scope, setScope] = React.useState<ChatScope>(ALL)
  React.useEffect(() => {
    try {
      const kept = JSON.parse(localStorage.getItem(KEY) ?? "null") as ChatScope | null
      if (kept && typeof kept === "object" && (kept.db === null || typeof kept.db === "string")) setScope({ db: kept.db ?? null, table: kept.table ?? null })
    } catch {}
  }, [])
  const choose = React.useCallback((s: ChatScope) => {
    setScope(s)
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {}
  }, [])
  return [scope, choose] as const
}

const Mark = ({ kind, className }: { kind: "db" | "table"; className: string }) => (
  <span aria-hidden className={cn(className, "inline-flex shrink-0 items-center justify-center text-slate-500 [&_svg]:size-full")}>
    <TypeIcon icon={kind} />
  </span>
)

const label = (s: ChatScope) => s.table ?? s.db ?? "All records"

export function ScopePicker({ value, onChange }: { value: ChatScope; onChange: (s: ChatScope) => void }) {
  const [open, setOpen] = React.useState(false)
  const [above, setAbove] = React.useState(true)
  const [db, setDb] = React.useState<string | null>(null)
  const [cat, setCat] = React.useState<{ dbs: { name: string; tables: string[] }[] } | null>(null)
  const box = React.useRef<HTMLDivElement>(null)
  const btn = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (!open || cat) return
    void loadCatalog().then((c) => {
      if (!c) return
      const by = new Map<string, string[]>()
      for (const t of c.tables) by.set(t.database, [...(by.get(t.database) ?? []), t.table])
      setCat({ dbs: [...by.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, tables]) => ({ name, tables: tables.sort((a, b) => a.localeCompare(b)) })) })
    })
  }, [open, cat])
  React.useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false)
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", down)
    document.addEventListener("keydown", key)
    return () => {
      document.removeEventListener("mousedown", down)
      document.removeEventListener("keydown", key)
    }
  }, [open])
  const pick = (s: ChatScope) => {
    onChange(s)
    setOpen(false)
  }
  const inside = db ? cat?.dbs.find((d) => d.name === db) : null
  const row = "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-100"
  return (
    <div ref={box} className="relative">
      <button
        ref={btn}
        type="button"
        onClick={() => {
          if (!open && btn.current) setAbove(btn.current.getBoundingClientRect().top > 320)
          if (!open) setDb(value.db)
          setOpen(!open)
        }}
        aria-label={`Search: ${label(value)}`}
        title={label(value)}
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 aria-expanded:bg-slate-100"
      >
        <Mark kind={value.table ? "table" : "db"} className="size-4" />
        <span className="max-w-[160px] truncate">{label(value)}</span>
        <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className={cn("absolute right-0 z-50 max-h-80 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-pax2-surface p-1 shadow-e3", above ? "bottom-full mb-2" : "top-full mt-2")}>
          {inside ? (
            <>
              <button type="button" onClick={() => setDb(null)} className={row}>
                <ArrowLeft className="size-4 shrink-0 text-slate-500" strokeWidth={1.75} />
                <span className="block min-w-0 flex-1 truncate text-[13px] font-medium text-slate-900">{inside.name}</span>
              </button>
              <button type="button" role="menuitemradio" aria-checked={value.db === inside.name && !value.table} onClick={() => pick({ db: inside.name, table: null })} className={row}>
                <Mark kind="db" className="size-5" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-slate-900">All of {inside.name}</span>
                  <span className="block truncate text-[11px] text-slate-500">{inside.tables.length} {inside.tables.length === 1 ? "table" : "tables"}</span>
                </span>
                {value.db === inside.name && !value.table && <Check className="size-3.5 shrink-0 text-pax2-light-blue" />}
              </button>
              {inside.tables.map((t) => (
                <button key={t} type="button" role="menuitemradio" aria-checked={value.table === t} onClick={() => pick({ db: inside.name, table: t })} className={row}>
                  <Mark kind="table" className="size-5" />
                  <span className="block min-w-0 flex-1 truncate text-[13px] font-medium text-slate-900">{t}</span>
                  {value.db === inside.name && value.table === t && <Check className="size-3.5 shrink-0 text-pax2-light-blue" />}
                </button>
              ))}
            </>
          ) : (
            <>
              <button type="button" role="menuitemradio" aria-checked={!value.db} onClick={() => pick(ALL)} className={row}>
                <Mark kind="db" className="size-5" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-slate-900">All records</span>
                  <span className="block truncate text-[11px] text-slate-500">Every database</span>
                </span>
                {!value.db && <Check className="size-3.5 shrink-0 text-pax2-light-blue" />}
              </button>
              {!cat && <p className="px-2.5 py-2 text-[12px] text-slate-500">Loading the databases…</p>}
              {cat?.dbs.map((d) => (
                <button key={d.name} type="button" onClick={() => setDb(d.name)} className={row}>
                  <Mark kind="db" className="size-5" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-slate-900">{d.name}</span>
                    <span className="block truncate text-[11px] text-slate-500">{d.tables.length} {d.tables.length === 1 ? "table" : "tables"}</span>
                  </span>
                  {value.db === d.name && <Check className="size-3.5 shrink-0 text-pax2-light-blue" />}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
