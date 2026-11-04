"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

import { MODEL_OPTIONS, modelById } from "@/lib/model-options"
import { cn } from "@/lib/utils"

// The chat input's model picker, after leuk's (components/directory/chat-input.tsx): the provider's mark,
// the model's name and a chevron beside the send button; the list drops up or down by the room there is,
// each row its mark, name and one line, the current one checked.

/** The chosen model, kept in this browser. */
export function useChatModel() {
  const [model, setModel] = React.useState(MODEL_OPTIONS[0].id)
  React.useEffect(() => {
    try {
      const kept = localStorage.getItem("pax2-chat-model")
      if (kept && MODEL_OPTIONS.some((m) => m.id === kept)) setModel(kept)
    } catch {}
  }, [])
  const choose = React.useCallback((id: string) => {
    setModel(id)
    try {
      localStorage.setItem("pax2-chat-model", id)
    } catch {}
  }, [])
  return [model, choose] as const
}

export function ModelPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = React.useState(false)
  const [above, setAbove] = React.useState(true)
  const box = React.useRef<HTMLDivElement>(null)
  const btn = React.useRef<HTMLButtonElement>(null)
  const current = modelById(value)
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
  return (
    <div ref={box} className="relative">
      <button
        ref={btn}
        type="button"
        onClick={() => {
          if (!open && btn.current) setAbove(btn.current.getBoundingClientRect().top > 380)
          setOpen(!open)
        }}
        aria-label={`Model: ${current.label}`}
        title={current.label}
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 aria-expanded:bg-slate-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.logo} alt="" className="size-4 shrink-0 rounded-sm object-contain" />
        <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className={cn("absolute right-0 z-50 max-h-[380px] w-64 overflow-y-auto rounded-xl border border-slate-200 bg-pax2-surface p-1 shadow-e3", above ? "bottom-full mb-2" : "top-full mt-2")}>
          {MODEL_OPTIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="menuitemradio"
              aria-checked={m.id === value}
              onClick={() => {
                onChange(m.id)
                setOpen(false)
              }}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.logo} alt="" className="size-5 shrink-0 rounded-sm object-contain" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-slate-900">{m.label}</span>
                <span className="block truncate text-[11px] text-slate-500">{m.description}</span>
              </span>
              {m.id === value && <Check className="size-3.5 shrink-0 text-pax2-light-blue" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
