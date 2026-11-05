import { VizShell } from "@/components/viz/VizShell"
import { LevelsView } from "./levels-view"

export const metadata = { title: "Level energies — Viz" }

// Prototype B (2026-11-04): every ENSDF adopted level standing over the chart of nuclides at its energy.
export default function Page() {
  return (
    <VizShell framed>
      <LevelsView />
    </VizShell>
  )
}
