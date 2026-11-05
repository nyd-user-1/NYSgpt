import { RevealFx } from "@/components/RevealFx";
import { VizBoxMenu } from "./box-menu";
import { ExpandBox } from "./expand-box";
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

/** The twelve chart pages, dealt onto the boxes in plate order. Static pages, so the links prefetch again
 *  (2026-11-04): served as files, twelve prefetches cost the worker nothing. */
// Each box names its chart TYPE and describes its variables (Brendan, 2026-11-04).
const CHARTS = [
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

  // The masthead and the byline are the (plate) layout's; the page is the plate.
  return (
    <RevealFx className="flex min-h-0 flex-1 flex-col" delay={0.22} translateY={5}>
      <div className="relative mt-[72px] flex min-h-0 flex-1 flex-col">
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
