"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import WHERE from "@/lib/inspect-map.json";
import { SCREENSHOT_TOKENS, tokensOf } from "../InspectorMode";
import { cn } from "@/lib/utils";
import { Chip, MONO, Pane, SERIF, useStage, type Staged } from "./parts";

/** What the Inspector copies for one element of this page: its file and line, the chain it sits in, its words. */
const BRIEF = `${WHERE.CardTitle}  <ContentsPlate › HomeCard › CardTitle>  "Encoder"`;
const BRIEF_TOKENS = tokensOf(BRIEF);
/** The multiple a screenshot costs over the brief — the chart's one headline. */
const RATIO = Math.round(SCREENSHOT_TOKENS / BRIEF_TOKENS);

const fade = { initial: { opacity: 0, filter: "blur(6px)" }, animate: { opacity: 1, filter: "blur(0px)" }, exit: { opacity: 0, filter: "blur(6px)" }, transition: { duration: 0.22 } };

/** One at a time: what a screenshot sends, what the Inspector sends, or the two costs on one chart. */
type Mode = "shot" | "brief" | "chart";

/** This page in small: what a screenshot hands the AI to search through. */
function Thumbnail() {
  return (
    <div className="aspect-video h-full max-h-56 overflow-hidden rounded-md border bg-background p-2 shadow-sm">
      <div className="flex h-[22%] items-stretch gap-1.5 border-y py-1">
        <span className="flex w-1/4 items-center justify-center text-[11px]" style={SERIF}>NYSgpt</span>
        <span className="grid flex-1 grid-cols-2 gap-1">
          {[0, 1, 2, 3].map((i) => <span key={i} className="rounded-xs bg-muted" />)}
        </span>
      </div>
      <div className="mt-2 grid h-[66%] grid-cols-5 grid-rows-2 gap-1">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="flex flex-col gap-1 rounded-xs border p-1">
            <span className="h-1 w-2/3 rounded-full bg-foreground/60" />
            <span className="h-0.5 w-full rounded-full bg-muted-foreground/30" />
            <span className="h-0.5 w-4/5 rounded-full bg-muted-foreground/30" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* The chart's frame: both costs on one scale, turns along the bottom. */
const MAX_TURNS = 40;
const W = 560, H = 232, L = 8, R = 450, T = 18, B = 206;
const MAX_Y = SCREENSHOT_TOKENS * MAX_TURNS;
const atTurn = (t: number) => L + (t / MAX_TURNS) * (R - L);
const atTokens = (tokens: number) => B - (tokens / MAX_Y) * (B - T);

/**
 * The two spends drawn to one scale: the screenshot's climbs corner to corner,
 * the Inspector's never leaves the floor. The slider below and a drag on the
 * chart move the same marker, so the reader can walk the gap turn by turn.
 * Colors are the illustrations' own pair (--red the ordinary way's cost, --ink
 * the tool's), CVD-checked against both surfaces; the lines carry their names
 * at their ends, so color is never the only mark of which is which.
 */
function DifferenceChart({ turns, onTurns }: { turns: number; onTurns: (n: number) => void }) {
  const box = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const pick = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const vx = ((clientX - r.left) / r.width) * W;
    onTurns(Math.min(MAX_TURNS, Math.max(1, Math.round(((vx - L) / (R - L)) * MAX_TURNS))));
  };
  const briefEnd = atTokens(BRIEF_TOKENS * MAX_TURNS);
  return (
    <svg
      ref={box}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Cumulative tokens over ${turns} turns: a screenshot every turn costs ${(SCREENSHOT_TOKENS * turns).toLocaleString("en-US")}, the Inspector's brief about ${(BRIEF_TOKENS * turns).toLocaleString("en-US")}.`}
      className="h-auto w-full max-w-xl cursor-ew-resize touch-none select-none"
      onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pick(e.clientX); }}
      onPointerMove={(e) => dragging.current && pick(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      {/* The frame: a quiet grid, the baseline, turns along the bottom. */}
      <g className="text-muted-foreground" style={MONO} fontSize={9}>
        {[25_000, 50_000, 75_000, 100_000].map((v) => (
          <g key={v}>
            <line x1={L} x2={R} y1={atTokens(v)} y2={atTokens(v)} stroke="currentColor" strokeOpacity={0.15} />
            <text x={L + 2} y={atTokens(v) - 3} fill="currentColor">{v / 1000}k</text>
          </g>
        ))}
        <line x1={L} x2={R} y1={B} y2={B} stroke="currentColor" strokeOpacity={0.35} />
        {[0, 10, 20, 30, 40].map((t) => (
          <text key={t} x={atTurn(t)} y={H - 10} textAnchor="middle" fill="currentColor">{t === 40 ? "40 turns" : t}</text>
        ))}
      </g>

      {/* The screenshot's spend: the same picture paid for again on every turn. */}
      <polygon points={`${atTurn(0)},${B} ${atTurn(MAX_TURNS)},${T} ${atTurn(MAX_TURNS)},${B}`} fill="var(--red)" fillOpacity={0.07} />
      <line x1={atTurn(0)} y1={B} x2={atTurn(MAX_TURNS)} y2={T} stroke="var(--red)" strokeWidth={2} />

      {/* The Inspector's: a line of text per turn. It reads as the floor because it nearly is. */}
      <line x1={atTurn(0)} y1={B} x2={atTurn(MAX_TURNS)} y2={briefEnd} stroke="var(--ink)" strokeWidth={2} />

      {/* Each line names itself at its end. */}
      <g style={MONO} fontSize={10}>
        <line x1={R + 4} x2={R + 14} y1={T} y2={T} stroke="var(--red)" strokeWidth={2.5} />
        <text x={R + 18} y={T + 3} fill="currentColor">Screenshot</text>
        <line x1={R + 4} x2={R + 14} y1={briefEnd} y2={briefEnd} stroke="var(--ink)" strokeWidth={2.5} />
        <text x={R + 18} y={briefEnd + 3} fill="currentColor">Inspector</text>
      </g>

      {/* The marker the slider and a drag both move. */}
      <g>
        <line x1={atTurn(turns)} x2={atTurn(turns)} y1={T} y2={B} stroke="currentColor" strokeOpacity={0.3} strokeDasharray="3 3" />
        <circle cx={atTurn(turns)} cy={atTokens(SCREENSHOT_TOKENS * turns)} r={4.5} fill="var(--background)" stroke="var(--red)" strokeWidth={2} />
        <circle cx={atTurn(turns)} cy={atTokens(BRIEF_TOKENS * turns)} r={4.5} fill="var(--background)" stroke="var(--ink)" strokeWidth={2} />
      </g>
    </svg>
  );
}

export function Inspector({ onStage }: Staged) {
  const [mode, setMode] = useState<Mode>("shot");
  const [turns, setTurns] = useState(20);
  useStage(onStage, mode !== "shot");
  const each = mode === "brief" ? BRIEF_TOKENS : SCREENSHOT_TOKENS;

  return (
    <>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        <Chip active={mode === "shot"} onClick={() => setMode("shot")}>Screenshot</Chip>
        <Chip active={mode === "brief"} onClick={() => setMode("brief")}>Inspector</Chip>
        <Chip active={mode === "chart"} onClick={() => setMode("chart")}>The difference</Chip>
      </div>

      {/* The pane's border never changes with the mode — the border is chrome, not a signal (Brendan, twice). */}
      <Pane head={mode === "chart" ? "What it costs, turn by turn" : "What the AI is sent"} className="min-h-[22rem] lg:min-h-0 lg:flex-1" bodyClassName="flex flex-col">
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <AnimatePresence mode="wait" initial={false}>
            {mode === "brief" ? (
              <motion.code key="brief" {...fade} className="block max-w-full rounded-md bg-muted/60 px-4 py-3 text-xs leading-relaxed break-words" style={MONO}>{BRIEF}</motion.code>
            ) : mode === "chart" ? (
              <motion.div key="chart" {...fade} className="flex h-full w-full items-center justify-center">
                <DifferenceChart turns={turns} onTurns={setTurns} />
              </motion.div>
            ) : (
              <motion.div key="shot" {...fade} className="flex h-full max-w-full items-center justify-center">
                <Thumbnail />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* The conversation is sent again on every turn, so the cost is paid again on every turn. */}
        <div className="grid shrink-0 gap-x-6 gap-y-3 border-t p-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="flex flex-col gap-2 text-xs text-muted-foreground">
            <span><span className="tabular-nums text-foreground">{turns}</span> turns in the conversation</span>
            <input type="range" min={1} max={40} value={turns} onChange={(e) => setTurns(Number(e.target.value))} className="w-full accent-[var(--ink)]" />
          </label>
          {mode === "chart" ? (
            <div className="text-right text-3xl leading-none tabular-nums text-[var(--red)]" style={MONO}>
              {RATIO}×<span className="ml-2 text-base text-muted-foreground">the cost</span>
            </div>
          ) : (
            <div className={cn("text-right text-3xl leading-none tabular-nums transition-colors duration-300", mode === "brief" && "text-[var(--ink)]")} style={MONO}>
              {(each * turns).toLocaleString("en-US")}<span className="text-xl">tks</span>
            </div>
          )}
        </div>
      </Pane>
    </>
  );
}
