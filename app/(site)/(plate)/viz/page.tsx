import { RevealFx } from "@/components/RevealFx";
import { VizBoxMenu } from "./box-menu";
import { ExpandBox } from "./expand-box";
import { VIZ_CHARTS, type VizChart } from "@/lib/viz-charts";
import { PLATE_H } from "@/lib/plate";
import { PlateGrid } from "@/app/PlateGrid";
import { APIS, CARDS, KINDS, PRODUCT_EXTRAS, TOOLS, type HomeCardData, type Kind } from "@/lib/home-data";

export const metadata = {
  title: "Viz",
  description: "The / page, hover stilled: each box opens one of the twelve corpus charts.",
};

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

/** HomeContents' own exclusions, verbatim. */
const OFF_RAIL = new Set(["Sports", "Solar", "Compiler", "Lake", "Loaders"]);


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

  // The masthead and the byline are the (plate) layout's; the page is the plate.
  return (
    <RevealFx className="flex min-h-0 flex-1 flex-col" delay={0.22} translateY={5}>
      <div className="relative mt-[72px] flex min-h-0 flex-1 flex-col">
        {/* The plate as / has it (HomeContents): a fixed height, an even grid from its own measured size. */}
        <div className={`isolate flex flex-col overflow-hidden rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper)] ${PLATE_H}`}>
          <PlateGrid className="-m-px min-h-0 flex-1" minW={220}>
            {boxes.map((card, i) => (
              <VizBox key={card.href + card.title} card={card} index={i} chart={VIZ_CHARTS[i]} />
            ))}
          </PlateGrid>
        </div>
      </div>
    </RevealFx>
  );
}

/** A contents-plate cell at rest — HomeCard's resting markup with every hover affordance gone.
 *  The first twelve link to the chart pages; the rest stand as they do on /. */
function VizBox({ card, index, chart }: { card: HomeCardData; index: number; chart?: VizChart }) {
  const body = (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="m-0 line-clamp-4 text-[20px] leading-[1.1]" style={{ ...SERIF, color: "var(--paper-text)" }}>
            {chart?.title ?? card.title}
          </h3>
          <span className="flex h-[22px] shrink-0 items-center">
            {/* The green dot gave way to trinity's three-dot menu (2026-11-04). */}
            <VizBoxMenu title={chart?.title ?? card.title} anchor={(chart?.href ?? card.href ?? card.title).replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase()} href={chart?.href ?? card.href} />
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
  const cls = "flex min-h-[210px] flex-col border-b border-r border-[var(--paper-rule)] px-5 py-5 transition-colors hover:bg-[var(--paper-quiet)] [-webkit-tap-highlight-color:transparent]";
  const style = { "--accent": card.accent } as React.CSSProperties;
  return chart ? (
    // Every chart box grows into its page (Brendan, 2026-11-04: box 1's transition, for all of them).
    <ExpandBox href={chart.href} className={cls} style={style}>
      {body}
    </ExpandBox>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  );
}
