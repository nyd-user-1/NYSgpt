import { PAPER_BRIDGE } from '@/components/editorial/PaperBridge'
import { RevealFx } from '@/components/RevealFx'
import { FramedBox } from '@/components/viz/FramedBox'

// The /viz chart pages' frame: the chart alone, centered in the app's shell (Brendan, 2026-11-04: no wordmark,
// no title, no note — each page keeps its metadata title for the tab). AppLayout itself is the (site) layout's
// (2026-11-04), and the header title comes from lib/header-titles.ts. The charts take the theme and their
// click (the data table in the second panel) through useEChart.

// The chart cursor (the plus) lives in use-echart's zrender patch — the one place to change it.

// `title` is kept for the call sites; the header reads lib/header-titles.ts.
export function VizShell({ children, framed }: { children: React.ReactNode; framed?: boolean; title?: string }) {
  if (framed)
    return (
      // The one large box (Brendan, 2026-11-04): the whole content area below the header, edge to
      // edge — the rect the /viz press's clone grows to — holding the frame the chart fills and
      // animates inside, with its prev, next and close (FramedBox). No byline; the box is the page.
      <div className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--paper)', ...PAPER_BRIDGE }}>
        <FramedBox>
          {/* The + cursor belongs to the chart's own ground alone — not the frame, not the buttons. */}
          <div data-viz-chart className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* The chart arrives INSIDE the box the /viz press just grew, filling it (2026-11-04: every box). */}
            <RevealFx className="flex min-h-0 min-w-0 flex-1 flex-col" delay={0.1} translateY={4}>
              {children}
            </RevealFx>
          </div>
        </FramedBox>
      </div>
    )
  return (
    <>
      {/* The chart's cursor lives in use-echart now — zrender swaps default/pointer for the cross,
          so the slider keeps its own hands and nothing off the canvas is touched. */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-6 sm:px-6" style={{ backgroundColor: 'var(--paper)', ...PAPER_BRIDGE }}>
        <div data-viz-chart className="w-full max-w-[1360px]">
          {children}
        </div>
      </div>
    </>
  )
}
