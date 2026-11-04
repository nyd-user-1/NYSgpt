import { VizShell } from "@/components/viz/VizShell"
import { nuclideField } from "@/lib/viz-data"
import { SimplexChart } from "./chart"

export const metadata = { title: "Noise field — Viz" }

export default function Page() {
  const field = nuclideField()
  return (
    <VizShell title="Nuclides | Noise Field">
      <SimplexChart field={field} />
    </VizShell>
  )
}
