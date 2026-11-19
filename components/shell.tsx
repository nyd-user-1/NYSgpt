"use client"

// NYSgpt stand-in for pax-trinity's src/components/shell.tsx (brief 46): the same exports the chat imports, without pax-trinity's
// services. What it would do there is said beside each export.

// The chat reads the shell's panel context; outside pax-trinity's Shell that context is its default value,
// every action a no-op, and that default is what comes across here, as written. The Shell component itself
// (sidebar, header, right panel) does not.

import * as React from "react"

import type { ChipOffer } from "@/lib/question-resolver"

type PanelState = {
  setOpen: (open: boolean) => void
  wide: boolean
  setWide: (wide: boolean) => void
  /** The right panel's three sizes: a third, half, or the whole content area; custom once the divider is dragged. */
  size: PanelSize
  /** Where the size button goes next. */
  nextSize: PanelSize
  cycleSize: () => void
  panelOpen: boolean
  sidebarOpen: boolean
  toggleSidebar: () => void
  discuss: boolean
  toggleDiscuss: () => void
  /** Opens content in the right panel (a chat script's Citations); null closes it. */
  openAside: (aside: Aside | null) => void
  /** Which content the right panel holds now, by its key. */
  asideKey: string | null
  /** Opens the discussion panel's chat about something on this page: its context, the video its chips
   *  come from, and a chip to ask at once. */
  askAbout: (seed: Omit<DiscussSeed, "nonce">) => void
  /** What this page last asked the discussion about. */
  discussSeed: DiscussSeed | null
  /** Someone is signed in: a template renders to an MP4 for them (Get MP4). */
  signedIn: boolean
  /** The signed-in user is an admin: the Studio and Housekeeping are theirs. */
  admin: boolean
  /** The super admin alone: the account menu's To Review. */
  superAdmin: boolean
  /** Opens a page in the second panel, beside the main one (lib/pane.ts). */
  openPane: (href: string) => void
}
/** `nonce` makes asking the same thing twice a second ask. */
export type DiscussSeed = { context: () => string; chipVideo?: string; ask?: ChipOffer | null; nonce: number }
/** `key` names the content's owner, so it can tell whether the panel still shows it. `back` puts the
 *  Discussion panel's back arrow before the title; `flush` lets rows run to the panel's edges. */
export type Aside = { key: string; title: string; body: React.ReactNode; back?: () => void; flush?: boolean }
export type PanelSize = "third" | "half" | "full" | "custom"
const PanelCtx = React.createContext<PanelState>({ setOpen: () => {}, wide: false, setWide: () => {}, size: "third", nextSize: "half", cycleSize: () => {}, panelOpen: false, sidebarOpen: false, toggleSidebar: () => {}, discuss: false, toggleDiscuss: () => {}, openAside: () => {}, asideKey: null, askAbout: () => {}, discussSeed: null, signedIn: false, admin: false, superAdmin: false, openPane: () => {} })
export const useShellPanel = () => React.useContext(PanelCtx)
