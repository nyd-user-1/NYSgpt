"use client"

import * as React from "react"

import "./devtools.css"
import { DevInspector } from "@/components/dev/inspector"
import { DEVTOOLS_OPEN, HOUSEKEEPING_OPEN, HousekeepingTool, takeDevTools, takeOpen } from "@/components/housekeeping/tool"
import { useSwitchboard } from "@/components/SwitchboardPanel"
import { DEV_TOOLS } from "./devtools-slots"

// The dev tools that sit over the page (2026-11-19): the inspector dock at the bottom right, the Point and Click
// crosshair at the bottom left (it shows while sonar or the dock's scope is on, with the open comments' marks
// on the page), and the opener: a comment just sent, or a mark pressed, opens the right panel on Dev Tools ›
// Dev Comments. The menu itself is the switchboard's Dev Tools entry (components/dev/devtools-entry.tsx).
// The root layout mounts this inside the switchboard's provider, on the dev server alone.

export function DevToolsOverlay() {
  const { cards, openProduct, setView } = useSwitchboard()
  const index = cards.findIndex((c) => c.title === DEV_TOOLS)

  React.useEffect(() => {
    if (index < 0) return
    const comments = () => {
      if (!takeOpen()) return
      openProduct(index)
      setView({ kind: "product", index, sub: "housekeeping" })
    }
    const menu = () => {
      if (takeDevTools()) openProduct(index)
    }
    comments()
    menu()
    window.addEventListener(HOUSEKEEPING_OPEN, comments)
    window.addEventListener(DEVTOOLS_OPEN, menu)
    return () => {
      window.removeEventListener(HOUSEKEEPING_OPEN, comments)
      window.removeEventListener(DEVTOOLS_OPEN, menu)
    }
  }, [index, openProduct, setView])

  return (
    <>
      <div data-chrome className="contents">
        <DevInspector />
      </div>
      <div data-sonar-exempt data-devinspector className="fixed bottom-4 left-4 z-[60] flex items-center gap-2">
        <HousekeepingTool />
      </div>
    </>
  )
}
