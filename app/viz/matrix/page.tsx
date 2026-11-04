import { VizShell } from "@/components/viz/VizShell"
import { measureMatrix } from "@/lib/viz-data"
import { MatrixChart } from "./chart"

export const metadata = { title: "Matrix — Viz" }

export default function Page() {
  const { vars, cells } = measureMatrix()
  return (
    <VizShell
      title="The measure matrix"
      note="After ECharts' matrix-covariance — that example rides v6's new matrix coordinate, and this build holds ECharts at 5 for the GL pages, so the classic heatmap rendering carries it. The matrix itself is real: 36 Pearson correlations across nine per-paper measures of all 303,568 references, computed once from the corpus snapshot — the corpus is frozen, so the numbers are too. Navy is moving together; red is moving apart."
    >
      <MatrixChart vars={vars} cells={cells} />
    </VizShell>
  )
}
