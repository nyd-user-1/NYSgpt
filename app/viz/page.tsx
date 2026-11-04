
import { AppLayout } from "@/components/AppLayout";
import { PaneLink } from "@/components/PaneLink";
import { RevealFx } from "@/components/RevealFx";
import { PAPER_BRIDGE } from "@/components/editorial/PaperBridge";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { HomeMasthead } from "../HomeMasthead";
import { PLATE_H } from "@/lib/plate";
import { PlateGrid } from "../PlateGrid";
import { APIS, CARDS, KINDS, LEDGER, PRODUCT_EXTRAS, TOOLS, type HomeCardData, type Kind } from "@/lib/home-data";

export const metadata = {
  title: "Viz",
  description: "The / page, hover stilled: each box opens one of the twelve corpus charts.",
};

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

/** HomeContents' own exclusions, verbatim. */
const OFF_RAIL = new Set(["Sports", "Solar", "Compiler", "Lake", "Loaders"]);

/** The twelve chart pages, dealt onto the boxes in plate order. Static JSON behind every one, so
 *  Next prerenders them; the links don't prefetch (twelve at once ran the worker past its CPU limit). */
const CHARTS = [
  { href: "/viz/nebula", title: "The nuclide nebula", body: "Every nuclide the literature has touched, neutrons across and protons up, glowing with the log of its paper count." },
  { href: "/viz/rainfall", title: "The rainfall and the river", body: "Papers entering the corpus each year, and below them the slice that flowed on into EXFOR as compiled data." },
  { href: "/viz/bar-large", title: "Every nuclide, ranked", body: "All ~7,900 literature-touched nuclides as one bar run on a log axis, from ²³⁵U down to one-paper exotica." },
  { href: "/viz/weight", title: "Two populations of papers", body: "The NSR record against the arXiv/APS additions: publication year across, citations up a log axis." },
  { href: "/viz/heatmap", title: "The nuclide heatmap", body: "The nebula's field as cells, heat by paper count. The empty black is nuclear terra incognita." },
  { href: "/viz/scatter3d", title: "The nuclide field, lifted", body: "The nebula with its third axis made literal: the valley of stability as a ridge you can orbit." },
  { href: "/viz/scatter3d-dataset", title: "Ten thousand papers in three measures", body: "A random 10,000 cited papers in space: year across, references deep, citations up." },
  { href: "/viz/simplex", title: "Literature smoke", body: "Each nuclide exhales a plume, taller and denser with its papers, jittered into weather. A mood instead of a measure." },
  { href: "/viz/surface", title: "The literature landscape", body: "Altitude is the log of each nuclide's paper count. The diagonal range is the valley of stability, raised into relief." },
  { href: "/viz/graph", title: "The collaboration web", body: "The 1,200 most-published authors, force-settled; an edge where two share four or more papers." },
  { href: "/viz/reactions", title: "The reaction transit map", body: "Every reaction a bus route across the chart of nuclides, with moving lights on the 1,200 busiest." },
  { href: "/viz/matrix", title: "The measure matrix", body: "36 Pearson correlations across nine per-paper measures of all 303,568 references. Navy moves together; red apart." },
];

/** The / page, duplicated exactly (Brendan, 2026-11-04): masthead, the contents plate's first
 *  frame with the same boxes at rest, byline. Two differences, both his: no hover state, and a
 *  press on each of the first twelve boxes opens one of the twelve chart pages. Fully static —
 *  nothing computes at request time. */
export default function VizPage() {
  // HomeContents' box list, verbatim: products + tools + APIs, A–Z, each wearing its kind's colour.
  const boxes = [...CARDS.map((c) => ({ ...c, ...PRODUCT_EXTRAS[c.title], tag: "Platform" })), ...TOOLS, ...APIS]
    .filter((c) => !OFF_RAIL.has(c.title))
    .map((c) => (c.tag ? { ...c, accent: KINDS[c.tag as Kind] } : c))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <AppLayout paperMode>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ backgroundColor: "var(--paper)", ...PAPER_BRIDGE }}>
        <div className="mx-auto w-full max-w-[1360px] px-6 sm:px-10 md:px-14 pt-8 pb-16">
          <RevealFx delay={0.08} translateY={6}>
            <HomeMasthead ledger={LEDGER} />
          </RevealFx>

          <RevealFx delay={0.22} translateY={5}>
            <div className="relative mt-[72px]">
              {/* The plate as / has it (HomeContents): a fixed height, an even grid from its own measured size. */}
              <div className={`isolate flex flex-col overflow-hidden rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper)] ${PLATE_H}`}>
                <PlateGrid className="-m-px min-h-0 flex-1" minW={220}>
                  {boxes.map((card, i) => (
                    <VizBox key={card.href + card.title} card={card} index={i} chart={CHARTS[i]} />
                  ))}
                </PlateGrid>
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

/** A contents-plate cell at rest — HomeCard's resting markup with every hover affordance gone.
 *  The first twelve link to the chart pages; the rest stand as they do on /. */
function VizBox({ card, index, chart }: { card: HomeCardData; index: number; chart?: (typeof CHARTS)[number] }) {
  const body = (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="m-0 line-clamp-4 text-[20px] leading-[1.1]" style={{ ...SERIF, color: "var(--paper-text)" }}>
            {chart?.title ?? card.title}
          </h3>
          <span className="flex h-[22px] shrink-0 items-center">
            <span aria-hidden className="pointer-events-none relative flex h-[5px] w-[5px] shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-[5px] w-[5px] rounded-full bg-emerald-500" />
            </span>
          </span>
        </div>
        <p className="mt-2 flex-1 text-[12px] leading-[1.5] text-[var(--paper-muted)]" style={SANS}>
          {chart?.body ?? card.body}
        </p>
      </div>
      <div className="relative mt-4 flex items-end justify-between gap-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] tabular-nums" style={MONO}>
          {card.tag && <span className="font-medium text-[var(--accent)]">{card.tag}</span>}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums tracking-[0.2em] text-[var(--paper-faint)]" style={MONO}>
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
    </>
  );
  const cls = "flex min-h-[210px] flex-col border-b border-r border-[var(--paper-rule)] px-5 py-5 [-webkit-tap-highlight-color:transparent]";
  const style = { "--accent": card.accent } as React.CSSProperties;
  return chart ? (
    // A chart box opens its chart in the second panel (2026-11-04).
    // No prefetch: twelve chart pages fetched at once ran the worker past its CPU limit (2026-11-04).
    <PaneLink href={chart.href} prefetch={false} className={cls} style={style}>
      {body}
    </PaneLink>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  );
}
