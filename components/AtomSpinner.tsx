"use client"
// The atom that stands in for "loading" (Brendan, 2026-11-11 14:15): lucide's atom icon, animated. Three electron dots
// ride the two orbit paths (SVG animateMotion along the icon's own path data, two on one orbit half a turn apart, one on
// the other) while the pair of orbits turns slowly (app/globals.css .atom-spin-orbits). The nucleus stays still. Inherits
// the header icons' two blues (components/AppLayout.tsx): orbits #dbe7fa, electrons and nucleus #033882; `size` in px. Use it in place of a "Reading…" line wherever a page waits on the lake.
import { useId } from "react"
import { cn } from "@/lib/utils"

const ORBIT_A = "M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"
const ORBIT_B = "M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"

export function AtomSpinner({ size = 32, className, label = "Loading" }: { size?: number; className?: string; label?: string }) {
  const id = useId()
  const a = `${id}-a`, b = `${id}-b`
  const electron = (path: string, dur: string, begin: string) => (
    <circle r="1.3" fill="#033882" stroke="none">
      <animateMotion dur={dur} begin={begin} repeatCount="indefinite" rotate="auto">
        <mpath href={`#${path}`} />
      </animateMotion>
    </circle>
  )
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#dbe7fa" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      role="img" aria-label={label} className={cn("shrink-0", className)}>
      <circle cx="12" cy="12" r="1.4" fill="#033882" stroke="#033882" />
      <g className="atom-spin-orbits">
        <path id={a} d={ORBIT_A} />
        <path id={b} d={ORBIT_B} />
        {electron(a, "2.4s", "0s")}
        {electron(a, "2.4s", "-1.2s")}
        {electron(b, "3.1s", "-0.7s")}
      </g>
    </svg>
  )
}
