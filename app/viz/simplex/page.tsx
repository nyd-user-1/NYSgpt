import { VizShell } from "@/components/viz/VizShell"
import { nuclideField } from "@/lib/viz-data"
import { SimplexChart } from "./chart"

export const metadata = { title: "Simplex — Viz" }

export default function Page() {
  const field = nuclideField()
  return (
    <VizShell>
      <SimplexChart field={field} />
    </VizShell>
  )
}
