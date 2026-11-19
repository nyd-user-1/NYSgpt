'use client'

import { useSyncExternalStore } from 'react'
import type { Box, BoxKind } from './home-boxes'

/**
 * The home page's shared state (2026-11-19, brief 43), as the option 3 sketch
 * keeps it: the box set on show (null = the all view), the pinned boxes, the
 * favorites, the Blocks shelf and its order (all four kept in this browser),
 * and the catalog overlay. A module store rather than a React context because
 * the masthead, the plate and the switchboard (which lives in the root
 * layout) all read it.
 *
 * Ported from pax2 lib/home-blocks.ts (the shelf store) by way of the sketch.
 */

export type ShelfItem = {
  key: string
  title: string
  set: BoxKind
  group: string
  added: string
  /** Brief 52: what a payload block carries (lib/blocks.ts); a plain Block has neither. */
  type?: 'design' | 'table' | 'api' | 'page' | 'brief'
  payload?: unknown
}
export type Overlay = { open: boolean; set: BoxKind; product: string; from: DOMRect | null; /** a table to open on, by name, within product */ table?: string }

type State = {
  set: BoxKind | null
  pins: string[]
  favs: string[]
  shelf: ShelfItem[]
  order: string[]
  /** The slot each Blocks tile sits in, by box key. Slots are numbered left to right, top to bottom; gaps are allowed. */
  slots: Record<string, number>
  overlay: Overlay
}

const K = { pins: 'home-pinned', favs: 'home-favorites', shelf: 'home-shelf', order: 'home-shelf-order', slots: 'home-shelf-slots' } as const

function read<T>(k: string, d: T): T {
  try {
    const v = localStorage.getItem(k)
    return v ? (JSON.parse(v) as T) : d
  } catch {
    return d
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {}
}

const INITIAL: State = {
  set: null,
  pins: [],
  favs: [],
  shelf: [],
  order: [],
  slots: {},
  overlay: { open: false, set: 'data', product: 'Artificial Intelligence', from: null },
}
let state: State = INITIAL
let loaded = false
const subs = new Set<() => void>()

function emit() {
  subs.forEach(f => f())
}
function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  emit()
}
/** The stored lists load on the first subscription, in the browser only, so
 *  the server render and the first client render agree. */
function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  state = { ...state, pins: read(K.pins, []), favs: read(K.favs, []), shelf: read(K.shelf, []), order: read(K.order, []), slots: read(K.slots, {}) }
}

function subscribe(f: () => void) {
  subs.add(f)
  if (!loaded) {
    load()
    queueMicrotask(emit)
  }
  return () => {
    subs.delete(f)
  }
}

export function useHome(): State {
  return useSyncExternalStore(subscribe, () => state, () => INITIAL)
}
export const getHome = () => state

export const boxKey = (b: Pick<Box, 'kind' | 'title'>) => `${b.kind}:${b.title}`

/** Order: pinned first (in the order pinned), then A to Z. */
export function sortBoxes<T extends Pick<Box, 'kind' | 'title'>>(list: T[], pins: string[]): T[] {
  return [...list].sort((a, b) => {
    const pa = pins.indexOf(boxKey(a))
    const pb = pins.indexOf(boxKey(b))
    if (pa < 0 !== pb < 0) return pa < 0 ? 1 : -1
    if (pa >= 0) return pa - pb
    return a.title.localeCompare(b.title, 'en', { sensitivity: 'base' })
  })
}

export const home = {
  /** A masthead cell: its set, or back to the all view when it is already on. */
  toggleSet(s: BoxKind) {
    set({ set: state.set === s ? null : s })
  },
  showSet(s: BoxKind | null) {
    if (state.set !== s) set({ set: s })
  },
  pin(key: string) {
    const pins = [key, ...state.pins.filter(k => k !== key)]
    write(K.pins, pins)
    set({ pins })
  },
  unpin(key: string) {
    const pins = state.pins.filter(k => k !== key)
    write(K.pins, pins)
    set({ pins })
  },
  toggleFav(key: string) {
    const favs = state.favs.includes(key) ? state.favs.filter(k => k !== key) : [...state.favs, key]
    write(K.favs, favs)
    set({ favs })
  },
  toggleShelf(b: Box) {
    const key = boxKey(b)
    const on = state.shelf.some(s => s.key === key)
    const shelf = on
      ? state.shelf.filter(s => s.key !== key)
      : [{ key, title: b.title, set: b.kind, group: b.group, added: new Date().toISOString() }, ...state.shelf]
    const order = on ? state.order.filter(k => k !== key) : state.order
    write(K.shelf, shelf)
    write(K.order, order)
    set({ shelf, order })
    // Brief 52: a Tables box added to Blocks carries its table payload (lib/blocks.ts), filled in once it has loaded.
    if (!on && b.kind === 'tables')
      void import('./blocks').then(m => m.tablePayload(b)).then(payload => { if (state.shelf.some(s => s.key === key)) home.setPayload(key, payload) }).catch(() => {})
  },
  /** Brief 52: a block with a payload (lib/blocks.ts). One already on the shelf takes the new payload and keeps its place. */
  addBlock(b: Omit<ShelfItem, 'added'>) {
    const had = state.shelf.find(s => s.key === b.key)
    const shelf = had ? state.shelf.map(s => (s.key === b.key ? { ...s, ...b } : s)) : [{ ...b, added: new Date().toISOString() }, ...state.shelf]
    write(K.shelf, shelf)
    set({ shelf })
  },
  /** Brief 52: replace a block's payload (the brief block's edited fields, a table payload once loaded). */
  setPayload(key: string, payload: unknown) {
    const shelf = state.shelf.map(s => (s.key === key ? { ...s, payload } : s))
    write(K.shelf, shelf)
    set({ shelf })
  },
  removeShelf(key: string) {
    const shelf = state.shelf.filter(s => s.key !== key)
    const order = state.order.filter(k => k !== key)
    write(K.shelf, shelf)
    write(K.order, order)
    set({ shelf, order })
  },
  /** Put a tile in a slot and leave it there (Brendan, 2026-11-19: the reader arranges Blocks as they see fit, gaps
   *  included). A tile already in that slot changes places with it. */
  placeShelf(key: string, slot: number) {
    const at = shelfSlots(state)
    const from = at.get(key)
    if (from === slot) return
    const other = [...at.entries()].find(([k, v]) => v === slot && k !== key)?.[0]
    at.set(key, slot)
    if (other != null && from != null) at.set(other, from)
    const slots = Object.fromEntries(at)
    write(K.slots, slots)
    set({ slots })
  },
  /** Drop `from` onto `to` (or at the end when `to` is null). */
  moveShelf(from: string, to: string | null) {
    if (from === to) return
    const keys = shelfItems(state).map(s => s.key).filter(k => k !== from)
    const at = to == null ? keys.length : keys.indexOf(to)
    keys.splice(at < 0 ? keys.length : at, 0, from)
    write(K.order, keys)
    set({ order: keys })
  },
  openOverlay(o: Omit<Overlay, 'open'>) {
    set({ overlay: { ...o, open: true } })
  },
  closeOverlay() {
    set({ overlay: { ...state.overlay, open: false } })
  },
}

/** Each tile's slot. A tile keeps the slot it was given; a tile without one (newly added) takes the first free slot,
 *  in the shelf's shown order. */
export function shelfSlots(s: Pick<State, 'shelf' | 'order' | 'slots'>): Map<string, number> {
  const items = shelfItems(s)
  const out = new Map<string, number>()
  const used = new Set<number>()
  for (const it of items) {
    const v = s.slots[it.key]
    if (Number.isInteger(v) && v >= 0 && !used.has(v)) {
      out.set(it.key, v)
      used.add(v)
    }
  }
  let next = 0
  for (const it of items) {
    if (out.has(it.key)) continue
    while (used.has(next)) next++
    out.set(it.key, next)
    used.add(next)
  }
  return out
}

/** The shelf in its shown order: newly added tiles first, then the arranged ones. */
export function shelfItems(s: Pick<State, 'shelf' | 'order'>): ShelfItem[] {
  const by = new Map(s.shelf.map(x => [x.key, x]))
  const placed = s.order.filter(k => by.has(k))
  const fresh = s.shelf.filter(x => !placed.includes(x.key))
  return [...fresh, ...placed.map(k => by.get(k)!)]
}
