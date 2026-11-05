import { VizShell } from "@/components/viz/VizShell"
import { Scatter3dChart } from "./chart"

export const metadata = { title: "3D scatter — Viz" }

export default function Page() {
  return (
    <VizShell title="Nuclides | 3D Scatter">
      <Scatter3dChart />
    </VizShell>
  )
}
