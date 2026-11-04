"use client"

import * as React from "react"
import { Check, ChevronDown, Clapperboard } from "lucide-react"

import { DEFAULT_VIDEO_MODEL, VIDEO_MODEL_OPTIONS, videoModelById, type VideoProvider } from "@/lib/video-model-options"
import { cn } from "@/lib/utils"

// The composer's second model picker, the text-to-video one, in model-picker.tsx's exact dress:
// the provider's mark, the model's name, the list dropping up or down by the room there is.

/** The chosen video model, kept in this browser. */
export function useVideoModel() {
  const [model, setModel] = React.useState<VideoProvider>(DEFAULT_VIDEO_MODEL)
  React.useEffect(() => {
    try {
      const kept = localStorage.getItem("pax2-video-model")
      if (kept && VIDEO_MODEL_OPTIONS.some((m) => m.id === kept)) setModel(kept as VideoProvider)
    } catch {}
  }, [])
  const choose = React.useCallback((id: VideoProvider) => {
    setModel(id)
    try {
      localStorage.setItem("pax2-video-model", id)
    } catch {}
  }, [])
  return [model, choose] as const
}

const Mark = ({ logo, className }: { logo: string | null; className: string }) =>
  logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" className={cn(className, "shrink-0 rounded-sm object-contain")} />
  ) : (
    <Clapperboard className={cn(className, "shrink-0 text-slate-500")} strokeWidth={1.75} />
  )

export function VideoModelPicker({ value, onChange }: { value: VideoProvider; onChange: (id: VideoProvider) => void }) {
  const [open, setOpen] = React.useState(false)
  const [above, setAbove] = React.useState(true)
  const box = React.useRef<HTMLDivElement>(null)
  const btn = React.useRef<HTMLButtonElement>(null)
  const current = videoModelById(value)
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
          if (!open && btn.current) setAbove(btn.current.getBoundingClientRect().top > 320)
          setOpen(!open)
        }}
        aria-label={`Video model: ${current.label}`}
        title={current.label}
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 aria-expanded:bg-slate-100"
      >
        <Mark logo={current.logo} className="size-4" />
        <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className={cn("absolute right-0 z-50 w-64 rounded-xl border border-slate-200 bg-pax2-surface p-1 shadow-e3", above ? "bottom-full mb-2" : "top-full mt-2")}>
          {VIDEO_MODEL_OPTIONS.map((m) => (
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
              <Mark logo={m.logo} className="size-5" />
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
