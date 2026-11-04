"use client"

import * as React from "react"

import type { ChipOffer } from "@/lib/question-resolver"

// Trinity's shell-panel contract, carried over with the /chat port (2026-11-03) so the chat tree
// compiles unchanged. NYSgpt has no trinity shell: the context below is the inert default — the
// panel never opens, nobody is admin, openPane/openAside/askAbout do nothing. Wire these to
// SwitchboardPanel when the chat should drive NYSgpt's own right panel.

export type PanelSize = "third" | "half" | "full" | "custom"
/** `nonce` makes asking the same thing twice a second ask. */
export type DiscussSeed = { context: () => string; chipVideo?: string; ask?: ChipOffer | null; nonce: number }
/** `key` names the content's owner, so it can tell whether the panel still shows it. */
export type Aside = { key: string; title: string; body: React.ReactNode; back?: () => void; flush?: boolean }

type PanelState = {
  setOpen: (open: boolean) => void
  wide: boolean
  setWide: (wide: boolean) => void
  size: PanelSize
  nextSize: PanelSize
  cycleSize: () => void
  panelOpen: boolean
  sidebarOpen: boolean
  toggleSidebar: () => void
  discuss: boolean
  toggleDiscuss: () => void
  openAside: (aside: Aside | null) => void
  asideKey: string | null
  askAbout: (seed: Omit<DiscussSeed, "nonce">) => void
  discussSeed: DiscussSeed | null
  signedIn: boolean
  admin: boolean
  superAdmin: boolean
  openPane: (href: string) => void
}

const PanelCtx = React.createContext<PanelState>({
  setOpen: () => {},
  wide: false,
  setWide: () => {},
  size: "third",
  nextSize: "half",
  cycleSize: () => {},
  panelOpen: false,
  sidebarOpen: false,
  toggleSidebar: () => {},
  discuss: false,
  toggleDiscuss: () => {},
  openAside: () => {},
  asideKey: null,
  askAbout: () => {},
  discussSeed: null,
  signedIn: false,
  admin: false,
  superAdmin: false,
  openPane: () => {},
})

export const useShellPanel = () => React.useContext(PanelCtx)
