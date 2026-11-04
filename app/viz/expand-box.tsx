'use client'

// Box 1's test flight (Brendan, 2026-11-04): a press doesn't open the pane — the box itself
// grows. A paper clone lifts off the box's own rect and expands to the plate frame's rect
// (the one box the masthead and plate would make combined), then the route changes and the
// chart fades in to fill it (RevealFx on the chart page). One box only, to test the motion.

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
    e.preventDefault()
    const el = ref.current
    if (!el || box) return
    const from = el.getBoundingClientRect()
    // The destination: the plate frame this box lives in — the single combined box.
    const frame = el.closest('.isolate') ?? el
    const to = frame.getBoundingClientRect()
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
