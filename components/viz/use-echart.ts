'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { VIZ_POINT } from '@/lib/pane'

import { useShellPanel } from '@/components/shell'

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

type Zoom = { type?: string; id?: string; xAxisIndex?: unknown; yAxisIndex?: unknown; filterMode?: string; [k: string]: unknown }
type Option = { dataZoom?: Zoom[] | Zoom; xAxis?: unknown; yAxis?: unknown; tooltip?: Record<string, unknown> }
type Pan = { id: string; axis: 'x' | 'y' }

/** Trackpad navigation (Brendan, 2026-11-04). On a cartesian chart, a pinch zooms — it arrives as a wheel with
 *  ctrlKey, which ECharts' inside dataZoom takes (zoomOnMouseWheel 'ctrl') — and a two-finger scroll pans: the
 *  hook moves each inside zoom's window by the wheel's deltaX / deltaY itself, since ECharts' own wheel-move reads
 *  only the vertical delta. A page's own inside zooms take the same settings; an x zoom is added where there is
 *  none, linked to the page's slider through their shared axes; a y zoom only on charts with one y axis and no
 *  slider. Added zooms never filter series ('none'), so the opening view is unchanged. Returns the zooms to pan.
 *  GL scenes (no xAxis/yAxis) keep their own orbit. */
const PINCH = { zoomOnMouseWheel: 'ctrl', moveOnMouseWheel: false }
function withTrackpad(o: Option): Pan[] {
  if (!o.xAxis || !o.yAxis) return []
  const zooms: Zoom[] = Array.isArray(o.dataZoom) ? o.dataZoom : o.dataZoom ? [o.dataZoom] : []
  const pans: Pan[] = []
  zooms.forEach((z, i) => {
    if (z.type !== 'inside') return
    Object.assign(z, PINCH)
    z.id ??= `pan-${i}`
    pans.push({ id: z.id, axis: z.yAxisIndex !== undefined && z.xAxisIndex === undefined ? 'y' : 'x' })
  })
  const slider = zooms.find((z) => z.type === 'slider' && z.yAxisIndex === undefined)
  if (!pans.some((p) => p.axis === 'x')) {
    const xAxisIndex = slider?.xAxisIndex ?? (Array.isArray(o.xAxis) ? o.xAxis.map((_, i) => i) : 0)
    zooms.push({ type: 'inside', id: 'pan-x', xAxisIndex, filterMode: slider ? (slider.filterMode ?? 'filter') : 'none', moveOnMouseMove: false, ...PINCH })
    pans.push({ id: 'pan-x', axis: 'x' })
  }
  if (!pans.some((p) => p.axis === 'y') && !slider && !Array.isArray(o.yAxis)) {
    zooms.push({ type: 'inside', id: 'pan-y', yAxisIndex: 0, filterMode: 'none', moveOnMouseMove: false, ...PINCH })
    pans.push({ id: 'pan-y', axis: 'y' })
  }
  o.dataZoom = zooms
  return pans
}

/** The crosshair's lines (Brendan, 2026-11-04): cartesian charts pair the + cursor with the inspector's
 *  cross — two faint guide lines tracking the pointer. GL scenes have no axes to cross. Applied on every
 *  draw: the theme flip's redraw replaces the whole option, so the lines must ride it too. */
function withCross(o: unknown): Option {
  const option = o as Option
  if (option.xAxis && option.yAxis)
    option.tooltip = {
      ...(option.tooltip ?? {}),
      axisPointer: { type: 'cross', crossStyle: { color: '#94a3b8', width: 1, opacity: 0.6 }, label: { show: false } },
    }
  return option
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
    let onWheel: ((e: WheelEvent) => void) | undefined
    let wheelEl: HTMLElement | null = null
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
      let pans: Pan[] = []
      /** Build, add the crosshair and the trackpad zooms, theme, draw — the first draw and every redraw. */
      const draw = (notMerge: boolean) => {
        const option = withCross(latest.current.build(data, latest.current.view))
        pans = withTrackpad(option)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chart.setOption(themed(option, dark) as any, notMerge)
        return option
      }
      const option = draw(false)
      const slider = Array.isArray(option.dataZoom) && option.dataZoom.some((d) => d.type === 'slider')
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
      const setCursor = zr.setCursorStyle.bind(zr)
      zr.setCursorStyle = (c: string) => setCursor(c === 'default' || c === 'pointer' ? 'crosshair' : c)
      zr.setCursorStyle('crosshair')
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
      ro = new ResizeObserver(() => chart?.resize())
      ro.observe(ref.current)
      mo = new MutationObserver(() => {
        if (isDark() === dark) return
        dark = isDark()
        draw(true)
      })
      redraw.current = () => draw(latest.current.replace)
      // A two-finger scroll pans each zoom's window by the wheel's own axis (withTrackpad); a pinch (ctrlKey) is
      // ECharts' zoom. Held from the page too, so a sideways swipe over a chart never turns into "back".
      wheelEl = ref.current
      onWheel = (e: WheelEvent) => {
        if (!pans.length || e.ctrlKey) return
        e.preventDefault()
        const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? chart.getHeight() : 1
        const panY = pans.some((p) => p.axis === 'y')
        const model = chart.getModel()
        for (const p of pans) {
          const dz = model.queryComponents({ mainType: 'dataZoom', id: p.id })[0]
          if (!dz) continue
          const [s, end] = dz.getPercentRange() as [number, number]
          const span = end - s
          // Natural scrolling: content follows the fingers. A chart with no y zoom pans x on a vertical scroll too.
          const d = p.axis === 'x' ? (e.deltaX + (panY ? 0 : e.deltaY)) / chart.getWidth() : -e.deltaY / chart.getHeight()
          if (span >= 100 || !d) continue
          const start = Math.min(100 - span, Math.max(0, s + d * k * span))
          chart.dispatchAction({ type: 'dataZoom', dataZoomId: p.id, start, end: start + span })
        }
      }
      wheelEl.addEventListener('wheel', onWheel, { passive: false })
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      // A table row pointing here (VIZ_POINT, 2026-11-04): the crosshair walks to that datum —
      // showTip lands the cross and the tooltip on series 0 at the row's index.
      const point = (d: { type?: string; slug?: string; row?: number } | null) => {
        if (!d || d.type !== VIZ_POINT || typeof d.row !== 'number') return
        const slug = latest.current.path?.split('/').filter(Boolean).pop()
        if (d.slug && slug && d.slug !== slug) return
        const at = latest.current.point ? latest.current.point(d.row) : { seriesIndex: 0, dataIndex: d.row }
        if (at) chart?.dispatchAction({ type: 'showTip', ...at })
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
      if (onWheel) wheelEl?.removeEventListener('wheel', onWheel)
      chart?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  React.useEffect(() => {
    redraw.current?.()
  }, [extras.view])
  return ref
}
