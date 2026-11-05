import { VizShell } from "@/components/viz/VizShell"
import { GammaPunchcardChart } from "./chart"

export const metadata = { title: "Capture γ punch card — Viz" }

export default function Page() {
  return (
    <VizShell>
      <GammaPunchcardChart />
    </VizShell>
  )
}
