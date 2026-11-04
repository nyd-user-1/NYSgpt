'use client'

import * as React from 'react'

// The /viz pages' one shared mechanism: mount an ECharts canvas in a ref'd div, loading echarts
// (and echarts-gl, when the chart needs WebGL) on the client only — the GL bundle touches window
// at import time, so neither may load during SSR. The option builder runs once the libraries are
// in; resize follows the div.

export function useEChart(build: () => unknown, gl = false): React.RefObject<HTMLDivElement | null> {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chart: any
    let disposed = false
    let ro: ResizeObserver | undefined
    ;(async () => {
      const echarts = await import('echarts')
      if (gl) await import('echarts-gl' as string)
      if (disposed || !ref.current) return
      chart = echarts.init(ref.current, undefined, { renderer: 'canvas' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chart.setOption(build() as any)
      ro = new ResizeObserver(() => chart?.resize())
      ro.observe(ref.current)
    })()
    return () => {
      disposed = true
      ro?.disconnect()
      chart?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return ref
}
