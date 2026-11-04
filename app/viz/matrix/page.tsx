import { VizShell } from "@/components/viz/VizShell"
import { measureMatrix } from "@/lib/viz-data"
import { MatrixChart } from "./chart"

export const dynamic = "force-dynamic"
export const metadata = { title: "Matrix — Viz" }

export default async function Page() {
  const { vars, cells } = await measureMatrix()
  return (
    <VizShell
      title="The measure matrix"
      note="After ECharts' matrix-covariance — that example rides v6's new matrix coordinate, and this build holds ECharts at 5 for the GL pages, so the classic heatmap rendering carries it. The matrix itself is real: Pearson correlations computed in the database, live on this page load, across nine per-paper measures of all 303,568 references. Navy is moving together; red is moving apart. It takes about ten seconds to compute — the database runs 36 correlations over five joined layers before this page can draw."
    >
      <MatrixChart vars={vars} cells={cells} />
    </VizShell>
  )
}
