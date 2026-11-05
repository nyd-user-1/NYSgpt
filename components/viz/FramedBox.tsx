'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from 'lucide-react'
import { HEADER_TITLES } from '@/lib/header-titles'
import { vizNeighbours } from '@/lib/viz-charts'

// A framed chart page's column and frame (Brendan, 2026-11-04), client-side for the expand. Four circle buttons
// in a row in the frame's top right: previous and next chart (the /viz index's box order, wrapping at the ends —
// lib/viz-charts.ts), expand, close (back to /viz). Expand lets the frame fill
// the app's content area edge to edge, past the 1360px column and its paddings; pressed again, or Escape, it
// returns to the column. The column's max-width and paddings transition over the expand-box's 420ms, and the
// chart follows through its own resize. At rest the column is exactly /viz's, so the clone a /viz press grows
// lands on this frame.

const MS = 420
const EASE = 'cubic-bezier(0.25,0.4,0.25,1)'
const CIRCLE =
  'flex h-10 w-10 items-center justify-center rounded-full border border-[var(--paper-rule)] bg-[var(--paper)] shadow-md transition-colors hover:bg-[var(--paper-quiet)]'

export function FramedBox({ children }: { children: React.ReactNode }) {
  const [wide, setWide] = React.useState(false)
  const near = vizNeighbours(usePathname())
  const name = (href: string, title: string) => HEADER_TITLES[href] ?? title

  React.useEffect(() => {
    if (!wide) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setWide(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [wide])

  const t = `${MS}ms ${EASE}`
  return (
    <div
      className={`mx-auto flex h-full w-full flex-col ${wide ? 'max-w-full p-0' : 'max-w-[1360px] px-6 pb-5 pt-8 sm:px-10 md:px-14'}`}
      style={{ transition: `max-width ${t}, padding ${t}` }}
    >
      <div
        className={`isolate relative flex min-h-0 flex-1 flex-col overflow-hidden border bg-[var(--paper)] p-2 ${wide ? 'rounded-none border-transparent' : 'rounded-2xl border-[var(--paper-rule)]'}`}
        style={{ transition: `border-radius ${t}, border-color ${t}` }}
      >
        <div className="absolute right-4 top-4 z-10 flex gap-2">
          {near && (
            <>
              <Link href={near.prev.href} aria-label={`Previous chart: ${name(near.prev.href, near.prev.title)}`} title={name(near.prev.href, near.prev.title)} className={CIRCLE}>
                <ChevronLeft className="h-4 w-4 text-[var(--paper-text)]" />
              </Link>
              <Link href={near.next.href} aria-label={`Next chart: ${name(near.next.href, near.next.title)}`} title={name(near.next.href, near.next.title)} className={CIRCLE}>
                <ChevronRight className="h-4 w-4 text-[var(--paper-text)]" />
              </Link>
            </>
          )}
          <button
            type="button"
            aria-label={wide ? 'Return the chart to its frame' : 'Expand the chart'}
            aria-pressed={wide}
            onClick={() => setWide((w) => !w)}
            className={CIRCLE}
          >
            {wide ? <Minimize2 className="h-4 w-4 text-[var(--paper-text)]" /> : <Maximize2 className="h-4 w-4 text-[var(--paper-text)]" />}
          </button>
          {/* Close: back to /viz, reversing the box the press grew (Brendan, 2026-11-04). */}
          <Link href="/viz" aria-label="Close the chart" className={CIRCLE}>
            <X className="h-4 w-4 text-[var(--paper-text)]" />
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}
