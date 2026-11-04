"use client"

import * as React from "react"
import * as echarts from "echarts"

// The expanding line chart, from pax-trinity's resonance figure (src/components/record/
// resonance-charts.tsx): an ECharts canvas line (optionally two) that draws itself in left to
// right over ~900ms on mount, a soft area wash under it, the house axis dress — navy ink, quiet
// slate axes, no gridlines. Trinity's version is welded to its shorts data, its tour and its
// cursor physics; this is the same visual language as a reusable component: hand it series, get
// the draw-in.
//
//   <ExpandLine
//     xLabels={["2019", "2020", "2021"]}
//     series={[{ name: "Citations", data: [12, 48, 90], area: true }]}
//   />

const NAVY = "#1e3a8a"
const RED = "#dc2626"
const AXIS = { fontSize: 12, color: "#334155" }

export type ExpandSeries = {
  name: string
  data: (number | null)[]
  /** The series color; the first defaults to navy, the second to red. */
  color?: string
  /** A soft wash under the line (trinity's 0.1 opacity area). */
  area?: boolean
}

export function ExpandLine({
  xLabels,
  series,
  unit = "",
  height = 280,
  duration = 900,
  className = "",
}: {
  xLabels: (string | number)[]
  series: ExpandSeries[]
  /** Suffix on the y axis labels ("%", "pp", …). */
  unit?: string
  height?: number
  /** The left-to-right draw-in's length, trinity's 900ms by default. */
  duration?: number
  className?: string
}) {
  const el = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const c = echarts.init(el.current!, undefined, { renderer: "canvas" })
    const palette = [NAVY, RED, "#0e7490", "#7c3aed", "#ea580c"]
    const option: echarts.EChartsOption = {
      animation: true,
      animationDuration: duration,
      animationEasing: "cubicOut",
      grid: { left: 44, right: 16, top: 28, bottom: 36 },
      tooltip: { trigger: "axis", valueFormatter: (v: unknown) => `${v}${unit}` },
      legend: series.length > 1 ? { top: 0, left: "right", textStyle: AXIS, icon: "roundRect", itemWidth: 14, itemHeight: 3 } : undefined,
      xAxis: {
        type: "category",
        data: xLabels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: "#475569" } },
        axisTick: { lineStyle: { color: "#475569" } },
        axisLabel: AXIS,
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        axisLine: { show: true, lineStyle: { color: "#475569" } },
        axisTick: { show: true, lineStyle: { color: "#475569" } },
        axisLabel: { ...AXIS, formatter: (t: number) => `${t}${unit}` },
        splitLine: { show: false },
      },
      series: series.map((s, i) => ({
        name: s.name,
        type: "line" as const,
        data: s.data,
        showSymbol: false,
        smooth: 0.15,
        lineStyle: { color: s.color ?? palette[i % palette.length], width: 3 },
        ...(s.area ? { areaStyle: { color: s.color ?? palette[i % palette.length], opacity: 0.1 } } : {}),
      })),
    }
    c.setOption(option)
    const ro = new ResizeObserver(() => c.resize())
    ro.observe(el.current!)
    return () => {
      ro.disconnect()
      c.dispose()
    }
    // Redraw (and re-run the draw-in) only when the data itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify({ xLabels, series, unit, duration })])
  return <div ref={el} style={{ height }} className={`w-full ${className}`.trim()} />
}
