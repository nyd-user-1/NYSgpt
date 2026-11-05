// The /viz chart pages in the index's box order (2026-11-04): the boxes deal them out in this order, the framed
// pages' prev/next walk it (wrapping at the ends), and the header's switcher lists it. Each entry names its chart
// TYPE and describes its variables (Brendan, 2026-11-04). The header's own name for each page is
// lib/header-titles.ts. Static pages, so the links prefetch: served as files, they cost the worker nothing.

export type VizChart = { href: string; title: string; body: string }

export const VIZ_CHARTS: VizChart[] = [
  { href: "/viz/nebula", title: "Scatter field", body: "x mass number A · y binding energy per nucleon: all 3,558 AME2020 nuclides, coloured by decay mode. The top of the curve is ⁶²Ni." },
  { href: "/viz/rainfall", title: "Stacked area", body: "x mass number A · y ENSDF nuclides at that A, stacked by primary decay mode: stable, β−, β+/EC, α, fission, p, n." },
  { href: "/viz/bar-large", title: "Bar run", body: "x 2,958 radioactive nuclides, ranked · y half-life on a log axis, ¹²⁸Te's 10³² s down to 10⁻²² s." },
  { href: "/viz/weight", title: "Two-series scatter", body: "x E(2⁺) · y B(E2), both log: 751 even-even nuclides. Near a magic number the first 2⁺ sits high and weak; midshell, low and strong." },
  { href: "/viz/heatmap", title: "Heatmap", body: "x N · y Z · heat log₁₀ half-life in decade bands, 3,420 ENSDF ground states; stable nuclides in ink." },
  { href: "/viz/scatter3d", title: "3D scatter", body: "x E(2⁺) · y B(E2), both log · z proton number Z: the 751 even-even nuclides with both, in layers by element." },
  { href: "/viz/scatter3d-dataset", title: "3D scatter", body: "x log incident energy · y year · z log cross section: 50,000 EXFOR measurements sampled from 4.3 million, coloured by projectile." },
  { href: "/viz/simplex", title: "Line strips", body: "x product nucleus by A · y γ energy: every thermal-capture γ line in CapGam, 78,746 over 260 nuclei, shaded by intensity." },
  { href: "/viz/surface", title: "3D surface", body: "x N · y Z · z binding energy per nucleon as terrain, from the AME2020 masses; the ridge is the valley of stability." },
  { href: "/viz/graph", title: "Force graph", body: "Nodes the 3,420 ENSDF nuclides, coloured by decay mode; 4,783 edges, each from a nuclide to the daughter of one of its decay modes." },
  { href: "/viz/reactions", title: "Flow lines", body: "Ground x N · y Z; the uranium, thorium and actinium decay series as routes. Each light moves faster the shorter its parent's half-life." },
  { href: "/viz/matrix", title: "Correlation matrix", body: "9×9 Pearson r across log T½, Qα, Qβ−, Sₙ, Sₚ, log E(2⁺), log B(E2), mass excess and log level count, over the 475 nuclides with all nine. Navy moves together; red apart." },
  { href: "/viz/decay", title: "Decay simulation", body: "x N · depth Z · height log₁₀ half-life, 3,420 ENSDF ground states. Each decays at its measured rate, scaled, and steps to its daughter." },
  { href: "/viz/decay2", title: "Decay simulation 2", body: "The decay simulation as a surface: x N · y Z · height √ population. It opens flat on every ground state and deforms as decays run." },
  { href: "/viz/knowledge", title: "Knowledge map", body: "x N · depth Z, 7,986 nuclides. Size adopted levels, colour years since the ENSDF evaluation; grey rings are studied but never evaluated." },
  { href: "/viz/spectra", title: "Spectra", body: "The line strips in 2D with a zoom slider to stretch a run of nuclei; a click opens that nucleus's full capture-γ spectrum beside them." },
  { href: "/viz/gamma-atlas", title: "Heatmap", body: "x γ energy in 25 keV bins · y product nucleus by A; heat the bin's summed capture-γ intensity per 100 captures." },
  { href: "/viz/gamma-punchcard", title: "Punch card", body: "x γ energy in 0.5 MeV bins · y element; heat the summed capture-γ intensity, averaged over the element's product nuclei." },
  { href: "/viz/levels", title: "Level energies", body: "x N · depth Z · height level energy, 0–10 MeV: 139,868 ENSDF adopted levels over 3,350 nuclides. The selected nuclide's gamma transitions fall level to level." },
  { href: "/viz/first-excited", title: "Aggregate bar", body: "x Z · y E(2⁺), log: 980 even-even nuclides as points, then folded into one bar per element, the mean. Z = 20, 28, 50 and 82 stand above their neighbours." },
  { href: "/viz/level-spans", title: "OHLC bars", body: "One isotope chain at a time: each bar from the ground state to the highest known level, ticks at the first excited level (left) and the median (right), MeV." },
  { href: "/viz/level-candles", title: "Candlestick", body: "2,371 nuclides by A, one candle each: body from the first excited level to the median, wick from the ground state to the highest known level, MeV." },
  { href: "/viz/separation", title: "Candlestick", body: "Neutron separation energy along each isotope chain: a candle from Sₙ(N−1) to Sₙ(N), so pairing shows as alternation. Bars: ENSDF levels known." },
  { href: "/viz/nuclide-card", title: "Radar", body: "One nuclide's half-life, Qα, Qβ−, Sₙ, Sₚ and E(2⁺) as a polygon, with a second nuclide overlaid." },
  { href: "/viz/isotope-radar", title: "Radar timeline", body: "One element at a time, every isotope as a translucent polygon on the same six spokes; the timeline walks Z with a play button. Neutron-poor runs cool, neutron-rich warm." },
  { href: "/viz/literature", title: "Scatter field", body: "x neutrons N · y protons Z · size and glow log₁₀ papers. All 7,799 nuclides the literature touches." },
]

/** The chart before and after `path` in box order, wrapping at the ends; null off the list. */
export function vizNeighbours(path: string | null): { prev: VizChart; next: VizChart } | null {
  const i = VIZ_CHARTS.findIndex((c) => c.href === path)
  if (i < 0) return null
  const n = VIZ_CHARTS.length
  return { prev: VIZ_CHARTS[(i - 1 + n) % n], next: VIZ_CHARTS[(i + 1) % n] }
}
