"use client"
// The wordmark drawn over the page while it loads (Brendan, 2026-11-19): the stroke-drawn wordmark of the other app's
// load curtain (its components/load-curtain.tsx and components/stroke-text.tsx, the latter copied as written), reading
// NYSgpt: black outlines drawn letter by letter, then the light blue fill wiped in from the left. Drawn with the page's
// first paint, held until the drawing has finished, then faded out and removed. On the root page.
import { useEffect, useState } from "react"
import StrokeText from "@/components/stroke-text"

const HOLD_MS = 2600
const FADE_MS = 400

export function PageLoader() {
  const [state, setState] = useState<"on" | "fading" | "off">("on")
  useEffect(() => {
    const a = setTimeout(() => setState("fading"), HOLD_MS)
    const b = setTimeout(() => setState("off"), HOLD_MS + FADE_MS)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])
  if (state === "off") return null
  return (
    <div
      data-inspect="PageLoader"
      aria-hidden={state === "fading"}
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--paper)", opacity: state === "fading" ? 0 : 1, transition: `opacity ${FADE_MS}ms ease`, pointerEvents: state === "fading" ? "none" : "auto" }}
    >
      <div className="flex h-[46vh] w-[80vw] items-center">
        <StrokeText
          text="NYSgpt"
          strokeColor="#000000"
          strokeWidth={1.6}
          fillMode="wipe"
          fillColor="#dbe7fa"
          fontSize={144}
          fontWeight={400}
          fontFamily="var(--font-display), Georgia, serif"
          letterSpacing={-4}
          drawDuration={0.9}
          stagger={0.08}
        />
      </div>
    </div>
  )
}
