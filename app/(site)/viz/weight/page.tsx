import { VizShell } from "@/components/viz/VizShell"
import { WeightChart } from "./chart"

export const metadata = { title: "Two-series scatter — Viz" }

export default function Page() {
  return (
    <VizShell title="Papers | Two-Series Scatter">
      <WeightChart />
    </VizShell>
  )
}
