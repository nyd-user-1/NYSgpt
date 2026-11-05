import { PAPER_BRIDGE } from "@/components/editorial/PaperBridge";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const;

/** The frame of the reader's own pages: a title and the page, inside the (site) layout's shell (2026-11-04). */
export function AccountShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar" style={{ backgroundColor: "var(--paper)", ...PAPER_BRIDGE }}>
        <main className="mx-auto w-full max-w-xl px-6 pt-10 pb-24 text-[var(--paper-text)]" style={SANS}>
          <h1 className="m-0 mb-10 text-4xl font-normal" style={SERIF}>{title}</h1>
          {children}
        </main>
    </div>
  );
}

/** One titled block of a page: a rule, the heading, its content. */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--paper-rule-soft)] py-8">
      <h2 className="m-0 mb-5 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--paper-faint)]">{title}</h2>
      {children}
    </section>
  );
}

export const FIELD = "w-full rounded-xl border border-[var(--paper-rule)]/25 bg-[var(--paper)] px-4 py-3 text-[15px] text-[var(--paper-text)] outline-none transition-shadow focus:ring-2 focus:ring-ring";
export const BUTTON = "inline-flex h-11 items-center justify-center rounded-xl bg-[var(--paper-text)] px-5 text-[14px] font-medium text-[var(--paper)] transition-opacity hover:opacity-90 disabled:opacity-60";
