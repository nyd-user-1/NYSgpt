import { VizShell } from "@/components/viz/VizShell"
import { nuclideField } from "@/lib/viz-data"
import { NebulaChart } from "./chart"

export const dynamic = "force-dynamic"
export const metadata = { title: "Nebula — Viz" }

export default async function Page() {
  const field = await nuclideField()
  return (
    <VizShell
      dark
      title="The nuclide nebula"
      note="After ECharts' scatter-nebula. Every point is a nuclide the literature has touched — neutrons across, protons up. Glow and size follow the log of its paper count, from 1.21 million paper–nuclide links over 303,568 references; the brightest single nuclide carries 24,646 papers."
    >
      <NebulaChart field={field} />
    </VizShell>
  )
}
