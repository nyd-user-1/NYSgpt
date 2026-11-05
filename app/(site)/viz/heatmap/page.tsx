import { VizShell } from "@/components/viz/VizShell"
import { HeatmapChart } from "./chart"

export const metadata = { title: "Heatmap — Viz" }

export default function Page() {
  return (
    <VizShell framed title="Nuclides | Heatmap">
      <HeatmapChart />
    </VizShell>
  )
}
