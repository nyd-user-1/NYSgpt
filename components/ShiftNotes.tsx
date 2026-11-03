'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GripVertical, X } from 'lucide-react'

const SERIF = { fontFamily: 'var(--font-display), Georgia, serif' } as const
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const

/**
 * Shift notes, ported from pax-trinity's drawn notes (draw-notes.tsx /
 * floating-note.tsx, 2026-10-31) in the paper dress: hold Shift and drag
 * across any surface that isn't a control, a field or a picture, and a dashed
 * outline follows the pointer. Let go and the outline holds for a beat, a
 * skeleton fills it, and a note card opens there, as large as drawn. A
 * Shift-click still extends a selection — the drawing starts only once the
 * pointer has moved — and Escape while drawing lets it go. Notes are kept in
 * this browser (localStorage) until closed: the card's X discards it.
 */

/** What a drag can't start on: controls, fields, links, pictures and frames keep their own Shift. */
const KEEP =
  "a, button, input, textarea, select, [contenteditable='true'], [draggable='true'], img, video, iframe, [role=slider], [role=dialog], [data-note]"
const MIN = { w: 260, h: 200 }
/** The skeleton reads for at least this long, so the card arrives as the shape it was drawn. */
const SKELETON_MS = 450
/** The outline holds this long before the skeleton fills it. */
const HOLD_MS = 160
const STORE = 'nysgpt-shift-notes'

export type Rect = { x: number; y: number; w: number; h: number }
type Note = { id: string; rect: Rect; text: string; ready: boolean }

const rectOf = (a: { x: number; y: number }, b: { x: number; y: number }): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(b.x - a.x),
  h: Math.abs(b.y - a.y),
})

/** A drawn shape at the card's least size, inside the window. */
function fit(r: Rect): Rect {
  const w = Math.min(Math.max(r.w, MIN.w), window.innerWidth - 16)
  const h = Math.min(Math.max(r.h, MIN.h), window.innerHeight - 16)
  return {
    x: Math.max(8, Math.min(r.x, window.innerWidth - w - 8)),
    y: Math.max(8, Math.min(r.y, window.innerHeight - h - 8)),
    w,
    h,
  }
}

function load(): Note[] {
  try {
    const kept = JSON.parse(localStorage.getItem(STORE) ?? '[]') as { id: string; rect: Rect; text: string }[]
    return kept.map(n => ({ ...n, ready: true }))
  } catch {
    return []
  }
}

function save(notes: Note[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify(notes.map(({ id, rect, text }) => ({ id, rect, text }))))
  } catch {
    /* a full or blocked store loses nothing but persistence */
  }
}

export function ShiftNotes() {
  const [outline, setOutline] = useState<Rect | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [mounted, setMounted] = useState(false)

  // Kept notes come back where they were left.
  useEffect(() => {
    setNotes(load())
    setMounted(true)
  }, [])

  const change = useCallback((fn: (all: Note[]) => Note[]) => {
    setNotes(all => {
      const next = fn(all)
      save(next)
      return next
    })
  }, [])

  const open = useCallback(
    (rect: Rect) => {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
      change(all => [...all, { id, rect, text: '', ready: false }])
      window.setTimeout(() => change(all => all.map(n => (n.id === id ? { ...n, ready: true } : n))), SKELETON_MS)
    },
    [change],
  )

  useEffect(() => {
    let start: { x: number; y: number } | null = null
    let drawing = false
    const stop = () => {
      start = null
      drawing = false
      document.body.style.removeProperty('user-select')
      document.body.style.removeProperty('-webkit-user-select')
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
        document.body.style.setProperty('user-select', 'none')
        document.body.style.setProperty('-webkit-user-select', 'none')
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
        open(card)
      }, HOLD_MS)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawing) {
        stop()
        setOutline(null)
      }
    }
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('pointermove', move, true)
    document.addEventListener('pointerup', up, true)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointermove', move, true)
      document.removeEventListener('pointerup', up, true)
      document.removeEventListener('keydown', key)
      stop()
    }
  }, [open])

  if (!mounted) return null
  return (
    <>
      {outline &&
        createPortal(
          // `nysgpt-app` on every portaled root: the paper tokens are scoped to
          // it, and these portals render into document.body, outside the div
          // that carries the class (SwitchboardPanel learned this the hard way).
          <div
            aria-hidden
            style={{ left: outline.x, top: outline.y, width: outline.w, height: outline.h }}
            className="nysgpt-app pointer-events-none fixed z-[55] rounded-2xl border-2 border-dashed border-[var(--paper-strong)] bg-[var(--paper-quiet)]"
          />,
          document.body,
        )}
      {notes.map(n =>
        n.ready ? (
          <NoteCard
            key={n.id}
            note={n}
            onChange={(id, patch) => change(all => all.map(x => (x.id === id ? { ...x, ...patch } : x)))}
            onClose={id => change(all => all.filter(x => x.id !== id))}
          />
        ) : (
          <Skeleton key={n.id} rect={n.rect} />
        ),
      )}
    </>
  )
}

/** The paper skeleton in the drawn shape: a title bar and a few resting lines. */
function Skeleton({ rect }: { rect: Rect }) {
  const bar = 'animate-pulse rounded bg-[var(--paper-rule-soft)]'
  return createPortal(
    <div
      aria-hidden
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      className="nysgpt-app fixed z-[55] flex flex-col rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper)] shadow-[0_4px_32px_rgba(0,0,0,0.18)]"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--paper-rule)] px-4 py-3">
        <span className={`${bar} h-4 w-4`} />
        <span className={`${bar} h-3.5 w-16`} />
        <span className={`${bar} ml-auto h-4 w-4`} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <span className={`${bar} h-3 w-1/3`} />
        <span className={`${bar} h-3 w-5/6`} />
        <span className={`${bar} h-3 w-2/3`} />
      </div>
    </div>,
    document.body,
  )
}

/**
 * The note card: the panel's chrome at hand size. The grip moves it, the
 * corner resizes it, the X discards it, and the body is plain writing saved
 * as it is typed.
 */
function NoteCard({
  note,
  onChange,
  onClose,
}: {
  note: Note
  onChange: (id: string, patch: Partial<Note>) => void
  onClose: (id: string) => void
}) {
  const [rect, setRect] = useState(note.rect)
  const box = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const size = useRef<{ x: number; y: number; w: number; h: number } | null>(null)

  // A fresh card takes the pen straight away.
  useEffect(() => {
    if (!note.text) area.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const settle = (r: Rect) => {
    setRect(r)
    onChange(note.id, { rect: r })
  }

  const grip = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      drag.current = { dx: e.clientX - rect.x, dy: e.clientY - rect.y }
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!drag.current) return
      settle(
        fit({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy, w: rect.w, h: rect.h }),
      )
    },
    onPointerUp: () => (drag.current = null),
  }

  const corner = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      size.current = { x: e.clientX, y: e.clientY, w: rect.w, h: rect.h }
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!size.current) return
      settle(
        fit({
          x: rect.x,
          y: rect.y,
          w: size.current.w + (e.clientX - size.current.x),
          h: size.current.h + (e.clientY - size.current.y),
        }),
      )
    },
    onPointerUp: () => (size.current = null),
  }

  return createPortal(
    <div
      ref={box}
      data-note
      role="dialog"
      aria-label="Note"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      className="nysgpt-app fixed z-[55] flex flex-col overflow-hidden rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper)] shadow-[0_4px_32px_rgba(0,0,0,0.18)]"
    >
      <div className="flex shrink-0 items-center gap-1.5 border-b border-[var(--paper-rule)] py-2 pr-2 pl-2.5">
        <span
          {...grip}
          aria-label="Move"
          title="Move"
          className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-[var(--paper-faint)] active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[15px] text-[var(--paper-text)]" style={SERIF}>
          Note
        </h3>
        <button
          onClick={() => onClose(note.id)}
          aria-label="Discard the note"
          className="shrink-0 rounded-lg p-1.5 text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <textarea
        ref={area}
        value={note.text}
        onChange={e => onChange(note.id, { text: e.target.value })}
        placeholder="Write…"
        className="min-h-0 flex-1 resize-none bg-transparent p-4 text-[14px] leading-[1.6] text-[var(--paper-text)] outline-none placeholder:text-[var(--paper-faint)]"
        style={SANS}
      />
      <span
        {...corner}
        aria-label="Resize"
        className="absolute right-0 bottom-0 h-5 w-5 cursor-nwse-resize touch-none"
      />
    </div>,
    document.body,
  )
}
