"use client";

import { PAPER_BRIDGE } from "@/components/editorial/PaperBridge";
import { BUTTON } from "@/components/AccountShell";

// A page that throws (a chart, a box) fails alone: the header and the sidebar stay, and the reader can retry.
export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center" style={{ backgroundColor: "var(--paper)", ...PAPER_BRIDGE }}>
      <div className="text-center text-[var(--paper-text)]">
        <p className="m-0 mb-5 text-[15px]">This page didn&rsquo;t load.</p>
        <button type="button" onClick={reset} className={BUTTON}>
          Try again
        </button>
      </div>
    </div>
  );
}
