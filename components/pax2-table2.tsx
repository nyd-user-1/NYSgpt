"use client"

import * as React from "react"
import { Search, X } from "lucide-react"

import { cn } from "@/lib/utils"

/** PAX2Table2 — the in-card standard: the search sits in the card's own header
 *  row right after the title, the column header row pins, and the card's rows
 *  and tiles filter in place as you type. Wrap the whole card; drop
 *  <PAX2Search /> after the h2. Matching runs over `tbody tr` plus anything
 *  tagged data-find. */
const Ctx = React.createContext<{ q: string; setQ: (v: string) => void }>({ q: "", setQ: () => {} })

export function PAX2Table2({ children, value: controlled, onChange }: { children: React.ReactNode; value?: string; onChange?: (v: string) => void }) {
  const [own, setOwn] = React.useState("")
  // Controlled when the block already filters its own rows in state.
  const q = onChange ? (controlled ?? "") : own
  const setQ = onChange ?? setOwn
  const ref = React.useRef<HTMLDivElement>(null)
  // Runs after every render so freshly-streamed rows respect the live query.
  React.useEffect(() => {
    if (onChange) return
    const root = ref.current
    if (!root) return
    const needle = q.trim().toLowerCase()
    for (const el of root.querySelectorAll<HTMLElement>("tbody tr, [data-find]")) {
      el.style.display = !needle || (el.textContent ?? "").toLowerCase().includes(needle) ? "" : "none"
    }
  })
  const value = React.useMemo(() => ({ q, setQ }), [q, setQ])
  return (
    <Ctx.Provider value={value}>
      <div ref={ref} className="contents">
        {children}
      </div>
    </Ctx.Provider>
  )
}

export function PAX2Search({ placeholder = "Search…", className }: { placeholder?: string; className?: string }) {
  const { q, setQ } = React.useContext(Ctx)
  // A button at rest (Brendan, 2026-10-25): it expands to the bar's full width when
  // picked, and the x folds it back to a button, clearing the filter with it.
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  if (!open)
    return (
      <button
        type="button"
        aria-label={placeholder}
        onClick={() => {
          setOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className={cn("ml-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100/80 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600", className)}
      >
        <Search className="size-3.5" />
      </button>
    )
  return (
    <label className={cn("ml-1 flex h-7 w-44 items-center gap-1.5 rounded-full bg-slate-100/80 px-2.5 transition-colors focus-within:bg-slate-100", className)}>
      <Search className="size-3.5 shrink-0 text-slate-400" />
      <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-900 outline-none placeholder:text-slate-400" />
      <button
        type="button"
        aria-label="Close search"
        onClick={() => {
          setQ("")
          setOpen(false)
        }}
        className="flex size-5 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/70 hover:text-slate-600"
      >
        <X className="size-3.5" />
      </button>
    </label>
  )
}
