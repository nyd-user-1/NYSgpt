import { VizShell } from "@/components/viz/VizShell"
import { nuclideField } from "@/lib/viz-data"
import { SurfaceChart } from "./chart"

export const metadata = { title: "3D surface — Viz" }

export default function Page() {
  const field = nuclideField()
  return (
    <VizShell>
      <SurfaceChart field={field} />
    </VizShell>
  )
}
