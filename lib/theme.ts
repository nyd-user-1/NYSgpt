// The app's themes (Brendan, 2026-10-30): six, each sixteen base colours, one of them central and the
// rest stepping up or down from it. Every colour in the app reads these (src/app/pax2.css maps them onto
// PAX's tokens, shadcn's, Tailwind's slate and gray, Home's paper and the design system's surface), so a
// theme is these values and nothing else. The seventeenth, lift, is a selected or hovered row on the
// sidebar and the rails: a step up from the sidebar where there is one (white on PAX Light's mist, the
// raised step on a dark), a step down on Light, whose sidebar is already white.
//
//   PAX Light  the default: the mist is the main colour, on both; cards lift to white on it.
//   PAX Dark   PAX's navy: the dark navy of the first dark conversion (#121a2b).
//   Light      white is the main colour, on the main container and the sidebar alike.
//   Dark       the classic dark: one near-black grey on both, zinc's steps.
//   Vercel     Vercel's near-black and its blue.
//   VS Code    VS Code's Dark+ greys, with PAX Dark's blue: Dark+'s own #0e639c could not be read as type.
//
// The sidebar and the right panel are the main colour in every theme (Brendan, 2026-10-31): a sidebar in
// another colour turned everything in it drawn in the main colour (the search box, buttons, hovers) into
// patches.
//
// The theme is data-theme on <html> (and `dark` for the four darks); its sixteen values are set on <html>
// as --t-* variables, so the theme panel's edits are the same variables changed. THEME_SCRIPT does it in
// <head> before the first paint, from this browser's saved choice and edits. The panel is
// components/theme/theme-palette.tsx; its numbers (shadow strength, the animated grid's opacities) ride
// along as --t-* too.

export type ThemeName = "light" | "dark" | "pax-light" | "pax-dark" | "vercel" | "vscode"

export type TokenKey =
  | "frame" | "sidebar" | "surface" | "raised" | "tint" | "lift"
  | "rule" | "ruleStrong"
  | "ink" | "ink2" | "ink3" | "ink4"
  | "accent" | "accent2" | "wash"
  | "positive" | "negative"

export type NumberKey = "shadow" | "gridOpacity" | "gridFill" | "gridSpotlight"

export type Theme = {
  name: ThemeName
  label: string
  dark: boolean
  colors: Record<TokenKey, string>
  numbers: Record<NumberKey, number>
  /** The shadow's colour, as r g b. */
  shadowRgb: string
}

const SLATE_INK = { ink: "#0f172a", ink2: "#475569", ink3: "#64748b", ink4: "#94a3b8" }
const PAX_ACCENT = { accent: "#1e3a8a", accent2: "#2563eb", wash: "#dbeafe" }
const LIGHT_SIGNALS = { positive: "#16a34a", negative: "#dc2626" }
const DARK_SIGNALS = { positive: "#4ade80", negative: "#f87171" }

export const THEMES: Theme[] = [
  {
    name: "pax-light",
    label: "PAX Light",
    dark: false,
    colors: {
      frame: "#e3e9f1", sidebar: "#f5f7fb", surface: "#f5f7fb", raised: "#ffffff", tint: "#eef2f8", lift: "#ffffff",
      rule: "#dce3ec", ruleStrong: "#c3cddb",
      ...SLATE_INK, ...PAX_ACCENT, ...LIGHT_SIGNALS,
    },
    numbers: { shadow: 1.2, gridOpacity: 0.18, gridFill: 0.08, gridSpotlight: 0.8 },
    shadowRgb: "15 23 42",
  },
  {
    name: "pax-dark",
    label: "PAX Dark",
    dark: true,
    colors: {
      frame: "#1d2638", sidebar: "#121a2b", surface: "#121a2b", raised: "#1c2638", tint: "#172033", lift: "#1c2638",
      rule: "#2a3548", ruleStrong: "#3a465a",
      ink: "#eef2f7", ink2: "#b0bbcb", ink3: "#94a1b5", ink4: "#7d8aa0",
      accent: "#3b82f6", accent2: "#60a5fa", wash: "#182c50",
      ...DARK_SIGNALS,
    },
    numbers: { shadow: 6, gridOpacity: 0.14, gridFill: 0.06, gridSpotlight: 0.6 },
    shadowRgb: "0 0 0",
  },
  {
    name: "light",
    label: "Light",
    dark: false,
    colors: {
      frame: "#eef1f5", sidebar: "#ffffff", surface: "#ffffff", raised: "#ffffff", tint: "#f4f6f9", lift: "#eef2f7",
      rule: "#e2e8f0", ruleStrong: "#cbd5e1",
      ...SLATE_INK, ...PAX_ACCENT, ...LIGHT_SIGNALS,
    },
    numbers: { shadow: 1, gridOpacity: 0.16, gridFill: 0.08, gridSpotlight: 0.8 },
    shadowRgb: "15 23 42",
  },
  {
    name: "dark",
    label: "Dark",
    dark: true,
    colors: {
      frame: "#09090b", sidebar: "#18181b", surface: "#18181b", raised: "#27272a", tint: "#222226", lift: "#27272a",
      rule: "#2e2e33", ruleStrong: "#3f3f46",
      ink: "#fafafa", ink2: "#d4d4d8", ink3: "#a1a1aa", ink4: "#71717a",
      accent: "#3b82f6", accent2: "#60a5fa", wash: "#172554",
      ...DARK_SIGNALS,
    },
    numbers: { shadow: 5, gridOpacity: 0.12, gridFill: 0.06, gridSpotlight: 0.6 },
    shadowRgb: "0 0 0",
  },
  {
    name: "vercel",
    label: "Vercel",
    dark: true,
    colors: {
      frame: "#000000", sidebar: "#0a0a0a", surface: "#0a0a0a", raised: "#1a1a1a", tint: "#111111", lift: "#1f1f1f",
      rule: "#262626", ruleStrong: "#3d3d3d",
      ink: "#ededed", ink2: "#a1a1a1", ink3: "#8f8f8f", ink4: "#6e6e6e",
      accent: "#0070f3", accent2: "#52a8ff", wash: "#0c1d33",
      positive: "#45a557", negative: "#ff6166",
    },
    numbers: { shadow: 6, gridOpacity: 0.12, gridFill: 0.06, gridSpotlight: 0.6 },
    shadowRgb: "0 0 0",
  },
  {
    name: "vscode",
    label: "VS Code",
    dark: true,
    colors: {
      frame: "#181818", sidebar: "#1e1e1e", surface: "#1e1e1e", raised: "#2d2d30", tint: "#252526", lift: "#37373d",
      rule: "#3c3c3c", ruleStrong: "#474747",
      ink: "#d4d4d4", ink2: "#bbbbbb", ink3: "#9d9d9d", ink4: "#858585",
      accent: "#3b82f6", accent2: "#3794ff", wash: "#1a2d4d",
      positive: "#89d185", negative: "#f48771",
    },
    numbers: { shadow: 5, gridOpacity: 0.12, gridFill: 0.06, gridSpotlight: 0.6 },
    shadowRgb: "0 0 0",
  },
]

export const DEFAULT_THEME: ThemeName = "pax-light"

/** The panel's controls, in its order, with the CSS variable each one sets. */
export const TOKENS: { key: TokenKey; label: string; group: "Surfaces" | "Type" | "Lines" | "Accent" | "Signals" }[] = [
  { key: "frame", label: "Page", group: "Surfaces" },
  { key: "sidebar", label: "Sidebar", group: "Surfaces" },
  { key: "surface", label: "Main", group: "Surfaces" },
  { key: "raised", label: "Raised", group: "Surfaces" },
  { key: "tint", label: "Tint", group: "Surfaces" },
  { key: "lift", label: "Selected", group: "Surfaces" },
  { key: "ink", label: "Ink", group: "Type" },
  { key: "ink2", label: "Secondary", group: "Type" },
  { key: "ink3", label: "Muted", group: "Type" },
  { key: "ink4", label: "Faint", group: "Type" },
  { key: "rule", label: "Rules", group: "Lines" },
  { key: "ruleStrong", label: "Strong rules", group: "Lines" },
  { key: "accent", label: "Brand", group: "Accent" },
  { key: "accent2", label: "Link", group: "Accent" },
  { key: "wash", label: "Wash", group: "Accent" },
  { key: "positive", label: "Positive", group: "Signals" },
  { key: "negative", label: "Negative", group: "Signals" },
]

/** The grid colours the panel can set apart from the brand and negative (the animated background). */
export type GridColorKey = "grid" | "pulse"

export const cssVar = (key: TokenKey | NumberKey | GridColorKey) => `--t-${key.replace(/[A-Z0-9]/g, (c) => `-${c.toLowerCase()}`)}`

export const THEME_KEY = "pax:theme"
/** One theme's edits from the panel: `${CUSTOM_KEY}:${name}`. */
export const CUSTOM_KEY = "pax:theme-custom"
/** The account menu's Theme switch: whether the palette shows. */
export const PANEL_KEY = "pax:theme-panel"
/** Fired on window whenever the theme or an edit changes; canvas-drawn things redraw on it. */
export const THEME_EVENT = "pax:theme"

export type Custom = Partial<Record<TokenKey | GridColorKey, string> & Record<NumberKey, number>>

export const themeOf = (name: string | null | undefined): Theme => THEMES.find((t) => t.name === name) ?? THEMES.find((t) => t.name === DEFAULT_THEME)!

/** Every --t-* variable for a theme with its edits. */
export function themeVars(theme: Theme, custom: Custom = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(theme.colors)) out[cssVar(k as TokenKey)] = (custom[k as TokenKey] as string | undefined) ?? v
  for (const [k, v] of Object.entries(theme.numbers)) out[cssVar(k as NumberKey)] = String((custom[k as NumberKey] as number | undefined) ?? v)
  out["--t-shadow-rgb"] = theme.shadowRgb
  out[cssVar("grid")] = (custom.grid as string | undefined) ?? out[cssVar("accent")]
  out[cssVar("pulse")] = (custom.pulse as string | undefined) ?? out[cssVar("negative")]
  return out
}

/**
 * Runs in <head> before the page paints: the saved theme (an old "pax" reads as PAX Light) and its edits,
 * as data-theme, the `dark` class and the --t-* variables on <html>.
 */
export const THEME_SCRIPT = `(function(){try{var T=${JSON.stringify(THEMES)};var n=localStorage.getItem("${THEME_KEY}");if(n==="pax")n="pax-light";var t=T.filter(function(x){return x.name===n})[0]||T.filter(function(x){return x.name==="${DEFAULT_THEME}"})[0];var c={};try{c=JSON.parse(localStorage.getItem("${CUSTOM_KEY}:"+t.name)||"{}")||{}}catch(e){}var v=function(k){return "--t-"+k.replace(/[A-Z0-9]/g,function(m){return "-"+m.toLowerCase()})};var r=document.documentElement,s=r.style;r.setAttribute("data-theme",t.name);if(t.dark)r.classList.add("dark");else r.classList.remove("dark");s.colorScheme=t.dark?"dark":"light";for(var k in t.colors)s.setProperty(v(k),c[k]||t.colors[k]);for(var k2 in t.numbers)s.setProperty(v(k2),String(c[k2]!=null?c[k2]:t.numbers[k2]));s.setProperty("--t-shadow-rgb",t.shadowRgb);s.setProperty("--t-grid",c.grid||c.accent||t.colors.accent);s.setProperty("--t-pulse",c.pulse||c.negative||t.colors.negative)}catch(e){}})()`
