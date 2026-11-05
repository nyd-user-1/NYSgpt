import { VizShell } from "@/components/viz/VizShell"
import { WeightChart } from "./chart"

export const metadata = { title: "E(2⁺) vs B(E2) — Viz" }

export default function Page() {
  return (
    <VizShell title="Nuclides | Two-Series Scatter">
      <WeightChart />
    </VizShell>
  )
}
