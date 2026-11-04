'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X } from 'lucide-react'

import { BlockCard } from '@/components/ui/nova/block-card'
import { useShelf, type ShelfItem } from '@/lib/home-blocks'
import { cn } from '@/lib/utils'
import { setShelfDrag } from '@/lib/shelf-drag'

// The Blocks shelf, trinity's view (its discussion-panel BlocksShelf) in the switchboard panel:
// a grid of square tiles — every block saved to the shelf, the rest of the grid dashed empty
// slots. A tile drags: onto another tile it moves there, onto an empty slot it goes last, and
// onto the chat it attaches as context (lib/shelf-drag's payload, which /chat already reads on
// drop). Trinity's page-layout mirror and its shorts row wait on surfaces NYSgpt doesn't have yet;
// the shelf itself and its drag protocol are the whole point.

const MIN_TILE = 104
const GAP = 10
const PLACE = (path: string) => (path === '/' ? 'Home' : path.slice(1).split('/')[0].replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()))

export function BlocksShelf() {
  const router = useRouter()
  const path = usePathname()
  const { items, remove, move } = useShelf()
  const [dragging, setDragging] = React.useState<string | null>(null)
  const [over, setOver] = React.useState<string | null>(null)
  // The panel's box, for the columns and the empty slots that fill it.
  const box = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState({ w: 372, h: 600 })
  React.useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const cols = Math.min(6, Math.max(3, Math.floor((size.w + GAP) / (MIN_TILE + GAP))))
  const tileSide = (size.w - GAP * (cols - 1)) / cols
  const rows = Math.max(Math.ceil(items.length / cols), Math.ceil((size.h + GAP) / (tileSide + GAP)))
  const empties = rows * cols - items.length

  const open = (it: ShelfItem) => {
    if (!it.block) return
    if (it.block.path === path) document.getElementById(it.block.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else router.push(`${it.block.path}#${it.block.anchor}`)
  }

  // Each tile drags: onto another tile it moves there, onto an empty slot it goes last, and onto
  // the chat it attaches as context.
  const drag = (it: ShelfItem) => {
    const key = it.key
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        setShelfDrag(
          e.dataTransfer,
          it.block
            ? { kind: 'block' as const, title: it.block.title, path: it.block.path, anchor: it.block.anchor }
            : { kind: 'video' as const, id: it.video.id, title: it.video.title, channel: it.video.channel, ratio: it.video.ratio, duration: it.video.duration },
        )
        setDragging(key)
      },
      onDragEnd: () => (setDragging(null), setOver(null)),
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault()
        setOver(key)
      },
      onDragLeave: () => setOver((o) => (o === key ? null : o)),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault()
        if (dragging) move(dragging, key)
        setDragging(null)
        setOver(null)
      },
    }
  }

  return (
    <div data-shelf className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4">
      <p className="pb-3 text-[12px] leading-[1.6] text-[var(--paper-muted)]">
        Blocks you save land here. Drag one onto the chat to attach it as context.
      </p>
      <div ref={box} className="h-full">
        <div className="grid content-start" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: GAP }}>
          {items.map((it) =>
            it.block ? (
              <BlockCard
                key={it.key}
                {...drag(it)}
                role="button"
                tabIndex={0}
                onClick={() => open(it)}
                onKeyDown={(e) => e.key === 'Enter' && open(it)}
                aria-label={`Open ${it.block.title}`}
                title={it.block.title}
                sub={PLACE(it.block.path)}
                dragging={dragging === it.key}
                dropTarget={over === it.key}
              >
                <button
                  type="button"
                  onClick={(e) => (e.stopPropagation(), remove(it.block!.key))}
                  aria-label={`Take ${it.block.title} off the shelf`}
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-md text-slate-400 opacity-0 transition-opacity hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)] focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </BlockCard>
            ) : (
              <BlockCard
                key={it.key}
                {...drag(it)}
                role="button"
                tabIndex={0}
                aria-label={it.video.title}
                variant="thumbnail"
                title={it.video.title}
                image={`https://i.ytimg.com/vi/${it.video.id}/hqdefault.jpg`}
                badge={it.video.duration || undefined}
                dragging={dragging === it.key}
                dropTarget={over === it.key}
              />
            ),
          )}
          {Array.from({ length: Math.max(0, empties) }, (_, i) => (
            <div
              key={i}
              aria-hidden
              onDragOver={(e) => (e.preventDefault(), setOver(`empty-${i}`))}
              onDragLeave={() => setOver((o) => (o === `empty-${i}` ? null : o))}
              onDrop={(e) => {
                e.preventDefault()
                if (dragging) move(dragging, null)
                setDragging(null)
                setOver(null)
              }}
              className={cn('aspect-square rounded-xl border border-dashed transition-colors', over === `empty-${i}` ? 'border-pax2-light-blue bg-pax2-lavender/40' : 'border-slate-300 dark:border-slate-600')}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
