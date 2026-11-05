import { VizShell } from "@/components/viz/VizShell"
import { SeparationChart } from "./chart"

export const metadata = { title: "Candlestick — Viz" }

export default function Page() {
  return (
    <VizShell framed title="Nuclides | Candlestick">
      <SeparationChart />
    </VizShell>
  )
}
