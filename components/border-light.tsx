import type { CSSProperties } from "react"

// A light that travels a box's 1px border, after hq's turn-state pulse (hq app/ui/landing/primitives.tsx,
// SpinRing): a conic band turned by an animated angle (--pax2-spin, pax2.css), masked to a ring that sits
// on the border. The style is inline because Turbopack's dev CSS mangles the mask rules. The parent must
// be `relative` and rounded; the ring takes its radius. Freezes under reduced motion.

const RING: CSSProperties = {
  position: "absolute",
  inset: "-1px",
  borderRadius: "inherit",
  padding: "1.5px",
  background: "conic-gradient(from var(--pax2-spin), transparent 0deg, #60a5fa 30deg, #1d4ed8 66deg, transparent 106deg, transparent 360deg)",
  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
  WebkitMaskComposite: "xor",
  maskComposite: "exclude",
  animation: "pax2-spin 2.4s linear infinite",
}

export function BorderLight() {
  return (
    // The glow sits on a wrapper: a filter on the masked ring itself would be masked away.
    <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ filter: "drop-shadow(0 0 5px rgb(37 99 235 / 0.8))" }}>
      <span data-pax2-spin style={RING} />
    </span>
  )
}
