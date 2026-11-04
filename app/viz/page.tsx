import { Suspense } from "react";
import Link from "next/link";

import { AppLayout } from "@/components/AppLayout";
import { RevealFx } from "@/components/RevealFx";
import { PAPER_BRIDGE } from "@/components/editorial/PaperBridge";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { HomeMasthead } from "../HomeMasthead";
import { LEDGER } from "@/lib/home-data";
import { authorGraph, measureMatrix, nuclideBars, nuclideField, paperScatter, paperTriples, perYear, reactionFlows } from "@/lib/viz-data";
import { MiniBarLarge, MiniGraph, MiniHeatmap, MiniMatrix, MiniNebula, MiniRainfall, MiniReactions, MiniScatter3d, MiniSimplex, MiniSurface, MiniTriples, MiniWeight } from "@/components/viz/minis";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Viz",
  description: "The contents plate with the twelve corpus charts in its boxes.",
};

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

/** The / page, duplicated exactly (Brendan, 2026-11-04) — masthead, plate, byline — with the
 *  hover state gone and one of the twelve charts standing in each box. Every query starts once
 *  at the top; each box streams in behind its own Suspense edge as its data lands (the measure
 *  matrix takes the database ~12 seconds of corr(); the rest arrive in a breath or two). */
export default function VizPage() {
  const field = nuclideField();
  const years = perYear();
  const bars = nuclideBars();
  const scatter = paperScatter();
  const triples = paperTriples();
  const flows = reactionFlows();
  const graph = authorGraph();
  const matrix = measureMatrix();

  const boxes: { title: string; href: string; cell: React.ReactNode }[] = [
    { title: "Nebula", href: "/viz/nebula", cell: <Async do={async () => <MiniNebula field={await field} />} /> },
    { title: "Rainfall", href: "/viz/rainfall", cell: <Async do={async () => { const y = await years; return <MiniRainfall papers={y.papers} exfor={y.exfor} /> }} /> },
    { title: "Bar large", href: "/viz/bar-large", cell: <Async do={async () => <MiniBarLarge bars={await bars} />} /> },
    { title: "Weight", href: "/viz/weight", cell: <Async do={async () => <MiniWeight rows={await scatter} />} /> },
    { title: "Heatmap", href: "/viz/heatmap", cell: <Async do={async () => <MiniHeatmap field={await field} />} /> },
    { title: "Scatter 3D", href: "/viz/scatter3d", cell: <Async do={async () => <MiniScatter3d field={await field} />} /> },
    { title: "Scatter 3D dataset", href: "/viz/scatter3d-dataset", cell: <Async do={async () => <MiniTriples rows={await triples} />} /> },
    { title: "Simplex", href: "/viz/simplex", cell: <Async do={async () => <MiniSimplex field={await field} />} /> },
    { title: "Surface", href: "/viz/surface", cell: <Async do={async () => <MiniSurface field={await field} />} /> },
    { title: "Graph", href: "/viz/graph", cell: <Async do={async () => { const g = await graph; return <MiniGraph nodes={g.nodes} edges={g.edges} /> }} /> },
    { title: "Reactions", href: "/viz/reactions", cell: <Async do={async () => <MiniReactions field={await field} flows={await flows} />} /> },
    { title: "Matrix", href: "/viz/matrix", cell: <Async do={async () => { const m = await matrix; return <MiniMatrix vars={m.vars} cells={m.cells} /> }} /> },
  ];

  return (
    <AppLayout paperMode>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ backgroundColor: "var(--paper)", ...PAPER_BRIDGE }}>
        <div className="mx-auto w-full max-w-[1360px] px-6 sm:px-10 md:px-14 pt-8 pb-16">
          <RevealFx delay={0.08} translateY={6}>
            <HomeMasthead ledger={LEDGER} />
          </RevealFx>

          {/* The contents plate, as / lays it: the rounded frame, the two-row
              column-major grid of 210px cells, scrolling sideways. Each box is
              its chart, no hover; pressing one opens the chart's own page. */}
          <RevealFx delay={0.22} translateY={5}>
            <div className="relative mt-[72px]">
              <div className="isolate flex flex-col overflow-hidden rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper)]">
                <div className="no-scrollbar -m-px flex-1 snap-x snap-proximity overflow-x-auto overscroll-x-contain [--col:100%] sm:[--col:50%] lg:[--col:20%]">
                  <div
                    className="grid h-full grid-flow-col grid-rows-[repeat(2,minmax(210px,auto))] border-t border-l border-[var(--paper-rule)] [&>*]:snap-start"
                    style={{ width: `calc(${Math.ceil(boxes.length / 2)} * var(--col))`, gridTemplateColumns: `repeat(${Math.ceil(boxes.length / 2)}, minmax(0, 1fr))` }}
                  >
                    {boxes.map((b, i) => (
                      <Link key={b.href} href={b.href} className="flex min-h-[210px] flex-col border-b border-r border-[var(--paper-rule)] px-5 py-5 [-webkit-tap-highlight-color:transparent]">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="m-0 text-[20px] leading-[1.1]" style={{ ...SERIF, color: "var(--paper-text)" }}>{b.title}</h3>
                          <span className="shrink-0 text-[10px] tabular-nums tracking-[0.2em] text-[var(--paper-faint)]" style={MONO}>{String(i + 1).padStart(2, "0")}</span>
                        </div>
                        <div className="mt-3 flex-1 overflow-hidden rounded-lg">
                          <Suspense fallback={<div className="h-full w-full animate-pulse bg-[var(--paper-quiet)]" />}>{b.cell}</Suspense>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </RevealFx>

          <RevealFx delay={0.7} translateY={3}>
            <div
              className="mt-3 flex items-center justify-between px-4 text-[10px] uppercase tracking-[0.28em] text-[var(--paper-faint)]"
              style={MONO}
            >
              <FeedbackDialog />
              <span className="-mr-[0.28em]">© 2026 All Rights Reserved.</span>
            </div>
          </RevealFx>
        </div>
      </div>
    </AppLayout>
  );
}

/** A box's chart, awaited behind its own Suspense edge. */
async function Async({ do: run }: { do: () => Promise<React.ReactNode> }) {
  return run();
}
