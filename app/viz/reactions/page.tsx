import { VizShell } from "@/components/viz/VizShell"
import { nuclideField, reactionFlows } from "@/lib/viz-data"
import { ReactionsChart } from "./chart"

export const metadata = { title: "Reactions — Viz" }

export default function Page() {
  const field = nuclideField()
  const flows = reactionFlows()
  return (
    <VizShell
      title="The reaction transit map"
      note="After ECharts' lines-ny — bus routes through New York, reimagined: the city is the chart of nuclides, and every route is a nuclear reaction the literature has paired with a nuclide. Each line runs from a nuclide to the one its reaction's (ΔN, ΔZ) produces; the moving lights ride the 1,200 busiest routes. Paper-level pairing, so it sketches the flow of the field rather than measures any one experiment."
    >
      <ReactionsChart field={field} flows={flows} />
    </VizShell>
  )
}
