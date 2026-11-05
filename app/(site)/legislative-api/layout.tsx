import { PAPER_BRIDGE } from "@/components/editorial/PaperBridge";
import { DocsTabs } from "./DocsTabs";

const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const;

/** The Legislative API's reference pages: the data dictionary and the coverage matrix, inside the (site) shell. */
export default function LegislativeApiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar" style={{ backgroundColor: "var(--paper)", ...PAPER_BRIDGE }}>
      <main className="mx-auto w-full max-w-[1120px] px-5 pb-24 pt-4 text-[var(--paper-text)] sm:px-10" style={SANS}>
        <DocsTabs />
        {children}
      </main>
    </div>
  );
}
