"use client";

import { useState, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import { Check, ChevronDown } from "lucide-react";
import { CALLS, LICENSES, TERMS, price, type Choice } from "@/lib/api-pricing";
import type { CatalogTable } from "./useCatalog";

const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;
const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const SHORT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const DOLLARS = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const TRIGGER = "flex h-9 w-full items-center gap-2 rounded-lg border bg-background px-3 text-[13px] transition-colors hover:bg-muted";
const ROW = "group/row flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted";

/**
 * An API box's control panel: the reader dials what they want and the price
 * follows, from a free key up to everything (lib/api-pricing.ts). The shape is
 * GovBlock's search filter panel (components/search-filters.tsx): a small
 * label over a one-line summary that opens a checklist, counts at the right,
 * All and None at the foot. The tables picked here are the rows lit in the
 * endpoint table beside it, and clicking a row there picks it here.
 */
export function ApiPricer({ dataset, name, tables, selected, onSelect }: {
  dataset: string;
  name: string;
  tables: CatalogTable[] | null;
  selected: Set<string>;
  onSelect: (next: Set<string>) => void;
}) {
  const [calls, setCalls] = useState<string>("1k");
  const [term, setTerm] = useState<string>("1");
  const [license, setLicense] = useState<string>("internal");
  const rows = Object.fromEntries((tables ?? []).map((t) => [t.path, t.rows]));
  const all = tables?.length ?? 0;
  const chosenRows = [...selected].reduce((s, p) => s + (rows[p] ?? 0), 0);
  const choice: Choice = { dataset, tables: [...selected], calls, term, license };
  const cost = price(choice, rows);
  const termRow = TERMS.find((t) => t.id === term)!;
  const free = cost === 0;

  const tableSummary = !selected.size ? "No tables" : selected.size === all ? `All ${all} tables` : `${selected.size} of ${all} tables`;

  return (
    <form action={free ? "/api/free-key" : "/api/checkout"} method="post" className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="dataset" value={dataset} />
      <input type="hidden" name="tables" value={selected.size === all ? "*" : [...selected].join(",")} />
      <input type="hidden" name="calls" value={calls} />
      <input type="hidden" name="term" value={term} />
      <input type="hidden" name="license" value={license} />

      <div className="thin-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <p className="m-0 text-xs font-medium text-muted-foreground">Build your plan</p>

        <Group title="Tables" summary={tableSummary} detail={selected.size ? `${SHORT.format(chosenRows)} records` : ""}>
          <div className="thin-scrollbar max-h-[min(22rem,60svh)] overflow-y-auto p-1">
            {tables?.map((t) => {
              const on = selected.has(t.path);
              return (
                <button key={t.path} type="button" className={ROW} onClick={() => {
                  const next = new Set(selected);
                  if (on) next.delete(t.path);
                  else next.add(t.path);
                  onSelect(next);
                }}>
                  <span className={`flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border ${on ? "border-foreground bg-foreground text-background" : "border-input"}`}>
                    {on && <Check className="size-2.5" strokeWidth={3} aria-hidden />}
                  </span>
                  <span className={`min-w-0 flex-1 truncate ${on ? "text-foreground" : "text-muted-foreground"}`} style={MONO}>/{t.path}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{SHORT.format(t.rows)}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1 border-t p-1">
            <button type="button" onClick={() => onSelect(new Set(tables?.map((t) => t.path)))} className="flex-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">All</button>
            <button type="button" onClick={() => onSelect(new Set())} className="flex-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">None</button>
          </div>
        </Group>

        <Single title="Calls a month" options={CALLS} value={calls} onChange={setCalls} note={(id) => (id === "1k" ? "Free" : "")} />
        <Single title="Term" options={TERMS} value={term} onChange={setTerm} note={(id) => (id === "6" ? "10% off" : id === "12" ? "27% off" : "")} />
        <Single title="License" options={LICENSES} value={license} onChange={setLicense} note={() => ""} />
      </div>

      <div className="mt-4 shrink-0 border-t pt-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <span className="text-3xl" style={SERIF}>{free ? "Free" : DOLLARS.format(cost)}</span>
          <span className="text-xs text-muted-foreground" style={MONO}>
            {free ? "1,000 calls a month" : termRow.months === 1 ? "per month" : `for ${termRow.months} months`}
          </span>
        </div>
        {free && (
          <input type="email" name="email" required placeholder="Your email" className="mb-2 h-11 w-full rounded-xl border bg-background px-3 text-[14px] outline-none focus:border-foreground" />
        )}
        <button type="submit" disabled={!selected.size} className="flex h-12 w-full items-center justify-center rounded-xl bg-foreground text-[15px] font-medium text-background hover:opacity-90 disabled:opacity-40">
          {free ? `Get a free ${name} key` : `Subscribe to the ${name}`}
        </button>
      </div>
    </form>
  );
}

/** A label over a one-line summary that opens a menu, the filter panel's group. */
function Group({ title, summary, detail, children }: { title: string; summary: string; detail?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="m-0 text-xs text-muted-foreground">{title}</p>
      <Popover.Root>
        <Popover.Trigger className={TRIGGER}>
          <span className="min-w-0 flex-1 truncate text-left text-foreground">{summary}</span>
          {detail && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{detail}</span>}
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner align="end" sideOffset={4} className="z-[100]">
            <Popover.Popup className="w-[19rem] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">{children}</Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

/** A group with one choice. */
function Single({ title, options, value, onChange, note }: {
  title: string;
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  note: (id: string) => string;
}) {
  const current = options.find((o) => o.id === value)!;
  return (
    <Group title={title} summary={current.label} detail={note(value)}>
      <div className="p-1">
        {options.map((o) => (
          <button key={o.id} type="button" className={ROW} onClick={() => onChange(o.id)}>
            <span className={`flex size-3.5 shrink-0 rounded-full border ${o.id === value ? "border-[4px] border-foreground" : "border-input"}`} aria-hidden />
            <span className={`min-w-0 flex-1 ${o.id === value ? "text-foreground" : "text-muted-foreground"}`}>{o.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{note(o.id)}</span>
          </button>
        ))}
      </div>
    </Group>
  );
}
