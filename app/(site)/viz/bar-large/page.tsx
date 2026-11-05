import { VizShell } from "@/components/viz/VizShell"
import { BarLargeChart } from "./chart"

export const metadata = { title: "Bar run — Viz" }

export default function Page() {
  return (
    <VizShell title="Nuclides | Bar Run">
      <BarLargeChart />
    </VizShell>
  )
}
