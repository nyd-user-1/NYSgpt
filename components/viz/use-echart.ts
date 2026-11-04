'use client'

import * as React from 'react'

// The /viz pages' one shared mechanism: mount an ECharts canvas in a ref'd div, loading echarts
// (and echarts-gl, when the chart needs WebGL) on the client only — the GL bundle touches window
// at import time, so neither may load during SSR. The option builder runs once the libraries are
// in; resize follows the div.
//
// The theme (2026-11-04): the charts sit on the app's paper in light or dark, so the option is
// recoloured for the active mode here, once for all twelve, and redrawn when <html>'s class flips.
// Dark: the slate axis ink lightens, the navy series brightens, the diverging matrix ramp goes to
// its dark form. Light: ramps that climb from navy to near-white run the other way, so the dense
// end reads on white; near-white marks go navy. Both: the GL scenes' black environment becomes
// transparent, the paper shows through.

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

export function useEChart(build: () => unknown, gl = false): React.RefObject<HTMLDivElement | null> {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chart: any
    let disposed = false
    let ro: ResizeObserver | undefined
    let mo: MutationObserver | undefined
    ;(async () => {
      const echarts = await import('echarts')
      if (gl) await import('echarts-gl' as string)
      if (disposed || !ref.current) return
      chart = echarts.init(ref.current, undefined, { renderer: 'canvas' })
      let dark = isDark()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chart.setOption(themed(build(), dark) as any)
      ro = new ResizeObserver(() => chart?.resize())
      ro.observe(ref.current)
      mo = new MutationObserver(() => {
        if (isDark() === dark) return
        dark = isDark()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chart?.setOption(themed(build(), dark) as any, true)
      })
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    })()
    return () => {
      disposed = true
      ro?.disconnect()
      mo?.disconnect()
      chart?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return ref
}
