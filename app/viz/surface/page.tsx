import { VizShell } from "@/components/viz/VizShell"
import { nuclideField } from "@/lib/viz-data"
import { SurfaceChart } from "./chart"

export const metadata = { title: "Surface — Viz" }

export default function Page() {
  const field = nuclideField()
  return (
    <VizShell
      title="The literature landscape"
      note="After ECharts' simple-surface, with the corpus in place of the equation: altitude is the log of each nuclide's paper count over the (N, Z) plane. The mountain range running the diagonal is the valley of stability, raised into relief by a century of publishing; drag to orbit it."
    >
      <SurfaceChart field={field} />
    </VizShell>
  )
}
