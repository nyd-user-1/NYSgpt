import { VizShell } from "@/components/viz/VizShell"
import { authorGraph } from "@/lib/viz-data"
import { GraphChart } from "./chart"

export const metadata = { title: "Graph — Viz" }

export default function Page() {
  const { nodes, edges } = authorGraph()
  return (
    <VizShell>
      <GraphChart nodes={nodes} edges={edges} />
    </VizShell>
  )
}
