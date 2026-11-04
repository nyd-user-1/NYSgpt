import { VizShell } from "@/components/viz/VizShell"
import { nuclideField } from "@/lib/viz-data"
import { HeatmapChart } from "./chart"

export const metadata = { title: "Heatmap — Viz" }

export default function Page() {
  const field = nuclideField()
  return (
    <VizShell
      title="The nuclide heatmap"
      note="After ECharts' heatmap-large. The same (N, Z) field as the nebula, drawn as cells instead of glow: every lit cell is a nuclide the corpus's references study, its heat the log of the paper count. The empty black is nuclear terra incognita — the literature has never touched it."
    >
      <HeatmapChart field={field} />
    </VizShell>
  )
}
