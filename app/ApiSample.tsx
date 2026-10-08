"use client";

import type { HomeCardData } from "@/lib/home-data";

const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

/**
 * An API box's dialog, where a product shows its screenshot: the example call
 * as a client makes it, and the response the live API gave (API_SAMPLES).
 */
export function ApiSample({ card }: { card: HomeCardData }) {
  if (!card.api || !card.sample) return null;
  return (
    <figure className="m-0 flex min-h-[20rem] flex-col overflow-hidden rounded-lg border bg-zinc-950 text-[11.5px] leading-relaxed text-zinc-100 shadow-sm lg:min-h-0 lg:flex-1" style={MONO}>
      <pre className="m-0 shrink-0 overflow-x-auto border-b border-zinc-800 px-4 py-3">
        <span className="text-zinc-500">$ </span>curl &quot;{card.api.base}{card.api.example}&quot; \{"\n"}
        {"    "}-H &quot;x-api-key: <span className="text-amber-300">your key</span>&quot;
      </pre>
      <pre className="m-0 min-h-0 flex-1 overflow-auto px-4 py-3 text-zinc-300">{card.sample}</pre>
    </figure>
  );
}
