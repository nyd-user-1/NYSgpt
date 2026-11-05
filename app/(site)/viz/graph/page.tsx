import { VizShell } from "@/components/viz/VizShell"
import { GraphChart } from "./chart"

export const metadata = { title: "Force graph — Viz" }

export default function Page() {
  return (
    <VizShell framed title="Nuclides | Force Graph">
      <GraphChart />
    </VizShell>
  )
}
