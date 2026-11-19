"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { createPortal } from "react-dom"

import { openNote } from "@/lib/notes-store"
import { NOTE_OPEN } from "@/lib/drawn-notes"
import { isEmbedded } from "@/lib/pane"

import type { Rect } from "./floating-note"

// Drawn notes (Brendan, 2026-10-31): hold Shift and drag across any surface that isn't a control, a field or
// a picture, and a dashed outline follows the pointer. Let go and the outline holds, the model card's skeleton
// fills it while the editor loads, and the note's card (floating-note.tsx) opens there, as large as drawn.
// A Shift-click still extends a selection: the drawing starts only once the pointer has moved, and then the
// selection is cleared. Escape while drawing lets it go. A note kept in the Inbox's My notes opens here too.

const FloatingNote = dynamic(() => import("./floating-note").then((m) => m.FloatingNote), { ssr: false })

/** What a drag can't start on: controls, fields, links, pictures and frames keep their own Shift. */
const KEEP = "a, button, input, textarea, select, [contenteditable='true'], [draggable='true'], img, video, iframe, [role=slider], [role=dialog], [data-note]"
const MIN = { w: 300, h: 240 }
/** The skeleton reads for at least this long, so the card arrives as the shape it was drawn. */
const SKELETON_MS = 450
/** The outline holds this long before the skeleton fills it. */
const HOLD_MS = 160

type Open = { key: number; rect: Rect; id: string | null; body: string; chat: string; ready: boolean }

const rectOf = (a: { x: number; y: number }, b: { x: number; y: number }): Rect => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) })

/** A drawn shape at the card's least size, inside the window. */
function fit(r: Rect): Rect {
  const w = Math.min(Math.max(r.w, MIN.w), window.innerWidth - 16)
  const h = Math.min(Math.max(r.h, MIN.h), window.innerHeight - 16)
  return { x: Math.max(8, Math.min(r.x, window.innerWidth - w - 8)), y: Math.max(8, Math.min(r.y, window.innerHeight - h - 8)), w, h }
}

export function DrawNotes() {
  const [outline, setOutline] = React.useState<Rect | null>(null)
  const [notes, setNotes] = React.useState<Open[]>([])
  const seq = React.useRef(0)

  const open = React.useCallback((rect: Rect, id: string | null, body: string, chat: string) => {
    const key = ++seq.current
    setNotes((n) => [...n, { key, rect, id, body, chat, ready: false }])
    window.setTimeout(() => setNotes((n) => n.map((x) => (x.key === key ? { ...x, ready: true } : x))), SKELETON_MS)
  }, [])

  React.useEffect(() => {
    if (isEmbedded()) return
    let start: { x: number; y: number } | null = null
    let drawing = false
    const stop = () => {
      start = null
      drawing = false
      document.body.style.removeProperty("user-select")
      document.body.style.removeProperty("-webkit-user-select")
    }
    const down = (e: PointerEvent) => {
      if (!e.shiftKey || e.button !== 0 || (e.target as Element | null)?.closest?.(KEEP)) return
      start = { x: e.clientX, y: e.clientY }
    }
    const move = (e: PointerEvent) => {
      if (!start) return
      if (!drawing) {
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) return
        drawing = true
        // The card's code starts loading now, so it is there by the time the skeleton has read.
        void import("./floating-note")
        document.body.style.setProperty("user-select", "none")
        document.body.style.setProperty("-webkit-user-select", "none")
        window.getSelection()?.removeAllRanges()
      }
      e.preventDefault()
      setOutline(rectOf(start, { x: e.clientX, y: e.clientY }))
    }
    const up = (e: PointerEvent) => {
      if (!start) return
      const from = start
      const was = drawing
      stop()
      if (!was) return
      window.getSelection()?.removeAllRanges()
      const r = rectOf(from, { x: e.clientX, y: e.clientY })
      // A stroke too small to mean a shape is let go.
      if (r.w < 40 || r.h < 40) return setOutline(null)
      const card = fit(r)
      setOutline(card)
      window.setTimeout(() => {
        setOutline(null)
        open(card, null, "", "")
      }, HOLD_MS)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawing) {
        stop()
        setOutline(null)
      }
    }
    document.addEventListener("pointerdown", down, true)
    document.addEventListener("pointermove", move, true)
    document.addEventListener("pointerup", up, true)
    document.addEventListener("keydown", key)
    return () => {
      document.removeEventListener("pointerdown", down, true)
      document.removeEventListener("pointermove", move, true)
      document.removeEventListener("pointerup", up, true)
      document.removeEventListener("keydown", key)
      stop()
    }
  }, [open])

  // A kept note opened from the Inbox's My notes: a card in the middle of the window.
  React.useEffect(() => {
    const on = async (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id
      if (!id) return
      const w = Math.min(460, window.innerWidth - 16)
      const h = Math.min(420, window.innerHeight - 16)
      const rect = { x: (window.innerWidth - w) / 2, y: (window.innerHeight - h) / 2, w, h }
      const note = await openNote(id)
      if (note) open(rect, note.id, note.bodyMd, note.chatMd ?? "")
    }
    window.addEventListener(NOTE_OPEN, on)
    return () => window.removeEventListener(NOTE_OPEN, on)
  }, [open])

  if (typeof document === "undefined") return null
  return (
    <>
      {outline &&
        createPortal(
          <div aria-hidden style={{ left: outline.x, top: outline.y, width: outline.w, height: outline.h }} className="nysgpt-note pointer-events-none fixed z-[55] rounded-[18px] border-2 border-dashed border-pax2-light-blue bg-pax2-light-blue/5" />,
          document.body,
        )}
      {notes.map((n) =>
        n.ready ? (
          <FloatingNote key={n.key} rect={n.rect} id={n.id} body={n.body} chat={n.chat} onClose={() => setNotes((all) => all.filter((x) => x.key !== n.key))} />
        ) : (
          <Skeleton key={n.key} rect={n.rect} />
        ),
      )}
    </>
  )
}

/** The model card's skeleton in the drawn shape: the frame and its title, the white card and a few lines. */
function Skeleton({ rect }: { rect: Rect }) {
  return createPortal(
    <div aria-hidden style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} className="nysgpt-note fixed z-[55] flex flex-col rounded-[18px] border border-slate-200 bg-slate-50 p-1 shadow-e3">
      <div className="flex shrink-0 items-center gap-2 px-2 pt-2.5 pb-3">
        <span className="size-4 animate-pulse rounded bg-slate-200" />
        <span className="h-3.5 w-16 animate-pulse rounded bg-slate-200" />
        <span className="ml-auto size-4 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-[14px] border border-slate-200 bg-pax2-surface p-4 shadow-e1">
        <span className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
        <span className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
        <span className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
        <span className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
      </div>
    </div>,
    document.body,
  )
}
