import { VizShell } from "@/components/viz/VizShell"
import { perYear } from "@/lib/viz-data"
import { RainfallChart } from "./chart"

export const metadata = { title: "Stacked area — Viz" }

export default function Page() {
  const { papers, exfor } = perYear()
  return (
    <VizShell>
      <RainfallChart papers={papers} exfor={exfor} />
    </VizShell>
  )
}
