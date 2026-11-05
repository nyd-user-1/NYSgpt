// The decay simulation's data (/viz/decay, 2026-11-04): public/viz-data/decay.json, written by
// scripts/viz-decay-snapshot.mjs from the ENSDF Adopted Levels ground states. Kept apart from lib/viz-data.ts
// so the prototype stands alone. The types, the colours, the names and the half-life text are lib/nuclide.ts's,
// shared with the physics charts, and re-exported here.

import { keyOf, type DecayData } from '@/lib/nuclide'

export { FAMILIES, FAMILY, familyOf, familyOfMode, formatSeconds, halfLifeText, keyOf, nucName } from '@/lib/nuclide'
export type { DecayData, DecayMode, DecayNuclide, Family } from '@/lib/nuclide'

let cached: Promise<DecayData> | null = null
export function loadDecay(): Promise<DecayData> {
  if (!cached) {
    const p = fetch('/viz-data/decay.json').then((r) => {
      if (!r.ok) throw new Error(`/viz-data/decay.json: ${r.status}`)
      return r.json() as Promise<DecayData>
    })
    p.catch(() => {
      cached = null
    })
    cached = p
  }
  return cached
}

export type ChainStep = { index: number; mode?: string; pct?: number | null }
export type ChainEnd = 'stable' | 'fission' | 'no mode' | 'not in the data' | 'loop'

/** The chain a nuclide's largest branch at each step leads down, to a stable nuclide or the end of the data. */
export function primaryChain(data: DecayData, index: Map<number, number>, start: number): { steps: ChainStep[]; end: ChainEnd } {
  const steps: ChainStep[] = []
  const seen = new Set<number>()
  let cur = start
  for (let guard = 0; guard < 60; guard++) {
    const nuc = data.nuclides[cur]
    seen.add(cur)
    if (nuc.t === null) {
      steps.push({ index: cur })
      return { steps, end: 'stable' }
    }
    const top = nuc.m[0]
    if (!top) {
      steps.push({ index: cur })
      return { steps, end: 'no mode' }
    }
    steps.push({ index: cur, mode: top[0], pct: top[1] })
    const mode = data.modes[top[0]]
    if (!mode || mode.dz === null || mode.dn === null) return { steps, end: 'fission' }
    const next = index.get(keyOf(nuc.z + mode.dz, nuc.n + mode.dn))
    if (next === undefined) return { steps, end: 'not in the data' }
    if (seen.has(next)) return { steps, end: 'loop' }
    cur = next
  }
  return { steps, end: 'loop' }
}
