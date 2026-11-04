"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, LayoutGrid } from "lucide-react"

// A block the chat answers with: the reply names it as [[block:/path#anchor]], and it renders here
// framed with its way back to the page. Trinity reads the block's live HTML through its
// /api/block-context and layers a shelf, notes and a kebab menu on the picture; NYSgpt has none of
// those surfaces yet, so the frame carries the reference and the way to the page alone.

export const BLOCK_REF = /\[\[block:(\/[^\]#\s]*)#([\w-]+)\]\]/g

export function ChatBlock({ path, anchor }: { path: string; anchor: string }) {
  const router = useRouter()
  const key = `${path}#${anchor}`
  const title = anchor.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase())
  return (
    <figure className="my-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-[12px] text-slate-500">
        <LayoutGrid className="size-3.5 text-pax2-blue" />
        <span className="font-mono">{key}</span>
        <span className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => router.push(`${path}#${anchor}`)} className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-slate-600 transition-colors hover:bg-pax2-surface hover:text-pax2-blue">
            Open <ArrowUpRight className="size-3.5" />
          </button>
        </span>
      </div>
      <div className="p-3 text-sm text-slate-600">
        {title} — <a href={`${path}#${anchor}`} onClick={(e) => (e.preventDefault(), router.push(`${path}#${anchor}`))} className="font-medium text-pax2-light-blue hover:underline">see it on its page</a>.
      </div>
    </figure>
  )
}
