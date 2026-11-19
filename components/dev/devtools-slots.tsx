import dynamic from "next/dynamic"
import type { ComponentType } from "react"

// The dev tools' places in the site's own components (2026-11-19): the switchboard's Dev Tools entry renders
// DevToolsEntry (the menu) and DevToolsSubView (Dev Comments, Settings). On the dev server each loads in its own
// chunk; a production build inlines NODE_ENV as "production", every one of these is null there, the bundler
// drops the imports, and the entry keeps its placeholder.

export type DevToolsSub = "housekeeping" | "devsettings"

/** The switchboard entry the tools live under (lib/home-data.ts). */
export const DEV_TOOLS = "Dev Tools"

// The test is written out in each condition, not kept in a variable: the bundler drops an import only when the
// condition around it is a literal comparison it can settle while reading the file.

export const DevToolsEntry: ComponentType<{ q: string; onSub: (sub: DevToolsSub) => void }> | null =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("./devtools-entry").then((m) => m.DevToolsEntry), { ssr: false })
    : null

export const DevToolsSubView: ComponentType<{ sub: DevToolsSub }> | null =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("./devtools-entry").then((m) => m.DevToolsSubView), { ssr: false })
    : null

/** The panel header's title for each view the menu opens. */
export const DEV_TOOLS_TITLE: Record<DevToolsSub, string> | null = process.env.NODE_ENV === "development" ? { housekeeping: "Dev Comments", devsettings: "Settings" } : null
