import { VizShell } from "@/components/viz/VizShell"
import { nuclideBars } from "@/lib/viz-data"
import { BarLargeChart } from "./chart"

export const metadata = { title: "Bar run — Viz" }

export default function Page() {
  const bars = nuclideBars()
  return (
    <VizShell>
      <BarLargeChart bars={bars} />
    </VizShell>
  )
}
