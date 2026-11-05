"use client"

import { useEffect, useState } from "react"

// The inspector's one switch (Brendan, 2026-11-05): X-ray and the inspector were the same tool behind three
// controls (X-ray's row, Settings' Inspector, Keep armed). Now the Dev tools row turns it on and off, on is
// armed, and the dock shows only while it is on. The inspector (inspector.tsx) owns the state and announces
// every change; this module remembers the last one so a row mounted later starts in the right position.

export const INSPECTOR_SET = "inspector:set"
export const INSPECTOR_CHANGED = "inspector:changed"

let on = false

export const inspectorOn = () => on

/** The inspector reports each change here. */
export function announceInspector(v: boolean) {
  on = v
  window.dispatchEvent(new CustomEvent(INSPECTOR_CHANGED, { detail: { on: v } }))
}

export const setInspector = (v: boolean) => window.dispatchEvent(new CustomEvent(INSPECTOR_SET, { detail: { on: v } }))

/** The inspector on or off, and the handle that flips it. */
export function useInspector(): [boolean, () => void] {
  const [state, setState] = useState(on)
  useEffect(() => {
    const hear = (e: Event) => setState(!!(e as CustomEvent<{ on?: boolean }>).detail?.on)
    setState(on)
    window.addEventListener(INSPECTOR_CHANGED, hear)
    return () => window.removeEventListener(INSPECTOR_CHANGED, hear)
  }, [])
  return [state, () => setInspector(!on)]
}
