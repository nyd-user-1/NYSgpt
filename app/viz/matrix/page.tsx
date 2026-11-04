import { VizShell } from "@/components/viz/VizShell"
import { measureMatrix } from "@/lib/viz-data"
import { MatrixChart } from "./chart"

export const metadata = { title: "Correlation matrix — Viz" }

export default function Page() {
  const { vars, cells } = measureMatrix()
  return (
    <VizShell title="Measures | Correlation Matrix">
      <MatrixChart vars={vars} cells={cells} />
    </VizShell>
  )
}
