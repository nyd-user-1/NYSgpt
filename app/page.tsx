import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { RevealFx } from "@/components/RevealFx";
import { PAPER_BRIDGE } from "@/components/editorial/PaperBridge";
import { HomeNameplate } from "./HomeNameplate";
import { CountUp } from "@/components/CountUp";

export const metadata = {
  title: "NYSgpt",
  description:
    "Case studies and build notes from the NYSgpt family of AI products — the features, components, and design patterns behind each one.",
};

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

type Card = {
  href: string;
  title: string;
  body: string;
  /** The project's primary accent — title color + light bg tint on hover. */
  accent: string;
  /** Mono footer: a live count from the project's database + its unit label. */
  count: number;
  unit: string;
  /** Optional compact display: decimals + suffix (e.g. 16.4 + "M"). */
  decimals?: number;
  suffix?: string;
};

export default function HomePage() {
  // The masthead ledger — four headline totals. Each links to its Dashboard lens.
  const LEDGER = [
    { value: 33598857, unit: "Records", href: "/dashboard?lens=records" },
    { value: 510922, unit: "Documents", href: "/dashboard?lens=documents" },
    { value: 563, unit: "APIs", href: "/dashboard?lens=apis" },
    { value: 470, unit: "Scripts", href: "/dashboard?lens=scripts" },
  ];

  // The section entry points → a numbered contents plate (the broadsheet's table
  // of contents). Hairline grid, each cell indexed in mono.
  const CARDS: Card[] = [
    { href: "/blog/44b", title: "Artificial Intelligence", accent: "#033882", body: "A public registry, library, and incident record for AI — New York's RAISE Act, independently implemented.", count: 532, unit: "models" },
    { href: "/blog/childcaregpt", title: "Childcare", accent: "#2f6d6a", body: "New York's 28-page childcare-subsidy PDF, rebuilt as a guided form that files itself.", count: 16800, unit: "providers" },
    { href: "/blog/liminal", title: "EHR", accent: "#3f8290", body: "All-in-one practice management and EHR — scheduling, notes, and billing over millions of published rates.", count: 16.4, decimals: 1, suffix: "M", unit: "published rates" },
    { href: "/blog/solargpt", title: "Energy", accent: "#d97706", body: "Every generator in the EIA inventory — capacity, fuel, emissions, and actual net generation across the grid.", count: 4.3, decimals: 1, suffix: "B", unit: "MWh generated" },
    { href: "/blog/insurancegpt", title: "Insurance", accent: "#16a34a", body: "Compare and buy auto coverage inside the chat, over NHTSA safety ratings for every make and model.", count: 17306, unit: "vehicles rated" },
    { href: "/blog/policygpt", title: "Policy", accent: "#3d63dd", body: "The New York legislature as data — bills, votes, sponsors, contracts, and the full lobbying record.", count: 292754, unit: "votes counted" },
    { href: "/blog/sciencegpt", title: "Science", accent: "#00BFFF", body: "Brookhaven's Nuclear Science References — indexed by nuclide, reaction, and measured quantity.", count: 46728, unit: "publications" },
    { href: "/blog/solargpt", title: "Solar", accent: "#f59e0b", body: "State-to-ZIP drill-down over rooftop solar potential and reprojected satellite flux rasters.", count: 56.2, decimals: 1, suffix: "M", unit: "rooftops scanned" },
    { href: "/blog/sportsgpt", title: "Sports", accent: "#033882", body: "New York high-school football as a live stat ledger — players, box scores, and every yard logged.", count: 685342, unit: "yards logged" },
    { href: "/blog/tariffsgpt", title: "Tariffs", accent: "#c9a961", body: "Read a CBP 7501 and get the refund you're owed — customs rulings, HTS codes, and the duty math.", count: 220178, unit: "federal rulings" },
  ];

  return (
    <AppLayout paperMode>
      <div
        className="flex-1 overflow-y-auto no-scrollbar"
        style={{ backgroundColor: "var(--paper)", ...PAPER_BRIDGE }}
      >
        <div className="mx-auto w-full max-w-[1360px] px-6 sm:px-10 md:px-14 pt-8 pb-16">
          {/* ─────────────────────────  NAMEPLATE  ───────────────────────── */}

          <RevealFx delay={0.08} translateY={6}>
            <div className="grid grid-cols-1 items-stretch border-t border-b border-[var(--paper-rule)] lg:grid-cols-[auto_1fr]">
              <HomeNameplate />
              {/* Ledger — 2×2 hairline grid of figures, flush to the nameplate via
                  a left rule. Bottom-row cells drop their border-b. */}
              <div className="grid grid-cols-2 border-t border-l border-[var(--paper-rule)] lg:border-t-0">
                {LEDGER.map((l, i) => (
                  <Link
                    key={l.unit}
                    href={l.href}
                    className={`group/fig flex flex-col justify-center border-r border-[var(--paper-rule)] px-5 py-6 sm:px-7 transition-colors hover:bg-[var(--paper-quiet)] ${
                      i < 2 ? "border-b" : ""
                    }`}
                  >
                    <p
                      className="text-[clamp(1.8rem,3.4vw,3rem)] leading-none text-[var(--paper-text)] tabular-nums transition-colors group-hover/fig:text-[var(--paper-strong)]"
                      style={MONO}
                    >
                      <CountUp value={l.value} />
                    </p>
                    <p
                      className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--paper-faint)] transition-colors group-hover/fig:text-[var(--paper-strong)]"
                      style={SANS}
                    >
                      {l.unit}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </RevealFx>

          {/* ─────────────────────────  CONTENTS PLATE  ───────────────────────── */}

          <RevealFx delay={0.22} translateY={4}>
            <h2
              className="mt-6 mb-4 text-[10px] uppercase tracking-[0.32em] text-[var(--paper-faint)]"
              style={MONO}
            >
              The System for Artificial Intelligence Model Safety (SAMS)
            </h2>
          </RevealFx>

          {/* Numbered contents grid — each cell indexed 01–10 like a table of
              contents. One mask-wipe reveals the whole plate. */}
          <RevealFx delay={0.26} translateY={6}>
            <div className="grid grid-cols-1 border-t border-l border-[var(--paper-rule)] sm:grid-cols-2 lg:grid-cols-5">
              {CARDS.map((card, i) => {
                const bigValue =
                  card.count.toLocaleString("en-US", {
                    minimumFractionDigits: card.decimals ?? 0,
                    maximumFractionDigits: card.decimals ?? 0,
                  }) + (card.suffix ?? "");
                const len = bigValue.length;
                const bigSize =
                  len <= 3
                    ? "5rem"
                    : len <= 4
                    ? "4.2rem"
                    : len <= 5
                    ? "3.6rem"
                    : len <= 6
                    ? "3rem"
                    : len <= 7
                    ? "2.7rem"
                    : "2.3rem";
                return (
                <Link
                  key={card.href}
                  href={card.href}
                  style={
                    {
                      "--accent": card.accent,
                      "--accent-tint": `color-mix(in oklab, ${card.accent} 5%, var(--paper))`,
                    } as React.CSSProperties
                  }
                  className="group/card relative flex min-h-[210px] flex-col border-b border-r border-[var(--paper-rule)] px-5 py-5 transition-colors hover:bg-[var(--accent-tint)]"
                >
                  {/* Big value, revealed on hover */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 text-center leading-none tabular-nums opacity-0 transition-opacity duration-200 group-hover/card:opacity-100"
                    style={{ ...MONO, color: "var(--accent)", fontSize: bigSize }}
                  >
                    <CountUp
                      value={card.count}
                      decimals={card.decimals}
                      suffix={card.suffix}
                      trigger="hover"
                      duration={900}
                    />
                  </span>

                  {/* Card content (fades out on hover) */}
                  <div className="flex flex-1 flex-col transition-opacity duration-200 group-hover/card:opacity-0">
                  {/* Folio number + arrow */}
                  <div className="flex items-start justify-between">
                    <span
                      className="text-[10px] tabular-nums tracking-[0.2em] text-[var(--paper-faint)] group-hover/card:text-[var(--accent)] transition-colors"
                      style={MONO}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 -translate-x-0.5 translate-y-0.5 text-[var(--paper-faint)] opacity-0 transition-all duration-200 group-hover/card:translate-x-0 group-hover/card:translate-y-0 group-hover/card:opacity-100 group-hover/card:text-[var(--accent)]" />
                  </div>

                  {/* Title */}
                  <h3
                    className="mt-3 text-[20px] leading-none text-[var(--paper-text)] transition-colors group-hover/card:[color:var(--accent)]"
                    style={SERIF}
                  >
                    {card.title}
                  </h3>

                  {/* Body */}
                  <p
                    className="mt-2 flex-1 text-[12px] leading-[1.5] text-[var(--paper-muted)]"
                    style={SANS}
                  >
                    {card.body}
                  </p>

                  {/* Stat footer */}
                  <span
                    className="mt-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--paper-faint)] group-hover/card:text-[var(--accent)] transition-colors tabular-nums"
                    style={MONO}
                  >
                    <span
                      aria-hidden
                      className="h-[5px] w-[5px] rounded-full bg-[var(--paper-rule)] transition-colors group-hover/card:bg-[var(--accent)]"
                    />
                    <CountUp
                      value={card.count}
                      decimals={card.decimals}
                      suffix={card.suffix}
                    />
                    &nbsp;{card.unit}
                  </span>
                  </div>
                </Link>
                );
              })}
            </div>
          </RevealFx>

          {/* Byline under the Index */}
          <RevealFx delay={0.7} translateY={3}>
            <div
              className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-[var(--paper-faint)]"
              style={MONO}
            >
              <span>By NYSgpt</span>
              <span>© 2026 All Rights Reserved. 2525 LLC</span>
            </div>
          </RevealFx>
        </div>
      </div>
    </AppLayout>
  );
}
