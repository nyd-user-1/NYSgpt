"use client"

import * as React from "react"

// The sidebar's favorites: pages starred from an item's three-dot menu, kept in this browser.

const KEY = "pax2-nav-favorites"
const EVENT = "pax2-nav-favorites"

const read = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]
  } catch {
    return []
  }
}

export function useNavFavorites() {
  const [favs, setFavs] = React.useState<string[]>([])
  React.useEffect(() => {
    const on = () => setFavs(read())
    on()
    window.addEventListener(EVENT, on)
    window.addEventListener("storage", on)
    return () => {
      window.removeEventListener(EVENT, on)
      window.removeEventListener("storage", on)
    }
  }, [])
  const toggle = React.useCallback((href: string) => {
    const now = read()
    const next = now.includes(href) ? now.filter((h) => h !== href) : [...now, href]
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {}
    window.dispatchEvent(new Event(EVENT))
  }, [])
  return { favs, toggle }
}
