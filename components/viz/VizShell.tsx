import Link from 'next/link'
import { X } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { PAPER_BRIDGE } from '@/components/editorial/PaperBridge'

// The /viz chart pages' frame: the app's own shell (AppLayout in paper mode) and the chart alone, centered
// in it (Brendan, 2026-11-04: no wordmark, no title, no note — each page keeps its metadata title for the
// tab). The charts take the theme and their click (the data table in the second panel) through useEChart.

// The chart cursor (the plus) lives in use-echart's zrender patch — the one place to change it.

export function VizShell({ children, framed, title }: { children: React.ReactNode; framed?: boolean; title?: string }) {
  if (framed)
    return (
      // The one large box (Brendan, 2026-11-04): the exact /viz column — same paddings, so the
      // frame's rect equals the expand clone's end rect — holding a single rounded frame the
      // chart fills and animates inside. No byline; the box is the page.
      <AppLayout paperMode headerTitle={title}>
        <div className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--paper)', ...PAPER_BRIDGE }}>
          <div className="mx-auto flex h-full w-full max-w-[1360px] flex-col px-6 sm:px-10 md:px-14 pt-8 pb-5">
            <div className="isolate relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper)] p-2">
              {/* Close: back to /viz, reversing the box the press grew (Brendan, 2026-11-04). */}
              <Link
                href="/viz"
                aria-label="Close the chart"
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--paper-rule)] bg-[var(--paper)] shadow-md transition-colors hover:bg-[var(--paper-quiet)]"
              >
                <X className="h-4 w-4 text-[var(--paper-text)]" />
              </Link>
              {/* The + cursor belongs to the chart's own ground alone — not the frame, not the close. */}
              <div data-viz-chart className="flex min-h-0 min-w-0 flex-1 flex-col">
                {children}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  return (
    <AppLayout paperMode headerTitle={title}>
      {/* The chart's cursor lives in use-echart now — zrender swaps default/pointer for the cross,
          so the slider keeps its own hands and nothing off the canvas is touched. */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-6 sm:px-6" style={{ backgroundColor: 'var(--paper)', ...PAPER_BRIDGE }}>
        <div data-viz-chart className="w-full max-w-[1360px]">
          {children}
        </div>
      </div>
    </AppLayout>
  )
}
