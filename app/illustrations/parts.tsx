"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { ChevronsLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
export const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

/** What every illustration is handed: a way to say the reader has moved it from the ordinary way to the tool's. */
export type Staged = { onStage?: (after: boolean) => void };

/** Tells the dialog which half of the statement to show. */
export function useStage(onStage: Staged["onStage"], after: boolean) {
  useEffect(() => {
    onStage?.(after);
  }, [onStage, after]);
}

/**
 * Types `text` a character at a time, the way a reader would enter it into a
 * search box. It starts after `wait` ms, and starts over whenever `run` changes.
 */
export function useTyped(text: string, run: unknown = 0, wait = 0) {
  const still = useReducedMotion();
  const [typed, setTyped] = useState({ run, n: still ? text.length : 0 });
  // A new run starts from an empty box.
  if (typed.run !== run) setTyped({ run, n: still ? text.length : 0 });
  const n = typed.run === run ? typed.n : 0;
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => setTyped((now) => (now.run === run ? { run, n: now.n + 1 } : now)), n === 0 ? Math.max(wait, 40) : 40);
    return () => clearTimeout(t);
  }, [n, text, run, wait]);
  return { typed: text.slice(0, n), done: n >= text.length };
}

/** The blinking bar after the last typed character. */
export function Caret() {
  return <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-foreground" aria-hidden />;
}

/** A surface inside an illustration, with an optional ruled head. */
export function Pane({ head, aside, className, bodyClassName, children }: { head?: ReactNode; aside?: ReactNode; className?: string; bodyClassName?: string; children: ReactNode }) {
  return (
    <section className={cn("flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-background", className)}>
      {head && (
        <header className="flex min-h-9 shrink-0 items-center justify-between gap-2 border-b px-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground" style={MONO}>
          <span className="truncate">{head}</span>
          {aside}
        </header>
      )}
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

/** A segmented switch: one of a few states. */
export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: readonly (readonly [T, string])[]; onChange: (value: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 rounded-md border bg-background p-0.5 text-xs">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === value}
          onClick={() => onChange(v)}
          className={cn("rounded-[5px] px-2.5 py-1 whitespace-nowrap transition-colors", v === value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** A preset the reader can pick: a query, a source, a category. */
export function Chip({ active, onClick, disabled, children }: { active?: boolean; onClick?: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        active ? "border-foreground bg-foreground text-background" : "bg-background text-muted-foreground enabled:hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Before and after under one handle: `before` shows left of it, `after` right.
 * The two layers must lay their content out identically, so the wipe reads as
 * one page changing rather than two pages overlapping.
 */
export function Compare({ before, after, start = 50, label, className, onMove }: { before: ReactNode; after: ReactNode; start?: number; label: string; className?: string; onMove?: (at: number) => void }) {
  const [at, setAt] = useState(start);
  useEffect(() => {
    onMove?.(at);
  }, [onMove, at]);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const move = useCallback((x: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setAt(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)));
  }, []);

  return (
    <div
      ref={box}
      className={cn("relative touch-none overflow-hidden rounded-lg border bg-background select-none", className)}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && move(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      {/* `after` stays in the flow and gives the box its height. */}
      <div>{after}</div>
      <div className="absolute inset-0 bg-background" style={{ clipPath: `inset(0 ${100 - at}% 0 0)` }}>{before}</div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(at)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setAt((a) => Math.max(0, a - 5));
          if (e.key === "ArrowRight") setAt((a) => Math.min(100, a + 5));
        }}
        className="group absolute inset-y-0 z-10 w-px -translate-x-1/2 cursor-ew-resize bg-foreground outline-none"
        style={{ left: `${at}%` }}
      >
        <span className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--ink)] bg-background text-[var(--ink)] shadow-sm group-focus-visible:ring-2 group-focus-visible:ring-[var(--ink)]">
          <ChevronsLeftRight className="size-4" aria-hidden />
        </span>
      </div>
    </div>
  );
}
