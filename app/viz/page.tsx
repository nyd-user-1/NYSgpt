import Link from "next/link"

export const metadata = { title: "Viz" }

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const

/** Brendan's eleven (2026-11-04): one page per ECharts example he picked, each fed by the NSR
 *  corpus, each standing alone for evaluation. */
const PAGES: { href: string; title: string; after: string; line: string }[] = [
  { href: "/viz/nebula", title: "The nuclide nebula", after: "scatter-nebula", line: "Every literature-touched nuclide as glow on the (N, Z) plane." },
  { href: "/viz/rainfall", title: "The rainfall and the river", after: "area-rainfall", line: "Papers per year above; the slice that flowed into EXFOR, inverted below." },
  { href: "/viz/bar-large", title: "Every nuclide, ranked", after: "bar-large", line: "~7,900 bars, tallest first, zoomable to any neighborhood." },
  { href: "/viz/weight", title: "Two populations of papers", after: "scatter-weight", line: "12,000 cited papers — the NSR record against the arXiv/APS additions." },
  { href: "/viz/heatmap", title: "The nuclide heatmap", after: "heatmap-large", line: "The same field as cells; the black is terra incognita." },
  { href: "/viz/scatter3d", title: "The nuclide field, lifted", after: "scatter3d (GL)", line: "Paper counts as altitude; the valley of stability as a ridge." },
  { href: "/viz/scatter3d-dataset", title: "Ten thousand papers in three measures", after: "scatter3D-dataset (GL)", line: "Year × references × citations, row by row into space." },
  { href: "/viz/simplex", title: "Literature smoke", after: "scatter3d-simplex-noise (GL)", line: "The artistic one: each nuclide exhales a plume sized by its papers." },
  { href: "/viz/surface", title: "The literature landscape", after: "simple-surface (GL)", line: "The field as terrain — a century of publishing in relief." },
  { href: "/viz/graph", title: "The collaboration web", after: "graphgl-large-internet (GL)", line: "1,200 most-published authors, force-settled into their labs and eras." },
  { href: "/viz/reactions", title: "The reaction transit map", after: "lines-ny", line: "The imaginative one: every reaction a bus route across the chart of nuclides." },
  { href: "/viz/matrix", title: "The measure matrix", after: "matrix-covariance", line: "36 Pearson correlations across nine per-paper measures, computed in the database on load." },
]

export default function VizIndex() {
  return (
    <div className="min-h-dvh" style={{ background: "#05070d", color: "#e2e8f0" }}>
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <Link href="/" className="text-[24px] leading-none transition-opacity hover:opacity-70" style={{ ...SERIF, letterSpacing: "-0.03em" }}>
          NYSgpt
        </Link>
        <h1 className="mt-8 text-[34px] leading-[1.1]" style={{ ...SERIF, letterSpacing: "-0.02em" }}>Twelve cuts of the corpus</h1>
        <p className="mt-3 max-w-xl text-[13.5px] leading-[1.7] text-slate-400" style={SANS}>
          One page per chart, every one drawn live from the Nuclear Science References corpus — 303,568 references, 1.21 million paper–nuclide links.
        </p>
        <ol className="mt-10 flex flex-col">
          {PAGES.map((p, i) => (
            <li key={p.href} className="border-t border-slate-800 last:border-b">
              <Link href={p.href} className="group flex items-baseline gap-4 py-4 transition-colors hover:bg-slate-900/40">
                <span className="w-7 shrink-0 text-[11px] tabular-nums text-slate-600" style={MONO}>{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] text-slate-100 transition-colors group-hover:text-[#00bfff]" style={SERIF}>{p.title}</span>
                  <span className="mt-0.5 block text-[12px] leading-[1.5] text-slate-500" style={SANS}>{p.line}</span>
                </span>
                <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-slate-600" style={MONO}>{p.after}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
