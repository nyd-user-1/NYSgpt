import { VizShell } from "@/components/viz/VizShell"
import { IsotopeRadarChart } from "./chart"

export const metadata = { title: "Isotope radar — Viz" }

export default function Page() {
  return (
    <VizShell framed title="Nuclides | Isotope Radar">
      <IsotopeRadarChart />
    </VizShell>
  )
}
