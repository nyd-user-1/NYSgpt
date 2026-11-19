"use client"

import * as React from "react"
import { Check, Clapperboard, Copy, RotateCcw, SlidersHorizontal, ThumbsDown, ThumbsUp } from "lucide-react"

import { BLOCK_EXAMPLES, RECORDING_ITEM } from "@/components/chat/block-examples"
import { cn } from "@/lib/utils"

// The row under each finished reply, after Code/hq's message menu (app/ui/block-menu.tsx): Copy, Good and
// Bad response, and Retry on the latest reply. Shown on the latest reply, on hover for the earlier ones.
// The model that wrote it is never named here (the standing rule, 2026-10-29); `model` stays in the props
// for the callers that pass it.

const BTN = "inline-flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 [&_svg]:size-3.5"

export function ResponseFooter({ text, latest, onRetry, onShowBlock, onOpenStudio }: { text: string; model?: string; latest: boolean; onRetry?: () => void; onShowBlock?: (id: string) => void; onOpenStudio?: () => void }) {
  const [copied, setCopied] = React.useState(false)
  const [reaction, setReaction] = React.useState<"up" | "down" | null>(null)
  const [blocksOpen, setBlocksOpen] = React.useState(false)
  return (
    <div className={cn("mt-2 flex items-center gap-0.5 transition-opacity", latest ? "opacity-100" : "opacity-0 group-hover/reply:opacity-100 focus-within:opacity-100")}>
      <button
        type="button"
        aria-label="Copy"
        title="Copy"
        onClick={() => {
          navigator.clipboard.writeText(text)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1200)
        }}
        className={BTN}
      >
        {copied ? <Check className="text-pax2-light-blue" /> : <Copy />}
      </button>
      <button type="button" aria-label="Good response" title="Good response" aria-pressed={reaction === "up"} onClick={() => setReaction(reaction === "up" ? null : "up")} className={cn(BTN, reaction === "up" && "text-pax2-blue")}>
        <ThumbsUp className={reaction === "up" ? "fill-pax2-lavender" : undefined} />
      </button>
      <button type="button" aria-label="Bad response" title="Bad response" aria-pressed={reaction === "down"} onClick={() => setReaction(reaction === "down" ? null : "down")} className={cn(BTN, reaction === "down" && "text-pax2-red")}>
        <ThumbsDown className={reaction === "down" ? "fill-pax2-red-soft" : undefined} />
      </button>
      {latest && onRetry && (
        <button type="button" aria-label="Retry" title="Retry" onClick={onRetry} className={BTN}>
          <RotateCcw />
        </button>
      )}
      {latest && onShowBlock && (
        <span className="relative">
          <button type="button" aria-label="Show a block" title="Show a block" aria-expanded={blocksOpen} onClick={() => setBlocksOpen((v) => !v)} className={cn(BTN, blocksOpen && "text-pax2-light-blue")}>
            <SlidersHorizontal />
          </button>
          {blocksOpen && (
            <span className="absolute bottom-full left-0 z-30 mb-1 flex w-56 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--inp-bg)] py-1 shadow-e1">
              {[...BLOCK_EXAMPLES.map(({ id, label }) => ({ id, label })), RECORDING_ITEM].map((b) => (
                <button key={b.id} type="button" onClick={() => { setBlocksOpen(false); onShowBlock(b.id) }} className="px-3 py-1.5 text-left text-[13px] text-[var(--txt)] transition-colors hover:bg-pax2-surface/70">
                  {b.label}
                </button>
              ))}
            </span>
          )}
        </span>
      )}
      {latest && onOpenStudio && (
        <button type="button" aria-label="Open the Studio beside this" title="Open the Studio beside this" onClick={onOpenStudio} className={BTN}>
          <Clapperboard />
        </button>
      )}
    </div>
  )
}
