"use client"
// The atom over the page while it loads (Brendan, 2026-11-19): drawn with the page's first paint, held for a moment
// after the page is ready, then faded out and removed. On the root page for now.
import { useEffect, useState } from "react"
import { AtomSpinner } from "@/components/AtomSpinner"

const HOLD_MS = 1500
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
      <AtomSpinner size={40} label="Loading page" />
    </div>
  )
}
