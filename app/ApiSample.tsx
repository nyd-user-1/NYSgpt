"use client";

import { useState } from "react";
import type { HomeCardData } from "@/lib/home-data";
import type { CatalogTable } from "./useCatalog";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;
const LONG = new Intl.NumberFormat("en-US");

/** A cell's value as text: nulls dashed, objects and lists as compact JSON. */
const show = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

/**
 * An API box's dialog, where a product shows its screenshot: what one call
 * returns, read as plain facts with the source each came from, and the raw
 * response one click away. With a table picked in the endpoint list, it shows
 * that table's real first row instead, every column with its type.
 */
export function ApiSample({ card, table, inline }: { card: HomeCardData; table?: CatalogTable | null; inline?: boolean }) {
  const [raw, setRaw] = useState(false);
  if (!card.api) return null;
  const call = table ? `${card.api.base}/${table.path}?limit=1` : `${card.api.base}${card.api.example}`;
  const json = table ? JSON.stringify({ data: [table.sample], meta: { source: `${table.schema}.${table.table}` } }, null, 2) : card.sample;

  return (
    <figure className={`flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm ${inline ? "m-0" : "m-0 min-h-[20rem] lg:min-h-0 lg:flex-1"}`}>
      <div className="flex h-10 shrink-0 items-center gap-3 border-b bg-muted/50 px-3 text-[11.5px]" style={MONO}>
        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700">GET</span>
        <span className="min-w-0 flex-1 truncate">{call.replace("https://", "")}</span>
        <button type="button" onClick={() => setRaw(!raw)} className="shrink-0 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          {raw ? "Readout" : "JSON"}
        </button>
      </div>
      {raw ? (
        <pre className="thin-scrollbar thin-scrollbar-dark m-0 min-h-0 flex-1 overflow-auto bg-zinc-950 px-4 py-3 text-[11.5px] leading-relaxed text-zinc-300" style={MONO}>{json}</pre>
      ) : table ? (
        <div className={`${inline ? "" : "thin-scrollbar min-h-0 flex-1 overflow-y-auto"} px-6 py-5`}>
          <p className="m-0 text-2xl" style={SERIF}>/{table.path}</p>
          <p className="m-0 mt-1 mb-4 text-sm text-muted-foreground">
            {LONG.format(table.rows)} records · {table.columns.length} fields · filter by {table.filters.join(", ")}
          </p>
          <dl className="m-0 divide-y">
            {table.columns.map(([name, type]) => (
              <div key={name} className="grid grid-cols-[8.5rem_1fr] items-baseline gap-4 py-2.5">
                <dt className="truncate text-sm text-muted-foreground" style={MONO}>{name}</dt>
                <dd className="m-0 min-w-0 text-[14px] break-words">{show(table.sample[name])}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        card.readout && (
          <div className={`${inline ? "" : "thin-scrollbar min-h-0 flex-1 overflow-y-auto"} px-6 py-5`}>
            <p className="m-0 mb-4 text-2xl" style={SERIF}>{card.readout.title}</p>
            <dl className="m-0 divide-y">
              {card.readout.rows.map(([label, value, source]) => (
                <div key={label} className="grid grid-cols-[9rem_1fr_auto] items-baseline gap-4 py-3">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="m-0 text-[15px]">{value}</dd>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground" style={MONO}>{source}</span>
                </div>
              ))}
            </dl>
          </div>
        )
      )}
    </figure>
  );
}
