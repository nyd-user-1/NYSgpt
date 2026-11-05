import { VizShell } from "@/components/viz/VizShell"
import { NebulaChart } from "./chart"

export const metadata = { title: "Scatter field — Viz" }

export default function Page() {
  return (
    <VizShell framed title="Nuclides | Scatter Field">
      <NebulaChart fill />
    </VizShell>
  )
}
