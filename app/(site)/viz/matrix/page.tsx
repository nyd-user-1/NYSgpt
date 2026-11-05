import { VizShell } from "@/components/viz/VizShell"
import { MatrixChart } from "./chart"

export const metadata = { title: "Correlation matrix — Viz" }

export default function Page() {
  return (
    <VizShell title="Measures | Correlation Matrix">
      <MatrixChart />
    </VizShell>
  )
}
