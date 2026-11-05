import { VizShell } from "@/components/viz/VizShell"
import { RainfallChart } from "./chart"

export const metadata = { title: "Stacked area — Viz" }

export default function Page() {
  return (
    <VizShell framed title="Nuclides | Stacked Area">
      <RainfallChart />
    </VizShell>
  )
}
