"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Caret, Chip, MONO, useStage, useTyped, type Staged } from "./parts";

const QUERY = "red fruit";

type Listing = { picture: string; name: string; score?: number };

/** Sample listings a keyword search returns: each has one of the query's words, and none is a red fruit. */
const KEYWORD: Listing[] = [
  { picture: "🧅", name: "Red onion, 1 lb" },
  { picture: "🪰", name: "Fruit fly trap" },
  { picture: "🍷", name: "Red wine vinegar" },
  { picture: "🥤", name: "Fruit punch, 2 L" },
  { picture: "🫘", name: "Red kidney beans" },
  { picture: "🥬", name: "Red cabbage" },
  { picture: "🍬", name: "Fruit chews" },
  { picture: "🍰", name: "Red velvet cake" },
];

/** What the encoder returns for the same query, with each listing's similarity. */
const SEMANTIC: Listing[] = [
  { picture: "🍎", name: "Apple", score: 0.93 },
  { picture: "🍓", name: "Strawberry", score: 0.92 },
  { picture: "🍒", name: "Cherries", score: 0.9 },
  { picture: "🍉", name: "Watermelon", score: 0.87 },
  { picture: "🍇", name: "Red grapes", score: 0.86 },
  { picture: "🍊", name: "Blood orange", score: 0.83 },
  { picture: "🍑", name: "Nectarine", score: 0.81 },
  { picture: "🍅", name: "Tomato", score: 0.78 },
];

const TERMS = new Set(QUERY.split(" "));
const ROW = "flex min-h-0 flex-1 items-center gap-3 border-b px-4 last:border-b-0";

/** The listing with the query's own words marked: all a keyword search matched on. */
function Marked({ name }: { name: string }) {
  return (
    <>
      {name.split(/([A-Za-z]+)/).map((part, i) =>
        TERMS.has(part.toLowerCase()) ? <mark key={i} className="rounded-xs bg-amber-200/70 px-0.5 text-inherit dark:bg-amber-400/30">{part}</mark> : part,
      )}
    </>
  );
}

export function Encoder({ onStage }: Staged) {
  /** One list at a time: the keyword results, or the encoder's. */
  const [semantic, setSemantic] = useState(false);
  // Each search types the query in again, then its results arrive.
  const { typed, done } = useTyped(QUERY, semantic, 500);
  useStage(onStage, semantic);

  return (
    <>
      <div className="flex shrink-0 flex-col gap-2">
        <div className="flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>{typed}{!done && <Caret />}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!semantic} onClick={() => setSemantic(false)}>Keyword</Chip>
          <Chip active={semantic} onClick={() => setSemantic(true)}>Semantic</Chip>
        </div>
      </div>

      <section className={cn("flex min-h-[24rem] flex-col overflow-hidden rounded-lg border bg-background transition-colors duration-300 lg:min-h-0 lg:flex-1")}>
        <header className="flex min-h-9 shrink-0 items-center border-b px-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground" style={MONO}>{semantic ? "Semantic" : "Keyword"}</header>
        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.ol
              key={semantic ? "semantic" : "keyword"}
              initial={{ opacity: 0, filter: "blur(6px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="m-0 flex min-h-0 flex-1 list-none flex-col p-0"
            >
              {(semantic ? SEMANTIC : KEYWORD).map((item) => (
                <li key={item.name} className={ROW}>
                  <span className="text-xl leading-none" aria-hidden>{item.picture}</span>
                  <span className="min-w-0 flex-1 truncate">{semantic ? item.name : <Marked name={item.name} />}</span>
                  {item.score !== undefined && <span className="shrink-0 text-[11px] tabular-nums text-[var(--ink)]" style={MONO}>{item.score.toFixed(2)}</span>}
                </li>
              ))}
            </motion.ol>
          ) : (
            // The results' own shape, while the query is still being typed.
            <motion.ol key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="m-0 flex min-h-0 flex-1 list-none flex-col p-0" aria-hidden>
              {KEYWORD.map((item, i) => (
                <li key={item.name} className={ROW}>
                  <span className="size-6 animate-pulse rounded-md bg-muted" />
                  <span className="h-3 animate-pulse rounded bg-muted" style={{ width: `${28 + ((i * 17) % 30)}%` }} />
                </li>
              ))}
            </motion.ol>
          )}
        </AnimatePresence>
      </section>
    </>
  );
}
