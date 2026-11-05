import { VizShell } from "@/components/viz/VizShell"
import { NuclideCardChart } from "./chart"

export const metadata = { title: "Radar — Viz" }

export default function Page() {
  return (
    <VizShell framed title="Nuclides | Radar">
      <NuclideCardChart />
    </VizShell>
  )
}
