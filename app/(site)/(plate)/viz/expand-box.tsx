'use client'

// Box 1's test flight, now every chart box's (Brendan, 2026-11-04): a press doesn't open the pane —
// the box itself grows. A paper clone lifts off the masthead's wordmark and expands to the whole
// content area below the header — the chart page's full-width frame — then the route changes and
// the chart fades in to fill it (VizShell framed's RevealFx). A press with a modifier key keeps the
// link's own behaviour (new tab, new window), and shift+right-click still reaches the pane: this
// stays a real link.

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

const MS = 420
const EASE = 'cubic-bezier(0.25,0.4,0.25,1)'

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
    // The clone's end rect IS the chart page's frame: the whole content area below the header, edge
    // to edge (Brendan, 2026-11-04: full width is the standard) — on /viz, the area the column sits in
    // (the column's parent, PlateFrame's root) — so the swap underneath is invisible and the chart
    // builds INSIDE the box the wipe leaves standing, never over it.
    const col = el.closest('[data-viz-column]') as HTMLElement | null
    const to = (col?.parentElement ?? el).getBoundingClientRect()
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
            className="nysgpt-app fixed z-[90] overflow-hidden border bg-[var(--paper)]"
            style={{
              left: grown ? box.to.left : box.from.left,
              top: grown ? box.to.top : box.from.top,
              width: grown ? box.to.width : box.from.width,
              height: grown ? box.to.height : box.from.height,
              opacity: grown ? 1 : 0.98,
              // A rounded, ruled box on the way up; at the end, the borderless frame, its bottom corners on the
              // app card's curve.
              borderRadius: grown ? '0 0 15px 15px' : 16,
              borderColor: grown ? 'transparent' : 'var(--paper-rule)',
              transition: ['left', 'top', 'width', 'height', 'border-radius', 'border-color'].map((p) => `${p} ${MS}ms ${EASE}`).join(', '),
            }}
          />,
          document.body,
        )}
    </>
  )
}
