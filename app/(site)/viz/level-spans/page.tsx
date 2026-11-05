import { VizShell } from "@/components/viz/VizShell"
import { LevelSpansChart } from "./chart"

export const metadata = { title: "Level spans per isotope chain — Viz" }

export default function Page() {
  return (
    <VizShell title="Nuclides | OHLC Bars">
      <LevelSpansChart />
    </VizShell>
  )
}
