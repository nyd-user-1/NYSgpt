"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import { useThemeVersion } from "@/lib/theme-client"
import { cn } from "@/lib/utils"
import "./agent-orb.css"

// The three agents' embodiment (Brendan, via the lead, 2026-11-03): a living orb where a profile picture would
// stand. AgentOrb is the live one, a WebGL canvas (strands.tsx), loaded on the client alone so it stays off
// first paint, and worn only where the agent is present, one to a surface: a browser keeps few WebGL contexts.
// AgentOrbTwin is its still twin, the same palette in CSS gradients, for every place an agent shows many
// times or small: chips, menu rows, the template list.

const Strands = dynamic(() => import("./strands"), { ssr: false })

export type AgentSlug = "assistant" | "tracker" | "bill-reader"

/** Each agent's seven colours, in the shader's roles: red, orange, amber, warm white, cyan, blue, deep. Pax in
 *  the house mark's red and blue, the Pollster in cool blues into cyan, the Analyst in warm amber into deep blue.
 *  The house's own where it has them (pax2.css: red, red-deep, red-soft, light-blue, blue), Tailwind's beside. */
export const AGENT_PALETTES: Record<AgentSlug, string[]> = {
  // The fourth role was a warm white (#fee2e2) that read as an extra white in the glass; a light blue
  // there makes the cool sheet's core blue too, so the blue that chases the pointer stands out (Brendan, 2026-11-03).
  assistant: ["#dc2626", "#991b1b", "#f87171", "#bfdbfe", "#93c5fd", "#2563eb", "#1e3a8a"],
  tracker: ["#1d4ed8", "#1e40af", "#38bdf8", "#cffafe", "#67e8f9", "#2563eb", "#1e3a8a"],
  "bill-reader": ["#d97706", "#b45309", "#fbbf24", "#fef3c7", "#93c5fd", "#2563eb", "#1e3a8a"],
}

export const isAgentSlug = (slug: string): slug is AgentSlug => Object.prototype.hasOwnProperty.call(AGENT_PALETTES, slug)

/** The orb as a share of its box: the shader's glass is 0.42 of the shorter side; 1.16 times that fills it, a hair inside. */
const GLASS = 1.16

/** At rest the strands drift; speaking, they move with a voice. */
const IDLE = 0.35

/** Below this many pixels the strands are drawn thicker, wider and brighter: at a chip's size the shader's own
 *  thin to a hairline. */
const SMALL = 32
const SMALL_STRANDS = { thickness: 2.4, glow: 1.5, spread: 1.4 }

/** Light unless the app's theme is dark, following the theme as it changes. */
function useLightTheme() {
  const version = useThemeVersion()
  const [light, setLight] = React.useState(true)
  React.useEffect(() => setLight(!document.documentElement.classList.contains("dark")), [version])
  return light
}

/** The live orb. `size` in pixels, or leave it out and size it with a class. `speaking` moves it with a voice:
 *  a thread running, an answer streaming. Without WebGL2 it is its still twin. */
export function AgentOrb({ agent, size, speaking = false, className, tune }: { agent: AgentSlug; size?: number; speaking?: boolean; className?: string; tune?: Record<string, number> }) {
  const light = useLightTheme()
  const ref = React.useRef<HTMLSpanElement>(null)
  const [webgl, setWebgl] = React.useState<boolean | null>(null)
  const [px, setPx] = React.useState(size ?? 0)
  React.useEffect(() => {
    setWebgl(typeof WebGL2RenderingContext !== "undefined")
    setPx(size ?? ref.current?.clientWidth ?? 0)
  }, [size])
  const box = size ? { width: size, height: size } : undefined
  if (webgl === false) return <AgentOrbTwin agent={agent} className={className} style={box} />
  return (
    <span ref={ref} aria-hidden data-agent-orb={agent} className={cn("relative inline-block shrink-0 rounded-full", className)} style={box}>
      {webgl && <Strands colors={AGENT_PALETTES[agent]} energy={IDLE} listening={speaking} lightMode={light} glassSize={GLASS} {...(px > 0 && px < SMALL ? SMALL_STRANDS : {})} {...tune} />}
    </span>
  )
}

/** The orb's still twin: the same palette, drawn by CSS, no canvas. Sized by its class or `style`. */
export function AgentOrbTwin({ agent, className, style }: { agent: AgentSlug; className?: string; style?: React.CSSProperties }) {
  const [red, orange, amber, white, cyan, blue, deep] = AGENT_PALETTES[agent]
  const vars = { "--orb-red": red, "--orb-orange": orange, "--orb-amber": amber, "--orb-white": white, "--orb-cyan": cyan, "--orb-blue": blue, "--orb-deep": deep } as React.CSSProperties
  return <span aria-hidden data-agent-twin={agent} className={cn("agent-twin", className)} style={{ ...vars, ...style }} />
}
