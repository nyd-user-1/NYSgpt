import { VizShell } from "@/components/viz/VizShell"
import { KnowledgeView } from "./view"

export const metadata = { title: "Knowledge map — Viz" }

// Prototype C (2026-11-04): what the literature and the evaluations hold for each nuclide.
export default function Page() {
  return (
    <VizShell framed>
      <KnowledgeView />
    </VizShell>
  )
}
