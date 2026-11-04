import { VizShell } from "@/components/viz/VizShell"
import { nuclideField } from "@/lib/viz-data"
import { SimplexChart } from "./chart"

export const dynamic = "force-dynamic"
export const metadata = { title: "Simplex — Viz" }

export default async function Page() {
  const field = await nuclideField()
  return (
    <VizShell
      dark
      title="Literature smoke"
      note="After ECharts GL's scatter3d-simplex-noise — the artistic one, taken with artistic license. Each nuclide exhales a plume of points: the more papers, the taller and denser the smoke, jittered by noise so the field reads as weather rather than bookkeeping. Same data as the nebula; a mood instead of a measure."
    >
      <SimplexChart field={field} />
    </VizShell>
  )
}
