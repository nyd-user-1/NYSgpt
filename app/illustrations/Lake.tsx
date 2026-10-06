"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Code, FileText, LoaderCircle, Search } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { cn } from "@/lib/utils";
import { Chip, MONO, Pane, useStage, type Staged } from "./parts";

/** A sample dataset as it sits in storage: a grocer's sales, two Parquet files a year. */
const FILES = [
  { year: 2024, part: 0, rows: 770_056, size: "212 MB" },
  { year: 2024, part: 1, rows: 770_056, size: "198 MB" },
  { year: 2025, part: 0, rows: 805_973, size: "221 MB" },
  { year: 2025, part: 1, rows: 805_973, size: "207 MB" },
  { year: 2026, part: 0, rows: 830_136, size: "224 MB" },
  { year: 2026, part: 1, rows: 830_136, size: "197 MB" },
];

const ALL = [2024, 2025, 2026];
const TOTAL = FILES.reduce((n, f) => n + f.rows, 0);

/** The sample questions. `years` is what the lake has to read; cost is at $5 a terabyte scanned. */
const QUESTIONS: { ask: string; years: number[]; says: string; table?: { head: [string, string]; rows: [string, string][] }; ran: string; cost: string; sql: string }[] = [
  {
    ask: "How many sales are on file?",
    years: ALL,
    says: "4,812,330 sales, across every year held.",
    ran: "0.9 s",
    cost: "$0.00005",
    sql: "SELECT count(*) AS sales\nFROM sales",
  },
  {
    ask: "How many sales each year?",
    years: ALL,
    says: "More each year.",
    table: { head: ["Year", "Sales"], rows: [["2024", "1,540,112"], ["2025", "1,611,946"], ["2026", "1,660,272"]] },
    ran: "1.2 s",
    cost: "$0.00005",
    sql: "SELECT year, count(*) AS sales\nFROM sales\nGROUP BY year\nORDER BY year",
  },
  {
    ask: "Which fruit sold the most in 2026?",
    years: [2026],
    says: "Bananas, then apples.",
    table: { head: ["Fruit", "Sales"], rows: [["🍌 Bananas", "412,880"], ["🍎 Apples", "377,105"], ["🍓 Strawberries", "201,442"]] },
    ran: "2.4 s",
    cost: "$0.0003",
    sql: "SELECT fruit, count(*) AS sales\nFROM sales\nWHERE year = 2026\nGROUP BY fruit\nORDER BY sales DESC\nLIMIT 3",
  },
];

type Phase = "idle" | "typing" | "searching" | "done";

export function Lake({ onStage }: Staged) {
  const still = useReducedMotion();
  const [at, setAt] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  /** How much of the question has been typed into the box. */
  const [typed, setTyped] = useState(0);
  const [sql, setSql] = useState(false);
  const q = QUESTIONS[at];
  const column = useRef<HTMLDivElement>(null);
  useStage(onStage, phase === "done");
  // A new answer is shown from its top.
  useEffect(() => {
    if (phase === "done") column.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase, at]);

  const ask = (i: number) => {
    setAt(i);
    setSql(false);
    setTyped(still ? QUESTIONS[i].ask.length : 0);
    setPhase(still ? "done" : "typing");
  };

  useEffect(() => {
    if (phase === "typing") {
      if (typed >= q.ask.length) {
        const t = setTimeout(() => setPhase("searching"), 250);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setTyped((n) => n + 1), 24);
      return () => clearTimeout(t);
    }
    if (phase === "searching") {
      const t = setTimeout(() => setPhase("done"), 1300);
      return () => clearTimeout(t);
    }
  }, [phase, typed, q.ask.length]);

  const reading = phase === "searching" || phase === "done";
  const read = FILES.filter((f) => q.years.includes(f.year));
  const rows = read.reduce((n, f) => n + f.rows, 0);

  return (
    <>
      <div className="flex shrink-0 flex-col gap-2">
        <div className="flex h-12 items-center gap-2.5 rounded-full border bg-background pr-1.5 pl-4 text-sm shadow-xs">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className={cn("min-w-0 flex-1 truncate", phase === "idle" && "text-muted-foreground")}>
            {phase === "idle" ? "Ask your files a question" : q.ask.slice(0, typed)}
            {phase === "typing" && <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-foreground" aria-hidden />}
          </span>
          <button type="button" onClick={() => ask(at)} aria-label="Ask" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background hover:opacity-90">
            <ArrowUp className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUESTIONS.map((x, i) => (
            <Chip key={x.ask} active={phase !== "idle" && i === at} onClick={() => ask(i)}>{x.ask}</Chip>
          ))}
        </div>
      </div>

      {/* The answer arrives above the files, and the column scrolls: the file
          cards keep their size instead of being squeezed to make room. */}
      <div ref={column} className="flex flex-col gap-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      <AnimatePresence mode="wait" initial={false}>
        {phase === "done" && (
          <motion.section key={at} initial={{ opacity: 0, filter: "blur(8px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: "easeOut" }} className="shrink-0 overflow-hidden rounded-lg border border-[var(--ink)] bg-background">
            <p className="m-0 px-4 pt-3 pb-2 text-base">{q.says}</p>
            {q.table && (
              <table className="w-full border-collapse border-t text-left text-xs">
                <thead>
                  <tr className="border-b text-[10px] uppercase tracking-[0.12em] text-muted-foreground" style={MONO}>
                    <th className="px-4 py-1.5 font-normal">{q.table.head[0]}</th>
                    <th className="px-4 py-1.5 text-right font-normal">{q.table.head[1]}</th>
                  </tr>
                </thead>
                <tbody>
                  {q.table.rows.map(([name, n]) => (
                    <tr key={name} className="border-b last:border-b-0">
                      <td className="px-4 py-1.5">{name}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums" style={MONO}>{n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <footer className="flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-1.5 text-[11px] text-muted-foreground">
              <span className="truncate tabular-nums">{read.length} files · {rows.toLocaleString("en-US")} rows · {q.ran} · {q.cost}</span>
              {/* The query is there for whoever wants it, and out of the way for everyone else. */}
              <button type="button" aria-expanded={sql} onClick={() => setSql(!sql)} className={cn("flex shrink-0 items-center gap-1.5 rounded px-1.5 py-1 hover:bg-muted hover:text-foreground", sql && "bg-muted text-foreground")}>
                <Code className="size-3.5" aria-hidden /> SQL
              </button>
            </footer>
            <AnimatePresence initial={false}>
              {sql && (
                <motion.pre key="sql" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="m-0 overflow-hidden border-t text-[11px] leading-[1.55] whitespace-pre" style={MONO}>
                  <span className="block px-4 py-2.5">{q.sql}</span>
                </motion.pre>
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>

      {/* The files being asked: every row of every one, not a page of links. */}
      <Pane
        head="sales/"
        className="min-h-[14rem] shrink-0 lg:min-h-full"
        bodyClassName="grid grid-cols-3 grid-rows-2 gap-2 p-2"
        aside={
          <span className="flex shrink-0 items-center gap-2 tabular-nums">
            {phase === "searching" && <LoaderCircle className="size-3 animate-spin" aria-hidden />}
            <span>{reading ? <CountUp value={rows} active={reading} duration={1100} /> : TOTAL.toLocaleString("en-US")} rows{reading ? " read" : ""}</span>
          </span>
        }
      >
        {FILES.map((f) => {
          const lit = reading && q.years.includes(f.year);
          return (
            <div key={`${f.year}-${f.part}`} className={cn("relative flex min-h-0 flex-col justify-center overflow-hidden rounded-md border px-3 py-2 transition-colors duration-500", lit ? "text-[var(--ink)]" : "text-muted-foreground")}>
              {/* The file is read top to bottom: every row. */}
              <span className="absolute inset-x-0 top-0 bg-[color-mix(in_oklab,var(--ink)_10%,transparent)] transition-[height] ease-linear" style={{ height: lit ? "100%" : 0, transitionDuration: lit && phase === "searching" ? "1100ms" : "0ms" }} aria-hidden />
              <span className="relative flex items-center gap-1.5 text-[10px]" style={MONO}><FileText className="size-3 shrink-0" aria-hidden /> <span className="truncate">{f.year}/part-{f.part}.parquet</span></span>
              <span className="relative mt-1 text-lg leading-none tabular-nums text-foreground" style={MONO}>{f.rows.toLocaleString("en-US")}</span>
              <span className="relative mt-1 text-[10px]" style={MONO}>rows · {f.size}</span>
            </div>
          );
        })}
      </Pane>
      </div>
    </>
  );
}
