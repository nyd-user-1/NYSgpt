"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, FileSpreadsheet, FileText, FileUp, Globe, KeyRound, LoaderCircle, Plug, RotateCcw, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Caret, MONO, Pane, useStage, useTyped, type Staged } from "./parts";

type Row = [picture: string, item: string, price: string, unit: string, origin: string];

/**
 * Four ways a price list comes in, each a sample supplier publishing it its
 * own way, and the records it becomes. `typed` is what the person enters for
 * that way, where there is something to type.
 */
const SOURCES: { mode: string; icon: LucideIcon; verb: string; typed: string; raw: string; rows: Row[] }[] = [
  {
    mode: "Website",
    icon: Globe,
    verb: "Load",
    typed: "https://riversidefarm.example/prices",
    raw: `<tr><td>BANANAS</td><td>$0.59 / lb</td><td>Ecuador</td></tr>\n<tr><td>PINEAPPLE</td><td>$2.99 ea.</td><td>Costa Rica</td></tr>\n…`,
    rows: [
      ["🍌", "Bananas", "0.59", "lb", "Ecuador"],
      ["🍍", "Pineapple", "2.99", "each", "Costa Rica"],
      ["🥭", "Mangoes", "1.19", "each", "Mexico"],
      ["🥥", "Coconuts", "2.49", "each", "Dominican Republic"],
      ["🥝", "Kiwi", "0.69", "each", "New Zealand"],
      ["🥑", "Avocados", "1.50", "each", "Mexico"],
      ["🍋", "Lemons", "0.79", "each", "California"],
    ],
  },
  {
    mode: "PDF",
    icon: FileUp,
    verb: "Load",
    typed: "",
    raw: `MANGOES (ATAULFO) ........ 1.25 EA     ORIGIN: MEXICO\nORANGES, NAVEL ........... 1.09 LB     ORIGIN: USA (FL)\n…`,
    rows: [
      ["🥭", "Mangoes, Ataulfo", "1.25", "each", "Mexico"],
      ["🍊", "Oranges, navel", "1.09", "lb", "Florida"],
      ["🍇", "Grapes, red", "2.99", "lb", "Chile"],
      ["🍉", "Watermelon", "5.99", "each", "Georgia"],
      ["🍑", "Peaches", "2.49", "lb", "South Carolina"],
      ["🍒", "Cherries", "6.99", "lb", "Washington"],
      ["🍋", "Lemons, 2 lb bag", "3.49", "bag", "California"],
    ],
  },
  {
    mode: "File",
    icon: FileSpreadsheet,
    verb: "Load",
    typed: "",
    raw: `sku,item,price_cents,uom,origin\n4011,"Apples, Gala",129,LB,US-WA\n…`,
    rows: [
      ["🍎", "Apples, Gala", "1.29", "lb", "Washington"],
      ["🍎", "Apples, Honeycrisp", "2.79", "lb", "New York"],
      ["🍏", "Apples, Granny Smith", "1.59", "lb", "Washington"],
      ["🍐", "Pears, Bartlett", "1.49", "lb", "Oregon"],
      ["🍓", "Strawberries", "3.99", "lb", "California"],
      ["🫐", "Blueberries", "4.49", "pint", "Michigan"],
      ["🍈", "Melon, honeydew", "3.99", "each", "Arizona"],
    ],
  },
  {
    mode: "API",
    icon: Plug,
    verb: "Connect",
    typed: "api.northfield.example/v1/prices",
    raw: `[{"item":"Tangerines","origin":"Spain","price":{"amount":1.79,"per":"lb"}},\n {"item":"Tomatoes","origin":"Mexico","price":{"amount":1.99,"per":"lb"}},\n …`,
    rows: [
      ["🍊", "Tangerines", "1.79", "lb", "Spain"],
      ["🍅", "Tomatoes", "1.99", "lb", "Mexico"],
      ["🫒", "Olives", "6.49", "jar", "Spain"],
      ["🥥", "Coconut", "2.29", "each", "Thailand"],
      ["🥝", "Kiwi", "0.59", "each", "Italy"],
      ["🫐", "Blueberries", "3.99", "pint", "Chile"],
      ["🍓", "Strawberries", "4.49", "lb", "Mexico"],
    ],
  },
];

const COLS = "grid grid-cols-[minmax(0,2.2fr)_4rem_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.1fr)] items-center gap-x-3 px-4";
const FIELD = "flex h-10 min-w-0 items-center gap-2 rounded-md border bg-background px-3 text-xs";

/** What the person adding a source does, for each way in. */
function Way({ at, typed, done }: { at: number; typed: string; done: boolean }) {
  if (at === 0)
    return (
      <span className={cn(FIELD, "flex-1")}>
        <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate" style={MONO}>{typed}{!done && <Caret />}</span>
      </span>
    );
  if (at === 1)
    return (
      <span className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-dashed bg-background px-3 text-xs text-muted-foreground">
        <FileUp className="size-4 shrink-0" aria-hidden />
        <span className="hidden truncate sm:inline">Drop a PDF here</span>
        <span className="ml-auto flex min-w-0 items-center gap-1.5 rounded bg-muted px-2 py-1 text-foreground">
          <FileText className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">harbor-price-sheet.pdf</span>
        </span>
      </span>
    );
  if (at === 2)
    return (
      <span className={cn(FIELD, "flex-1")}>
        <span className="shrink-0 rounded border bg-muted px-2 py-1">Choose file</span>
        <span className="truncate">elm-park-export.csv</span>
        <span className="ml-auto shrink-0 text-muted-foreground">14 KB</span>
      </span>
    );
  return (
    <>
      <span className={cn(FIELD, "flex-[2]")}>
        <span className="shrink-0 text-muted-foreground" style={MONO}>GET</span>
        <span className="truncate" style={MONO}>{typed}{!done && <Caret />}</span>
      </span>
      <span className={cn(FIELD, "hidden flex-1 sm:flex")}>
        <KeyRound className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate tracking-widest">••••••••</span>
      </span>
    </>
  );
}

export function Loaders({ onStage }: Staged) {
  const [at, setAt] = useState(0);
  /** The sources loaded so far, in the order they were loaded. */
  const [loaded, setLoaded] = useState<number[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const table = useRef<HTMLOListElement>(null);
  useStage(onStage, loaded.length > 0);

  const source = SOURCES[at];
  // An address is typed in as the reader would enter it; a file or a PDF has nothing to type.
  const { typed, done: entered } = useTyped(source.typed, at, 350);

  useEffect(() => {
    if (busy === null) return;
    const t = setTimeout(() => {
      setLoaded((prev) => [...prev, busy]);
      setBusy(null);
    }, 800);
    return () => clearTimeout(t);
  }, [busy]);

  // A second source's rows arrive below the first's: the table scrolls to show them landing.
  useEffect(() => {
    const el = table.current;
    if (el && loaded.length > 1) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [loaded.length]);

  const done = loaded.includes(at);
  const records = loaded.flatMap((i) => SOURCES[i].rows.map((row) => ({ row, from: SOURCES[i] })));

  return (
    <>
      <Pane head="Add a source" className="shrink-0" bodyClassName="flex flex-col gap-3 p-3">
        <div role="tablist" aria-label="Kind of source" className="grid grid-cols-4 gap-1 rounded-md bg-muted p-1">
          {SOURCES.map((s, i) => (
            <button
              key={s.mode}
              type="button"
              role="tab"
              aria-selected={i === at}
              onClick={() => setAt(i)}
              className={cn("flex h-8 items-center justify-center gap-1.5 rounded text-xs transition-colors", i === at ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {loaded.includes(i) ? <Check className="size-3.5" aria-hidden /> : <s.icon className="size-3.5" aria-hidden />}
              {s.mode}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Way at={at} typed={typed} done={entered} />
          <button
            type="button"
            disabled={done || busy !== null || !entered}
            onClick={() => setBusy(at)}
            className="flex h-10 w-24 shrink-0 items-center justify-center gap-1.5 rounded-md bg-foreground text-sm font-medium text-background transition-opacity enabled:hover:opacity-90 disabled:opacity-50"
          >
            {busy === at ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : done ? <><Check className="size-4" aria-hidden /> Loaded</> : source.verb}
          </button>
        </div>

        {/* What the source hands over, before it is made into records. */}
        <code className={cn("block h-16 overflow-hidden rounded-md bg-muted/60 px-3 py-2 text-[10.5px] leading-[1.5] whitespace-pre transition-colors", done || busy === at ? "text-foreground/80" : "text-muted-foreground/60")} style={MONO}>{source.raw}</code>
      </Pane>

      <Pane
        head="One table"
        className="lg:flex-1"
        bodyClassName="flex flex-col text-xs"
        aside={
          loaded.length > 0 && (
            <span className="flex shrink-0 items-center gap-3 font-sans text-xs normal-case tracking-normal">
              <span className="tabular-nums">{records.length} rows</span>
              <button type="button" onClick={() => setLoaded([])} className="flex items-center gap-1.5 hover:text-foreground">
                <RotateCcw className="size-3" aria-hidden /> Clear
              </button>
            </span>
          )
        }
      >
        <div className={cn(COLS, "shrink-0 border-b py-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground")} style={MONO}>
          <span>Item</span>
          <span className="text-right">Price</span>
          <span>Per</span>
          <span>Origin</span>
          <span>Source</span>
        </div>
        {/* One source nearly fills the table; a second sets it scrolling. */}
        <ol ref={table} className="m-0 h-[17rem] list-none overflow-y-auto p-0 lg:h-auto lg:min-h-0 lg:flex-1">
          <AnimatePresence initial={false}>
            {records.map(({ row: [picture, item, price, unit, origin], from }, i) => (
              <motion.li key={`${from.mode}-${item}`} initial={{ opacity: 0, filter: "blur(8px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0 }} transition={{ duration: 0.5, delay: (i % from.rows.length) * 0.06, ease: "easeOut" }} className={cn(COLS, "h-9 border-b")}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="text-lg leading-none" aria-hidden>{picture}</span>
                  <span className="truncate">{item}</span>
                </span>
                <span className="text-right tabular-nums" style={MONO}>{price}</span>
                <span className="truncate">{unit}</span>
                <span className="truncate">{origin}</span>
                <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground"><from.icon className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{from.mode}</span></span>
              </motion.li>
            ))}
          </AnimatePresence>
          {records.length === 0 && <li className="px-4 py-6 text-center text-muted-foreground">Nothing loaded yet. Add a source above.</li>}
        </ol>
      </Pane>
    </>
  );
}
