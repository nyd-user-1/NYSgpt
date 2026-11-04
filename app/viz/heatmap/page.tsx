import { VizShell } from "@/components/viz/VizShell"
import { nuclideField } from "@/lib/viz-data"
import { HeatmapChart } from "./chart"

export const metadata = { title: "Heatmap — Viz" }

export default function Page() {
  const field = nuclideField()
  return (
    <VizShell title="Nuclides | Heatmap">
      <HeatmapChart field={field} />
    </VizShell>
  )
}
