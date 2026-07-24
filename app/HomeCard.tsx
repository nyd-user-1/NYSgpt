"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { compact } from "@/lib/compact";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

/**
 * One type size for every figure. compact() caps results at five characters,
 * so 532, 16.8K, 16.4M and 4.3B all set at the same size — the scale responds
 * to the viewport, never to the length of the number.
 */
const FIGURE_SIZE = "clamp(2.4rem, 3.4vw, 3.6rem)";

export type HomeCardData = {
  href: string;
  title: string;
  body: string;
  /** The project's primary accent — title color + light bg tint when active. */
  accent: string;
  /** Raw count from the project's database; compact() handles the display. */
  value: number;
  unit: string;
};

/**
 * A contents-plate cell. Hovering (or tapping, on touch) swaps the blurb for
 * the project's headline figure, counted up in the project's accent.
 *
 * The card stays a real <a> so it keeps link semantics — crawlable, focusable,
 * middle-clickable. On touch, where hover can never fire, the first tap reveals
 * the figure and the corner arrow is what navigates.
 */
export function HomeCard({ card, index }: { card: HomeCardData; index: number }) {
  const [active, setActive] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(true);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const figure = compact(card.value);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    const sync = () => setHoverCapable(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <Link
      href={card.href}
      target="_blank"
      rel="noreferrer noopener"
      style={
        {
          "--accent": card.accent,
          "--accent-tint": `color-mix(in oklab, ${card.accent} 5%, var(--paper))`,
        } as React.CSSProperties
      }
      onMouseEnter={() => hoverCapable && setActive(true)}
      onMouseLeave={() => hoverCapable && setActive(false)}
      onClick={(e) => {
        if (hoverCapable) return; // mouse: the whole card navigates, as before
        if (e.detail === 0) return; // keyboard Enter: navigate, don't toggle
        if (arrowRef.current?.contains(e.target as Node)) return; // the arrow navigates
        e.preventDefault();
        setActive((v) => !v);
      }}
      className={`group/card relative flex min-h-[210px] flex-col border-b border-r border-[var(--paper-rule)] px-5 py-5 transition-colors [-webkit-tap-highlight-color:transparent] ${
        active ? "bg-[var(--accent-tint)]" : ""
      }`}
    >
      {/* The figure — centered, revealed in place of the blurb. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center transition-opacity duration-200 ${
          active ? "opacity-100" : "opacity-0"
        }`}
        style={{ color: "var(--accent)" }}
      >
        <span
          className="leading-none tabular-nums"
          style={{ ...MONO, fontSize: FIGURE_SIZE }}
        >
          <CountUp
            value={figure.count}
            decimals={figure.decimals}
            suffix={figure.suffix}
            active={active}
            duration={900}
          />
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.2em]"
          style={SANS}
        >
          {card.unit}
        </span>
      </span>

      {/* Card content (fades out as the figure comes up) */}
      <div
        className={`flex flex-1 flex-col transition-opacity duration-200 ${
          active ? "opacity-0" : "opacity-100"
        }`}
      >
        <span
          className={`text-[10px] tabular-nums tracking-[0.2em] transition-colors ${
            active ? "text-[var(--accent)]" : "text-[var(--paper-faint)]"
          }`}
          style={MONO}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <h3
          className="mt-3 text-[20px] leading-none transition-colors"
          style={{ ...SERIF, color: active ? "var(--accent)" : "var(--paper-text)" }}
        >
          {card.title}
        </h3>

        <p
          className="mt-2 flex-1 text-[12px] leading-[1.5] text-[var(--paper-muted)]"
          style={SANS}
        >
          {card.body}
        </p>
      </div>

      {/* Bottom row. A flex sibling rather than an overlay, so the arrow
          reserves its own width instead of colliding with a long label. */}
      <div className="mt-4 flex items-end justify-between gap-3">
        {/* Stat footer — same figure, stated in the small print. Fades with
            the blurb; the arrow beside it does not. */}
        <span
          className={`inline-flex min-w-0 items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] tabular-nums transition-opacity duration-200 ${
            active
              ? "opacity-0"
              : "opacity-100 text-[var(--paper-faint)]"
          }`}
          style={MONO}
        >
          <span
            aria-hidden
            className="h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--paper-rule)]"
          />
          <CountUp
            value={figure.count}
            decimals={figure.decimals}
            suffix={figure.suffix}
          />
          &nbsp;{card.unit}
        </span>

        {/* Navigate affordance — hidden at rest, only appears with the
            figure. On touch it is the only thing that navigates. */}
        <span
          ref={arrowRef}
          className={`-m-2 flex shrink-0 items-center justify-center rounded-full p-2 transition-opacity duration-200 hover:bg-[var(--paper-rule-soft)] ${
            active ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden
        >
          <ArrowUpRight className="h-4 w-4 text-[var(--accent)]" />
        </span>
      </div>
    </Link>
  );
}
