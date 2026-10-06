"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Minus, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MONO, SERIF, useStage, type Staged } from "./parts";

// Three screens (Brendan, 2026-10-03): the poll as the old way, a full screen
// of divide and gridlock with a Build Consensus button; then the statements,
// each vote adding to one list where the statements both groups agree on float
// to the top; then policy built from the consensus statements.
//
// The statements are GovBlock's open-primaries conversation, word for word
// (govblock/apps/web/lib/consensus/open-primaries.ts). It has no votes yet, so
// each statement's split is a sample: how many in ten of each group agree. The
// groups wear the simulator's blue and red (govblock lib/map/palette.ts).

const GROUPS = [
  { name: "Group A", colour: "var(--blue)" },
  { name: "Group B", colour: "var(--red)" },
] as const;

/** `act` is the policy starting point drawn from a statement both groups agree on. */
const STATEMENTS: { text: string; agree: [number, number]; act?: string }[] = [
  { text: "Primaries paid for by taxpayers should be open to every registered voter.", agree: [8, 2] },
  { text: "Whatever the rule is, it should apply to every party in the state equally.", agree: [9, 9], act: "Write one primary rule that binds every party in the state." },
  { text: "How primaries work is a state matter and Congress should stay out of it.", agree: [3, 9] },
  { text: "The current system protects incumbents more than it protects parties.", agree: [8, 7], act: "Judge each reform by whether it makes primaries more competitive." },
  { text: "A political party is a private association and should decide for itself who picks its nominees.", agree: [2, 8] },
  { text: "Most voters do not know their own state's primary rules, and that is the bigger problem.", agree: [8, 8], act: "Mail every voter the primary rules before each election." },
];

/** GovBlock's test for agreement: the least agreeable group decides, so a big group cannot carry a small one. */
const common = (s: (typeof STATEMENTS)[number]) => Math.min(...s.agree) >= 7;
const AGREED = STATEMENTS.filter(common);

type Answer = "agree" | "disagree" | "pass";
type Screen = "poll" | "vote" | "policy";

const CHOICES: { value: Answer; label: string; icon: typeof Check }[] = [
  { value: "agree", label: "Agree", icon: Check },
  { value: "disagree", label: "Disagree", icon: X },
  { value: "pass", label: "Pass", icon: Minus },
];

const BUTTON = "flex h-9 items-center gap-1.5 rounded-md bg-foreground px-3 text-sm font-medium text-background hover:opacity-90";
const HEAD = "flex min-h-9 shrink-0 items-center justify-between border-b px-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

/** Ten people of one group: filled for each who agrees. */
function Ten({ group, agree, shown = true, small = false }: { group: (typeof GROUPS)[number]; agree: number; shown?: boolean; small?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      {!small && <span className="w-16 shrink-0 text-xs font-medium" style={{ color: group.colour }}>{group.name}</span>}
      <span className={cn("flex", small ? "gap-0.5" : "gap-1")} role="img" aria-label={`${agree} in 10 of ${group.name} agree`}>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={cn("rounded-full border transition-[background-color,border-color] duration-300", small ? "size-1.5" : "size-3")}
            style={shown && i < agree ? { background: group.colour, borderColor: group.colour, transitionDelay: `${i * 50}ms` } : undefined}
          />
        ))}
      </span>
      {!small && <span className={cn("text-xs tabular-nums text-muted-foreground transition-opacity duration-300", shown ? "opacity-100 delay-500" : "opacity-0")}>{agree} in 10 agree</span>}
    </span>
  );
}

/** The first screen: what a poll of the same room reports. */
function Poll({ onBuild }: { onBuild: () => void }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 500);
    return () => clearTimeout(t);
  }, []);
  return (
    <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-lg border bg-background lg:min-h-0 lg:flex-1">
      <header className={HEAD} style={MONO}><span>A poll</span><span>Open primaries</span></header>
      <div className="flex flex-1 flex-col justify-center gap-8 px-8 py-6">
        <p className="m-0 text-2xl leading-snug text-balance" style={SERIF}>Should taxpayer-funded primaries be open to every registered voter?</p>
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between tabular-nums" style={MONO}>
            <span><span className="text-5xl text-[var(--blue)]">51%</span> <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">yes</span></span>
            <span><span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">no</span> <span className="text-5xl text-[var(--red)]">49%</span></span>
          </div>
          <div className="flex h-4 gap-1 overflow-hidden rounded-full">
            <span className="rounded-l-full bg-[var(--blue)] transition-[width] duration-1000 ease-out" style={{ width: drawn ? "51%" : "50%" }} />
            <span className="flex-1 rounded-r-full bg-[var(--red)]" />
          </div>
        </div>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-muted-foreground">
          <li>One question, two answers, a two-point margin.</li>
          <li>Each side hears that it nearly won, and digs in.</li>
          <li>The headline is the divide. Nothing moves.</li>
        </ul>
      </div>
      <footer className="flex shrink-0 justify-end border-t px-4 py-3">
        <button type="button" onClick={onBuild} className="flex h-9 items-center gap-1.5 rounded-md bg-[#16a34a] px-3 text-sm font-medium text-white hover:opacity-90">Build Consensus <ArrowRight className="size-4" aria-hidden /></button>
      </footer>
    </section>
  );
}

export function Consensus({ onStage }: Staged) {
  const still = useReducedMotion();
  const [screen, setScreen] = useState<Screen>("poll");
  /** The reader's answers, one per statement so far. */
  const [answers, setAnswers] = useState<Answer[]>([]);
  useStage(onStage, screen !== "poll");

  const restart = () => {
    setAnswers([]);
    setScreen("poll");
  };

  if (screen === "poll") return <Poll onBuild={() => setScreen("vote")} />;

  if (screen === "policy")
    return (
      <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-lg border bg-background lg:min-h-0 lg:flex-1">
        <header className={HEAD} style={MONO}><span>Policy from consensus</span><span>{AGREED.length} statements</span></header>
        <p className="m-0 px-6 pt-5 pb-3 text-xl leading-snug" style={SERIF}>Both groups agree on these. Policy starts here.</p>
        <ol className="m-0 flex flex-1 list-none flex-col p-0">
          {AGREED.map((s, i) => (
            <motion.li
              key={s.text}
              initial={still ? false : { opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.2 }}
              className="grid flex-1 grid-cols-1 items-center gap-x-6 gap-y-2 border-t px-6 py-4 sm:grid-cols-2"
            >
              <span className="flex flex-col gap-2">
                <span className="leading-snug">{s.text}</span>
                <span className="flex gap-3">
                  {GROUPS.map((g, gi) => <Ten key={g.name} group={g} agree={s.agree[gi]} small />)}
                  <span className="text-[11px] text-muted-foreground tabular-nums">{s.agree[0]} and {s.agree[1]} in 10</span>
                </span>
              </span>
              <span className="flex gap-2.5 rounded-md bg-muted/60 px-3 py-2.5 leading-snug font-medium">
                <ArrowRight className="mt-0.5 size-4 shrink-0" aria-hidden /> {s.act}
              </span>
            </motion.li>
          ))}
        </ol>
        <footer className="flex shrink-0 justify-end border-t px-4 py-3">
          <button type="button" onClick={restart} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="size-3.5" aria-hidden /> Start over
          </button>
        </footer>
      </section>
    );

  // The vote screen: the statement on the card, and below it the list it builds.
  const at = answers.length;
  const statement = STATEMENTS[at];
  const seen = STATEMENTS.slice(0, at);
  // Agreement floats to the top; within each kind, the order the statements were answered.
  const record = [...seen.filter(common), ...seen.filter((s) => !common(s))];

  return (
    <>
      <section className="flex shrink-0 flex-col gap-4 rounded-lg border bg-background p-4">
        <header className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground" style={MONO}>
          <span>Open primaries</span>
          <span className="tabular-nums">{statement ? `${at + 1} of ${STATEMENTS.length}` : "Done"}</span>
        </header>
        {statement ? (
          <>
            <p className="m-0 min-h-[3.25rem] text-lg leading-snug text-balance" style={SERIF}>{statement.text}</p>
            <div className="grid grid-cols-3 gap-2">
              {CHOICES.map(({ value, label, icon: Icon }) => (
                <button key={value} type="button" onClick={() => setAnswers([...answers, value])} className="flex h-9 items-center justify-center gap-2 rounded-md border bg-background text-sm font-medium transition-colors hover:bg-muted">
                  <Icon className="size-4" aria-hidden /> {label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="m-0 text-lg leading-snug" style={SERIF}>Both groups agree on {AGREED.length} of {STATEMENTS.length}.</p>
            <button type="button" onClick={() => setScreen("policy")} className={BUTTON}>Build policy <ArrowRight className="size-4" aria-hidden /></button>
          </div>
        )}
      </section>

      <section className="flex min-h-[20rem] flex-col overflow-hidden rounded-lg border bg-background lg:min-h-0 lg:flex-1">
        <header className={HEAD} style={MONO}><span>Consensus</span><span>{seen.filter(common).length} agreed</span></header>
        <ol className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0">
          {record.map((s) => {
            const both = common(s);
            return (
              <motion.li
                key={s.text}
                layout={!still}
                initial={still ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 34 }}
                className={cn("flex flex-col gap-2 border-b bg-background px-4 py-3", both ? "" : "text-muted-foreground")}
              >
                <span className="flex items-start gap-3">
                  <span className="min-w-0 flex-1 leading-snug">{s.text}</span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", both ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}>{both ? "Both agree" : "Split"}</span>
                </span>
                <span className="flex flex-wrap gap-x-5 gap-y-1">
                  {GROUPS.map((g, gi) => <Ten key={g.name} group={g} agree={s.agree[gi]} />)}
                </span>
              </motion.li>
            );
          })}
          {record.length === 0 && <li className="px-4 py-6 text-center text-muted-foreground">Vote on the statement above. Each answer is added here, and what both groups agree on rises to the top.</li>}
        </ol>
      </section>
    </>
  );
}
