import { VizShell } from "@/components/viz/VizShell"
import { ReactionsChart } from "./chart"

export const metadata = { title: "Flow lines — Viz" }

export default function Page() {
  return (
    <VizShell framed title="Decays | Flow Lines">
      <ReactionsChart />
    </VizShell>
  )
}
