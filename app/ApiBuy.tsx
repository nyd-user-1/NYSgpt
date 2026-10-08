const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

/**
 * An API box's checkout: this dataset on the Pro plan, or every dataset.
 * Each posts to /api/checkout, which hands the buyer to Stripe; the key is
 * issued on the page Stripe returns to (/api-access). Prices: lib/api-access.ts.
 */
export function ApiBuy({ dataset, name }: { dataset: string; name: string }) {
  return (
    <div className="grid shrink-0 grid-cols-2 gap-2">
      <form action="/api/checkout" method="post">
        <input type="hidden" name="dataset" value={dataset} />
        <button type="submit" className="flex h-12 w-full flex-col items-center justify-center rounded-xl bg-foreground text-background hover:opacity-90">
          <span className="text-[14px] font-medium">Get the {name}</span>
          <span className="text-[11px] opacity-70" style={MONO}>$199 / month</span>
        </button>
      </form>
      <form action="/api/checkout" method="post">
        <input type="hidden" name="dataset" value="all" />
        <button type="submit" className="flex h-12 w-full flex-col items-center justify-center rounded-xl border text-foreground hover:bg-muted">
          <span className="text-[14px] font-medium">Get all 10 APIs</span>
          <span className="text-[11px] text-muted-foreground" style={MONO}>$999 / month</span>
        </button>
      </form>
    </div>
  );
}
