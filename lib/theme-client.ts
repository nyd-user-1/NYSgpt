"use client"

import * as React from "react"
import { flushSync } from "react-dom"

import { CUSTOM_KEY, THEME_EVENT, THEME_KEY, themeOf, themeVars, type Custom, type Theme, type ThemeName } from "@/lib/theme"

// The theme in the browser (lib/theme.ts holds the values): putting one on <html>, reading its colours
// for things drawn on a canvas, and telling them to redraw when it changes.

export function savedThemeName(): ThemeName {
  try {
    const n = localStorage.getItem(THEME_KEY)
    return themeOf(n === "pax" ? "pax-light" : n).name
  } catch {
    return themeOf(null).name
  }
}

export function savedCustom(name: ThemeName): Custom {
  try {
    return (JSON.parse(localStorage.getItem(`${CUSTOM_KEY}:${name}`) ?? "{}") as Custom) ?? {}
  } catch {
    return {}
  }
}

/** Puts a theme and its edits on <html> and tells the page, without saving them. */
export function paintTheme(theme: Theme, custom: Custom) {
  const root = document.documentElement
  root.setAttribute("data-theme", theme.name)
  root.classList.toggle("dark", theme.dark)
  root.style.colorScheme = theme.dark ? "dark" : "light"
  for (const [k, v] of Object.entries(themeVars(theme, custom))) root.style.setProperty(k, v)
  window.dispatchEvent(new Event(THEME_EVENT))
}

/** Puts a theme and its edits on <html>, keeps them in this browser, and tells the page. */
export function applyTheme(theme: Theme, custom: Custom) {
  try {
    localStorage.setItem(THEME_KEY, theme.name)
    localStorage.setItem(`${CUSTOM_KEY}:${theme.name}`, JSON.stringify(custom))
  } catch {}
  paintTheme(theme, custom)
}

// A theme change the reader makes here is drawn in as a circle that spreads from the top-right corner over
// the old page (Brendan, 2026-11-01), ported from the light/dark toggle in ~/Code/sports (AppLayout's
// toggleTheme, 2026-05-18; 44b carries the same code): the View Transitions API snapshots the page as it
// was, the update paints the new theme, and the new view is uncovered by a growing circle clip. The update
// runs under flushSync, so whatever repaints from the theme event (useThemeVersion's charts, retheme) has
// committed before the new view is shown; the new view is live, so a canvas that draws on its next frame
// draws inside the circle while it is still small. Without view transitions, or when the reader asks for
// reduced motion, the change applies at once. html.theme-change scopes the pseudo-elements' rules
// (pax2.css) to this transition alone.

/** How a theme change made here is shown: "circle" where the browser can and the reader allows motion. */
export function themeMotion(): "circle" | "instant" {
  if (typeof document === "undefined" || typeof document.startViewTransition !== "function") return "instant"
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "circle"
}

export const THEME_CHANGE = { duration: 600, easing: "cubic-bezier(.76,.32,.29,.99)" } as const

// The transition running now: a quick second pick skips the first, whose end must not take the class off
// the second's.
let running: ViewTransition | null = null

/** Applies a theme the reader picked here, as applyTheme does, drawn in as the circle from the top-right.
 *  `alongside` runs inside the same update (the picker's own state), so it lands in the new view only. */
export function changeTheme(theme: Theme, custom: Custom, alongside?: () => void) {
  const apply = () => {
    alongside?.()
    applyTheme(theme, custom)
  }
  if (themeMotion() === "instant") return apply()
  const root = document.documentElement
  const x = window.innerWidth
  const y = 0
  // From the corner, the farthest point is the bottom-left: the circle's last radius reaches it.
  const radius = Math.hypot(window.innerWidth, window.innerHeight)
  root.classList.add("theme-change")
  const t = document.startViewTransition(() => flushSync(apply))
  running = t
  t.ready
    .then(() => root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, { ...THEME_CHANGE, pseudoElement: "::view-transition-new(root)" }))
    // A second pick before this one finishes skips it; the new theme is applied all the same.
    .catch(() => {})
  t.finished
    .finally(() => {
      if (running !== t) return
      running = null
      root.classList.remove("theme-change")
    })
    .catch(() => {})
}

/** Repaints this page when the theme saved in this browser changes elsewhere: another tab, or the page
 *  around the second panel's frame (lib/pane.ts). The storage event fires only in the other pages. It
 *  paints at once: only a change the reader makes in this page is drawn in as the circle. */
export function useThemeFollow() {
  React.useEffect(() => {
    const on = (e: StorageEvent) => {
      if (!e.key?.startsWith(THEME_KEY)) return
      const t = themeOf(savedThemeName())
      paintTheme(t, savedCustom(t.name))
    }
    window.addEventListener("storage", on)
    return () => window.removeEventListener("storage", on)
  }, [])
}

/** A --t-* value as it stands now (a hex), for a canvas that cannot read CSS variables. */
export function themeToken(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

export const isDarkTheme = () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")

/** A number that changes whenever the theme does: a dependency for anything drawn with its colours. */
export function useThemeVersion(): number {
  const [v, setV] = React.useState(0)
  React.useEffect(() => {
    const bump = () => setV((n) => n + 1)
    window.addEventListener(THEME_EVENT, bump)
    return () => window.removeEventListener(THEME_EVENT, bump)
  }, [])
  return v
}

// The charts were drawn in the light palette's literal colours. retheme() walks a chart's option and puts
// the current theme's colour in place of each one it knows, by the role it plays: ink, rules, grounds,
// brand. The blue ramp of a chart's series runs light end up on a dark theme so its darkest steps show.
const LIGHT_RAMP = ["#0f1b49", "#1a2b64", "#1e3a8a", "#1e45bd", "#2057e0", "#2e71f0", "#448cf7", "#60a5fa"]
const DARK_RAMP = ["#1e45bd", "#2057e0", "#2e71f0", "#448cf7", "#60a5fa", "#7db7fb", "#9ccafc", "#bfdcfd"]

function roleMap(): Record<string, string> {
  const t = (k: string, f: string) => themeToken(`--t-${k}`, f)
  const ink = t("ink", "#0f172a")
  const ink2 = t("ink-2", "#475569")
  const map: Record<string, string> = {
    "#0f172a": ink,
    "#1e293b": ink,
    "#16181d": ink,
    "#334155": ink2,
    "#475569": ink2,
    "#64748b": t("ink-3", "#64748b"),
    "#94a3b8": t("ink-4", "#94a3b8"),
    "#cbd5e1": t("rule-strong", "#cbd5e1"),
    "#e2e8f0": t("rule", "#e2e8f0"),
    "#f1f5f9": t("tint", "#f1f5f9"),
    "#f8fafc": t("tint", "#f8fafc"),
    "#f5f7fb": t("tint", "#f5f7fb"),
    "#fff": t("surface", "#ffffff"),
    "#ffffff": t("surface", "#ffffff"),
    "#1e3a8a": t("accent", "#1e3a8a"),
    "#2563eb": t("accent-2", "#2563eb"),
    "#dbeafe": t("wash", "#dbeafe"),
    "#dc2626": t("negative", "#dc2626"),
    "#16a34a": t("positive", "#16a34a"),
  }
  if (isDarkTheme()) LIGHT_RAMP.forEach((c, i) => (map[c] = DARK_RAMP[i]))
  return map
}

export function retheme<T>(option: T): T {
  if (typeof document === "undefined") return option
  const map = roleMap()
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return map[v.toLowerCase()] ?? v
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
      const out: Record<string, unknown> = {}
      for (const [k, x] of Object.entries(v)) out[k] = walk(x)
      return out
    }
    return v
  }
  return walk(option) as T
}
