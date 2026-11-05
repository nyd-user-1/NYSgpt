import { VizShell } from "@/components/viz/VizShell"
import { SurfaceChart } from "./chart"

export const metadata = { title: "3D surface — Viz" }

export default function Page() {
  return (
    <VizShell title="Nuclides | 3D Surface">
      <SurfaceChart />
    </VizShell>
  )
}
