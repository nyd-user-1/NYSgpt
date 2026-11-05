import type { Levels } from '@/lib/viz-data'

// levels.json unpacked for drawing: per-nuclide offsets into one flat run of level energies, so the scene
// can lay every level out as one instanced mesh and find a nuclide's levels by index.

/** World units per keV: 10 MeV stands 50 units tall over a floor ~180 × 120 (one unit per nucleon). */
export const Y_PER_KEV = 50 / 10000

export type Model = {
  count: number
  total: number
  z: Int16Array
  n: Int16Array
  start: Int32Array
  size: Int32Array
  /** keV, every kept level, nuclide by nuclide, ascending within each. */
  energy: Float32Array
  /** The highest kept level per nuclide, keV. */
  top: Float32Array
  maxN: number
  maxZ: number
  nuclides: Levels['nuclides']
  byZN: Map<number, number>
}

const key = (z: number, n: number) => z * 1000 + n

export function toModel(d: Levels): Model {
  const list = d.nuclides
  const count = list.length
  let total = 0
  for (const x of list) total += x.L.length / 3
  const m: Model = {
    count,
    total,
    z: new Int16Array(count),
    n: new Int16Array(count),
    start: new Int32Array(count),
    size: new Int32Array(count),
    energy: new Float32Array(total),
    top: new Float32Array(count),
    maxN: 0,
    maxZ: 0,
    nuclides: list,
    byZN: new Map(),
  }
  let at = 0
  list.forEach((x, i) => {
    m.z[i] = x.z
    m.n[i] = x.n
    m.start[i] = at
    m.size[i] = x.L.length / 3
    for (let k = 0; k < x.L.length; k += 3) m.energy[at++] = Number(x.L[k])
    m.top[i] = m.energy[at - 1] ?? 0
    m.maxN = Math.max(m.maxN, x.n)
    m.maxZ = Math.max(m.maxZ, x.z)
    m.byZN.set(key(x.z, x.n), i)
  })
  return m
}

export const find = (m: Model, z: number, n: number) => m.byZN.get(key(z, n)) ?? -1

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
/** ²⁰⁸Pb. */
export const label = (m: Model, i: number) =>
  `${String(m.z[i] + m.n[i]).replace(/\d/g, (d) => SUP[Number(d)])}${m.nuclides[i].el}`

/** "208Pb", "Pb208", "pb-208" → a nuclide index, or -1. */
export function parseNuclide(m: Model, text: string): number {
  const t = text.trim()
  const front = t.match(/^(\d+)\s*-?\s*([a-z]{1,2})$/i)
  const back = t.match(/^([a-z]{1,2})\s*-?\s*(\d+)$/i)
  if (!front && !back) return -1
  const a = Number(front ? front[1] : back![2])
  const sym = (front ? front[2] : back![1]).toLowerCase()
  for (let i = 0; i < m.count; i++) if (m.z[i] + m.n[i] === a && m.nuclides[i].el.toLowerCase() === sym) return i
  return -1
}
