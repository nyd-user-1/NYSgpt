import { VizShell } from "@/components/viz/VizShell"
import { paperTriples } from "@/lib/viz-data"
import { Scatter3dDatasetChart } from "./chart"

export const metadata = { title: "Scatter 3D dataset — Viz" }

export default function Page() {
  const rows = paperTriples()
  return (
    <VizShell>
      <Scatter3dDatasetChart rows={rows} />
    </VizShell>
  )
}
