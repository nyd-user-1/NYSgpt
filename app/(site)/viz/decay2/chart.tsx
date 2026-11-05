'use client'

// Decay simulation 2 (2026-11-04): the decay simulation as a surface over the chart of nuclides, in the form of
// ECharts-GL's simple-surface example. The height over each (N, Z) cell is that nuclide's current population
// (on a square-root scale, so the early plateau and the late peaks both read). It starts as one particle on every
// ENSDF ground state, so the surface opens as a flat plateau shaped like the chart. Each unstable particle decays
// at its measured rate (ln 2 / T½, scaled by the time compression) down its ENSDF branching to its daughter, and
// the surface deforms as populations drain off the short-lived edges and pile up on the stable valley. Fission
// leaves no single daughter, so those particles leave the surface. ECharts-GL morphs the vertices between redraws.

import * as React from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEChart } from '@/components/viz/use-echart'
import { formatSeconds, keyOf, loadDecay, type DecayData } from '@/lib/viz-decay'

const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const
const AXIS = { nameTextStyle: { color: '#64748b' }, axisLabel: { color: '#475569' }, axisLine: { lineStyle: { color: '#1e293b' } } }

const N_MAX = 180
const Z_MAX = 120
const REDRAW_MS = 450
const RATE_MIN = -12
const RATE_MAX = 18

type Model = { count: number; cell: Int32Array; lambda: Float64Array; cum: number[][]; to: number[][] }

function prepare(data: DecayData): Model {
  const count = data.nuclides.length
  const index = new Map<number, number>()
  data.nuclides.forEach((x, i) => index.set(keyOf(x.z, x.n), i))
  const cell = new Int32Array(count)
  const lambda = new Float64Array(count)
  const cum: number[][] = []
  const to: number[][] = []
  data.nuclides.forEach((x, i) => {
    cell[i] = x.z <= Z_MAX && x.n <= N_MAX ? x.z * (N_MAX + 1) + x.n : -1
    lambda[i] = x.t !== null && x.t > 0 && x.m.length > 0 ? Math.LN2 / x.t : 0
    const known = x.m.some(([, p]) => p !== null && p > 0)
    const w = x.m.map(([, p]) => (known ? Math.max(0, p ?? 0) : 1))
    const total = w.reduce((a, b) => a + b, 0) || 1
    let acc = 0
    cum.push(w.map((v) => (acc += v / total)))
    to.push(
      x.m.map(([code]) => {
        const mode = data.modes[code]
        if (!mode || mode.dz === null || mode.dn === null) return -2
        return index.get(keyOf(x.z + mode.dz, x.n + mode.dn)) ?? -1
      }),
    )
  })
  return { count, cell, lambda, cum, to }
}

type Sim = { occ: Int32Array; delta: Int32Array; simT: number; decays: number; fissions: number }
const freshSim = (count: number): Sim => ({ occ: new Int32Array(count).fill(1), delta: new Int32Array(count), simT: 0, decays: 0, fissions: 0 })

/** One step of Δt simulated seconds: every particle decays with p = 1 − e^(−λΔt), all against the counts at the
 *  step's start, so a daughter made this step doesn't also decay in it. */
function step(model: Model, s: Sim, dt: number) {
  s.delta.fill(0)
  for (let i = 0; i < model.count; i++) {
    const k = s.occ[i]
    const lam = model.lambda[i]
    if (!k || !lam) continue
    const p = -Math.expm1(-lam * dt)
    if (p <= 0) continue
    let n = 0
    if (p >= 1) n = k
    else for (let j = 0; j < k; j++) if (Math.random() < p) n++
    const cum = model.cum[i]
    for (let j = 0; j < n; j++) {
      const r = Math.random()
      let b = 0
      while (b < cum.length - 1 && cum[b] < r) b++
      const t = model.to[i][b]
      s.delta[i]--
      if (t >= 0) s.delta[t]++
      else if (t === -2) s.fissions++
      s.decays++
    }
  }
  for (let i = 0; i < model.count; i++) s.occ[i] += s.delta[i]
  s.simT += dt
}

/** The surface's grid, row by row in Z, N fastest: √ population per cell, optionally smoothed over its neighbours. */
function surface(model: Model, s: Sim, smooth: boolean) {
  const W = N_MAX + 1
  const H = Z_MAX + 1
  const raw = new Float32Array(W * H)
  for (let i = 0; i < model.count; i++) if (model.cell[i] >= 0) raw[model.cell[i]] += s.occ[i]
  const out: [number, number, number][] = []
  let max = 0
  for (let z = 0; z < H; z++) {
    for (let n = 0; n < W; n++) {
      let v = raw[z * W + n]
      if (smooth) {
        // A 3×3 binomial kernel: the surface reads as a landscape rather than a field of needles.
        let acc = 0
        let wsum = 0
        for (let dz = -1; dz <= 1; dz++) {
          for (let dn = -1; dn <= 1; dn++) {
            const zz = z + dz
            const nn = n + dn
            if (zz < 0 || zz >= H || nn < 0 || nn >= W) continue
            const w = (dz === 0 ? 2 : 1) * (dn === 0 ? 2 : 1)
            acc += raw[zz * W + nn] * w
            wsum += w
          }
        }
        v = acc / wsum
      }
      const h = Math.sqrt(v)
      if (h > max) max = h
      out.push([n, z, Number(h.toFixed(3))])
    }
  }
  return { data: out, max }
}

export function Decay2Chart() {
  const model = React.useRef<Model | null>(null)
  const sim = React.useRef<Sim>(freshSim(0))
  const playing = React.useRef(true)
  const rate = React.useRef(1)
  const smoothRef = React.useRef(true)
  const [view, setView] = React.useState(0)
  const [isPlaying, setPlaying] = React.useState(true)
  const [logRate, setLogRate] = React.useState(0)
  const [smooth, setSmooth] = React.useState(true)
  const [stats, setStats] = React.useState({ simT: 0, decays: 0, fissions: 0 })

  const ref = useEChart(
    loadDecay,
    (data) => {
      if (!model.current) {
        model.current = prepare(data)
        sim.current = freshSim(model.current.count)
      }
      const { data: grid, max } = surface(model.current, sim.current, smoothRef.current)
      return {
        backgroundColor: 'transparent',
        tooltip: {
          formatter: (p: unknown) => {
            const v = (p as { value: [number, number, number] }).value
            return `Z ${v[1]} · N ${v[0]} — population ${Number((v[2] * v[2]).toFixed(2))}${smoothRef.current ? ' (smoothed)' : ''}`
          },
        },
        visualMap: { show: false, dimension: 2, min: 0, max: Math.max(1.2, max), inRange: { color: ['#0b1a3a', '#1d4ed8', '#00bfff', '#f0f9ff'] } },
        xAxis3D: { type: 'value', name: 'N', min: 0, max: N_MAX, ...AXIS },
        yAxis3D: { type: 'value', name: 'Z', min: 0, max: Z_MAX, ...AXIS },
        zAxis3D: { type: 'value', name: '√ population', min: 0, ...AXIS },
        grid3D: { boxWidth: 180, boxDepth: 120, boxHeight: 60, viewControl: { distance: 240, alpha: 32, beta: 20 }, environment: '#05070d' },
        series: [
          {
            type: 'surface',
            dataShape: [Z_MAX + 1, N_MAX + 1],
            data: grid,
            shading: 'color',
            wireframe: { show: false },
            animationDurationUpdate: REDRAW_MS - 50,
            animationEasingUpdate: 'linear',
          },
        ],
      }
    },
    true,
    undefined,
    { view },
  )

  // The clock: the simulation steps every animation frame; the surface redraws every REDRAW_MS and morphs between.
  React.useEffect(() => {
    let raf = 0
    let last = performance.now()
    let sinceDraw = 0
    let sinceStats = 0
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const m = model.current
      if (m && playing.current) {
        step(m, sim.current, rate.current * dt)
        sinceDraw += dt
        if (sinceDraw * 1000 >= REDRAW_MS) {
          sinceDraw = 0
          setView((v) => v + 1)
        }
      }
      sinceStats += dt
      if (sinceStats > 0.25) {
        sinceStats = 0
        const s = sim.current
        setStats({ simT: s.simT, decays: s.decays, fissions: s.fissions })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const toggle = () => {
    playing.current = !playing.current
    setPlaying(playing.current)
  }
  const reset = () => {
    if (model.current) sim.current = freshSim(model.current.count)
    setStats({ simT: 0, decays: 0, fissions: 0 })
    setView((v) => v + 1)
  }
  const toggleSmooth = () => {
    smoothRef.current = !smoothRef.current
    setSmooth(smoothRef.current)
    setView((v) => v + 1)
  }

  const button =
    'flex h-9 w-9 items-center justify-center rounded-full border border-[var(--paper-rule)]/25 bg-[var(--paper)] transition-colors hover:bg-[var(--paper-quiet)]'
  return (
    <div className="relative min-h-0 w-full flex-1">
      <div ref={ref} className="absolute inset-0" />
      <div className="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-4 rounded-xl border border-[var(--paper-rule)]/15 bg-[var(--paper)]/90 px-4 py-3 text-[var(--paper-text)] backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggle} aria-label={isPlaying ? 'Pause' : 'Play'} className={button}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button type="button" onClick={reset} aria-label="Reset" className={button}>
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <label className="flex flex-col gap-1 text-[11px]">
          <span className="text-[var(--paper-muted)]">
            Time compression: 1 s = <span style={MONO}>{formatSeconds(10 ** logRate)}</span>
          </span>
          <input
            type="range"
            min={RATE_MIN}
            max={RATE_MAX}
            step={0.25}
            value={logRate}
            onChange={(e) => {
              const v = Number(e.target.value)
              setLogRate(v)
              rate.current = 10 ** v
            }}
            className="w-56 accent-[var(--paper-text)]"
          />
        </label>
        <button
          type="button"
          onClick={toggleSmooth}
          aria-pressed={smooth}
          className="rounded-full border border-[var(--paper-rule)]/25 px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--paper-quiet)]"
        >
          {smooth ? 'Smoothed' : 'Exact cells'}
        </button>
        <div className="grid grid-cols-[auto_auto] gap-x-3 text-[11px] tabular-nums" style={MONO}>
          <span className="text-[var(--paper-muted)]">Elapsed</span>
          <span>{stats.simT > 0 ? formatSeconds(stats.simT) : '0 s'}</span>
          <span className="text-[var(--paper-muted)]">Decays</span>
          <span>{stats.decays.toLocaleString('en')}</span>
          <span className="text-[var(--paper-muted)]">Fissions</span>
          <span>{stats.fissions.toLocaleString('en')}</span>
        </div>
      </div>
    </div>
  )
}
