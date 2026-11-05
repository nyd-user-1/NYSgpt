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
export type ChartClick = { seriesIndex?: number; dataIndex?: number; dataType?: string }
/** The row a click names when the chart's first series draws the snapshot's rows in order. */
export const firstSeriesRow = (p: ChartClick) => (p.seriesIndex === 0 && typeof p.dataIndex === 'number' ? p.dataIndex : null)

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

export function useEChart<D>(
  load: () => Promise<D>,
  build: (data: D) => unknown,
  gl = false,
  rowOf?: (p: ChartClick) => number | null,
): React.RefObject<HTMLDivElement | null> {
  const ref = React.useRef<HTMLDivElement>(null)
  const path = usePathname()
  const { openPane } = useShellPanel()
  const latest = React.useRef({ path, openPane, rowOf })
  latest.current = { path, openPane, rowOf }
  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chart: any
    let disposed = false
    let ro: ResizeObserver | undefined
    let mo: MutationObserver | undefined
    let onMsg: ((e: MessageEvent) => void) | undefined
    let onEvt: EventListener | undefined
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
      const option = withCross(build(data))
      const slider = Array.isArray(option.dataZoom) && option.dataZoom.some((d) => d.type === 'slider')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chart.setOption(themed(option, dark) as any)
      // The datum under a click, when there is one; the canvas's own click decides whether it was a click.
      let hit: number | null = null
      let down: [number, number] | null = null
      chart.on('click', (p: ChartClick) => {
        hit = latest.current.rowOf?.(p) ?? null
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
          return
        }
        // A beat, so a datum's click event (which a GL layer may send after the canvas's) lands first.
        window.setTimeout(() => {
          const row = hit
          hit = null
          const slug = latest.current.path?.split('/').filter(Boolean).pop()
          if (slug) latest.current.openPane(`/viz/data/${slug}${row !== null && row >= 0 ? `?row=${row}` : ''}`)
        }, 0)
      })
      ro = new ResizeObserver(() => chart?.resize())
      ro.observe(ref.current)
      mo = new MutationObserver(() => {
        if (isDark() === dark) return
        dark = isDark()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chart?.setOption(themed(withCross(build(data)), dark) as any, true)
      })
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      // A table row pointing here (VIZ_POINT, 2026-11-04): the crosshair walks to that datum —
      // showTip lands the cross and the tooltip on series 0 at the row's index.
      const point = (d: { type?: string; slug?: string; row?: number } | null) => {
        if (!d || d.type !== VIZ_POINT || typeof d.row !== 'number') return
        const slug = latest.current.path?.split('/').filter(Boolean).pop()
        if (d.slug && slug && d.slug !== slug) return
        chart?.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: d.row })
      }
      onMsg = (e: MessageEvent) => { if (e.origin === window.location.origin) point(e.data as Parameters<typeof point>[0]) }
      onEvt = ((e: Event) => point((e as CustomEvent).detail)) as EventListener
      window.addEventListener('message', onMsg)
      window.addEventListener(VIZ_POINT, onEvt)
    })()
    return () => {
      disposed = true
      ro?.disconnect()
      mo?.disconnect()
      if (onMsg) window.removeEventListener('message', onMsg)
      if (onEvt) window.removeEventListener(VIZ_POINT, onEvt)
      chart?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return ref
}
