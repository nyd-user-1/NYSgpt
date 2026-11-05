import { VizShell } from "@/components/viz/VizShell"
import { LevelCandlesChart } from "./chart"

export const metadata = { title: "Level energies per nuclide — Viz" }

export default function Page() {
  return (
    <VizShell framed title="Nuclides | Candlestick">
      <LevelCandlesChart />
    </VizShell>
  )
}
