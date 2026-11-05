'use client'

// The capture-gamma atlas (2026-11-04, chart batch B): every thermal-capture γ line in CapGam binned into 25 keV
// cells — x the γ energy, y the product nucleus ordered by A — with the heat the cell's summed intensity
// (log γ per 100 captures).

import { firstSeriesRow, useEChart } from '@/components/viz/use-echart'
import { ATLAS_BIN_KEV, E_MAX_KEV, I_FLOOR, binned, loadCapgam, setName } from '@/lib/viz-gamma'

const AXIS = { nameTextStyle: { color: '#64748b' }, axisLine: { lineStyle: { color: '#1e293b' } }, axisTick: { show: false }, splitArea: { show: false } }

export function GammaAtlasChart() {
  const ref = useEChart(loadCapgam, (data) => {
    const names = data.sets.map(setName)
    const bins = Math.ceil(E_MAX_KEV / ATLAS_BIN_KEV)
    const cells = binned(data, ATLAS_BIN_KEV, (_, i) => i)
    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        formatter: (p: unknown) => {
          const c = cells[(p as { dataIndex: number }).dataIndex]
          if (!c) return ''
          const lo = c.bin * ATLAS_BIN_KEV
          return `${names[c.row]} — ${lo.toLocaleString('en')}–${(lo + ATLAS_BIN_KEV).toLocaleString('en')} keV · ${c.lines} line${c.lines === 1 ? '' : 's'} · ${Number(c.sum.toPrecision(3))} per 100 captures`
        },
      },
      grid: { left: 56, right: 24, top: 16, bottom: 48 },
      xAxis: {
        type: 'category',
        name: 'Eγ (MeV)',
        nameLocation: 'middle',
        nameGap: 28,
        data: Array.from({ length: bins }, (_, b) => b * ATLAS_BIN_KEV),
        axisLabel: { color: '#475569', fontSize: 10, interval: 1000 / ATLAS_BIN_KEV - 1, formatter: (v: string) => `${Number(v) / 1000}` },
        ...AXIS,
      },
      yAxis: { type: 'category', data: names, axisLabel: { color: '#475569', fontSize: 9 }, ...AXIS },
      visualMap: { show: false, min: Math.log10(I_FLOOR), max: 2, inRange: { color: ['#0b1a3a', '#1d4ed8', '#00bfff', '#f0f9ff'] } },
      series: [
        {
          type: 'heatmap',
          data: cells.map((c) => [c.bin, c.row, Math.log10(Math.max(I_FLOOR, c.sum))]),
          progressive: 5000,
          emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } },
        },
      ],
    }
  }, false, firstSeriesRow)
  return <div ref={ref} className="h-[78vh] w-full" />
}
