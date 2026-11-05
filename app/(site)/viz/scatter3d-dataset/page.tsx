import { VizShell } from "@/components/viz/VizShell"
import { Scatter3dDatasetChart } from "./chart"

export const metadata = { title: "EXFOR measurements — Viz" }

export default function Page() {
  return (
    <VizShell framed>
      <Scatter3dDatasetChart />
    </VizShell>
  )
}
