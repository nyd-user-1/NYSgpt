import { DATASETS, keyFor } from "@/lib/api-access";

export const dynamic = "force-dynamic";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

/** Where Stripe Checkout returns: the buyer's API key, and their first call. */
export default async function ApiAccess({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const access = session_id ? await keyFor(session_id).catch(() => null) : null;
  const first = access?.datasets[0] ?? "energy";

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      {access ? (
        <>
          <h1 className="m-0 text-4xl" style={SERIF}>Your API key</h1>
          <p className="mt-3 text-muted-foreground">
            {access.datasets.length === Object.keys(DATASETS).length ? "Every dataset" : access.datasets.map((d) => DATASETS[d]).join(", ")} · 100,000 calls a month
            {access.email ? ` · receipt sent to ${access.email}` : ""}
          </p>
          <pre className="mt-8 overflow-x-auto rounded-xl bg-zinc-950 px-5 py-4 text-[13px] text-amber-300" style={MONO}>{access.key}</pre>
          <p className="mt-3 text-sm text-muted-foreground">Keep it somewhere safe. This page shows it again from the same link.</p>
          <pre className="mt-8 overflow-x-auto rounded-xl border px-5 py-4 text-[12.5px] leading-relaxed" style={MONO}>
{`curl https://api.nysgpt.com/v1/${first} \\
  -H "x-api-key: ${access.key}"`}
          </pre>
          <p className="mt-3 text-sm text-muted-foreground">That call lists every table in the dataset. Each one is <span style={MONO}>/v1/{first}/&lt;table&gt;</span>, filtered on its indexed columns.</p>
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
