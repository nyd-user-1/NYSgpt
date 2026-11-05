'use client'

import * as React from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Y_PER_KEV, label, type Model } from './model'

// The level energies in 3D (2026-11-04, prototype B). The floor is the (N, Z) plane, one unit per nucleon,
// x = N and z = −Z, so from the front the chart of nuclides reads as it does on paper. Every kept level of
// every nuclide is one flat marker at its real energy (one instanced mesh, ~140k instances). The selected
// nuclide and its eight neighbours carry their gammas as particles falling level to level, brightness by
// relative intensity; the rest of the field stays still. Picking tests one box per nuclide column, not the
// 140k markers. Colours come from the page's paper tokens (levels-view.tsx resolves them to hex); bloom
// runs on dark paper only, where the falling particles are the one thing bright enough to catch it.

export type Palette = { bg: string; ink: string; accent: string; dark: boolean }

const MAGIC = [2, 8, 20, 28, 50, 82, 126]
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const
const LABEL = 'whitespace-nowrap text-[10px] tabular-nums text-[var(--paper-muted)]'

type Props = {
  model: Model
  palette: Palette
  /** Nuclide indices, −1 for none. */
  focus: number
  hover: number
  /** A level index within the focused nuclide (the panel row under the pointer), −1 for none. */
  row: number
  onSelect: (i: number) => void
  onHover: (i: number) => void
}

export function Scene({ model, palette, focus, hover, row, onSelect, onHover }: Props) {
  const target = React.useMemo(() => new THREE.Vector3(model.maxN / 2, 4, -model.maxZ / 2), [model])
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      camera={{ position: [target.x - 10, 105, 75], fov: 40, near: 0.5, far: 3000 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      fallback={<p className="p-6 text-[13px] text-[var(--paper-muted)]">This view needs WebGL.</p>}
    >
      <color attach="background" args={[palette.bg]} />
      <LevelField model={model} palette={palette} focus={focus} />
      <Floor model={model} palette={palette} />
      <Gammas model={model} palette={palette} focus={focus} />
      <RowMarker model={model} palette={palette} focus={focus} row={row} />
      {hover >= 0 && hover !== focus && <Tag model={model} i={hover} />}
      {focus >= 0 && <Tag model={model} i={focus} strong />}
      <Picker model={model} onSelect={onSelect} onHover={onHover} />
      <Rig model={model} focus={focus} />
      <OrbitControls
        makeDefault
        target={target}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.03}
        minDistance={6}
        maxDistance={420}
      />
      {palette.dark && (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur intensity={0.6} luminanceThreshold={1} luminanceSmoothing={0.15} />
        </EffectComposer>
      )}
    </Canvas>
  )
}

/** Every level: a thin square at (N, energy, −Z). Low levels in a stronger ink, high ones toward the paper;
 *  the selected nuclide in the accent, its neighbours halfway there. */
function LevelField({ model, palette, focus }: { model: Model; palette: Palette; focus: number }) {
  const { mesh, colors } = React.useMemo(() => {
    const geometry = slab(0.72, 0.05)
    const material = new THREE.MeshBasicMaterial({ toneMapped: false })
    const mesh = new THREE.InstancedMesh(geometry, material, model.total)
    const matrices = new Float32Array(model.total * 16)
    for (let i = 0; i < model.count; i++) {
      const x = model.n[i]
      const z = -model.z[i]
      for (let k = model.start[i], end = k + model.size[i]; k < end; k++) {
        const o = k * 16
        matrices[o] = 1
        matrices[o + 5] = 1
        matrices[o + 10] = 1
        matrices[o + 15] = 1
        matrices[o + 12] = x
        matrices[o + 13] = model.energy[k] * Y_PER_KEV
        matrices[o + 14] = z
      }
    }
    mesh.instanceMatrix = new THREE.InstancedBufferAttribute(matrices, 16)
    const colors = new Float32Array(model.total * 3)
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3)
    mesh.frustumCulled = false
    return { mesh, colors }
  }, [model])

  React.useEffect(
    () => () => {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
      mesh.dispose()
    },
    [mesh],
  )

  React.useEffect(() => {
    const bg = new THREE.Color(palette.bg)
    const ink = new THREE.Color(palette.ink)
    const accent = new THREE.Color(palette.accent)
    const low = bg.clone().lerp(ink, 0.55)
    const high = bg.clone().lerp(ink, 0.2)
    const near = low.clone().lerp(accent, 0.55)
    const c = new THREE.Color()
    const fz = focus >= 0 ? model.z[focus] : -99
    const fn = focus >= 0 ? model.n[focus] : -99
    for (let i = 0; i < model.count; i++) {
      const d = Math.max(Math.abs(model.z[i] - fz), Math.abs(model.n[i] - fn))
      for (let k = model.start[i], end = k + model.size[i]; k < end; k++) {
        if (d === 0) c.copy(accent)
        else if (d === 1) c.copy(near)
        else c.copy(low).lerp(high, Math.min(1, model.energy[k] / 10000))
        c.toArray(colors, k * 3)
      }
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [mesh, colors, model, palette, focus])

  return <primitive object={mesh} />
}

/** A w × h × w box as 8 shared corners: no normals, which an unlit material never reads, so a third of
 *  BoxGeometry's 24 vertices per instance. */
function slab(w: number, h: number) {
  const a = w / 2
  const b = h / 2
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute([-a, -b, -a, a, -b, -a, a, -b, a, -a, -b, a, -a, b, -a, a, b, -a, a, b, a, -a, b, a], 3))
  // Counter-clockwise from outside, face by face: bottom, top, −z, +x, +z, −x.
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 5, 1, 0, 4, 5, 1, 6, 2, 1, 5, 6, 2, 7, 3, 2, 6, 7, 3, 4, 0, 3, 7, 4])
  return g
}

/** The floor: its edge, the magic numbers on both axes, and a 0–10 MeV scale standing at the front corner. */
function Floor({ model, palette }: { model: Model; palette: Palette }) {
  const W = Math.ceil(model.maxN / 10) * 10 + 10
  const D = Math.ceil(model.maxZ / 10) * 10 + 10
  const H = 10000 * Y_PER_KEV
  const { edge, magic } = React.useMemo(() => {
    const geom = (p: number[]) => {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
      return g
    }
    const y = -0.04
    const e: number[] = [0, y, 0, W, y, 0, W, y, 0, W, y, -D, W, y, -D, 0, y, -D, 0, y, -D, 0, y, 0]
    // The energy scale: a post at the front-left corner with a tick every 2 MeV.
    e.push(-3, 0, 3, -3, H, 3)
    for (let mev = 0; mev <= 10; mev += 2) e.push(-3, mev * 1000 * Y_PER_KEV, 3, -2, mev * 1000 * Y_PER_KEV, 3)
    const m: number[] = []
    for (const v of MAGIC) {
      if (v <= W) m.push(v, y, 0, v, y, -D)
      if (v <= D) m.push(0, y, -v, W, y, -v)
    }
    return { edge: geom(e), magic: geom(m) }
  }, [W, D, H])

  React.useEffect(
    () => () => {
      edge.dispose()
      magic.dispose()
    },
    [edge, magic],
  )

  const [edgeColor, magicColor] = React.useMemo(() => {
    const bg = new THREE.Color(palette.bg)
    const ink = new THREE.Color(palette.ink)
    return [bg.clone().lerp(ink, 0.18), bg.clone().lerp(ink, 0.42)]
  }, [palette.bg, palette.ink])

  return (
    <group>
      <lineSegments geometry={edge}>
        <lineBasicMaterial color={edgeColor} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={magic}>
        <lineBasicMaterial color={magicColor} toneMapped={false} />
      </lineSegments>
      {MAGIC.filter((v) => v <= W).map((v) => (
        <Html key={`n${v}`} position={[v, 0, 4]} center zIndexRange={[10, 0]} pointerEvents="none">
          <span className={LABEL} style={MONO}>{v}</span>
        </Html>
      ))}
      {MAGIC.filter((v) => v <= D).map((v) => (
        <Html key={`z${v}`} position={[-4, 0, -v]} center zIndexRange={[10, 0]} pointerEvents="none">
          <span className={LABEL} style={MONO}>{v}</span>
        </Html>
      ))}
      <Html position={[W / 2, 0, 10]} center zIndexRange={[10, 0]} pointerEvents="none">
        <span className={LABEL} style={MONO}>N</span>
      </Html>
      <Html position={[-10, 0, -D / 2]} center zIndexRange={[10, 0]} pointerEvents="none">
        <span className={LABEL} style={MONO}>Z</span>
      </Html>
      {[0, 2, 4, 6, 8, 10].map((mev) => (
        <Html key={mev} position={[-5.5, mev * 1000 * Y_PER_KEV, 3]} center zIndexRange={[10, 0]} pointerEvents="none">
          <span className={LABEL} style={MONO}>{mev === 10 ? '10 MeV' : mev}</span>
        </Html>
      ))}
    </group>
  )
}

/** A soft round dot for the particles, drawn once. */
let dotTexture: THREE.Texture | null = null
function dot() {
  if (dotTexture) return dotTexture
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.35, 'rgba(255,255,255,0.8)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
  }
  dotTexture = new THREE.CanvasTexture(c)
  return dotTexture
}

const PER = 2 // particles per gamma, half a cycle apart

/** The selected nuclide's gammas and its neighbours': particles falling from level to level, brightness by
 *  relative intensity (the strongest branch from a level is 100). The selected nuclide's transitions are
 *  also drawn as faint vertical lines. */
function Gammas({ model, palette, focus }: { model: Model; palette: Palette; focus: number }) {
  // Per gamma: x, z, y from, y to, brightness, phase, duration, selected (1) or neighbour (0).
  const items = React.useMemo(() => {
    const out: number[] = []
    if (focus < 0) return new Float32Array(0)
    for (let i = 0; i < model.count; i++) {
      const d = Math.max(Math.abs(model.z[i] - model.z[focus]), Math.abs(model.n[i] - model.n[focus]))
      if (d > 1) continue
      const G = model.nuclides[i].G
      const s = model.start[i]
      for (let g = 0; g < G.length; g += 3) {
        const y0 = model.energy[s + Number(G[g])] * Y_PER_KEV
        const y1 = model.energy[s + Number(G[g + 1])] * Y_PER_KEV
        const ri = G[g + 2]
        const b = ri === null ? 0.35 : 0.25 + 0.75 * Math.sqrt(Math.min(Number(ri), 100) / 100)
        const off = (((g / 3) % 5) - 2) * 0.11
        out.push(model.n[i] + off, -model.z[i], y0, y1, b, ((g * 0.6180339) % 1), 1.3 + Math.min(1.7, (y0 - y1) * 0.07), d === 0 ? 1 : 0)
      }
    }
    return new Float32Array(out)
  }, [model, focus])

  const count = items.length / 8

  const { points, positions, colors } = React.useMemo(() => {
    const n = Math.max(1, count * PER)
    const positions = new Float32Array(n * 3)
    const colors = new Float32Array(n * 4)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4).setUsage(THREE.DynamicDrawUsage))
    geometry.setDrawRange(0, count * PER)
    const material = new THREE.PointsMaterial({
      size: 7,
      sizeAttenuation: false,
      map: dot(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      // Always over the level markers: the falling light is the thing to see.
      depthTest: false,
      toneMapped: false,
    })
    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    return { points, positions, colors }
  }, [count])

  const lines = React.useMemo(() => {
    const p: number[] = []
    for (let g = 0; g < items.length; g += 8) {
      if (items[g + 7] !== 1) continue
      p.push(items[g], items[g + 2], items[g + 1], items[g], items[g + 3], items[g + 1])
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    return geometry
  }, [items])

  React.useEffect(
    () => () => {
      points.geometry.dispose()
      ;(points.material as THREE.Material).dispose()
    },
    [points],
  )
  React.useEffect(() => () => lines.dispose(), [lines])

  React.useEffect(() => {
    const m = points.material as THREE.PointsMaterial
    m.blending = palette.dark ? THREE.AdditiveBlending : THREE.NormalBlending
    m.needsUpdate = true
  }, [points, palette.dark])

  const accent = React.useMemo(() => new THREE.Color(palette.accent), [palette.accent])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (let g = 0, q = 0; g < items.length; g += 8) {
      const y0 = items[g + 2]
      const y1 = items[g + 3]
      const level = items[g + 4] * (items[g + 7] ? 1 : 0.45)
      for (let p = 0; p < PER; p++, q++) {
        const u = (t / items[g + 6] + items[g + 5] + p / PER) % 1
        const a = level * Math.min(1, u * 8) * Math.min(1, (1 - u) * 5)
        positions[q * 3] = items[g]
        positions[q * 3 + 1] = y0 + (y1 - y0) * u * u
        positions[q * 3 + 2] = items[g + 1]
        // Dark paper: additive and brighter than 1, so bloom takes it. Light paper: the accent, by alpha.
        const lift = palette.dark ? 0.6 + 2.6 * a : 1
        colors[q * 4] = accent.r * lift
        colors[q * 4 + 1] = accent.g * lift
        colors[q * 4 + 2] = accent.b * lift
        colors[q * 4 + 3] = a
      }
    }
    points.geometry.attributes.position.needsUpdate = true
    points.geometry.attributes.color.needsUpdate = true
  })

  if (!count) return null
  return (
    <group>
      <primitive object={points} />
      <lineSegments geometry={lines}>
        <lineBasicMaterial color={palette.accent} transparent opacity={0.3} toneMapped={false} />
      </lineSegments>
    </group>
  )
}

/** The panel row under the pointer, marked on the selected nuclide's stack. */
function RowMarker({ model, palette, focus, row }: { model: Model; palette: Palette; focus: number; row: number }) {
  if (focus < 0 || row < 0 || row >= model.size[focus]) return null
  const k = model.start[focus] + row
  return (
    <mesh position={[model.n[focus], model.energy[k] * Y_PER_KEV, -model.z[focus]]}>
      <boxGeometry args={[1.8, 0.1, 1.8]} />
      <meshBasicMaterial color={palette.accent} toneMapped={false} />
    </mesh>
  )
}

/** A nuclide's name above its stack. */
function Tag({ model, i, strong }: { model: Model; i: number; strong?: boolean }) {
  return (
    <Html position={[model.n[i], Math.max(model.top[i] * Y_PER_KEV, 0) + 1.6, -model.z[i]]} center zIndexRange={[10, 0]} pointerEvents="none">
      <span
        className={`whitespace-nowrap rounded border bg-[var(--paper)] px-1.5 py-0.5 text-[11px] ${strong ? 'border-[var(--paper-strong)] text-[var(--paper-strong)]' : 'border-[var(--paper-rule-soft)] text-[var(--paper-text)]'}`}
        style={MONO}
      >
        {label(model, i)}
      </span>
    </Html>
  )
}

/** Hover and click: the ray against one box per nuclide column (3,350 slab tests), nearest hit wins. A press
 *  that moves more than 5px is an orbit, not a click. */
function Picker({ model, onSelect, onHover }: { model: Model; onSelect: (i: number) => void; onHover: (i: number) => void }) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const latest = React.useRef({ onSelect, onHover })
  latest.current = { onSelect, onHover }

  React.useEffect(() => {
    const el = gl.domElement
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const pick = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const o = ray.ray.origin
      const d = ray.ray.direction
      const ix = 1 / d.x
      const iy = 1 / d.y
      const iz = 1 / d.z
      let best = -1
      let bestT = Infinity
      for (let i = 0; i < model.count; i++) {
        const x = model.n[i]
        const z = -model.z[i]
        const h = Math.max(model.top[i] * Y_PER_KEV, 0.4)
        let a = (x - 0.5 - o.x) * ix
        let b = (x + 0.5 - o.x) * ix
        let lo = Math.min(a, b)
        let hi = Math.max(a, b)
        a = (-0.05 - o.y) * iy
        b = (h - o.y) * iy
        lo = Math.max(lo, Math.min(a, b))
        hi = Math.min(hi, Math.max(a, b))
        a = (z - 0.5 - o.z) * iz
        b = (z + 0.5 - o.z) * iz
        lo = Math.max(lo, Math.min(a, b))
        hi = Math.min(hi, Math.max(a, b))
        if (hi >= Math.max(lo, 0) && lo < bestT) {
          bestT = lo
          best = i
        }
      }
      return best
    }

    let down: [number, number] | null = null
    let queued: PointerEvent | null = null
    let frame = 0
    let last = -1
    const hover = (i: number) => {
      if (i === last) return
      last = i
      el.style.cursor = i >= 0 ? 'pointer' : ''
      latest.current.onHover(i)
    }
    const onDown = (e: PointerEvent) => {
      down = [e.clientX, e.clientY]
    }
    const onUp = (e: PointerEvent) => {
      if (!down || e.button !== 0) return
      const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1])
      down = null
      if (moved > 5) return
      const i = pick(e)
      if (i >= 0) latest.current.onSelect(i)
    }
    const onMove = (e: PointerEvent) => {
      if (e.buttons) return
      queued = e
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (queued) hover(pick(queued))
      })
    }
    const onLeave = () => hover(-1)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [model, camera, gl])

  return null
}

type Controls = {
  target: THREE.Vector3
  update: () => void
  addEventListener: (type: 'start', fn: () => void) => void
  removeEventListener: (type: 'start', fn: () => void) => void
}

/** The camera moves to a newly selected nuclide, keeping its viewing direction; any drag cancels the move. */
function Rig({ model, focus }: { model: Model; focus: number }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as Controls | null
  const goal = React.useRef<{ target: THREE.Vector3; pos: THREE.Vector3 } | null>(null)
  const last = React.useRef(focus)

  React.useEffect(() => {
    if (focus === last.current) return
    last.current = focus
    if (focus < 0 || !controls) return
    const h = Math.max(model.top[focus] * Y_PER_KEV, 1)
    const target = new THREE.Vector3(model.n[focus], h / 2, -model.z[focus])
    const dir = camera.position.clone().sub(controls.target).normalize()
    const dist = Math.min(90, Math.max(30, h * 1.6))
    goal.current = { target, pos: target.clone().addScaledVector(dir, dist) }
  }, [focus, model, camera, controls])

  React.useEffect(() => {
    if (!controls) return
    const stop = () => {
      goal.current = null
    }
    controls.addEventListener('start', stop)
    return () => controls.removeEventListener('start', stop)
  }, [controls])

  useFrame((_, dt) => {
    const g = goal.current
    if (!g || !controls) return
    const k = 1 - Math.exp(-dt * 3.2)
    controls.target.lerp(g.target, k)
    camera.position.lerp(g.pos, k)
    controls.update()
    if (camera.position.distanceTo(g.pos) < 0.05 && controls.target.distanceTo(g.target) < 0.05) goal.current = null
  })

  return null
}
