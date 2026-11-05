'use client'

// The capture-gamma punch card (2026-11-04, chart batch B): thermal-capture γ intensity by element and energy —
// x 0.5 MeV bins of Eγ, y the element of the product nucleus by Z, the heat the bin's summed intensity averaged
// over that element's product nuclei (log γ per 100 captures), so an element with many isotopes in CapGam
// isn't hotter for it.

import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'
import { E_MAX_KEV, I_FLOOR, PUNCH_BIN_KEV, loadCapgam, punchCells } from '@/lib/viz-gamma'

const AXIS = { nameTextStyle: { color: '#64748b' }, axisLine: { lineStyle: { color: '#1e293b' } }, axisTick: { show: false }, splitArea: { show: false } }

export function GammaPunchcardChart() {
  const ref = useEChart(loadCapgam, (data) => {
    const { els, cells } = punchCells(data)
    const bins = Math.ceil(E_MAX_KEV / PUNCH_BIN_KEV)
    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        formatter: (p: unknown) => {
          const c = cells[(p as { dataIndex: number }).dataIndex]
          if (!c) return ''
          const lo = (c.bin * PUNCH_BIN_KEV) / 1000
          const e = els[c.row]
          return `${e.el} (Z ${e.z}) — ${lo}–${lo + PUNCH_BIN_KEV / 1000} MeV · ${c.lines} line${c.lines === 1 ? '' : 's'} over ${e.nuclei} nucle${e.nuclei === 1 ? 'us' : 'i'} · ${Number(c.mean.toPrecision(3))} per 100 captures`
        },
      },
      grid: { left: 48, right: 24, top: 16, bottom: 48 },
      xAxis: {
        type: 'category',
        name: 'Eγ (MeV)',
        nameLocation: 'middle',
        nameGap: 28,
        data: Array.from({ length: bins }, (_, b) => `${(b * PUNCH_BIN_KEV) / 1000}`),
        axisLabel: { color: '#475569', fontSize: 10 },
        ...AXIS,
      },
      yAxis: { type: 'category', data: els.map((e) => e.el), axisLabel: { color: '#475569', fontSize: 9, interval: 0 }, ...AXIS },
      visualMap: { show: false, min: Math.log10(I_FLOOR), max: 2, inRange: { color: ['#0b1a3a', '#1d4ed8', '#00bfff', '#f0f9ff'] } },
      series: [
        {
          type: 'heatmap',
          data: cells.map((c) => [c.bin, c.row, Math.log10(Math.max(I_FLOOR, c.mean))]),
          itemStyle: { borderColor: 'transparent', borderWidth: 1 },
          emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } },
        },
      ],
    }
  }, false, firstSeriesRow)
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
