import { VizShell } from "@/components/viz/VizShell"
import { perYear } from "@/lib/viz-data"
import { RainfallChart } from "./chart"

export const dynamic = "force-dynamic"
export const metadata = { title: "Rainfall — Viz" }

export default async function Page() {
  const { papers, exfor } = await perYear()
  return (
    <VizShell
      title="The rainfall and the river"
      note="After ECharts' area-rainfall, which pairs rainfall with the water flow it becomes. Above: papers entering the corpus, per year since 1900. Below, inverted: the slice of each year that flowed on into EXFOR as compiled experimental data. Drag the zoom to any era — the axes stay linked."
    >
      <RainfallChart papers={papers} exfor={exfor} />
    </VizShell>
  )
}
