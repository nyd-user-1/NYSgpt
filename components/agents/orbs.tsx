'use client'

// The orb family (Brendan, 2026-11-03). The pax orb is the WebGL strands sphere (agent-orb.tsx); the
// blue orb is 44B's CSS sphere brought over hex for hex, with red, purple, green, yellow and orange
// siblings cut from the same cloth (orbs.css). CHAT_ORB names the orb the chat wears — one word swaps it.
//
// The chat wears it the 44B way (Brendan, 2026-11-03: the 44B pattern, exactly): while inference runs
// and no first word has landed, ThinkingOrb cycles its moves — spin, oscillate, bounce, pulse, stretch
// wide, stretch tall, vibrate, and the four color wipes — one at a time, around and around. From the
// first word on, RestOrb stands BELOW the answer, pushed down as the output grows, moving while it
// streams, and coming to rest there when it settles. Nothing stands beside or above the answer.
//
// LIVELY turns the strands up so the color visibly swirls even at a mark's size: the chat's orb is
// never a pale still sphere.

import { useEffect, useState } from 'react'

import { AgentOrb } from '@/components/agents/agent-orb'
import './orbs.css'

export type OrbKind = 'pax' | 'blue' | 'red' | 'purple' | 'green' | 'yellow' | 'orange'
export const ORB_KINDS: readonly OrbKind[] = ['pax', 'blue', 'red', 'purple', 'green', 'yellow', 'orange']

/** The orb the chat wears. 'pax' is the strands sphere; any other name is its CSS kin. */
export const CHAT_ORB: OrbKind = 'pax'

/** The strands turned up for the chat's small marks: thicker, brighter, faster, so the color's
 *  movement reads at a mark's size — at the shader's defaults a mark this small looks still and pale.
 *  Saturation and intensity carry the color; red and blue rise together, so their balance holds. */
const LIVELY = { energy: 0.8, speed: 1.35, saturation: 1.65, intensity: 1.55, thickness: 2.1, glow: 1.6, spread: 1.35, waviness: 1.2, drift: 0.45, leanStrength: 3 }

/** A CSS orb — the 44B pattern: a struck sphere in four stops, breathing while it thinks. */
export function CssOrb({ kind = 'blue', size = 26, thinking = false, className = '' }: { kind?: Exclude<OrbKind, 'pax'>; size?: number; thinking?: boolean; className?: string }) {
  return <span aria-hidden className={`orb-css orb-${kind} ${thinking ? 'orb-breathe' : ''} ${className}`.trim()} style={{ width: size, height: size }} />
}

/** Any orb by name: the pax strands (turned up to LIVELY), or a CSS sibling. */
export function Orb({ kind = CHAT_ORB, size = 26, thinking = false, className = '' }: { kind?: OrbKind; size?: number; thinking?: boolean; className?: string }) {
  if (kind === 'pax') return <AgentOrb agent="assistant" size={size} speaking={thinking} tune={LIVELY} className={`block ${className}`.trim()} />
  return <CssOrb kind={kind} size={size} thinking={thinking} className={className} />
}

const MOVES = ['pulse', 'wipe-up', 'spin', 'stretch-x', 'bounce', 'wipe-left', 'osc', 'stretch-y', 'wipe-down', 'vibrate', 'wipe-right'] as const

/** The thinking orb: inference is running, no first word yet. One move at a time, cycling. */
export function ThinkingOrb({ size = 32, className = '' }: { size?: number; className?: string }) {
  const [move, setMove] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setMove((n) => (n + 1) % MOVES.length), 1400)
    return () => clearInterval(id)
  }, [])
  return (
    <span className={`inline-flex items-center ${className}`.trim()}>
      <span className={`orb-stage orb-move-${MOVES[move]}`}>
        <Orb size={size} thinking />
      </span>
      <span className="orb-dots" aria-hidden>
        <i /><i /><i />
      </span>
    </span>
  )
}

/** The orb below the newest answer, the 44B way: pushed down as the output grows, moving while the
 *  answer streams, at rest there once it settles. The hover moves are off for now (Brendan, 2026-11-03,
 *  while the pointer-chase is judged); the float shadow and the lean after the pointer stay. Settled,
 *  a click asks for what's next (`onClick`), and `busy` moves the orb while the follow-ups are fetched. */
export function RestOrb({ thinking, busy = false, onClick }: { thinking: boolean; busy?: boolean; onClick?: () => void }) {
  return (
    <span className="mt-4 block">
      <span className={`orb-perch ${thinking ? '' : 'orb-set'}`.trim()} onClick={thinking ? undefined : onClick} role={onClick && !thinking ? 'button' : undefined} aria-label={onClick && !thinking ? "What's next" : undefined}>
        <span className={`orb-stage ${onClick && !thinking ? 'cursor-pointer' : ''}`.trim()}>
          <Orb size={32} thinking={thinking || busy} />
        </span>
      </span>
    </span>
  )
}
