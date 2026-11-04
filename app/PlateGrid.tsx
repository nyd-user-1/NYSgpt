'use client'

import { Children, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * The contents plate's grid (2026-11-04, Brendan: the plate measures itself, so an open second panel
 * counts). The plate is a fixed height; this fills it with an even rows × columns grid chosen from its
 * own measured size — boxes resize, the plate doesn't grow — and deals the boxes into whole pages that
 * snap sideways, never a half-visible column. A last page with fewer boxes takes the grid that fills
 * the plate best (two large tools sit side by side, not stacked).
 *
 * `minW`/`minH`: the smallest a box may be. Before the plate is measured (the server render) it lays
 * out for a desktop plate.
 */

type Fit = { rows: number; cols: number }

function grid(w: number, h: number, minW: number, minH: number): Fit {
  const rows = h >= 2 * minH ? 2 : 1
  let cols = Math.max(1, Math.floor(w / minW))
  // A single row stays even too.
  if (rows === 1 && cols > 1 && cols % 2) cols -= 1
  return { rows, cols }
}

/** The grid for a page of n boxes: least empty cells, then boxes nearest the natural shape. */
function pageFit(n: number, { rows, cols }: Fit, w: number, h: number, aspect: number): Fit {
  let best: (Fit & { waste: number; off: number }) | null = null
  for (let r = 1; r <= rows; r++) {
    const c = Math.ceil(n / r)
    if (c > cols) continue
    const waste = r * c - n
    const off = Math.abs(Math.log(w / c / (h / r) / aspect))
    if (!best || waste < best.waste || (waste === best.waste && off < best.off)) best = { rows: r, cols: c, waste, off }
  }
  return best ? { rows: best.rows, cols: best.cols } : { rows, cols }
}

export function PlateGrid({ children, minW = 220, minH = 200, className = '' }: { children: ReactNode; minW?: number; minH?: number; className?: string }) {
  const items = Children.toArray(children)
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 1250, h: 420 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => setSize(s => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }))
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const fit = grid(size.w, size.h, minW, minH)
  const cap = fit.rows * fit.cols
  const pages: ReactNode[][] = []
  for (let i = 0; i < items.length; i += cap) pages.push(items.slice(i, i + cap))

  return (
    <div ref={ref} className={`no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain ${className}`}>
      {pages.map((page, p) => {
        const f = pageFit(page.length, fit, size.w, size.h, minW / minH)
        return (
          <div
            key={p}
            className="grid h-full w-full shrink-0 snap-start snap-always border-t border-l border-[var(--paper-rule)]"
            style={{ gridTemplateColumns: `repeat(${f.cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${f.rows}, minmax(0, 1fr))` }}
          >
            {page}
            {/* An odd last page keeps its rules: the empty cell is drawn, not left as a hole. */}
            {Array.from({ length: f.rows * f.cols - page.length }, (_, k) => (
              <div key={`empty-${k}`} aria-hidden className="border-b border-r border-[var(--paper-rule)]" />
            ))}
          </div>
        )
      })}
    </div>
  )
}
