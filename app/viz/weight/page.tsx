import { VizShell } from "@/components/viz/VizShell"
import { paperScatter } from "@/lib/viz-data"
import { WeightChart } from "./chart"

export const metadata = { title: "Weight — Viz" }

export default function Page() {
  const rows = paperScatter()
  return (
    <VizShell
      title="Two populations of papers"
      note="After ECharts' scatter-weight, which sets two populations against each other. A random 12,000 cited papers: publication year across, citations up a log axis. Navy is the NSR record proper; sky is the arXiv/APS additions — younger, and climbing the citation axis faster than their age should allow."
    >
      <WeightChart rows={rows} />
    </VizShell>
  )
}
