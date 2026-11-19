"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

// Section three's charts as horizontal slides: one block per slide, the scrollbar hidden. The
// stepping chevrons live inside each block's header, right after the chart's title — the blocks
// read them from CarouselNav (blocks.tsx). The section heading is fixed and centered; the one- or
// two-line definition beneath it changes with the slide.

export type SlideHeader = { title: string; lines: string[] }

/** The carousel's position and stepper, for the chevrons a block header renders beside its title. */
export const CarouselNav = React.createContext<{ at: number; count: number; go: (d: -1 | 1) => void } | null>(null)

export function ChartCarousel({ title, headers, children }: { title?: string; headers?: SlideHeader[]; children: React.ReactNode }) {
  const slides = React.Children.toArray(children)
  const track = React.useRef<HTMLDivElement>(null)
  const [at, setAt] = React.useState(0)
  const onScroll = () => {
    const el = track.current
    if (el) setAt(Math.min(slides.length - 1, Math.round(el.scrollLeft / (el.clientWidth + 24))))
  }
  const go = React.useCallback((d: -1 | 1) => {
    const el = track.current
    el?.scrollBy({ left: d * (el.clientWidth + 24), behavior: "smooth" })
  }, [])
  const nav = React.useMemo(() => ({ at, count: slides.length, go }), [at, slides.length, go])
  const head = headers?.[at]
  return (
    <CarouselNav.Provider value={nav}>
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        {title && <h2 className="font-display text-3xl font-bold text-pax2-blue">{title}</h2>}
        {head && (
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-slate-900">
            {head.lines.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </p>
        )}
      </div>
      <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory gap-6 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slides.map((s, i) => (
          <div key={i} className="w-full shrink-0 snap-start">
            {s}
          </div>
        ))}
      </div>
    </CarouselNav.Provider>
  )
}

/** The chevrons beside a chart's title while it rides in a carousel: muted squares, the left one
 *  only once the reader has moved right, the right one dimming on the last slide. */
export function CarouselChevrons() {
  const nav = React.useContext(CarouselNav)
  if (!nav) return null
  const btn = "inline-flex size-8 items-center justify-center rounded-md bg-muted/70 text-slate-700 transition-colors hover:bg-muted hover:text-foreground"
  return (
    <span className="ml-1 flex items-center gap-1">
      {nav.at > 0 && (
        <button type="button" aria-label="Previous chart" onClick={() => nav.go(-1)} className={btn}>
          <ChevronLeft className="size-4" />
        </button>
      )}
      <button type="button" aria-label="Next chart" onClick={() => nav.go(1)} disabled={nav.at >= nav.count - 1} className={cn(btn, nav.at >= nav.count - 1 && "opacity-40 hover:bg-muted/70 hover:text-slate-700")}>
        <ChevronRight className="size-4" />
      </button>
    </span>
  )
}
