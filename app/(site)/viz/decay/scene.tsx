'use client'

// The decay simulation (/viz/decay, prototype A, 2026-11-04). The chart of nuclides from the ENSDF ground states:
// x = N, depth = Z, height = log₁₀ T½ (stable nuclides on the plateau above the rest), coloured by primary decay
// mode in the NNDC chart's palette. The population starts as one particle on every nuclide; each unstable one
// decays at its measured rate (ln 2 / T½, scaled by the time compression), takes a branch by its ENSDF branching,
// and steps to its daughter, which keeps decaying — the chains run themselves. Fission leaves no single daughter:
// the particle flashes out. Each step takes STEP_S on screen, during which that particle doesn't decay again, so
// sub-frame chains stay visible as steps.

import * as React from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, Line, OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Pause, Play, RotateCcw, X } from 'lucide-react'
import {
  FAMILIES, FAMILY, familyOf, familyOfMode, formatSeconds, halfLifeText, keyOf, loadDecay, nucName, primaryChain,
  type DecayData, type Family,
} from '@/lib/viz-decay'

const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const

// ── geometry of the chart ───────────────────────────────────────────────────────────────────────
const N0 = 88
const Z0 = 59
const LOG_MIN = -24
const LOG_MAX = 33
const RISE = 1.1
const PLATEAU = (LOG_MAX - LOG_MIN) * RISE + 6
const STEP_S = 0.35
const TRAIL_S = 1.4
const FLASH_S = 0.8
const MAX_MOVERS = 8192
const MAX_TRAILS = 8192

function elevation(t: number | null) {
  if (t === null) return PLATEAU
  if (t <= 0) return 0
  return (Math.min(LOG_MAX, Math.max(LOG_MIN, Math.log10(t))) - LOG_MIN) * RISE
}

type Branch = { cum: number[]; to: number[]; away: [number, number, number][]; fam: Family[] }
type Model = {
  data: DecayData
  index: Map<number, number>
  pos: Float32Array
  fam: Family[]
  lambda: Float64Array
  branches: Branch[]
}

function prepare(data: DecayData): Model {
  const count = data.nuclides.length
  const index = new Map<number, number>()
  data.nuclides.forEach((x, i) => index.set(keyOf(x.z, x.n), i))
  const pos = new Float32Array(count * 3)
  const lambda = new Float64Array(count)
  const fam: Family[] = []
  const branches: Branch[] = []
  data.nuclides.forEach((x, i) => {
    pos[i * 3] = x.n - N0
    pos[i * 3 + 1] = elevation(x.t)
    pos[i * 3 + 2] = -(x.z - Z0)
    fam.push(familyOf(x))
    lambda[i] = x.t !== null && x.t > 0 && x.m.length > 0 ? Math.LN2 / x.t : 0
    // Branch weights: the deck's percentages; a mode listed without one counts only when none has one.
    const known = x.m.some(([, p]) => p !== null && p > 0)
    const w = x.m.map(([, p]) => (known ? Math.max(0, p ?? 0) : 1))
    const total = w.reduce((a, b) => a + b, 0) || 1
    let acc = 0
    const cum = w.map((v) => (acc += v / total))
    const to: number[] = []
    const away: [number, number, number][] = []
    for (const [code] of x.m) {
      const mode = data.modes[code]
      if (!mode || mode.dz === null || mode.dn === null) {
        to.push(-2)
        away.push([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]])
      } else {
        to.push(index.get(keyOf(x.z + mode.dz, x.n + mode.dn)) ?? -1)
        away.push([x.n + mode.dn - N0, 0, -(x.z + mode.dz - Z0)])
      }
    }
    branches.push({ cum, to, away, fam: x.m.map(([code]) => familyOfMode(code)) })
  })
  return { data, index, pos, fam, lambda, branches }
}

// ── simulation state ────────────────────────────────────────────────────────────────────────────
type Mover = { to: number; kind: 'step' | 'away' | 'fission'; a: [number, number, number]; b: [number, number, number]; t0: number; fam: Family }
type Trail = { a: [number, number, number]; b: [number, number, number]; t0: number; fam: Family }
type Sim = { occ: Int32Array; dirty: boolean; movers: Mover[]; trails: Trail[]; now: number; simT: number; decays: number; fissions: number }

const freshSim = (count: number): Sim => ({
  occ: new Int32Array(count).fill(1),
  dirty: true,
  movers: [],
  trails: [],
  now: 0,
  simT: 0,
  decays: 0,
  fissions: 0,
})

type Palette = { bg: THREE.Color; ink: THREE.Color; fam: Record<Family, THREE.Color>; tile: Record<Family, THREE.Color>; grid: THREE.Color }

function palette(dark: boolean, paper: string, ink: string): Palette {
  const bg = new THREE.Color(dark ? '#15120d' : '#ffffff')
  try { bg.set(paper) } catch { /* keep the theme default */ }
  const inkC = new THREE.Color(dark ? '#f0e9d8' : '#16181d')
  try { inkC.set(ink) } catch { /* keep the theme default */ }
  const fam = {} as Record<Family, THREE.Color>
  const tile = {} as Record<Family, THREE.Color>
  for (const f of FAMILIES) {
    fam[f] = new THREE.Color(dark ? FAMILY[f].dark : FAMILY[f].light)
    tile[f] = fam[f].clone().lerp(bg, dark ? 0.62 : 0.55)
  }
  return { bg, ink: inkC, fam, tile, grid: inkC.clone().lerp(bg, 0.88) }
}

/** The theme: html.dark, and the paper tokens as the canvas's element resolves them. */
function useTheme(el: React.RefObject<HTMLDivElement | null>) {
  const [theme, setTheme] = React.useState({ dark: false, paper: '#ffffff', ink: '#16181d' })
  React.useEffect(() => {
    const read = () => {
      const root = el.current ?? document.body
      const cs = getComputedStyle(root)
      setTheme({
        dark: document.documentElement.classList.contains('dark'),
        paper: cs.getPropertyValue('--paper').trim() || '#ffffff',
        ink: cs.getPropertyValue('--paper-text').trim() || '#16181d',
      })
    }
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] })
    return () => mo.disconnect()
  }, [el])
  return theme
}

// ── the scene ───────────────────────────────────────────────────────────────────────────────────
type Stats = { simT: number; decays: number; fissions: number; moving: number }

const Chart = React.memo(function Chart({
  model, pal, sim, playing, rate, selected, onSelect, onHover, onStats,
}: {
  model: Model
  pal: Palette
  sim: { current: Sim }
  playing: { current: boolean }
  rate: { current: number }
  selected: number | null
  onSelect: (i: number | null) => void
  onHover: (i: number | null) => void
  onStats: (s: Stats) => void
}) {
  const count = model.data.nuclides.length
  const tiles = React.useRef<THREE.InstancedMesh>(null)
  const dots = React.useRef<THREE.InstancedMesh>(null)
  const movers = React.useRef<THREE.InstancedMesh>(null)
  const trails = React.useRef<THREE.LineSegments>(null)
  const tmp = React.useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), c: new THREE.Color() }), [])
  const trailPos = React.useMemo(() => new Float32Array(MAX_TRAILS * 6), [])
  const trailCol = React.useMemo(() => new Float32Array(MAX_TRAILS * 6), [])
  const statsClock = React.useRef(0)

  // Tiles: placed once; coloured per theme.
  React.useLayoutEffect(() => {
    const mesh = tiles.current
    if (!mesh) return
    for (let i = 0; i < count; i++) {
      tmp.p.set(model.pos[i * 3], model.pos[i * 3 + 1], model.pos[i * 3 + 2])
      tmp.s.set(0.88, 0.22, 0.88)
      mesh.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s))
      mesh.setColorAt(i, pal.tile[model.fam[i]])
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    const d = dots.current
    if (d) {
      for (let i = 0; i < count; i++) d.setColorAt(i, pal.fam[model.fam[i]])
      if (d.instanceColor) d.instanceColor.needsUpdate = true
    }
    sim.current.dirty = true
  }, [model, pal, count, tmp, sim])

  const grid = React.useMemo(() => {
    const pts: number[] = []
    for (let n = 0; n <= 180; n += 10) pts.push(n - N0, -0.4, Z0, n - N0, -0.4, -(120 - Z0))
    for (let z = 0; z <= 120; z += 10) pts.push(-N0, -0.4, -(z - Z0), 180 - N0, -0.4, -(z - Z0))
    return new Float32Array(pts)
  }, [])

  useFrame((_, delta) => {
    if (sim.current.occ.length !== count) sim.current = freshSim(count)
    const s = sim.current
    const dt = Math.min(delta, 0.1)
    if (playing.current) {
      s.now += dt
      const simDt = rate.current * dt
      s.simT += simDt
      // Decays: each particle on an unstable nuclide decays this frame with p = 1 − e^(−λ·Δt).
      for (let i = 0; i < count; i++) {
        const k = s.occ[i]
        const lam = model.lambda[i]
        if (!k || !lam) continue
        const p = -Math.expm1(-lam * simDt)
        if (p <= 0) continue
        let n = 0
        if (p >= 1) n = k
        else for (let j = 0; j < k; j++) if (Math.random() < p) n++
        if (!n) continue
        const br = model.branches[i]
        const a: [number, number, number] = [model.pos[i * 3], model.pos[i * 3 + 1] + 0.9, model.pos[i * 3 + 2]]
        for (let j = 0; j < n; j++) {
          s.occ[i]--
          s.dirty = true
          s.decays++
          const r = Math.random()
          let b = 0
          while (b < br.cum.length - 1 && br.cum[b] < r) b++
          const to = br.to[b]
          const fam = br.fam[b]
          if (to === -2) s.fissions++
          const end: [number, number, number] = to >= 0 ? [model.pos[to * 3], model.pos[to * 3 + 1] + 0.9, model.pos[to * 3 + 2]] : br.away[b]
          if (s.movers.length >= MAX_MOVERS) {
            if (to >= 0) s.occ[to]++
            continue
          }
          s.movers.push({ to, kind: to >= 0 ? 'step' : to === -2 ? 'fission' : 'away', a, b: end, t0: s.now, fam })
          if (to !== -2 && s.trails.length < MAX_TRAILS) s.trails.push({ a, b: end, t0: s.now, fam })
        }
      }
      // Landings.
      let w = 0
      for (const m of s.movers) {
        const age = s.now - m.t0
        if (m.kind === 'step' && age >= STEP_S) {
          s.occ[m.to]++
          s.dirty = true
        } else if (m.kind !== 'step' && age >= FLASH_S) {
          // gone: fission, or a daughter past the edge of the data
        } else s.movers[w++] = m
      }
      s.movers.length = w
      let t = 0
      for (const tr of s.trails) if (s.now - tr.t0 < TRAIL_S) s.trails[t++] = tr
      s.trails.length = t
    }

    // Resting population: one dot per occupied nuclide, grown by the cube root of its count.
    const d = dots.current
    if (d && s.dirty) {
      for (let i = 0; i < count; i++) {
        const k = s.occ[i]
        tmp.p.set(model.pos[i * 3], model.pos[i * 3 + 1] + 0.9, model.pos[i * 3 + 2])
        const r = k > 0 ? 0.34 * Math.cbrt(k) : 0
        tmp.s.set(r, r, r)
        d.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s))
      }
      d.instanceMatrix.needsUpdate = true
      s.dirty = false
    }

    // Particles in flight: a short arc parent → daughter; fission and off-chart steps fade out.
    const mv = movers.current
    if (mv) {
      let c = 0
      for (const m of s.movers) {
        const age = s.now - m.t0
        if (m.kind === 'step') {
          const u = Math.min(1, age / STEP_S)
          const e = u * u * (3 - 2 * u)
          tmp.p.set(m.a[0] + (m.b[0] - m.a[0]) * e, m.a[1] + (m.b[1] - m.a[1]) * e + Math.sin(Math.PI * u) * 2.2, m.a[2] + (m.b[2] - m.a[2]) * e)
          tmp.s.setScalar(0.42)
          tmp.c.copy(pal.fam[m.fam])
        } else {
          const u = Math.min(1, age / FLASH_S)
          const at = m.kind === 'fission' ? m.a : m.b
          tmp.p.set(at[0], at[1], at[2])
          tmp.s.setScalar(m.kind === 'fission' ? 0.4 + u * 2.4 : 0.42 * (1 - u))
          tmp.c.copy(pal.fam[m.fam]).lerp(pal.bg, u)
        }
        mv.setMatrixAt(c, tmp.m.compose(tmp.p, tmp.q, tmp.s))
        mv.setColorAt(c, tmp.c)
        c++
      }
      mv.count = c
      mv.instanceMatrix.needsUpdate = true
      if (mv.instanceColor) mv.instanceColor.needsUpdate = true
    }

    // Trails: each step's segment, fading into the paper.
    const tl = trails.current
    if (tl) {
      let c = 0
      for (const tr of s.trails) {
        const u = Math.min(1, (s.now - tr.t0) / TRAIL_S)
        tmp.c.copy(pal.fam[tr.fam]).lerp(pal.bg, u)
        trailPos.set(tr.a, c * 6)
        trailPos.set(tr.b, c * 6 + 3)
        for (let k = 0; k < 2; k++) {
          trailCol[c * 6 + k * 3] = tmp.c.r
          trailCol[c * 6 + k * 3 + 1] = tmp.c.g
          trailCol[c * 6 + k * 3 + 2] = tmp.c.b
        }
        c++
      }
      tl.geometry.setDrawRange(0, c * 2)
      tl.geometry.attributes.position.needsUpdate = true
      tl.geometry.attributes.color.needsUpdate = true
    }

    // The readouts, four times a second whether playing or paused.
    statsClock.current += delta
    if (statsClock.current > 0.25) {
      statsClock.current = 0
      onStats({ simT: s.simT, decays: s.decays, fissions: s.fissions, moving: s.movers.length })
    }
  })

  const pick = (e: { instanceId?: number }) => (e.instanceId === undefined ? null : e.instanceId)

  const chain = React.useMemo(() => {
    if (selected === null) return null
    const { steps } = primaryChain(model.data, model.index, selected)
    return steps.map((st) => new THREE.Vector3(model.pos[st.index * 3], model.pos[st.index * 3 + 1] + 1.6, model.pos[st.index * 3 + 2]))
  }, [selected, model])

  return (
    <>
      <color attach="background" args={[pal.bg]} />
      <lineSegments frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[grid, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={pal.grid} toneMapped={false} />
      </lineSegments>
      <Html position={[180 - N0 + 6, -0.4, Z0]} center style={{ ...MONO, fontSize: 11, color: 'var(--paper-faint)', pointerEvents: 'none' }}>
        N
      </Html>
      <Html position={[-N0, -0.4, -(120 - Z0) - 6]} center style={{ ...MONO, fontSize: 11, color: 'var(--paper-faint)', pointerEvents: 'none' }}>
        Z
      </Html>

      <instancedMesh
        ref={tiles}
        args={[undefined, undefined, count]}
        frustumCulled={false}
        onClick={(e) => {
          if (e.delta > 4) return
          e.stopPropagation()
          onSelect(pick(e))
        }}
        onPointerMove={(e) => {
          e.stopPropagation()
          onHover(pick(e))
        }}
        onPointerOut={() => onHover(null)}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
        <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(count * 3), 3]} />
      </instancedMesh>

      <instancedMesh ref={dots} args={[undefined, undefined, count]} frustumCulled={false} raycast={() => null}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial toneMapped={false} />
        <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(count * 3), 3]} />
      </instancedMesh>

      <instancedMesh ref={movers} args={[undefined, undefined, MAX_MOVERS]} frustumCulled={false} raycast={() => null}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial toneMapped={false} />
        <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(MAX_MOVERS * 3), 3]} />
      </instancedMesh>

      <lineSegments ref={trails} frustumCulled={false} raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[trailPos, 3]} usage={THREE.DynamicDrawUsage} />
          <bufferAttribute attach="attributes-color" args={[trailCol, 3]} usage={THREE.DynamicDrawUsage} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors toneMapped={false} />
      </lineSegments>

      {chain && chain.length > 1 && <Line points={chain} color={pal.ink} lineWidth={2} transparent opacity={0.85} />}
      {selected !== null && (
        <mesh position={[model.pos[selected * 3], model.pos[selected * 3 + 1] + 0.9, model.pos[selected * 3 + 2]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <torusGeometry args={[1.25, 0.12, 8, 32]} />
          <meshBasicMaterial color={pal.ink} toneMapped={false} />
        </mesh>
      )}
    </>
  )
})

// ── page ────────────────────────────────────────────────────────────────────────────────────────
const RATE_MIN = -12
const RATE_MAX = 18

export default function DecayScene() {
  const box = React.useRef<HTMLDivElement>(null)
  const theme = useTheme(box)
  const [data, setData] = React.useState<DecayData | null>(null)
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => {
    loadDecay().then(setData, () => setFailed(true))
  }, [])
  const model = React.useMemo(() => (data ? prepare(data) : null), [data])
  const pal = React.useMemo(() => palette(theme.dark, theme.paper, theme.ink), [theme])

  // Sized to the data on the first frame (Chart's useFrame).
  const sim = React.useRef<Sim>(freshSim(0))
  const playingRef = React.useRef(true)
  const rateRef = React.useRef(1)
  const [playing, setPlaying] = React.useState(true)
  const [logRate, setLogRate] = React.useState(0)
  const [stats, setStats] = React.useState<Stats>({ simT: 0, decays: 0, fissions: 0, moving: 0 })
  const [selected, setSelected] = React.useState<number | null>(null)
  const [hover, setHover] = React.useState<number | null>(null)

  const toggle = () => {
    playingRef.current = !playingRef.current
    setPlaying(playingRef.current)
  }
  const reset = () => {
    if (model) sim.current = freshSim(model.data.nuclides.length)
    setStats({ simT: 0, decays: 0, fissions: 0, moving: 0 })
  }
  const setRate = (v: number) => {
    setLogRate(v)
    rateRef.current = 10 ** v
  }

  const onHover = React.useCallback((i: number | null) => setHover((h) => (h === i ? h : i)), [])

  const hovered = model && hover !== null ? model.data.nuclides[hover] : null
  const chain = model && selected !== null ? primaryChain(model.data, model.index, selected) : null

  return (
    <div ref={box} className="relative min-h-0 flex-1 overflow-hidden rounded-xl" style={{ ...SANS, cursor: hover !== null ? 'pointer' : undefined }}>
      {model ? (
        <Canvas flat dpr={[1, 2]} camera={{ position: [0, 150, 170], fov: 42, near: 1, far: 3000 }}>
          <Chart
            model={model}
            pal={pal}
            sim={sim}
            playing={playingRef}
            rate={rateRef}
            selected={selected}
            onSelect={setSelected}
            onHover={onHover}
            onStats={setStats}
          />
          <OrbitControls makeDefault target={[0, 26, 0]} enableDamping dampingFactor={0.08} minDistance={25} maxDistance={700} />
          {theme.dark && (
            <EffectComposer multisampling={0}>
              <Bloom mipmapBlur intensity={0.45} luminanceThreshold={0.55} luminanceSmoothing={0.25} />
            </EffectComposer>
          )}
        </Canvas>
      ) : (
        <div className="flex h-full items-center justify-center text-[13px] text-[var(--paper-muted)]">
          {failed ? 'The decay data didn’t load.' : 'Loading 3,420 ground states…'}
        </div>
      )}

      {/* Legend */}
      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-1 rounded-xl border border-[var(--paper-rule)]/15 bg-[var(--paper)]/85 px-3 py-2.5 text-[11px] text-[var(--paper-text)] backdrop-blur-sm">
        {FAMILIES.map((f) => (
          <span key={f} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: theme.dark ? FAMILY[f].dark : FAMILY[f].light }} />
            {FAMILY[f].label}
          </span>
        ))}
        <span className="mt-1 text-[10px] text-[var(--paper-faint)]" style={MONO}>
          height: log₁₀ half-life
        </span>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-4 rounded-xl border border-[var(--paper-rule)]/15 bg-[var(--paper)]/90 px-4 py-3 text-[var(--paper-text)] backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Pause' : 'Play'}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--paper-rule)]/25 bg-[var(--paper)] transition-colors hover:bg-[var(--paper-quiet)]"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="Reset"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--paper-rule)]/25 bg-[var(--paper)] transition-colors hover:bg-[var(--paper-quiet)]"
          >
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
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-56 accent-[var(--paper-text)]"
          />
        </label>
        <div className="grid grid-cols-[auto_auto] gap-x-3 text-[11px] tabular-nums" style={MONO}>
          <span className="text-[var(--paper-muted)]">Elapsed</span>
          <span>{stats.simT > 0 ? formatSeconds(stats.simT) : '0 s'}</span>
          <span className="text-[var(--paper-muted)]">Decays</span>
          <span>{stats.decays.toLocaleString('en')}</span>
          <span className="text-[var(--paper-muted)]">Fissions</span>
          <span>{stats.fissions.toLocaleString('en')}</span>
        </div>
      </div>

      {/* Hovered nuclide */}
      {hovered && selected === null && (
        <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl border border-[var(--paper-rule)]/15 bg-[var(--paper)]/90 px-3 py-2 text-[12px] text-[var(--paper-text)] backdrop-blur-sm">
          <span className="font-medium">{nucName(hovered)}</span>
          <span className="ml-2 text-[var(--paper-muted)]" style={MONO}>
            {halfLifeText(hovered)}
            {hovered.m[0] ? ` · ${model?.data.modes[hovered.m[0][0]]?.label ?? hovered.m[0][0]}` : ''}
          </span>
        </div>
      )}

      {/* The selected nuclide's chain */}
      {model && chain && selected !== null && (
        <div className="absolute bottom-4 right-4 top-16 flex w-[320px] flex-col overflow-hidden rounded-xl border border-[var(--paper-rule)]/15 bg-[var(--paper)]/95 text-[var(--paper-text)] backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3 px-4 pt-4">
            <div>
              <div className="text-[22px] leading-none" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                {nucName(model.data.nuclides[selected])}
              </div>
              <div className="mt-1.5 text-[11px] text-[var(--paper-muted)]" style={MONO}>
                Z {model.data.nuclides[selected].z} · N {model.data.nuclides[selected].n} · {halfLifeText(model.data.nuclides[selected])}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--paper-rule)]/25 transition-colors hover:bg-[var(--paper-quiet)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <table className="w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[var(--paper-faint)]">
                  <th className="pb-1.5 font-medium">Nuclide</th>
                  <th className="pb-1.5 font-medium">Mode</th>
                  <th className="pb-1.5 text-right font-medium">Branch</th>
                  <th className="pb-1.5 text-right font-medium">Half-life</th>
                </tr>
              </thead>
              <tbody style={MONO}>
                {chain.steps.map((st) => {
                  const nuc = model.data.nuclides[st.index]
                  const f = familyOf(nuc)
                  return (
                    <tr
                      key={st.index}
                      className="cursor-pointer border-t border-[var(--paper-rule)]/10 hover:bg-[var(--paper-quiet)]"
                      onClick={() => setSelected(st.index)}
                    >
                      <td className="py-1.5">
                        <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: theme.dark ? FAMILY[f].dark : FAMILY[f].light }} />
                        {nucName(nuc)}
                      </td>
                      <td className="py-1.5">{st.mode ? (model.data.modes[st.mode]?.label ?? st.mode) : ''}</td>
                      <td className="py-1.5 text-right">{st.mode ? (st.pct === null || st.pct === undefined ? '—' : `${st.pct}%`) : ''}</td>
                      <td className="py-1.5 text-right">{halfLifeText(nuc)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {chain.end !== 'stable' && (
              <p className="mt-3 text-[11px] text-[var(--paper-muted)]">
                {chain.end === 'fission'
                  ? 'The chain ends in fission.'
                  : chain.end === 'not in the data'
                    ? 'The daughter has no ENSDF ground state.'
                    : chain.end === 'no mode'
                      ? 'ENSDF gives no decay mode here.'
                      : 'The chain loops.'}
              </p>
            )}
            {model.data.nuclides[selected].m.length > 1 && (
              <div className="mt-4 border-t border-[var(--paper-rule)]/10 pt-3">
                <div className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--paper-faint)]">All branches</div>
                {model.data.nuclides[selected].m.map(([code, pct]) => (
                  <div key={code} className="flex justify-between text-[11.5px]" style={MONO}>
                    <span>{model.data.modes[code]?.label ?? code}</span>
                    <span>{pct === null ? '—' : `${pct}%`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
