import { VizShell } from "@/components/viz/VizShell"
import { Decay2Chart } from "./chart"

export const metadata = { title: "Decay simulation 2 — Viz" }

export default function Page() {
  return (
    <VizShell framed>
      <Decay2Chart />
    </VizShell>
  )
}
