'use client'

import { useEChart } from '@/components/viz/use-echart'
import { decayLinks, familyColor, familyOf, halfLifeText, loadDecay, modesText, nucName } from '@/lib/viz-physics'

// The decay network (chart batch A, 2026-11-04): every ENSDF ground state a node, coloured by its primary decay
// mode, and an edge from it to the daughter of each mode it decays by — so the β chains run down each isobar
// to its stable member, α links them four mass units apart, and the stable nuclides gather the flow. Nodes
// are in decay.json's order, so the table's rows name them.
export function GraphChart() {
  const ref = useEChart(loadDecay, (decay) => {
    const links = decayLinks(decay)
    const fed = new Map<number, number>()
    for (const l of links) fed.set(l.to, (fed.get(l.to) ?? 0) + 1)
    return {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (p: unknown) => {
          const d = p as { dataType: string; dataIndex: number }
          if (d.dataType !== 'node') return ''
          const x = decay.nuclides[d.dataIndex]
          const modes = modesText(x, decay.modes)
          return `${nucName(x)} — ${halfLifeText(x)}${modes ? ` · ${modes}` : ''}`
        },
      },
      series: [
        {
          type: 'graphGL',
          nodes: decay.nuclides.map((x, i) => ({
            id: String(i),
            name: nucName(x),
            // Each node starts at its place on the chart of nuclides, and the decay links pull from there.
            x: (x.n - 90) * 4,
            y: (59 - x.z) * 4,
            // Size by how many parents decay into it: the stable ends of long chains grow.
            symbolSize: Math.min(9, 2 + Math.sqrt(fed.get(i) ?? 0) * 1.6),
            itemStyle: { color: familyColor(familyOf(x)), opacity: 0.9 },
          })),
          edges: links.map((l) => ({
            source: String(l.from),
            target: String(l.to),
            lineStyle: { color: familyColor(familyOf(decay.nuclides[l.from])), opacity: 0.35, width: l.pct === null || l.pct >= 50 ? 0.8 : 0.4 },
          })),
          // graphGL fits its camera once, to the starting positions, and never follows a layout that spreads; strong
          // gravity at this ratio to the repulsion settles the network at about the chart's own size. Wheel and drag
          // zoom and pan.
          forceAtlas2: { steps: 5, maxSteps: 2000, stopThreshold: 1, jitterTolerence: 10, edgeWeight: [1, 2], gravity: 0.3, strongGravityMode: true, scaling: 0.9 },
          roam: true,
        },
      ],
    }
  }, true, (p) => (p.dataType === 'node' && typeof p.dataIndex === 'number' ? p.dataIndex : null))
  return <div ref={ref} className="min-h-0 w-full flex-1" />
}
