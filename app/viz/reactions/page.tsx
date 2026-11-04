import { VizShell } from "@/components/viz/VizShell"
import { nuclideField, reactionFlows } from "@/lib/viz-data"
import { ReactionsChart } from "./chart"

export const metadata = { title: "Reactions — Viz" }

export default function Page() {
  const field = nuclideField()
  const flows = reactionFlows()
  return (
    <VizShell>
      <ReactionsChart field={field} flows={flows} />
    </VizShell>
  )
}
