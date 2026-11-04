import { VizShell } from "@/components/viz/VizShell"
import { nuclideField } from "@/lib/viz-data"
import { NebulaChart } from "./chart"

export const metadata = { title: "Nebula — Viz" }

export default function Page() {
  const field = nuclideField()
  return (
    <VizShell>
      <NebulaChart field={field} />
    </VizShell>
  )
}
