import { VizShell } from "@/components/viz/VizShell"
import { measureMatrix } from "@/lib/viz-data"
import { MatrixChart } from "./chart"

export const metadata = { title: "Correlation matrix — Viz" }

export default function Page() {
  const { vars, cells } = measureMatrix()
  return (
    <VizShell>
      <MatrixChart vars={vars} cells={cells} />
    </VizShell>
  )
}
