import { VizShell } from "@/components/viz/VizShell"
import { GammaAtlasChart } from "./chart"

export const metadata = { title: "Capture γ atlas — Viz" }

export default function Page() {
  return (
    <VizShell>
      <GammaAtlasChart />
    </VizShell>
  )
}
