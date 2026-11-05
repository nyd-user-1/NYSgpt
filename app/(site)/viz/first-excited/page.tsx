import { VizShell } from "@/components/viz/VizShell"
import { FirstExcitedChart } from "./chart"

export const metadata = { title: "First 2⁺ energies — Viz" }

export default function Page() {
  return (
    <VizShell framed title="Nuclides | Aggregate Bar">
      <FirstExcitedChart />
    </VizShell>
  )
}
