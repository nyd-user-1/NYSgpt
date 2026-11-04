import { VizShell } from "@/components/viz/VizShell"
import { nuclideField } from "@/lib/viz-data"
import { Scatter3dChart } from "./chart"

export const metadata = { title: "Scatter 3D — Viz" }

export default function Page() {
  const field = nuclideField()
  return (
    <VizShell>
      <Scatter3dChart field={field} />
    </VizShell>
  )
}
