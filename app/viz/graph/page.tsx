import { VizShell } from "@/components/viz/VizShell"
import { authorGraph } from "@/lib/viz-data"
import { GraphChart } from "./chart"

export const metadata = { title: "Force graph — Viz" }

export default function Page() {
  const { nodes, edges } = authorGraph()
  return (
    <VizShell title="Authors | Force Graph">
      <GraphChart nodes={nodes} edges={edges} />
    </VizShell>
  )
}
