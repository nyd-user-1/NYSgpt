import { VizShell } from "@/components/viz/VizShell"
import { RevealFx } from "@/components/RevealFx"
import { nuclideField } from "@/lib/viz-data"
import { NebulaChart } from "./chart"

export const metadata = { title: "Scatter field — Viz" }

export default function Page() {
  const field = nuclideField()
  return (
    <VizShell framed title="Nuclides | Scatter Field">
      {/* The chart arrives INSIDE the box the /viz press just grew, filling it (expand-box.tsx test). */}
      <RevealFx className="flex min-h-0 min-w-0 flex-1 flex-col" delay={0.1} translateY={4}>
        <NebulaChart field={field} fill />
      </RevealFx>
    </VizShell>
  )
}
