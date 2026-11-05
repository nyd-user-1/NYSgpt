import { VizShell } from "@/components/viz/VizShell"
import { SpectraChart } from "./chart"

export const metadata = { title: "Capture γ spectra — Viz" }

export default function Page() {
  return (
    <VizShell framed>
      <SpectraChart />
    </VizShell>
  )
}
