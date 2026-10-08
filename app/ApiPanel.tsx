"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { HomeCardData } from "@/lib/home-data";
import type { CatalogTable } from "./useCatalog";

const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;
const SHORT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const LONG = new Intl.NumberFormat("en-US");

const ROW = "grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2 text-left transition-colors";

/**
 * A product's API reference in its card dialog: the base URL to copy, every
 * endpoint with the records behind it (largest first, the short figure in the
 * row and the exact one on hover), and one call as a client would make it.
 *
 * A live API box (one with a catalog) lists every table its dataset publishes
 * under the join endpoints, and each row picks the record the dialog shows.
 */
export function ApiPanel({ api, live, tables, picked, chosen, onPick, className = "mt-6" }: {
  api: NonNullable<HomeCardData["api"]>;
  className?: string;
  live?: boolean;
  tables?: CatalogTable[] | null;
  picked?: string | null;
  /** The tables in the reader's plan: their rows are ticked, and a click adds or drops one. */
  chosen?: Set<string> | null;
  onPick?: (path: string | null) => void;
}) {
  const [copied, setCopied] = useState(false);
  const endpoints = [...api.endpoints].sort((a, b) => b[1] - a[1]);
  const path = api.example.replace(/\?.*$/, "");
  const copy = () => {
    void navigator.clipboard.writeText(api.base).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <section className={`${className} overflow-hidden rounded-xl border bg-background text-[12.5px]`} style={MONO}>
      <div className="flex h-10 items-center gap-2 border-b bg-muted/40 pr-1.5 pl-3">
        <span className="min-w-0 flex-1 truncate text-foreground">{api.base}</span>
        <button type="button" onClick={copy} aria-label="Copy the base URL" className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        </button>
      </div>

      <ul className="m-0 list-none divide-y p-0">
        {endpoints.map(([route, records]) => (
          <li key={route}>
            {onPick ? (
              <button type="button" onClick={() => onPick(null)} className={`${ROW} ${picked ? "hover:bg-muted/40" : "bg-muted/60"}`}>
                <Get />
                <span className="truncate text-foreground">{route}</span>
                <span className="tabular-nums text-muted-foreground" title={`${LONG.format(records)} records`}>{SHORT.format(records)}</span>
              </button>
            ) : (
              <div className={`${ROW} hover:bg-muted/40`}>
                <Get />
                <span className="truncate text-foreground">{route}</span>
                <span className="tabular-nums text-muted-foreground" title={`${LONG.format(records)} records`}>{SHORT.format(records)}</span>
              </div>
            )}
          </li>
        ))}
        {tables?.map((t) => (
          <li key={t.path}>
            <button type="button" onClick={() => onPick?.(t.path)} className={`${ROW} ${picked === t.path || chosen?.has(t.path) ? "bg-muted/60" : "hover:bg-muted/40"}`}>
              {chosen ? <Tick on={chosen.has(t.path)} /> : <Get />}
              <span className="truncate text-foreground">/{t.path}</span>
              <span className="tabular-nums text-muted-foreground" title={`${LONG.format(t.rows)} records`}>{SHORT.format(t.rows)}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* A live API's box shows its real call and response beside this, so the sketch is left off. */}
      {!live && <pre className="m-0 overflow-x-auto bg-zinc-950 px-3 py-3 text-[11.5px] leading-relaxed text-zinc-100">
        <span className="text-zinc-500">$ </span>curl &quot;{api.base}{api.example}&quot; \{"\n"}
        {"    "}-H &quot;x-api-key: <span className="text-amber-300">your key</span>&quot;{"\n\n"}
        <span className="text-zinc-400">{`{ "object": "list", "url": "${new URL(api.base).pathname}${path}", "has_more": true, "data": [ … ] }`}</span>
      </pre>}
    </section>
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <span className={`flex size-4 items-center justify-center rounded-[4px] border ${on ? "border-foreground bg-foreground text-background" : "border-input bg-background"}`}>
      {on && <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden><path d="M2.5 6.5l2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>}
    </span>
  );
}

function Get() {
  return <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 dark:text-emerald-400">GET</span>;
}
