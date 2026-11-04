import { VizShell } from "@/components/viz/VizShell"
import { paperTriples } from "@/lib/viz-data"
import { Scatter3dDatasetChart } from "./chart"

export const metadata = { title: "3D dataset scatter — Viz" }

export default function Page() {
  const rows = paperTriples()
  return (
    <VizShell title="Papers | 3D Dataset Scatter">
      <Scatter3dDatasetChart rows={rows} />
    </VizShell>
  )
}
