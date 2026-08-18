import { AppLayout } from "@/components/AppLayout";
import { RevealFx } from "@/components/RevealFx";
import { PAPER_BRIDGE } from "@/components/editorial/PaperBridge";
import { HomeMasthead } from "./HomeMasthead";
import { HomeCard } from "./HomeCard";
import { LEDGER, CARDS } from "@/lib/home-data";

export const metadata = {
  title: "NYSgpt",
  description:
    "The NYSgpt family of AI products — ten domains, one system. Artificial intelligence, childcare, health records, energy, insurance, policy, science, solar, sports, and tariffs.",
};

const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

export default function HomePage() {
  return (
    <AppLayout paperMode>
      <div
        className="flex-1 overflow-y-auto no-scrollbar"
        style={{ backgroundColor: "var(--paper)", ...PAPER_BRIDGE }}
      >
        <div className="mx-auto w-full max-w-[1360px] px-6 sm:px-10 md:px-14 pt-8 pb-16">
          {/* Nameplate + ledger — a client island so the wordmark can toggle the
              switchboard, and so the figures can re-count on hover. */}
          <RevealFx delay={0.08} translateY={6}>
            <HomeMasthead ledger={LEDGER} />
          </RevealFx>

          {/* SAMS */}
          <RevealFx delay={0.22} translateY={4}>
            <h2 className="mt-6 mb-4 text-[10px] uppercase tracking-[0.32em] text-[var(--paper-faint)]" style={MONO}>
              The System for Artificial Intelligence Model Safety (SAMS)
            </h2>
          </RevealFx>

          {/* Contents plate — each cell indexed 01–10 like a table of contents. */}
          <RevealFx delay={0.26} translateY={6}>
            <div className="grid grid-cols-1 border-t border-l border-[var(--paper-rule)] sm:grid-cols-2 lg:grid-cols-5">
              {CARDS.map((card, i) => (
                <HomeCard key={card.href + card.title} card={card} index={i} />
              ))}
            </div>
          </RevealFx>

          {/* Byline */}
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
