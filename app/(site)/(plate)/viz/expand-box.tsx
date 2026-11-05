'use client'

// Box 1's test flight, now every chart box's (Brendan, 2026-11-04): a press doesn't open the pane —
// the box itself grows. A paper clone lifts off the box's own rect and expands to the plate frame's
// rect (the one box the masthead and plate would make combined), then the route changes and the
// chart fades in to fill it (VizShell framed's RevealFx). A press with a modifier key keeps the
// link's own behaviour (new tab, new window), and shift+right-click still reaches the pane: this
// stays a real link.

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

const MS = 420

export function ExpandBox({ href, className, style, children }: { href: string; className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  const router = useRouter()
  const ref = useRef<HTMLAnchorElement>(null)
  const [box, setBox] = useState<{ from: DOMRect; to: DOMRect } | null>(null)
  const [grown, setGrown] = useState(false)

  const onClick = (e: React.MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    const el = ref.current
    if (!el || box) return
    // The motion starts at the masthead's MAIN box, top left (Brendan, 2026-11-04 — not the
    // clicked box), and grows over the union of masthead + plate: the one combined box.
    const word = document.querySelector('[data-inspect="Wordmark"]')
    const from = (word ?? el).getBoundingClientRect()
    // The clone's end rect IS the chart page's frame: the column's content box — same column,
    // same paddings on both pages — so the swap underneath is invisible and the chart builds
    // INSIDE the box the wipe leaves standing, never over it.
    const col = (el.closest('[data-viz-column]') as HTMLElement) ?? el
    const cr = col.getBoundingClientRect()
    const cs = getComputedStyle(col)
    const [pl, pr, pt, pb] = [cs.paddingLeft, cs.paddingRight, cs.paddingTop, cs.paddingBottom].map(parseFloat)
    const to = new DOMRect(cr.left + pl, cr.top + pt, cr.width - pl - pr, cr.height - pt - pb)
    setBox({ from, to })
    requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)))
    window.setTimeout(() => router.push(href), MS)
  }

  return (
    <>
      <a ref={ref} href={href} onClick={onClick} className={className} style={style}>
        {children}
      </a>
      {box &&
        createPortal(
          <div
            aria-hidden
            className="nysgpt-app fixed z-[90] overflow-hidden rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper)]"
            style={{
              left: grown ? box.to.left : box.from.left,
              top: grown ? box.to.top : box.from.top,
              width: grown ? box.to.width : box.from.width,
              height: grown ? box.to.height : box.from.height,
              opacity: grown ? 1 : 0.98,
              transition: `left ${MS}ms cubic-bezier(0.25,0.4,0.25,1), top ${MS}ms cubic-bezier(0.25,0.4,0.25,1), width ${MS}ms cubic-bezier(0.25,0.4,0.25,1), height ${MS}ms cubic-bezier(0.25,0.4,0.25,1)`,
            }}
          />,
          document.body,
        )}
    </>
  )
}
