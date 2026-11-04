"use client"

import dynamic from "next/dynamic"

// The layout renders the inspector for admins alone, but a static import shipped its code to every reader in the
// layout's chunk. Through here it loads only where it renders.
const Inspector = dynamic(() => import("./inspector").then((m) => m.DevInspector), { ssr: false })

export function DevInspector() {
  return <Inspector />
}
