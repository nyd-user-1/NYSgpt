"use client"

import dynamic from "next/dynamic"

// The housekeeping pointer and Live edit's armed mode, as the inspector already is (inspector-lazy.tsx): both are
// inert until the panel's Dev tools rows switch them on, so the root layout loads them after the page instead
// of shipping them in its own chunk (2026-11-04).
const Tool = dynamic(() => import("@/components/housekeeping/tool").then((m) => m.HousekeepingTool), { ssr: false })
const LiveEdit = dynamic(() => import("@/components/housekeeping/live-edit").then((m) => m.LiveEditMode), { ssr: false })

export function HousekeepingTool() {
  return <Tool />
}

export function LiveEditMode() {
  return <LiveEdit />
}
