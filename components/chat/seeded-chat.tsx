"use client"

import * as React from "react"

import { Chat } from "@/components/chat/chat"
import { SEED_PREFIX } from "@/lib/pane"

// A chat opened about something (the shell's askAbout, 2026-11-04 — a drawn note's Chat): the context the
// opener handed over waits under ?seed=<key> and rides every message as systemContext.
export function SeededChat({ seed, ...props }: { seed: string } & React.ComponentProps<typeof Chat>) {
  const context = React.useCallback(() => {
    try {
      const text = localStorage.getItem(SEED_PREFIX + seed)
      return text ? `THE USER OPENED THIS CHAT ABOUT THE FOLLOWING — answer with it in mind:\n${text}` : ""
    } catch {
      return ""
    }
  }, [seed])
  return <Chat {...props} context={context} />
}
