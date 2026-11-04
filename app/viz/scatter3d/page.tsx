import { VizShell } from "@/components/viz/VizShell"
import { nuclideField } from "@/lib/viz-data"
import { Scatter3dChart } from "./chart"

export const metadata = { title: "Scatter 3D — Viz" }

export default function Page() {
  const field = nuclideField()
  return (
    <VizShell
      dark
      title="The nuclide field, lifted"
      note="After ECharts GL's scatter3d: the nebula's (N, Z) plane with the third axis made literal — height and color are the log of each nuclide's paper count. The valley of stability becomes a ridge you can orbit; drag to turn it, scroll to dive."
    >
      <Scatter3dChart field={field} />
    </VizShell>
  )
}
