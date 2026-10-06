"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Caret, Chip, MONO, useStage, useTyped, type Staged } from "./parts";

const QUERY = "tropical fruit";

/** How many results the page holds; the rest are off it. */
const PAGE = 9;

/** Sample results in the order a search returns them: the tropical ones come after the page ends. */
const RESULTS = [
  { picture: "🍎", name: "Apple", right: false },
  { picture: "🍐", name: "Pear", right: false },
  { picture: "🍇", name: "Grapes", right: false },
  { picture: "🍓", name: "Strawberry", right: false },
  { picture: "🍒", name: "Cherries", right: false },
  { picture: "🍑", name: "Peach", right: false },
  { picture: "🫐", name: "Blueberries", right: false },
  { picture: "🍋", name: "Lemon", right: false },
  { picture: "🍉", name: "Watermelon", right: false },
  { picture: "🍍", name: "Pineapple", right: true },
  { picture: "🥭", name: "Mango", right: true },
  { picture: "🥥", name: "Coconut", right: true },
  { picture: "🍌", name: "Banana", right: true },
];

/** The reranker's order: the results that answer the query first, the rest as they were. */
const RERANKED = [...RESULTS.filter((r) => r.right), ...RESULTS.filter((r) => !r.right)];

export function Reranker({ onStage }: Staged) {
  const [reranked, setReranked] = useState(false);
  const still = useReducedMotion();
  // The query is typed in once; the results arrive when it is entered.
  const { typed, done } = useTyped(QUERY, 0, 500);
  useStage(onStage, reranked);

  return (
    <>
      <div className="flex shrink-0 flex-col gap-2">
        <div className="flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>{typed}{!done && <Caret />}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!reranked} disabled={!done} onClick={() => setReranked(false)}>Search order</Chip>
          <Chip active={reranked} disabled={!done} onClick={() => setReranked(true)}>Rerank</Chip>
        </div>
      </div>

      {/* One page of results. Every result is in the list, so one that was off
          the page keeps its element and slides up into it. */}
      <ol className={cn("m-0 h-[27rem] list-none overflow-hidden rounded-lg border bg-background p-0 transition-colors duration-300 lg:h-auto lg:min-h-0 lg:flex-1")}>
        {done
          ? (reranked ? RERANKED : RESULTS).map((r, i) => (
              <motion.li
                key={r.name}
                layout={!still}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 34, delay: r.right && reranked ? RERANKED.indexOf(r) * 0.07 : 0 }}
                style={{ height: `${100 / PAGE}%` }}
                className={cn("relative flex items-center gap-3 border-b bg-background px-4", r.right && "z-10 bg-[color-mix(in_oklab,var(--ink)_9%,var(--background))]")}
              >
                <span className="w-5 shrink-0 text-[11px] tabular-nums text-muted-foreground" style={MONO}>{i + 1}</span>
                <span className="text-xl leading-none" aria-hidden>{r.picture}</span>
                <span className={cn("min-w-0 flex-1 truncate", r.right && "font-medium text-[var(--ink)]")}>{r.name}</span>
              </motion.li>
            ))
          : // The results' own shape, while the query is still being typed.
            Array.from({ length: PAGE }, (_, i) => (
              <li key={i} style={{ height: `${100 / PAGE}%` }} className="flex items-center gap-3 border-b px-4" aria-hidden>
                <span className="h-3 w-4 animate-pulse rounded bg-muted" />
                <span className="size-6 animate-pulse rounded-md bg-muted" />
                <span className="h-3 animate-pulse rounded bg-muted" style={{ width: `${22 + ((i * 13) % 26)}%` }} />
              </li>
            ))}
      </ol>
    </>
  );
}
