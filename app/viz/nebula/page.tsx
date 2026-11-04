import { VizShell } from "@/components/viz/VizShell"
import { RevealFx } from "@/components/RevealFx"
import { nuclideField } from "@/lib/viz-data"
import { NebulaChart } from "./chart"

export const metadata = { title: "Scatter field — Viz" }

export default function Page() {
  const field = nuclideField()
  return (
    <VizShell>
      {/* The chart arrives into the box the /viz press just grew (expand-box.tsx test). */}
      <RevealFx className="flex min-h-0 flex-1 flex-col" delay={0.12} translateY={4}>
        <NebulaChart field={field} />
      </RevealFx>
    </VizShell>
  )
}
