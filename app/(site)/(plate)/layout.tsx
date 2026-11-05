import { RevealFx } from "@/components/RevealFx";
import { PAPER_BRIDGE } from "@/components/editorial/PaperBridge";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { HomeMasthead } from "@/app/HomeMasthead";
import { LEDGER } from "@/lib/home-data";
import { PlateBackground } from "./plate-background";

const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

// What / and /viz share (2026-11-04): the masthead, the column the plate sits in, the byline. As a layout it
// stays put between the two — only the plate below the masthead changes, and the masthead's entrance plays
// once, on the first load. data-viz-column is the rect /viz's expand box grows to (expand-box.tsx).
export default function PlateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex-1 overflow-hidden" style={{ backgroundColor: "var(--paper)", ...PAPER_BRIDGE }}>
      <PlateBackground />
      <div data-viz-column className="relative mx-auto flex h-full w-full max-w-[1360px] flex-col px-6 sm:px-10 md:px-14 pt-8 pb-5">
        {/* Nameplate + ledger — a client island so the wordmark can toggle the
            switchboard, and so the figures can re-count on hover. */}
        <RevealFx className="shrink-0" delay={0.08} translateY={6}>
          <HomeMasthead ledger={LEDGER} />
        </RevealFx>

        {children}

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
  );
}
