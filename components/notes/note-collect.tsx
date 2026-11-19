"use client"

import * as React from "react"
import Link from "next/link"
import { Bot, Clapperboard, HelpCircle, LayoutGrid, Percent, X, type LucideIcon } from "lucide-react"

import { useShelf } from "@/lib/home-blocks"
import { openCollect, useBasket, type BasketKind } from "@/lib/note-basket"

// A note's Collect shape (Brendan, 2026-11-02): the basket, carried from page to page. While it is open every card's
// menu offers Add to the note beside Add to Blocks (components/notes/add-to-note.tsx); what comes in lists here, each
// a link back to where it lives with an × to take it out. At the foot, Add all to Blocks puts every item on the
// Blocks shelf, and Make a survey draft turns the collected questions into the survey draft's questions, the draft
// America Thinks' Add to survey writes. The basket stays in this browser until it is emptied.
// NYSgpt (brief 61): a card is a home box (its key the box's, so Add all to Blocks puts it on NYSgpt's Blocks); NYSgpt
// has no surveys, so Make a survey draft answers that it is not set up here.

const ICON: Record<BasketKind, LucideIcon> = { question: HelpCircle, value: Percent, clip: Clapperboard, model: Bot, block: LayoutGrid }

export function NoteCollect() {
  const basket = useBasket()
  const shelf = useShelf()
  const [done, setDone] = React.useState<{ text: string; href?: string } | null>(null)
  React.useEffect(() => openCollect(), [])
  const questions = basket.items.filter((i) => i.kind === "question" && i.question)

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-note-collect>
      {basket.items.length ? (
        <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
          {basket.items.map((item) => {
            const Icon = ICON[item.kind] ?? LayoutGrid
            return (
              <li key={item.key} className="group/item flex items-center gap-2.5 px-3 py-2 text-sm">
                <Icon className="size-4 shrink-0 text-slate-400" aria-label={item.kind} />
                <Link href={item.anchor && !item.path.includes("open=") ? `${item.path}#${item.anchor}` : item.path} className="min-w-0 flex-1 truncate text-slate-700 hover:text-pax2-blue" title={item.title}>
                  {item.title}
                </Link>
                <button type="button" aria-label={`Remove ${item.title}`} title="Remove" onClick={() => basket.remove(item.key)} className="flex size-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="size-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="flex-1 px-4 py-4 text-sm text-slate-500">Nothing collected yet. While this is open, every card&rsquo;s menu offers Add to the note.</p>
      )}
      {done && (
        <p role="status" className="px-3 pb-1 text-xs text-slate-500">
          {done.text}
          {done.href && (
            <>
              {" · "}
              <Link href={done.href} className="font-medium text-pax2-blue hover:underline">
                Open
              </Link>
            </>
          )}
        </p>
      )}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 px-3 py-2">
        <button
          type="button"
          disabled={!basket.items.length}
          onClick={() => {
            for (const i of basket.items) if (!shelf.has(i.key)) shelf.add({ key: i.key, title: i.title, path: i.path, anchor: i.anchor })
            setDone({ text: `${basket.items.length} in Blocks` })
          }}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Add all to Blocks
        </button>
        <button
          type="button"
          disabled={!questions.length}
          onClick={() => setDone({ text: "Survey drafts are not set up here." })}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Make a survey draft
        </button>
        <button
          type="button"
          disabled={!basket.items.length}
          onClick={() => {
            basket.clear()
            setDone(null)
          }}
          className="ml-auto text-xs text-slate-400 hover:text-slate-700 disabled:opacity-40"
        >
          Empty
        </button>
      </div>
    </div>
  )
}
