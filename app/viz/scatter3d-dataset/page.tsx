import { VizShell } from "@/components/viz/VizShell"
import { paperTriples } from "@/lib/viz-data"
import { Scatter3dDatasetChart } from "./chart"

export const metadata = { title: "Scatter 3D dataset — Viz" }

export default function Page() {
  const rows = paperTriples()
  return (
    <VizShell
      dark
      title="Ten thousand papers in three measures"
      note="After ECharts GL's scatter3D-dataset, which turns tabular rows straight into space. A random 10,000 cited papers as points: year across, references carried (log) deep, citations earned (log) up. Navy is the NSR record; sky the arXiv/APS additions."
    >
      <Scatter3dDatasetChart rows={rows} />
    </VizShell>
  )
}
