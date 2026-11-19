'use client'

import * as React from 'react'

/** The longest title a header shows whole (Brendan, 2026-11-06); a longer one ends in "…" and hovering shows it all. */
export const TITLE_MAX = 'Binding Energy per Nucleon'

/** A header title held to TITLE_MAX's width in its own font: a hidden copy of TITLE_MAX is measured for the limit. */
export function TitleText({ text, className = '', style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const ruler = React.useRef<HTMLSpanElement>(null)
  const [max, setMax] = React.useState<number | undefined>(undefined)
  React.useLayoutEffect(() => {
    const el = ruler.current
    if (!el) return
    const fit = () => setMax(Math.ceil(el.getBoundingClientRect().width))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <>
      <span ref={ruler} aria-hidden className={`pointer-events-none invisible absolute whitespace-nowrap ${className}`} style={style}>
        {TITLE_MAX}
      </span>
      {/* The padding holds a g's or a y's tail inside the cut-off edge; the negative margin keeps the line's height. */}
      <span title={text} className={`-mb-[0.2em] inline-block min-w-0 truncate pb-[0.2em] align-bottom ${className}`} style={{ ...style, maxWidth: max }}>
        {text}
      </span>
    </>
  )
}
