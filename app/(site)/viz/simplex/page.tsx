import { VizShell } from "@/components/viz/VizShell"
import { SimplexChart } from "./chart"

export const metadata = { title: "Noise field — Viz" }

export default function Page() {
  return (
    <VizShell title="Nuclides | Noise Field">
      <SimplexChart />
    </VizShell>
  )
}
