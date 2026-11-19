"use client"

import * as React from "react"
import dynamic from "next/dynamic"

// ⌘K from anywhere opens the palette (command-k.tsx); so does anything that dispatches "nysgpt:cmdk"
// (an empty Blocks slot sends its slot number, so the box picked goes into that slot). The palette's
// code loads the first time it opens, not with every page. From pax-trinity (2026-11-19, brief 47).
const CommandK = dynamic(() => import("./command-k").then((m) => m.CommandK), { ssr: false })

export const openCommandK = () => window.dispatchEvent(new Event("nysgpt:cmdk"))

export function CommandKHost() {
  const [open, setOpen] = React.useState(false)
  const [slot, setSlot] = React.useState<number | undefined>(undefined)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !open) {
        e.preventDefault()
        setSlot(undefined)
        setOpen(true)
      }
    }
    const onAsk = (e: Event) => {
      const s = (e as CustomEvent<{ slot?: number } | null>).detail?.slot
      setSlot(typeof s === "number" ? s : undefined)
      setOpen(true)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("nysgpt:cmdk", onAsk)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("nysgpt:cmdk", onAsk)
    }
  }, [open])
  return open ? <CommandK slot={slot} onClose={() => setOpen(false)} /> : null
}
