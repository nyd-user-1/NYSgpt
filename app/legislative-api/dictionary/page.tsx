import { dictionary } from "@/lib/legislative-docs";

export const metadata = { title: "Legislative API data dictionary" };

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;
const fmt = (n: number) => n.toLocaleString("en-US");

export default function DictionaryPage() {
  const { groups, tables, rows } = dictionary();
  return (
    <>
      <h1 className="m-0 text-4xl font-normal" style={SERIF}>Legislative API data dictionary</h1>
      <p className="m-0 mt-3 text-[13px] text-[var(--paper-muted)]" style={MONO}>
        {tables} tables · {fmt(rows)} records · GET https://api.nysgpt.com/v1/gov/&lt;table&gt;
      </p>

      <nav className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
        {groups.map((g) => (
          <a key={g.slug} href={`#${g.slug}`} className="text-[var(--paper-strong)]">
            <span className="link-wipe">{g.name}</span> <span className="text-[var(--paper-faint)]">{g.tables.length}</span>
          </a>
        ))}
      </nav>

      {groups.map((g) => (
        <section key={g.slug} id={g.slug} className="mt-12 scroll-mt-6">
          <h2 className="m-0 flex items-baseline justify-between gap-4 border-b border-[var(--paper-rule)] pb-3 text-2xl font-normal" style={SERIF}>
            {g.name}
            <span className="text-[13px] text-[var(--paper-faint)]" style={MONO}>
              {g.tables.length} tables · {fmt(g.rows)} records
            </span>
          </h2>
          {g.tables.map((t) => (
            <details key={t.path} id={t.path} className="group border-b border-[var(--paper-rule-soft)]">
              <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 py-3 hover:bg-[var(--paper-quiet)]">
                <span className="text-[14px] text-[var(--paper-text)]" style={MONO}>{t.path}</span>
                <span className="shrink-0 text-[13px] tabular-nums text-[var(--paper-muted)]">
                  {fmt(t.rows)} rows · {t.columns.length} columns
                </span>
              </summary>
              <div className="pb-5">
                <p className="m-0 mb-3 text-[12.5px] text-[var(--paper-muted)]" style={MONO}>GET /v1/gov/{t.path}</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-[13px]">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[var(--paper-faint)]">
                        <th className="py-2 pr-4 font-medium">Column</th>
                        <th className="py-2 pr-4 font-medium">Type</th>
                        <th className="py-2 pr-4 font-medium">Filter</th>
                        <th className="py-2 font-medium">Example</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.columns.map((c) => (
                        <tr key={c.name} className="border-t border-[var(--paper-rule-soft)] align-top">
                          <td className="py-2 pr-4" style={MONO}>{c.name}</td>
                          <td className="py-2 pr-4 text-[var(--paper-muted)]" style={MONO}>{c.type}</td>
                          <td className="py-2 pr-4">{c.filter ? "Yes" : ""}</td>
                          <td className="max-w-[360px] break-words py-2 text-[var(--paper-muted)]" style={MONO}>{c.example}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          ))}
        </section>
      ))}
    </>
  );
}
