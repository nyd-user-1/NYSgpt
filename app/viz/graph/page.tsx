import { VizShell } from "@/components/viz/VizShell"
import { authorGraph } from "@/lib/viz-data"
import { GraphChart } from "./chart"

export const metadata = { title: "Graph — Viz" }

export default function Page() {
  const { nodes, edges } = authorGraph()
  return (
    <VizShell
      dark
      title="The collaboration web"
      note="After ECharts GL's graphgl-large-internet. The 1,200 most-published authors in the corpus as nodes, sized by paper count; an edge wherever two of them share four or more papers. The force layout finds the labs and the eras on its own — the dense knots are the great collaborations settling into place."
    >
      <GraphChart nodes={nodes} edges={edges} />
    </VizShell>
  )
}
