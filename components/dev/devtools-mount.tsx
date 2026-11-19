"use client"

import dynamic from "next/dynamic"

// The root layout's one line for the dev tools that sit over the page (components/dev/devtools-overlay.tsx).
// On the dev server it loads in its own chunk; a production build inlines NODE_ENV as "production", so the
// bundler drops the branch with the import in it and no chunk of the tools is built, served or fetched. The
// routes they call answer 404 there too (devOnly, lib/housekeeping-people.ts).
const Overlay =
  process.env.NODE_ENV === "development" ? dynamic(() => import("./devtools-overlay").then((m) => m.DevToolsOverlay), { ssr: false }) : () => null

export function DevToolsMount() {
  return <Overlay />
}
