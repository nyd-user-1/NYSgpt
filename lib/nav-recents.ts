"use client"

import * as React from "react"

// The pages lately visited, newest first, kept in this browser (Brendan, 2026-10-31): the header's Go to menu
// leads with them. The shell records each page it arrives on, its query included.

const KEY = "pax2-nav-recents"
const EVENT = "pax2-nav-recents"
const KEEP = 12
/** Pages that are a way in, not a place to go back to. */
const SKIP = /^\/(signin|signup)(\/|$)/

const read = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]
  } catch {
    return []
  }
}

export function recordVisit(href: string) {
  if (SKIP.test(href)) return
  const next = [href, ...read().filter((h) => h !== href)].slice(0, KEEP)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
  window.dispatchEvent(new Event(EVENT))
}

/** Forget the pages lately visited (Nav's menu). */
export function clearRecents() {
  try {
    localStorage.removeItem(KEY)
  } catch {}
  window.dispatchEvent(new Event(EVENT))
}

export function useNavRecents(): string[] {
  const [recents, setRecents] = React.useState<string[]>([])
  React.useEffect(() => {
    const on = () => setRecents(read())
    on()
    window.addEventListener(EVENT, on)
    window.addEventListener("storage", on)
    return () => {
      window.removeEventListener(EVENT, on)
      window.removeEventListener("storage", on)
    }
  }, [])
  return recents
}
