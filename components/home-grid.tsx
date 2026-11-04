"use client"

import * as React from "react"

import { THEME_EVENT } from "@/lib/theme"

// The home's background grid (Brendan, 2026-11-04): the 404's flickering squares (app/not-found.tsx — 4px squares
// on a 6px gap, #6B7280, flickering at 0.1, at most 0.5) given the motion of trinity's landing grid
// (src/components/landing-grid.tsx over cursor-grid.tsx): a spotlight that follows the pointer, cells lit where
// it passes that hold and fade, a fill behind a lit cell, an opening pulse in the grid's colour, a pulse in the
// pulse colour when the ledger's count lands and wherever the reader clicks, and the edges faded. The numbers
// are cursor-grid's own (radius 140, hold 400ms, fade 800ms, pulses at 600px/s with its 36/84px band).
//
// The Theme view's Background grid controls drive it, as they drive trinity's: --t-grid and --t-pulse are the
// colours, --t-grid-opacity the resting squares' ceiling, --t-grid-fill a lit cell's fill, --t-grid-spotlight the
// spotlight (lib/theme.ts), read again on every theme event. Before a theme is picked it wears the 404's look.

type Look = { grid: string; pulse: string; opacity: number; fill: number; spotlight: number }

function readLook(): Look {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(name).trim()
  const n = (name: string, f: number) => {
    const x = parseFloat(v(name))
    return Number.isFinite(x) ? x : f
  }
  return {
    grid: v("--t-grid") || "#6B7280",
    pulse: v("--t-pulse") || v("--pax2-red") || "#dc2626",
    opacity: n("--t-grid-opacity", 0.5),
    fill: n("--t-grid-fill", 0.08),
    spotlight: n("--t-grid-spotlight", 0.8),
  }
}

/** `pulseAt`: when the pulse-coloured pulse runs, in ms — the ledger's count landing (0.08s reveal + 1.4s count). */
export function HomeGrid({ pulseAt = 1500 }: { pulseAt?: number }) {
  const [look, setLook] = React.useState<Look | null>(null)
  const [pulse, setPulse] = React.useState(0)
  React.useEffect(() => {
    setLook(readLook())
    const t = window.setTimeout(() => setPulse(1), pulseAt)
    const changed = () => setLook(readLook())
    window.addEventListener(THEME_EVENT, changed)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener(THEME_EVENT, changed)
    }
  }, [pulseAt])
  if (!look) return null
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <PulseGrid color={look.grid} pulseColor={look.pulse} maxOpacity={look.opacity} fillOpacity={look.fill} spotlight={look.spotlight} pulseKey={pulse} />
    </div>
  )
}

// The 404's grid.
const SQUARE = 4
const GAP = 6
const STEP = SQUARE + GAP
const FLICKER = 0.1
// cursor-grid's motion, at its defaults (cellSize 60 sets the pulse band).
const RADIUS = 140
const HOLD_S = 0.4
const FADE_S = 0.8
const PULSE_SPEED = 600
const AHEAD = 60 * 0.6
const BEHIND = 60 * 1.4
const EDGE_FADE = 0.2

type Rgb = [number, number, number]
function toRgb(color: string): Rgb {
  const c = document.createElement("canvas")
  c.width = c.height = 1
  const ctx = c.getContext("2d")
  if (!ctx) return [107, 114, 128]
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data)
  return [r, g, b]
}
const smooth = (t: number) => t * t * (3 - 2 * t)
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function PulseGrid({ color, pulseColor, maxOpacity, fillOpacity, spotlight, pulseKey }: { color: string; pulseColor: string; maxOpacity: number; fillOpacity: number; spotlight: number; pulseKey: number }) {
  const ref = React.useRef<HTMLCanvasElement>(null)
  const settings = React.useRef({ color, pulseColor, maxOpacity, fillOpacity, spotlight })
  const pulseRef = React.useRef<(() => void) | null>(null)

  React.useEffect(() => {
    settings.current = { color, pulseColor, maxOpacity: clamp(maxOpacity, 0, 1), fillOpacity: clamp(fillOpacity, 0, 1), spotlight: clamp(spotlight, 0, 1) }
  }, [color, pulseColor, maxOpacity, fillOpacity, spotlight])

  React.useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const box = canvas.parentElement!
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

    const view = { w: 1, h: 1 }
    let cols = 0
    let rows = 0
    let flicker = new Float32Array(0) // each square's flicker, 0..1, scaled by maxOpacity when drawn
    let levels = new Float32Array(0)
    let targets = new Float32Array(0)
    let touched = new Float32Array(0)
    let waves = new Float32Array(0) // tinted pulses
    let calm = new Float32Array(0) // pulses in the grid's own colour
    let fadeX = new Float32Array(0)
    let fadeY = new Float32Array(0)
    const pulses: { x: number; y: number; t0: number; strength: number; tint: boolean }[] = []
    const pointer = { x: 0, y: 0, inside: false }
    const mouse = { x: 0, y: 0 }
    let presence = 0
    let clock = 0
    let last = 0
    let raf = 0
    let visible = true
    let rgb: Rgb = [107, 114, 128]
    let pulseRgb: Rgb = [220, 38, 38]
    let colorKey = ""

    const rebuild = () => {
      view.w = Math.max(1, box.clientWidth)
      view.h = Math.max(1, box.clientHeight)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(view.w * dpr)
      canvas.height = Math.round(view.h * dpr)
      canvas.style.width = `${view.w}px`
      canvas.style.height = `${view.h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const c = Math.floor(view.w / STEP)
      const r = Math.floor(view.h / STEP)
      if (c !== cols || r !== rows) {
        cols = c
        rows = r
        const n = cols * rows
        flicker = new Float32Array(n).map(() => Math.random())
        levels = new Float32Array(n)
        targets = new Float32Array(n)
        touched = new Float32Array(n).fill(-1e9)
        waves = new Float32Array(n)
        calm = new Float32Array(n)
      }
      const edge = (p: number) => smoother(clamp(p / EDGE_FADE, 0, 1)) * smoother(clamp((1 - p) / EDGE_FADE, 0, 1))
      fadeX = new Float32Array(cols).map((_, i) => edge((i * STEP + SQUARE / 2) / view.w))
      fadeY = new Float32Array(rows).map((_, j) => edge((j * STEP + SQUARE / 2) / view.h))
    }

    const light = (i: number, v: number) => {
      if (v > targets[i]) targets[i] = v
      touched[i] = clock
    }
    const energize = (x: number, y: number) => {
      const c0 = Math.max(0, Math.floor((x - RADIUS) / STEP))
      const c1 = Math.min(cols - 1, Math.floor((x + RADIUS) / STEP))
      const r0 = Math.max(0, Math.floor((y - RADIUS) / STEP))
      const r1 = Math.min(rows - 1, Math.floor((y + RADIUS) / STEP))
      for (let j = r0; j <= r1; j++)
        for (let i = c0; i <= c1; i++) {
          const d = Math.hypot(i * STEP + SQUARE / 2 - x, j * STEP + SQUARE / 2 - y)
          if (d <= RADIUS) light(j * cols + i, smooth(1 - d / RADIUS))
        }
    }

    const sweep = () => {
      const far = Math.hypot(view.w, view.h)
      waves.fill(0)
      calm.fill(0)
      for (let k = pulses.length - 1; k >= 0; k--) {
        const p = pulses[k]
        const ring = (clock - p.t0) * PULSE_SPEED
        if (ring - BEHIND * 2 > far) {
          pulses.splice(k, 1)
          continue
        }
        if (ring < 0) continue
        const envelope = p.strength * Math.pow(Math.max(0, 1 - ring / (far + BEHIND)), 0.6)
        const outer = ring + AHEAD * 2
        const c0 = Math.max(0, Math.floor((p.x - outer) / STEP))
        const c1 = Math.min(cols - 1, Math.floor((p.x + outer) / STEP))
        const r0 = Math.max(0, Math.floor((p.y - outer) / STEP))
        const r1 = Math.min(rows - 1, Math.floor((p.y + outer) / STEP))
        const into = p.tint ? waves : calm
        for (let j = r0; j <= r1; j++)
          for (let i = c0; i <= c1; i++) {
            const off = Math.hypot(i * STEP + SQUARE / 2 - p.x, j * STEP + SQUARE / 2 - p.y) - ring
            if (off > AHEAD * 2 || off < -BEHIND * 2) continue
            const t = off > 0 ? off / AHEAD : off / BEHIND
            const v = envelope * Math.exp(-t * t)
            const idx = j * cols + i
            if (v > into[idx]) into[idx] = v
          }
      }
    }

    const draw = () => {
      const s = settings.current
      if (colorKey !== s.color + s.pulseColor) {
        colorKey = s.color + s.pulseColor
        rgb = toRgb(s.color)
        pulseRgb = toRgb(s.pulseColor)
      }
      const [gr, gg, gb] = rgb
      const [pr, pg, pb] = pulseRgb
      ctx.clearRect(0, 0, view.w, view.h)
      const r2 = RADIUS * RADIUS
      for (let j = 0; j < rows; j++) {
        const y = j * STEP
        for (let i = 0; i < cols; i++) {
          const fade = fadeX[i] * fadeY[j]
          if (fade <= 0.001) continue
          const idx = j * cols + i
          const x = i * STEP
          const dx = x + SQUARE / 2 - mouse.x
          const dy = y + SQUARE / 2 - mouse.y
          const spot = presence > 0.002 ? Math.exp((-(dx * dx + dy * dy) / r2) * 1.6) * s.spotlight * presence : 0
          const rest = Math.min(flicker[idx] * s.maxOpacity + spot * 0.45, 1) * fade
          const hover = Math.max(levels[idx], calm[idx])
          const m = Math.max(hover, waves[idx])
          const lit = smooth(clamp(m, 0, 1))
          if (lit > 0.002) {
            // A lit cell wears the pulse colour by the pulse's share of its light, as cursor-grid tints it.
            const share = m > 0 ? waves[idx] / m : 0
            const r = Math.round(gr + (pr - gr) * share)
            const g = Math.round(gg + (pg - gg) * share)
            const b = Math.round(gb + (pb - gb) * share)
            const fill = lit * s.fillOpacity * fade
            if (fill > 0.002) {
              ctx.fillStyle = `rgba(${r},${g},${b},${fill})`
              ctx.fillRect(x - GAP / 2, y - GAP / 2, STEP, STEP)
            }
            const on = lit * fade
            ctx.fillStyle = `rgba(${r},${g},${b},${on + rest * (1 - on)})`
            ctx.fillRect(x, y, SQUARE, SQUARE)
          } else if (rest > 0.002) {
            ctx.fillStyle = `rgba(${gr},${gg},${gb},${rest})`
            ctx.fillRect(x, y, SQUARE, SQUARE)
          }
        }
      }
    }

    const frame = (now: number) => {
      raf = 0
      if (!visible || document.hidden) return
      const dt = last ? clamp((now - last) / 1000, 0, 1 / 20) : 1 / 60
      last = now
      clock += dt

      const follow = 1 - Math.exp(-dt / 0.07)
      mouse.x += (pointer.x - mouse.x) * follow
      mouse.y += (pointer.y - mouse.y) * follow
      presence += ((pointer.inside ? 1 : 0) - presence) * (1 - Math.exp(-dt / 0.25))

      if (!reduce) for (let i = 0; i < flicker.length; i++) if (Math.random() < FLICKER * dt) flicker[i] = Math.random()

      if (pulses.length) sweep()
      else {
        waves.fill(0)
        calm.fill(0)
      }

      const fadeStep = dt / FADE_S
      const attack = 1 - Math.exp(-dt / 0.045)
      for (let i = 0; i < levels.length; i++) {
        let target = targets[i]
        if (target <= 0 && levels[i] <= 0) continue
        if (clock - touched[i] > HOLD_S) target = Math.max(0, target - fadeStep)
        targets[i] = target
        const next = target > levels[i] ? levels[i] + (target - levels[i]) * attack : target
        levels[i] = next < 0.002 ? 0 : next
      }

      draw()
      raf = requestAnimationFrame(frame)
    }
    const wake = () => {
      if (!raf && visible && !document.hidden) {
        last = 0
        raf = requestAnimationFrame(frame)
      }
    }

    const locate = (e: PointerEvent) => {
      const rect = box.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      return { x, y, inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height }
    }
    const onMove = (e: PointerEvent) => {
      const { x, y, inside } = locate(e)
      const was = pointer.inside
      pointer.inside = inside
      if (!inside) return
      pointer.x = x
      pointer.y = y
      if (!was) {
        mouse.x = x
        mouse.y = y
      }
      energize(x, y)
    }
    const onDown = (e: PointerEvent) => {
      const { x, y, inside } = locate(e)
      if (!inside || reduce) return
      pulses.push({ x, y, t0: clock, strength: 1, tint: true })
    }
    const onLeave = () => {
      pointer.inside = false
    }
    const onVisibility = () => wake()

    const resize = new ResizeObserver(() => {
      rebuild()
      draw()
    })
    resize.observe(box)
    const seen = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting)
      if (visible) wake()
    })
    seen.observe(box)
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerdown", onDown, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)
    document.addEventListener("visibilitychange", onVisibility)

    rebuild()
    // landing-grid's startPulse: one pulse in the grid's own colour as it first appears.
    if (!reduce) pulses.push({ x: view.w / 2, y: view.h / 2, t0: 0.1, strength: 1, tint: false })
    pulseRef.current = () => {
      if (reduce) return
      pulses.push({ x: view.w / 2, y: view.h / 2, t0: clock, strength: 1, tint: true })
    }
    draw()
    wake()

    return () => {
      cancelAnimationFrame(raf)
      pulseRef.current = null
      resize.disconnect()
      seen.disconnect()
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerdown", onDown)
      document.documentElement.removeEventListener("pointerleave", onLeave)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  React.useEffect(() => {
    if (pulseKey) pulseRef.current?.()
  }, [pulseKey])

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 block" />
}
