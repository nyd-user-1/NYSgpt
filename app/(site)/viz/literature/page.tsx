import { VizShell } from "@/components/viz/VizShell"
import { LiteratureChart } from "./chart"

// The literature field returns as its own page (Brendan, 2026-11-04): the scatter-nebula glow
// treatment over paper counts, which /viz/nebula's binding-energy rewrite displaced.

export const metadata = { title: "Literature field — Viz" }

export default function Page() {
  return (
    <VizShell framed title="Nuclides | Literature Field">
      <LiteratureChart fill />
    </VizShell>
  )
}
