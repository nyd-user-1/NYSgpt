import { AppLayout } from '@/components/AppLayout'
import { PAPER_BRIDGE } from '@/components/editorial/PaperBridge'

// The /viz chart pages' frame: the app's own shell (AppLayout in paper mode) and the chart alone, centered
// in it (Brendan, 2026-11-04: no wordmark, no title, no note — each page keeps its metadata title for the
// tab). The charts take the theme and their click (the data table in the second panel) through useEChart.

/** Every chart surface's cursor (2026-11-04: the plus first). The one place to change it. */
const CHART_CURSOR = 'crosshair'

export function VizShell({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout paperMode>
      {/* ECharts sets its own cursor on the canvas as the pointer moves; !important holds this one. */}
      <style>{`[data-viz-chart], [data-viz-chart] * { cursor: ${CHART_CURSOR} !important; }`}</style>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-6 sm:px-6" style={{ backgroundColor: 'var(--paper)', ...PAPER_BRIDGE }}>
        <div data-viz-chart className="w-full max-w-[1360px]">
          {children}
        </div>
      </div>
    </AppLayout>
  )
}
