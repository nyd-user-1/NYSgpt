import { VizShell } from "@/components/viz/VizShell"
import { GraphChart } from "./chart"

export const metadata = { title: "Force graph — Viz" }

export default function Page() {
  return (
    <VizShell title="Authors | Force Graph">
      <GraphChart />
    </VizShell>
  )
}
