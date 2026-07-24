import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { RevealFx } from "@/components/RevealFx";
import { PAPER_BRIDGE } from "@/components/editorial/PaperBridge";
import { HomeNameplate } from "./HomeNameplate";
import { HomeCard, type HomeCardData } from "./HomeCard";
import { CountUp } from "@/components/CountUp";
import { compact } from "@/lib/compact";

export const metadata = {
  title: "NYSgpt",
  description:
    "Case studies and build notes from the NYSgpt family of AI products — the features, components, and design patterns behind each one.",
};

const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

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
  const CARDS: HomeCardData[] = [
    { href: "https://44b.nysgpt.com", title: "Artificial Intelligence", accent: "#033882", body: "A public registry, library, and incident record for AI — New York's RAISE Act, independently implemented.", value: 532, unit: "models" },
    { href: "https://childcare.nysgpt.com", title: "Childcare", accent: "#2f6d6a", body: "New York's 28-page childcare-subsidy PDF, rebuilt as a guided form that files itself.", value: 16_800, unit: "providers" },
    { href: "https://leuk.nysgpt.com", title: "EHR", accent: "#3f8290", body: "All-in-one practice management and EHR — scheduling, notes, and billing over millions of published rates.", value: 16_400_000, unit: "published rates" },
    { href: "https://solar.nysgpt.com", title: "Energy", accent: "#d97706", body: "Every generator in the EIA inventory — capacity, fuel, emissions, and actual net generation across the grid.", value: 4_300_000_000, unit: "MWh generated" },
    { href: "https://insurance.nysgpt.com", title: "Insurance", accent: "#16a34a", body: "Compare and buy auto coverage inside the chat, over NHTSA safety ratings for every make and model.", value: 17_306, unit: "vehicles rated" },
    { href: "https://policy.nysgpt.com", title: "Policy", accent: "#3d63dd", body: "The New York legislature as data — bills, votes, sponsors, contracts, and the full lobbying record.", value: 292_754, unit: "votes counted" },
    { href: "https://nsr.nysgpt.com", title: "Science", accent: "#00BFFF", body: "Brookhaven's Nuclear Science References — indexed by nuclide, reaction, and measured quantity.", value: 46_728, unit: "publications" },
    { href: "https://solar.nysgpt.com", title: "Solar", accent: "#f59e0b", body: "State-to-ZIP drill-down over rooftop solar potential and reprojected satellite flux rasters.", value: 56_200_000, unit: "rooftops scanned" },
    { href: "https://sports.nysgpt.com", title: "Sports", accent: "#033882", body: "New York high-school football as a live stat ledger — players, box scores, and every yard logged.", value: 685_342, unit: "yards logged" },
    { href: "https://tariffs.nysgpt.com", title: "Tariffs", accent: "#c9a961", body: "Read a CBP 7501 and get the refund you're owed — customs rulings, HTS codes, and the duty math.", value: 220_178, unit: "federal rulings" },
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
                {LEDGER.map((l, i) => {
                  const fig = compact(l.value);
                  return (
                  <Link
                    key={l.unit}
                    href={l.href}
                    className={`group/fig flex flex-col justify-center border-r border-[var(--paper-rule)] px-5 py-6 sm:px-7 transition-colors hover:bg-[var(--paper-quiet)] active:bg-[var(--paper-quiet)] [-webkit-tap-highlight-color:transparent] ${
                      i < 2 ? "border-b" : ""
                    }`}
                  >
                    <p
                      className="text-[clamp(1.8rem,3.4vw,3rem)] leading-none text-[var(--paper-text)] tabular-nums transition-colors group-hover/fig:text-[var(--paper-strong)] group-active/fig:text-[var(--paper-strong)]"
                      style={MONO}
                    >
                      <CountUp
                        value={fig.count}
                        decimals={fig.decimals}
                        suffix={fig.suffix}
                      />
                    </p>
                    <p
                      className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--paper-faint)] transition-colors group-hover/fig:text-[var(--paper-strong)] group-active/fig:text-[var(--paper-strong)]"
                      style={SANS}
                    >
                      {l.unit}
                    </p>
                  </Link>
                  );
                })}
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
              {CARDS.map((card, i) => (
                <HomeCard key={card.href + card.title} card={card} index={i} />
              ))}
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
