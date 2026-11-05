import { VizShell } from "@/components/viz/VizShell"
import { Scatter3dDatasetChart } from "./chart"

export const metadata = { title: "3D dataset scatter — Viz" }

export default function Page() {
  return (
    <VizShell title="Papers | 3D Dataset Scatter">
      <Scatter3dDatasetChart />
    </VizShell>
  )
}
