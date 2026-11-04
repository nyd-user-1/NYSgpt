"use client"

import * as React from "react"

// Trinity's theme-version hook, reduced to what the orb needs (2026-11-03): a number that bumps
// whenever <html>'s class list changes, so AgentOrb re-reads light/dark. NYSgpt themes through
// next-themes, which flips the `dark` class on <html>; watching the attribute covers it.

export function useThemeVersion(): number {
  const [version, setVersion] = React.useState(0)
  React.useEffect(() => {
    const o = new MutationObserver(() => setVersion((n) => n + 1))
    o.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] })
    return () => o.disconnect()
  }, [])
  return version
}
