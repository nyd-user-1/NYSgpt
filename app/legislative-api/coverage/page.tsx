import { coverage, dictionary } from "@/lib/legislative-docs";

export const metadata = { title: "Legislative API coverage" };

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;
const fmt = (n: number) => (n ? n.toLocaleString("en-US") : "—");
const COLS = [
  ["bills", "Bills"],
  ["texts", "Bill texts"],
  ["sponsors", "Sponsorships"],
  ["rollCalls", "Roll calls"],
  ["votes", "Member votes"],
  ["laws", "Law sections"],
] as const;

export default function CoveragePage() {
  const { counted, jurisdictions } = coverage();
  const { groups } = dictionary();
  const total = (k: (typeof COLS)[number][0]) => jurisdictions.reduce((s, j) => s + j[k], 0);
  const date = new Date(`${counted}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      <h1 className="m-0 text-4xl font-normal" style={SERIF}>Legislative API coverage</h1>
      <p className="m-0 mt-3 text-[13px] text-[var(--paper-muted)]" style={MONO}>
        {jurisdictions.length} jurisdictions · counted {date}
      </p>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--paper-rule-soft)]">
        <table className="w-full min-w-[820px] border-collapse text-[13.5px] tabular-nums">
          <thead className="sticky top-0 bg-[var(--paper)]">
            <tr className="text-[11px] uppercase tracking-[0.14em] text-[var(--paper-faint)]">
              <th className="sticky left-0 bg-[var(--paper)] px-4 py-3 text-left font-medium">Jurisdiction</th>
              <th className="px-4 py-3 text-left font-medium">Years</th>
              {COLS.map(([, label]) => (
                <th key={label} className="px-4 py-3 text-right font-medium">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jurisdictions.map((j) => (
              <tr key={j.state} className="border-t border-[var(--paper-rule-soft)] hover:bg-[var(--paper-quiet)]">
                <td className="sticky left-0 bg-[var(--paper)] px-4 py-2.5">
                  {j.name} <span className="text-[var(--paper-faint)]" style={MONO}>{j.state}</span>
                </td>
                <td className="px-4 py-2.5 text-[var(--paper-muted)]">{j.from && j.to ? `${j.from}–${j.to}` : "—"}</td>
                {COLS.map(([k]) => (
                  <td key={k} className="px-4 py-2.5 text-right">{fmt(j[k])}</td>
                ))}
              </tr>
            ))}
            <tr className="border-t-2 border-[var(--paper-rule)] font-medium">
              <td className="sticky left-0 bg-[var(--paper)] px-4 py-3">All jurisdictions</td>
              <td className="px-4 py-3" />
              {COLS.map(([k]) => (
                <td key={k} className="px-4 py-3 text-right">{fmt(total(k))}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="m-0 mt-14 border-b border-[var(--paper-rule)] pb-3 text-2xl font-normal" style={SERIF}>Every table, by topic</h2>
      <div className="grid gap-x-10 sm:grid-cols-2">
        {groups.map((g) => (
          <a
            key={g.slug}
            href={`/legislative-api/dictionary#${g.slug}`}
            className="group flex items-baseline justify-between gap-4 border-b border-[var(--paper-rule-soft)] py-3 hover:bg-[var(--paper-quiet)]"
          >
            <span className="text-[15px] text-[var(--paper-strong)]">
              <span className="link-wipe">{g.name}</span>
            </span>
            <span className="text-[13px] tabular-nums text-[var(--paper-muted)]" style={MONO}>
              {g.tables.length} tables · {g.rows.toLocaleString("en-US")} records
            </span>
          </a>
        ))}
      </div>
    </>
  );
}
