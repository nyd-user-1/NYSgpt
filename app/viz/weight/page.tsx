import { VizShell } from "@/components/viz/VizShell"
import { paperScatter } from "@/lib/viz-data"
import { WeightChart } from "./chart"

export const metadata = { title: "Two-series scatter — Viz" }

export default function Page() {
  const rows = paperScatter()
  return (
    <VizShell>
      <WeightChart rows={rows} />
    </VizShell>
  )
}
