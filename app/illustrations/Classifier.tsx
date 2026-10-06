"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { RotateCcw, Tags } from "lucide-react";
import { Chip, Pane, useStage, type Staged } from "./parts";

/** The two kinds of fruit, and each tag's colour. */
const KINDS = {
  "Farm stand": "#0e9594",
  Tropical: "#c1670c",
} as const;

type Kind = keyof typeof KINDS;

/** A sample delivery, in the order it was unpacked. */
const ITEMS: { picture: string; name: string; is: Kind }[] = [
  { picture: "🍎", name: "Apple", is: "Farm stand" },
  { picture: "🍍", name: "Pineapple", is: "Tropical" },
  { picture: "🍓", name: "Strawberry", is: "Farm stand" },
  { picture: "🥭", name: "Mango", is: "Tropical" },
  { picture: "🍑", name: "Peach", is: "Farm stand" },
  { picture: "🥥", name: "Coconut", is: "Tropical" },
  { picture: "🫐", name: "Blueberries", is: "Farm stand" },
  { picture: "🍌", name: "Banana", is: "Tropical" },
];

const NAMES = Object.keys(KINDS) as Kind[];
const count = (k: Kind) => ITEMS.filter((item) => item.is === k).length;

/** The dissolve a tag arrives with: out of a soft blur, one row after the next. */
const dissolve = (i: number) => ({
  initial: { opacity: 0, filter: "blur(10px) brightness(1.8)", scale: 0.92 },
  animate: { opacity: 1, filter: "blur(0px) brightness(1)", scale: 1, transition: { duration: 0.7, delay: i * 0.09, ease: "easeOut" as const } },
  exit: { opacity: 0, filter: "blur(6px) brightness(1.4)", transition: { duration: 0.25 } },
});

export function Classifier({ onStage }: Staged) {
  const still = useReducedMotion();
  const [tagged, setTagged] = useState(false);
  const [only, setOnly] = useState<Kind | null>(null);
  useStage(onStage, tagged);

  // A filter brings its kind to the top; the rows slide to their new places.
  const rows = tagged && only ? [...ITEMS.filter((item) => item.is === only), ...ITEMS.filter((item) => item.is !== only)] : ITEMS;

  return (
    <Pane
      head="Today's delivery"
      className="lg:flex-1"
      bodyClassName="flex flex-col"
      aside={
        <button
          type="button"
          onClick={() => {
            setTagged(!tagged);
            setOnly(null);
          }}
          className={tagged ? "flex shrink-0 items-center gap-1.5 font-sans text-xs normal-case tracking-normal hover:text-foreground" : "flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-foreground px-2.5 font-sans text-xs font-medium normal-case tracking-normal text-background hover:opacity-90"}
        >
          {tagged ? <><RotateCcw className="size-3" aria-hidden /> Clear tags</> : <><Tags className="size-3.5" aria-hidden /> Classify</>}
        </button>
      }
    >
      {/* The filter exists only once there are tags to filter by. */}
      <div className="relative flex min-h-11 shrink-0 flex-wrap items-center gap-1.5 border-b px-3 py-2">
        <AnimatePresence initial={false} mode="popLayout">
          {tagged ? (
            [
              <motion.span key="all" {...dissolve(0)}><Chip active={only === null} onClick={() => setOnly(null)}>All {ITEMS.length}</Chip></motion.span>,
              ...NAMES.map((k, i) => (
                <motion.span key={k} {...dissolve(i + 1)}><Chip active={only === k} onClick={() => setOnly(only === k ? null : k)}>{k} {count(k)}</Chip></motion.span>
              )),
            ]
          ) : (
            <motion.span key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-muted-foreground">{ITEMS.length} items, no tags</motion.span>
          )}
        </AnimatePresence>
      </div>

      <ul className="m-0 flex min-h-[22rem] flex-1 list-none flex-col p-0 lg:min-h-0">
        {rows.map((item) => (
          <motion.li
            key={item.name}
            layout={!still}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            animate={{ opacity: tagged && only && item.is !== only ? 0.3 : 1 }}
            className="flex min-h-0 flex-1 items-center gap-3 border-b bg-background px-4 last:border-b-0"
          >
            <span className="text-xl leading-none" aria-hidden>{item.picture}</span>
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
            <AnimatePresence>
              {tagged && (
                <motion.span
                  key="tag"
                  {...dissolve(ITEMS.indexOf(item))}
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  style={{ color: KINDS[item.is], background: `color-mix(in oklab, ${KINDS[item.is]} 13%, transparent)` }}
                >
                  {item.is}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.li>
        ))}
      </ul>
    </Pane>
  );
}
