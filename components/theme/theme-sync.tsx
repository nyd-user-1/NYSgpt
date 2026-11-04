"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import { THEME_EVENT, THEME_KEY, themeOf } from "@/lib/theme"
import { isDarkTheme, useThemeFollow } from "@/lib/theme-client"

// NYSgpt's glue for trinity's theme engine (2026-11-04). NYSgpt's own light/dark runs on next-themes, which
// owns the `dark` class on <html>; the engine (lib/theme-client.ts, copied from trinity) toggles that class
// too. This keeps the two agreeing:
//  - a theme picked in the Theme view tells next-themes whether it is light or dark;
//  - NYSgpt's own toggle, flipped against the picked theme, takes the picked theme off, so NYSgpt's palette stands;
//  - any change to <html>'s class fires the engine's theme event, so its listeners (the chat orb) follow next-themes too;
//  - useThemeFollow (trinity's shell runs it) repaints a second panel's frame when the theme changes.
export function ThemeSync() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const current = React.useRef(theme)
  current.current = theme
  useThemeFollow()

  React.useEffect(() => {
    const root = document.documentElement
    const onPick = () => {
      if (!root.hasAttribute("data-theme")) return
      const want = isDarkTheme() ? "dark" : "light"
      if (current.current !== want) setTheme(want)
    }
    window.addEventListener(THEME_EVENT, onPick)
    const o = new MutationObserver(() => window.dispatchEvent(new Event(THEME_EVENT)))
    o.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => {
      window.removeEventListener(THEME_EVENT, onPick)
      o.disconnect()
    }
  }, [setTheme])

  React.useEffect(() => {
    const root = document.documentElement
    const name = root.getAttribute("data-theme")
    if (!name || !resolvedTheme) return
    if (themeOf(name).dark === (resolvedTheme === "dark")) return
    root.removeAttribute("data-theme")
    for (const k of Array.from(root.style)) if (k.startsWith("--t-")) root.style.removeProperty(k)
    try {
      localStorage.removeItem(THEME_KEY)
    } catch {}
    window.dispatchEvent(new Event(THEME_EVENT))
  }, [resolvedTheme])

  return null
}
