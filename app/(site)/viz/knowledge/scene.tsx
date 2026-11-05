'use client'

// The knowledge map (/viz/knowledge, prototype C, 2026-11-04): every nuclide the literature indexes, at (N, Z).
// Evaluated nuclides are spheres sized by the levels in their ENSDF Adopted Levels deck and coloured by the years
// since the evaluation's literature cutoff; nuclides studied in papers but never evaluated are grey rings.
// Click one for its counts: papers, EXFOR entries, levels, ENSDF cards, XUNDL sets, cutoff.

import * as React from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { X } from 'lucide-react'
import { AGE_MAX, AGE_STOPS, NEVER, SNAPSHOT_YEAR, knowledgeName, loadKnowledge, type KnowledgeRow } from '@/lib/viz-knowledge'

const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const

const N0 = 95
const Z0 = 60
const N_MAX = 200
const Z_MAX = 120

const radius = (levels: number) => Math.min(1.6, 0.22 + 0.06 * Math.sqrt(levels))
const age = (r: KnowledgeRow) => Math.max(0, SNAPSHOT_YEAR - r.cutoff)

function useTheme(el: React.RefObject<HTMLDivElement | null>) {
  const [theme, setTheme] = React.useState({ dark: false, paper: '#ffffff', ink: '#16181d' })
  React.useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(el.current ?? document.body)
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

type Palette = { bg: THREE.Color; ink: THREE.Color; grid: THREE.Color; stops: THREE.Color[]; never: THREE.Color }
function palette(dark: boolean, paper: string, ink: string): Palette {
  const bg = new THREE.Color(dark ? '#15120d' : '#ffffff')
  try { bg.set(paper) } catch { /* keep the theme default */ }
  const inkC = new THREE.Color(dark ? '#f0e9d8' : '#16181d')
  try { inkC.set(ink) } catch { /* keep the theme default */ }
  const stops = (dark ? AGE_STOPS.dark : AGE_STOPS.light).map((c) => new THREE.Color(c))
  return { bg, ink: inkC, grid: inkC.clone().lerp(bg, 0.88), stops, never: new THREE.Color(dark ? NEVER.dark : NEVER.light) }
}

/** The age scale at t ∈ [0, 1]: teal → amber → rust. */
function ageColor(stops: THREE.Color[], t: number, out: THREE.Color) {
  const u = Math.min(1, Math.max(0, t)) * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(u))
  return out.copy(stops[i]).lerp(stops[i + 1], u - i)
}

const Chart = React.memo(function Chart({
  rows, evaluated, never, pal, selected, onSelect, onHover,
}: {
  rows: KnowledgeRow[]
  evaluated: number[]
  never: number[]
  pal: Palette
  selected: number | null
  onSelect: (i: number | null) => void
  onHover: (i: number | null) => void
}) {
  const spheres = React.useRef<THREE.InstancedMesh>(null)
  const rings = React.useRef<THREE.InstancedMesh>(null)
  const ringGeom = React.useMemo(() => new THREE.RingGeometry(0.28, 0.42, 20).rotateX(-Math.PI / 2), [])

  React.useLayoutEffect(() => {
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), c = new THREE.Color()
    const sp = spheres.current
    if (sp) {
      evaluated.forEach((ri, k) => {
        const r = rows[ri]
        p.set(r.n - N0, 0, -(r.z - Z0))
        s.setScalar(radius(r.levels))
        sp.setMatrixAt(k, m.compose(p, q, s))
        sp.setColorAt(k, ageColor(pal.stops, age(r) / AGE_MAX, c))
      })
      sp.instanceMatrix.needsUpdate = true
      if (sp.instanceColor) sp.instanceColor.needsUpdate = true
      sp.computeBoundingSphere()
    }
    const rg = rings.current
    if (rg) {
      never.forEach((ri, k) => {
        const r = rows[ri]
        p.set(r.n - N0, 0, -(r.z - Z0))
        s.setScalar(1)
        rg.setMatrixAt(k, m.compose(p, q, s))
        rg.setColorAt(k, pal.never)
      })
      rg.instanceMatrix.needsUpdate = true
      if (rg.instanceColor) rg.instanceColor.needsUpdate = true
      rg.computeBoundingSphere()
    }
  }, [rows, evaluated, never, pal])

  const grid = React.useMemo(() => {
    const pts: number[] = []
    for (let n = 0; n <= N_MAX; n += 10) pts.push(n - N0, -0.6, Z0, n - N0, -0.6, -(Z_MAX - Z0))
    for (let z = 0; z <= Z_MAX; z += 10) pts.push(-N0, -0.6, -(z - Z0), N_MAX - N0, -0.6, -(z - Z0))
    return new Float32Array(pts)
  }, [])

  const handlers = (list: number[]) => ({
    onClick: (e: { delta: number; instanceId?: number; stopPropagation: () => void }) => {
      if (e.delta > 4 || e.instanceId === undefined) return
      e.stopPropagation()
      onSelect(list[e.instanceId])
    },
    onPointerMove: (e: { instanceId?: number; stopPropagation: () => void }) => {
      e.stopPropagation()
      onHover(e.instanceId === undefined ? null : list[e.instanceId])
    },
    onPointerOut: () => onHover(null),
  })

  const sel = selected === null ? null : rows[selected]

  return (
    <>
      <color attach="background" args={[pal.bg]} />
      <lineSegments frustumCulled={false} raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[grid, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={pal.grid} toneMapped={false} />
      </lineSegments>
      <Html position={[N_MAX - N0 + 6, -0.6, Z0]} center style={{ ...MONO, fontSize: 11, color: 'var(--paper-faint)', pointerEvents: 'none' }}>
        N
      </Html>
      <Html position={[-N0, -0.6, -(Z_MAX - Z0) - 6]} center style={{ ...MONO, fontSize: 11, color: 'var(--paper-faint)', pointerEvents: 'none' }}>
        Z
      </Html>

      <instancedMesh ref={rings} args={[ringGeom, undefined, never.length]} frustumCulled={false} {...handlers(never)}>
        <meshBasicMaterial toneMapped={false} side={THREE.DoubleSide} />
        <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(never.length * 3), 3]} />
      </instancedMesh>

      <instancedMesh ref={spheres} args={[undefined, undefined, evaluated.length]} frustumCulled={false} {...handlers(evaluated)}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshBasicMaterial toneMapped={false} />
        <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(evaluated.length * 3), 3]} />
      </instancedMesh>

      {sel && (
        <mesh position={[sel.n - N0, 0, -(sel.z - Z0)]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <torusGeometry args={[(sel.evaluated ? radius(sel.levels) : 0.42) + 0.5, 0.1, 8, 40]} />
          <meshBasicMaterial color={pal.ink} toneMapped={false} />
        </mesh>
      )}
    </>
  )
})

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-t border-[var(--paper-rule)]/10 py-1.5 text-[12px]">
      <span className="text-[var(--paper-muted)]">{label}</span>
      <span className="tabular-nums" style={MONO}>
        {value}
      </span>
    </div>
  )
}

export default function KnowledgeScene() {
  const box = React.useRef<HTMLDivElement>(null)
  const theme = useTheme(box)
  const [rows, setRows] = React.useState<KnowledgeRow[] | null>(null)
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => {
    loadKnowledge().then(setRows, () => setFailed(true))
  }, [])
  const split = React.useMemo(() => {
    if (!rows) return null
    const evaluated: number[] = []
    const never: number[] = []
    rows.forEach((r, i) => (r.evaluated ? evaluated : never).push(i))
    return { evaluated, never }
  }, [rows])
  const pal = React.useMemo(() => palette(theme.dark, theme.paper, theme.ink), [theme])
  const [selected, setSelected] = React.useState<number | null>(null)
  const [hover, setHover] = React.useState<number | null>(null)
  const onHover = React.useCallback((i: number | null) => setHover((h) => (h === i ? h : i)), [])

  const stops = theme.dark ? AGE_STOPS.dark : AGE_STOPS.light
  const hovered = rows && hover !== null ? rows[hover] : null
  const sel = rows && selected !== null ? rows[selected] : null
  const fmt = (v: number) => v.toLocaleString('en')

  return (
    <div ref={box} className="relative min-h-0 flex-1 overflow-hidden rounded-xl" style={{ ...SANS, cursor: hover !== null ? 'pointer' : undefined }}>
      {rows && split ? (
        <Canvas flat dpr={[1, 2]} camera={{ position: [0, 170, 120], fov: 42, near: 1, far: 3000 }}>
          <Chart rows={rows} evaluated={split.evaluated} never={split.never} pal={pal} selected={selected} onSelect={setSelected} onHover={onHover} />
          <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.08} minDistance={25} maxDistance={700} />
          {theme.dark && (
            <EffectComposer multisampling={0}>
              <Bloom mipmapBlur intensity={0.35} luminanceThreshold={0.6} luminanceSmoothing={0.25} />
            </EffectComposer>
          )}
        </Canvas>
      ) : (
        <div className="flex h-full items-center justify-center text-[13px] text-[var(--paper-muted)]">
          {failed ? 'The knowledge data didn’t load.' : 'Loading 7,986 nuclides…'}
        </div>
      )}

      {/* Legend */}
      <div className="pointer-events-none absolute left-4 top-4 flex w-[210px] flex-col gap-2 rounded-xl border border-[var(--paper-rule)]/15 bg-[var(--paper)]/85 px-3 py-2.5 text-[11px] text-[var(--paper-text)] backdrop-blur-sm">
        <span>Years since evaluation</span>
        <span className="h-2 w-full rounded-full" style={{ background: `linear-gradient(to right, ${stops.join(', ')})` }} />
        <span className="-mt-1 flex justify-between text-[10px] text-[var(--paper-faint)]" style={MONO}>
          <span>0</span>
          <span>15</span>
          <span>{AGE_MAX}+</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: theme.dark ? NEVER.dark : NEVER.light }} />
          Studied, never evaluated
        </span>
        <span className="text-[10px] text-[var(--paper-faint)]" style={MONO}>
          size: adopted levels
        </span>
      </div>

      {/* Hovered nuclide */}
      {hovered && !sel && (
        <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl border border-[var(--paper-rule)]/15 bg-[var(--paper)]/90 px-3 py-2 text-[12px] text-[var(--paper-text)] backdrop-blur-sm">
          <span className="font-medium">{knowledgeName(hovered)}</span>
          <span className="ml-2 text-[var(--paper-muted)]" style={MONO}>
            {fmt(hovered.papers)} papers · {hovered.evaluated ? `cutoff ${hovered.cutoff || '—'}` : 'never evaluated'}
          </span>
        </div>
      )}

      {/* Counts */}
      {sel && (
        <div className="absolute right-4 top-16 w-[280px] rounded-xl border border-[var(--paper-rule)]/15 bg-[var(--paper)]/95 px-4 pb-3 pt-4 text-[var(--paper-text)] backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[22px] leading-none" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                {knowledgeName(sel)}
              </div>
              <div className="mt-1.5 text-[11px] text-[var(--paper-muted)]" style={MONO}>
                Z {sel.z} · N {sel.n}
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
          <div className="mt-3">
            <Row label="Papers" value={fmt(sel.papers)} />
            <Row label="EXFOR entries" value={fmt(sel.exfor)} />
            <Row label="XUNDL datasets" value={fmt(sel.xundl)} />
            {sel.evaluated ? (
              <>
                <Row label="Adopted levels" value={fmt(sel.levels)} />
                <Row label="ENSDF cards" value={fmt(sel.cards)} />
                <Row label="Evaluation cutoff" value={sel.cutoff ? `${sel.cutoff} (${age(sel)} y ago)` : '—'} />
              </>
            ) : (
              <Row label="ENSDF evaluation" value="None" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
