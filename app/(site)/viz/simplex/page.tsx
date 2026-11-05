import { VizShell } from "@/components/viz/VizShell"
import { SimplexChart } from "./chart"

export const metadata = { title: "Capture γ strips — Viz" }

export default function Page() {
  return (
    <VizShell>
      <SimplexChart />
    </VizShell>
  )
}
