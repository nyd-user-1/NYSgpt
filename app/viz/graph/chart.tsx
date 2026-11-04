'use client'

import { useEChart } from '@/components/viz/use-echart'

const full = new Intl.NumberFormat('en')
type Node = { id: string; name: string; c: number }
type Edge = { s: string; t: string; w: number }

export function GraphChart({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const ref = useEChart(() => ({
    backgroundColor: 'transparent',
    tooltip: { formatter: (p: unknown) => { const d = p as { dataType: string; data: { name?: string; value?: number } }; return d.dataType === 'node' ? `${d.data.name} — ${full.format(d.data.value ?? 0)} papers` : '' } },
    series: [
      {
        type: 'graphGL',
        nodes: nodes.map((n) => ({ id: String(n.id), name: n.name, value: n.c, symbolSize: Math.max(2, Math.sqrt(n.c) / 2), itemStyle: { color: n.c > 400 ? '#e0f2fe' : n.c > 150 ? '#00bfff' : '#1d4ed8', opacity: 0.9 } })),
        edges: edges.map((e) => ({ source: String(e.s), target: String(e.t), lineStyle: { color: 'rgba(29,78,216,0.18)', width: Math.min(3, 0.4 + e.w / 20) } })),
        forceAtlas2: { steps: 5, stopThreshold: 1, jitterTolerence: 10, edgeWeight: [0.2, 1], gravity: 0.6, scaling: 0.6 },
      },
    ],
  }), true, (p) => (p.dataType === 'node' && typeof p.dataIndex === 'number' ? p.dataIndex : null))
  return <div ref={ref} className="h-[78vh] w-full" />
}
