import { VizShell } from "@/components/viz/VizShell"
import { Scatter3dChart } from "./chart"

export const metadata = { title: "E(2⁺) × B(E2) × Z — Viz" }

export default function Page() {
  return (
    <VizShell title="Nuclides | 3D Scatter">
      <Scatter3dChart />
    </VizShell>
  )
}
