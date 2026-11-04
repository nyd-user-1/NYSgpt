import { AppLayout } from "@/components/AppLayout";
import { RevealFx } from "@/components/RevealFx";
import { PAPER_BRIDGE } from "@/components/editorial/PaperBridge";
import { HomeMasthead } from "./HomeMasthead";
import { HomeContents } from "./HomeContents";
import { FeedbackDialog } from "@/components/FeedbackDialog";
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
        className="flex-1 overflow-hidden"
        style={{ backgroundColor: "var(--paper)", ...PAPER_BRIDGE }}
      >
        <div className="mx-auto flex h-full w-full max-w-[1360px] flex-col px-6 sm:px-10 md:px-14 pt-8 pb-5">
          {/* Nameplate + ledger — a client island so the wordmark can toggle the
              switchboard, and so the figures can re-count on hover. */}
          <RevealFx className="shrink-0" delay={0.08} translateY={6}>
            <HomeMasthead ledger={LEDGER} />
          </RevealFx>

          {/* Contents plate: heading + Refresh + the 5×2 grid, one client island
              so Refresh can swap the ten products for the ten newest papers.
              The column's leftover height is the plate's — nothing scrolls. */}
          <RevealFx className="flex min-h-0 flex-1 flex-col" delay={0.22} translateY={5}>
            <HomeContents initial={CARDS} />
          </RevealFx>

          {/* Byline */}
          <RevealFx className="shrink-0" delay={0.7} translateY={3}>
            <div
              data-inspect="Byline"
              /* Inset 16px each side, the frames' corner radius, so both ends start
                 where the bottom rule turns into its curve. */
              className="mt-3 flex items-center justify-between px-4 text-[10px] uppercase tracking-[0.28em] text-[var(--paper-faint)]"
              style={MONO}
            >
              <FeedbackDialog />
              {/* -mr cancels the tracking after the last letter, so the text ends on the inset. */}
              <span className="-mr-[0.28em]">© 2026 All Rights Reserved.</span>
            </div>
          </RevealFx>
        </div>
      </div>
    </AppLayout>
  );
}
