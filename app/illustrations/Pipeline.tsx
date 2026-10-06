"use client";

import { useEffect, useState } from "react";
import { ChevronDown, LoaderCircle, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { MONO, Pane, useStage, type Staged } from "./parts";

/** Sample fruit orders as a supplier hands them over. `held` is why the check stops one. */
const FETCHED: { id: string; name: string; date: string; amount: string; held?: string }[] = [
  { id: "1041", name: "BANANAS, 40 LB CASE", date: "03/04/26", amount: "$1,200.00" },
  { id: "1041", name: "Bananas, 40 lb case", date: "2026-03-04", amount: "1200", held: "duplicate" },
  { id: "1042", name: "mango  crate", date: "4 Mar 2026", amount: "880.5" },
  { id: "", name: "Strawberries, flat", date: "2026-03-05", amount: "310", held: "no id" },
  { id: "1044", name: "Blueberries, pint", date: "05.03.2026", amount: "95" },
];

const PUBLISHED = [
  { id: "1041", picture: "🍌", name: "Bananas, 40 lb case", date: "2026-03-04", amount: "1,200.00" },
  { id: "1042", picture: "🥭", name: "Mango crate", date: "2026-03-04", amount: "880.50" },
  { id: "1044", picture: "🫐", name: "Blueberries, pint", date: "2026-03-05", amount: "95.00" },
];

const STEPS = [
  { name: "Discover", did: "5 orders changed at the source" },
  { name: "Fetch", did: "5 orders fetched" },
  { name: "Check", did: "2 held back: a duplicate and an order with no id" },
  { name: "Publish", did: "3 clean orders published" },
];

const COLS = "grid grid-cols-[3rem_1fr_6.5rem_5.5rem] gap-x-3 px-3";

export function Pipeline({ onStage }: Staged) {
  /** How many steps have finished: 0 before the run, 4 once published. */
  const [done, setDone] = useState(0);
  /** The reader starts it, pauses it and moves it step by step; nothing moves on its own. */
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (done >= STEPS.length) {
      setRunning(false);
      return;
    }
    const t = setTimeout(() => setDone((d) => d + 1), 1000);
    return () => clearTimeout(t);
  }, [running, done]);

  const finished = done >= STEPS.length;
  const fetched = done >= 2;
  const checked = done >= 3;
  const published = done >= 4;
  useStage(onStage, published);

  /** Run from where it stands, pause a run, or start over once it has finished. */
  const press = () => {
    if (running) return setRunning(false);
    if (finished) setDone(0);
    setRunning(true);
  };

  return (
    <>
      <Pane
        head="As fetched"
        className="lg:flex-[5]"
        bodyClassName="flex flex-col"
        aside={
          // The run control: the step it stands at, forward or back, and one small button to run it.
          <span className="flex shrink-0 items-center gap-1.5 font-sans normal-case tracking-normal">
            <span className="relative">
              <select
                aria-label="The step the run stands at"
                value={done}
                onChange={(e) => {
                  setRunning(false);
                  setDone(Number(e.target.value));
                }}
                className="h-7 appearance-none rounded-md border bg-background pr-6 pl-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value={0}>Not run</option>
                {STEPS.map((s, i) => (
                  <option key={s.name} value={i + 1}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-1.5 size-3 -translate-y-1/2" aria-hidden />
            </span>
            <button type="button" onClick={press} aria-label={running ? "Pause the run" : finished ? "Run again" : "Run"} title={running ? "Pause" : finished ? "Run again" : "Run"} className="flex size-7 items-center justify-center rounded-md border bg-background text-foreground hover:bg-muted">
              {running ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : finished ? <RotateCcw className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
            </button>
          </span>
        }
      >
        <ul className="m-0 flex min-h-[10.5rem] flex-1 list-none flex-col p-0 text-xs lg:min-h-0">
          {FETCHED.map((r, i) => {
            const struck = checked && r.held ? "text-muted-foreground/70 line-through" : "";
            return (
              <li key={i} className={cn(COLS, "min-h-0 flex-1 items-center border-b transition-opacity duration-500 last:border-b-0", !fetched && "opacity-20")}>
                <span className={cn("tabular-nums", struck)} style={MONO}>{r.id || "—"}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn("truncate whitespace-pre", struck)}>{r.name}</span>
                  {r.held && (
                    <span className={cn("shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive transition-opacity duration-300", checked ? "opacity-100" : "opacity-0")}>{r.held}</span>
                  )}
                </span>
                <span className={cn("tabular-nums", struck)} style={MONO}>{r.date}</span>
                <span className={cn("text-right tabular-nums", struck)} style={MONO}>{r.amount}</span>
              </li>
            );
          })}
        </ul>
      </Pane>

      <p className="m-0 min-h-5 shrink-0 text-xs text-muted-foreground" aria-live="polite">{done > 0 ? `${STEPS[done - 1].name}: ${STEPS[done - 1].did}` : "Not run yet."}</p>

      <Pane head="Published" className="lg:flex-[3]" bodyClassName="flex flex-col">
        <ul className="m-0 flex min-h-[6.5rem] flex-1 list-none flex-col p-0 text-xs lg:min-h-0">
          {PUBLISHED.map((r, i) => (
            <li key={r.id} className={cn(COLS, "min-h-0 flex-1 items-center border-b transition-opacity duration-500 last:border-b-0", published ? "opacity-100" : "opacity-0")} style={{ transitionDelay: published ? `${i * 120}ms` : "0ms" }}>
              <span className="tabular-nums" style={MONO}>{r.id}</span>
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-sm leading-none" aria-hidden>{r.picture}</span>
                <span className="truncate">{r.name}</span>
              </span>
              <span className="tabular-nums" style={MONO}>{r.date}</span>
              <span className="text-right tabular-nums" style={MONO}>{r.amount}</span>
            </li>
          ))}
        </ul>
      </Pane>
    </>
  );
}
