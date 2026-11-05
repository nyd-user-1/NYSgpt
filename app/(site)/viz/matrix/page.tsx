import { VizShell } from "@/components/viz/VizShell"
import { MatrixChart } from "./chart"

export const metadata = { title: "Nuclide measure correlations — Viz" }

export default function Page() {
  return (
    <VizShell title="Nuclides | Correlation Matrix">
      <MatrixChart />
    </VizShell>
  )
}
