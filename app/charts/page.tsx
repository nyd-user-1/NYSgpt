import { AppLayout } from "@/components/AppLayout";
import { RevealFx } from "@/components/RevealFx";
import { PAPER_BRIDGE } from "@/components/editorial/PaperBridge";
import { HomeMasthead } from "../HomeMasthead";
import { ChartsGrid } from "./ChartsGrid";
import { LEDGER, CARDS } from "@/lib/home-data";

export const metadata = {
  title: "Charts",
  description: "The NYSgpt contents plate, cut as charts — every product's measured layers, and the chart of nuclides drawn live from the corpus.",
};

const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

/** The second cut of the / page (Brendan's ask, 2026-11-04): the same boxes, but a press opens a
 *  chart with its explainer instead of the panel. Science draws the real chart of nuclides, live
 *  from the corpus; the rest draw the measured layers their cards already carry. */
export default function ChartsPage() {
  return (
    <AppLayout paperMode>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ backgroundColor: "var(--paper)", ...PAPER_BRIDGE }}>
        <div className="mx-auto w-full max-w-[1360px] px-6 sm:px-10 md:px-14 pt-8 pb-16">
          <RevealFx delay={0.08} translateY={6}>
            <HomeMasthead ledger={LEDGER} />
          </RevealFx>

          <RevealFx delay={0.22} translateY={5}>
            <ChartsGrid cards={CARDS} />
          </RevealFx>

          <RevealFx delay={0.5} translateY={3}>
            <div
              className="mt-3 flex items-center justify-between px-4 text-[10px] uppercase tracking-[0.28em] text-[var(--paper-faint)]"
              style={MONO}
            >
              <span>Press a box for its chart</span>
              <span className="-mr-[0.28em]">© 2026 All Rights Reserved.</span>
            </div>
          </RevealFx>
        </div>
      </div>
    </AppLayout>
  );
}
