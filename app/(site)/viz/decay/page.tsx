import { VizShell } from "@/components/viz/VizShell"
import { DecayView } from "./view"

export const metadata = { title: "Decay simulation — Viz" }

// Prototype A (2026-11-04): the chart of nuclides from the ENSDF ground states, decaying at their measured rates.
export default function Page() {
  return (
    <VizShell framed>
      <DecayView />
    </VizShell>
  )
}
