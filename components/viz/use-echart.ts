'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { VIZ_POINT } from '@/lib/pane'

import { useShellPanel } from '@/components/shell'
import { inspectorOn } from '@/components/dev/inspector-state'

// The /viz pages' one shared mechanism: mount an ECharts canvas in a ref'd div, loading echarts
// (and echarts-gl, when the chart needs WebGL) on the client only — the GL bundle touches window
// at import time, so neither may load during SSR. The chart's data (lib/viz-data.ts, a static file
// under public/viz-data/) is fetched alongside the libraries, and the option builder runs on it once
// both are in; resize follows the div.
//
// The theme (2026-11-04): the charts sit on the app's paper in light or dark, so the option is
// recoloured for the active mode here, once for all twelve, and redrawn when <html>'s class flips.
// Dark: the slate axis ink lightens, the navy series brightens, the diverging matrix ramp goes to
// its dark form. Light: ramps that climb from navy to near-white run the other way, so the dense
// end reads on white; near-white marks go navy. Both: the GL scenes' black environment becomes
// transparent, the paper shows through.
//
// The click (2026-11-04): a click anywhere on a chart opens its data table, /viz/data/<slug>, in the second
// panel — on the row of the datum clicked when the chart can name it (`rowOf`). A drag (a 3D orbit, a
// zoom) is not a click, nor is a press on a zoom slider along the foot. Nothing else rides the charts.

/** What ECharts hands a click on a datum. */
export type ChartClick = { seriesIndex?: number; dataIndex?: number; dataType?: string; seriesType?: string; value?: unknown }
/** The row a click names when the chart's first series draws the snapshot's rows in order. */
export const firstSeriesRow = (p: ChartClick) => (p.seriesIndex === 0 && typeof p.dataIndex === 'number' ? p.dataIndex : null)
/** The row a click names when each datum carries its snapshot row at position `i` of its value array. */
export const valueRow = (i: number) => (p: ChartClick) =>
  Array.isArray(p.value) && typeof p.value[i] === 'number' ? (p.value[i] as number) : null

const DARK: Record<string, string> = {
  '#334155': '#cbd5e1',
  '#475569': '#94a3b8',
  '#64748b': '#94a3b8',
  '#1e3a8a': '#60a5fa',
  '#f9f9f9': '#15120d',
}
const DARK_RAMP: Record<string, string> = {
  '#dc2626': '#f87171',
  '#fca5a5': '#991b1b',
  '#f8fafc': '#1e293b',
  '#93c5fd': '#1d4ed8',
  '#1e3a8a': '#60a5fa',
}
const LIGHT: Record<string, string> = {
  '#e0f2fe': '#1e3a8a',
  '#bfefff': '#1d4ed8',
  '#1e293b': '#cbd5e1',
  '#10192e': '#cbd5e1',
  '#f9f9f9': '#ffffff',
}
/** Ramps that start this dark climb to near-white — reversed on light paper. */
const DARK_START = new Set(['#172554', '#0b1a3a', '#13306b', '#060b18'])

function themed(v: unknown, dark: boolean, inRamp = false): unknown {
  if (typeof v === 'string') {
    if (v === '#05070d') return 'none'
    const map = dark ? (inRamp ? DARK_RAMP : DARK) : inRamp ? {} : LIGHT
    return map[v] ?? v
  }
  if (Array.isArray(v)) {
    const out = v.map((x) => themed(x, dark, inRamp))
    return !dark && inRamp && typeof v[0] === 'string' && DARK_START.has(v[0]) ? out.reverse() : out
  }
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, themed(x, dark, inRamp || k === 'visualMap')]))
  }
  return v
}

const isDark = () => document.documentElement.classList.contains('dark')

type Option = { dataZoom?: { type?: string }[]; xAxis?: unknown; yAxis?: unknown; tooltip?: Record<string, unknown> }

/** ECharts' own axis pointer is off on cartesian charts (Brendan, 2026-11-05): the inspector's rules (below)
 *  are the chart's one crosshair, so ECharts' grey dashed cross, or an axis chart's snapped line, would be a
 *  second. The tooltip still follows the pointer. Applied on every draw: the theme flip's redraw replaces
 *  the whole option. */
function withCross(o: unknown): Option {
  const option = o as Option
  if (option.xAxis && option.yAxis) option.tooltip = { ...(option.tooltip ?? {}), axisPointer: { type: 'none' } }
  return option
}

/** The inspector's rules (components/dev/inspector.tsx TraceOverlay), to the pixel: 1px of this blue. */
const RULE = 'rgba(59,130,246,0.5)'

/** Two rules through a point. Over a chart they cross the window, as the inspector's do; at a datum a table
 *  row points to, they stay inside the chart's box. */
function makeRules() {
  const line = () => {
    const d = document.createElement('div')
    d.setAttribute('aria-hidden', 'true')
    Object.assign(d.style, { position: 'fixed', left: '0', top: '0', pointerEvents: 'none', zIndex: '2147483644', background: RULE, display: 'none' })
    document.body.append(d)
    return d
  }
  const v = line()
  const h = line()
  return {
    at(x: number, y: number, box?: DOMRect) {
      Object.assign(v.style, { display: '', left: `${x}px`, top: box ? `${box.top}px` : '0', width: '1px', height: box ? `${box.height}px` : '100dvh' })
      Object.assign(h.style, { display: '', top: `${y}px`, left: box ? `${box.left}px` : '0', height: '1px', width: box ? `${box.width}px` : '100dvw' })
    },
    hide() {
      v.style.display = 'none'
      h.style.display = 'none'
    },
    remove() {
      v.remove()
      h.remove()
    },
  }
}

/** Where a datum sits on a 2D chart's canvas, or null (GL scenes, polar, anything that won't say). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pixelOf(chart: any, at: { seriesIndex: number; dataIndex: number }): [number, number] | null {
  try {
    const series = chart?.getModel?.()?.getSeriesByIndex(at.seriesIndex)
    const cs = series?.coordinateSystem
    if (!cs || cs.type !== 'cartesian2d') return null
    const data = series.getData()
    const p = cs.dataToPoint(cs.dimensions.map((d: string) => data.get(data.mapDimension(d), at.dataIndex)))
    return p && Number.isFinite(p[0]) && Number.isFinite(p[1]) ? [p[0], p[1]] : null
  } catch {
    return null
  }
}

/** Optional extras (2026-11-04, chart batches A and B).
 *  `view`: a state of the chart's own — points or bars, one isotope chain or another, a selected nuclide. When
 *    it changes, build runs again with it: merged, so marks animate to their new places, or replaced whole when
 *    `replace` is set, which universalTransition between series of different types needs.
 *  `point`: the datum a table row points at, for charts whose first series isn't drawn in table order; it may
 *    act on the row itself and return null.
 *  `onPick`: a click on a datum goes here instead of opening the data table; a click on blank ground does nothing. */
export type EChartExtras = {
  view?: number
  replace?: boolean
  point?: (row: number) => { seriesIndex: number; dataIndex: number } | null
  onPick?: (p: ChartClick) => void
}

export function useEChart<D>(
  load: () => Promise<D>,
  build: (data: D, view: number) => unknown,
  gl = false,
  rowOf?: (p: ChartClick) => number | null,
  extras: EChartExtras = {},
): React.RefObject<HTMLDivElement | null> {
  const ref = React.useRef<HTMLDivElement>(null)
  const path = usePathname()
  const { openPane } = useShellPanel()
  const now = { path, openPane, rowOf, build, view: extras.view ?? 0, replace: !!extras.replace, point: extras.point, onPick: extras.onPick }
  const latest = React.useRef(now)
  latest.current = now
  const redraw = React.useRef<(() => void) | null>(null)
  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chart: any
    let disposed = false
    let ro: ResizeObserver | undefined
    let mo: MutationObserver | undefined
    let onMsg: ((e: MessageEvent) => void) | undefined
    let onEvt: EventListener | undefined
    let rules: ReturnType<typeof makeRules> | undefined
    let unhook: (() => void) | undefined
    ;(async () => {
      const [echarts, data] = await Promise.all([
        import('echarts').then(async (m) => {
          if (gl) await import('echarts-gl' as string)
          return m
        }),
        load(),
      ])
      if (disposed || !ref.current) return
      chart = echarts.init(ref.current, undefined, { renderer: 'canvas' })
      let dark = isDark()
      const option = withCross(build(data, latest.current.view))
      const slider = Array.isArray(option.dataZoom) && option.dataZoom.some((d) => d.type === 'slider')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chart.setOption(themed(option, dark) as any)
      // The datum under a click, when there is one; the canvas's own click decides whether it was a click.
      let hit: number | null = null
      let picked: ChartClick | null = null
      let down: [number, number] | null = null
      chart.on('click', (p: ChartClick) => {
        hit = latest.current.rowOf?.(p) ?? null
        picked = p
      })
      const zr = chart.getZr()
      // The + cursor belongs to the chart's ground and its data ALONE (Brendan, 2026-11-04): the
      // old CSS !important blanketed the whole canvas — slider included, since it's the same
      // canvas. Here zrender itself decides: blank ground and data (default/pointer) become the
      // cross; the zoom slider's own move/resize cursors stay; off the canvas, nothing changes.
      // The patch sits on the handler's DOM proxy (2026-11-05): a hover sets the cursor through
      // proxy.setCursor directly (zrender Handler.mousemove), so patching zr.setCursorStyle left
      // the arrow on every move after the first.
      const box = ref.current
      const r = makeRules()
      rules = r
      let cross = true
      let over = false
      const proxy = zr.handler?.proxy as { setCursor?: (c?: string) => void } | undefined
      if (proxy?.setCursor) {
        const setCursor = proxy.setCursor.bind(proxy)
        proxy.setCursor = (c?: string) => {
          const next = !c || c === 'default' || c === 'pointer' ? 'crosshair' : c
          cross = next === 'crosshair'
          if (!cross) r.hide()
          setCursor(next)
        }
      }
      zr.setCursorStyle('crosshair')
      // The rules ride the + (Brendan, 2026-11-05): anywhere over the chart — plot, axes, a GL scene —
      // the inspector's two blue lines cross at the pointer; where the cursor is the slider's own, none.
      // While the inspector itself is on, its rules are already there.
      const move = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return
        over = true
        if (cross && !inspectorOn()) r.at(e.clientX, e.clientY)
        else r.hide()
      }
      const leave = () => {
        over = false
        r.hide()
      }
      // Rules left at a pointed datum go when the page moves under them.
      const stale = () => {
        if (!over) r.hide()
      }
      box.addEventListener('pointermove', move)
      box.addEventListener('pointerleave', leave)
      window.addEventListener('scroll', stale, true)
      unhook = () => {
        box.removeEventListener('pointermove', move)
        box.removeEventListener('pointerleave', leave)
        window.removeEventListener('scroll', stale, true)
      }
      zr.on('mousedown', (e: { offsetX: number; offsetY: number }) => {
        down = [e.offsetX, e.offsetY]
      })
      zr.on('click', (e: { offsetX: number; offsetY: number }) => {
        const moved = down ? Math.hypot(e.offsetX - down[0], e.offsetY - down[1]) : 0
        down = null
        if (moved > 4 || (slider && e.offsetY > chart.getHeight() - 48)) {
          hit = null
          picked = null
          return
        }
        // A beat, so a datum's click event (which a GL layer may send after the canvas's) lands first.
        window.setTimeout(() => {
          const row = hit
          const p = picked
          hit = null
          picked = null
          if (latest.current.onPick) {
            if (p) latest.current.onPick(p)
            return
          }
          const slug = latest.current.path?.split('/').filter(Boolean).pop()
          if (slug) latest.current.openPane(`/viz/data/${slug}${row !== null && row >= 0 ? `?row=${row}` : ''}`)
        }, 0)
      })
      ro = new ResizeObserver(() => {
        chart?.resize()
        stale()
      })
      ro.observe(box)
      mo = new MutationObserver(() => {
        if (isDark() === dark) return
        dark = isDark()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chart?.setOption(themed(withCross(latest.current.build(data, latest.current.view)), dark) as any, true)
      })
      redraw.current = () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chart?.setOption(themed(withCross(latest.current.build(data, latest.current.view)), dark) as any, latest.current.replace)
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      // A table row pointing here (VIZ_POINT, 2026-11-04): the crosshair walks to that datum —
      // showTip lands the tooltip on series 0 at the row's index, and the rules cross at the datum
      // (2026-11-05: they replaced ECharts' cross, which used to land there).
      const point = (d: { type?: string; slug?: string; row?: number } | null) => {
        if (!d || d.type !== VIZ_POINT || typeof d.row !== 'number') return
        const slug = latest.current.path?.split('/').filter(Boolean).pop()
        if (d.slug && slug && d.slug !== slug) return
        const at = latest.current.point ? latest.current.point(d.row) : { seriesIndex: 0, dataIndex: d.row }
        if (!at) return
        chart?.dispatchAction({ type: 'showTip', ...at })
        if (over) return
        const p = pixelOf(chart, at)
        if (!p) return r.hide()
        const b = box.getBoundingClientRect()
        r.at(b.left + p[0], b.top + p[1], b)
      }
      onMsg = (e: MessageEvent) => { if (e.origin === window.location.origin) point(e.data as Parameters<typeof point>[0]) }
      onEvt = ((e: Event) => point((e as CustomEvent).detail)) as EventListener
      window.addEventListener('message', onMsg)
      window.addEventListener(VIZ_POINT, onEvt)
    })()
    return () => {
      disposed = true
      redraw.current = null
      ro?.disconnect()
      mo?.disconnect()
      if (onMsg) window.removeEventListener('message', onMsg)
      if (onEvt) window.removeEventListener(VIZ_POINT, onEvt)
      unhook?.()
      rules?.remove()
      chart?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  React.useEffect(() => {
    redraw.current?.()
  }, [extras.view])
  return ref
}
