"use client"

import * as React from "react"

// The volunteer's draft, carried between the record steps in this browser tab only.
export type Draft = {
  mode?: "personal" | "library" | "own" | "upload"
  scriptId?: string
  title?: string
  text?: string
  name?: string
  lastName?: string
  role?: string
  town?: string
  wpm?: number
  /** Re-recording an original video: the one this take replaces. */
  again?: string
  /** When it should go out, ISO. */
  publishAt?: string
}

const KEY = "pax2-record-draft"

export function useDraft() {
  const [draft, setDraft] = React.useState<Draft>({})
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    try {
      setDraft(JSON.parse(sessionStorage.getItem(KEY) ?? "{}"))
    } catch {}
    setReady(true)
  }, [])
  const update = React.useCallback((patch: Partial<Draft>) => {
    // Merged onto what's stored, not this hook's copy: several steps hold their own useDraft, and a
    // stale copy would otherwise write back over another step's fields.
    setDraft((d) => {
      let stored: Draft = d
      try {
        stored = JSON.parse(sessionStorage.getItem(KEY) ?? "null") ?? d
      } catch {}
      const next = { ...stored, ...patch }
      sessionStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])
  return { draft, update, ready }
}

export const words = (t: string) => t.split(/\s+/).filter(Boolean).length
export const secondsAt = (t: string, wpm = 130) => Math.round((words(t) / wpm) * 60)

