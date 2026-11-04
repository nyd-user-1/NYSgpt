import { VizShell } from "@/components/viz/VizShell"
import { nuclideBars } from "@/lib/viz-data"
import { BarLargeChart } from "./chart"

export const metadata = { title: "Bar large — Viz" }

export default function Page() {
  const bars = nuclideBars()
  return (
    <VizShell
      title="Every nuclide, ranked"
      note="After ECharts' bar-large: all ~7,900 literature-touched nuclides as one bar run, tallest first, on a log axis. The head of the line is the workhorse physics (²³⁵U, ¹²C, ²⁰⁸Pb); the tail is one-paper exotica. Zoom in anywhere — each bar names its nuclide."
    >
      <BarLargeChart bars={bars} />
    </VizShell>
  )
}
