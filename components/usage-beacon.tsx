"use client"

import * as React from "react"

import { logUsage } from "@/app/usage-actions"
import type { UsageKind } from "@/lib/usage"

// The reader's side of the usage log: an anonymous id kept in this browser, and a log call that
// never blocks or throws. Call `log` from an event, never on render.

const KEY = "pax2-reader"
export const readerId = () => {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = `r-${Math.random().toString(36).slice(2, 12)}`
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return undefined
  }
}

export function useUsage() {
  return React.useCallback((kind: UsageKind, subject: string, meta?: Record<string, unknown>) => {
    logUsage(kind, subject, meta, readerId()).catch(() => {})
  }, [])
}

/** Logs one open of a video when its drawer or page mounts. */
export function UsageOpen({ subject }: { subject: string }) {
  const log = useUsage()
  React.useEffect(() => {
    log("open", subject)
  }, [log, subject])
  return null
}
