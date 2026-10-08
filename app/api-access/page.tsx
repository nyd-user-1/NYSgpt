import { DATASETS, freeKeyFrom, keyFor } from "@/lib/api-access";

export const dynamic = "force-dynamic";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

/** Where a plan lands: Stripe returns here with its session, a free key with its signed link. The key, and a first call. */
export default async function ApiAccess({ searchParams }: { searchParams: Promise<{ session_id?: string; key?: string; sig?: string }> }) {
  const q = await searchParams;
  const access = q.session_id
    ? await keyFor(q.session_id).catch(() => null)
    : q.key && q.sig
      ? await freeKeyFrom(q.key, q.sig).catch(() => null)
      : null;
  const tables = access?.tables === "*" ? "every table" : `${access?.tables.split(",").length} tables`;

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      {access ? (
        <>
          <h1 className="m-0 text-4xl" style={SERIF}>Your {DATASETS[access.dataset]} API key</h1>
          <p className="mt-3 text-muted-foreground">{tables} · {access.calls} a month</p>
          <pre className="mt-8 overflow-x-auto rounded-xl bg-zinc-950 px-5 py-4 text-[13px] text-amber-300" style={MONO}>{access.key}</pre>
          <p className="mt-3 text-sm text-muted-foreground">Keep it somewhere safe. This link shows it again.</p>
          <pre className="mt-8 overflow-x-auto rounded-xl border px-5 py-4 text-[12.5px] leading-relaxed" style={MONO}>
{`curl https://api.nysgpt.com/v1/${access.dataset} \\
  -H "x-api-key: ${access.key}"`}
          </pre>
          <p className="mt-3 text-sm text-muted-foreground">That call lists the dataset&apos;s tables. Each is <span style={MONO}>/v1/{access.dataset}/&lt;table&gt;</span>, filtered on its indexed columns.</p>
        </>
      ) : (
        <>
          <h1 className="m-0 text-4xl" style={SERIF}>Payment is still processing</h1>
          <p className="mt-3 text-muted-foreground">Reload this page in a moment and your key will be here.</p>
        </>
      )}
    </main>
  );
}
