"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, PanelRight } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { Scramble } from "@/components/Scramble";
import { compact } from "@/lib/compact";
import { useSwitchboard } from "@/components/SwitchboardPanel";
import type { HomeCardData } from "@/lib/home-data";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

/**
 * One type size for every figure. compact() caps results at five characters,
 * so 532, 16.8K, 16.4M and 4.3B all set at the same size — the scale responds
 * to the viewport, never to the length of the number.
 */
const FIGURE_SIZE = "clamp(2.4rem, 3.4vw, 3.6rem)";

/**
 * A contents-plate cell. Hovering (or tapping, on touch) swaps the blurb for
 * the project's headline figure, counted up in the project's accent.
 *
 * The card stays a real <a> so it keeps link semantics — crawlable, focusable,
 * middle-clickable. On touch, where hover can never fire, the first tap reveals
 * the figure and the corner arrow is what navigates.
 *
 * `paper` (the Refresh cards) inverts the resting/hover split: at rest the cell
 * is index + title + a "Published …" footer — no blurb, and a FIXED 210px
 * height so ten papers can never outgrow the ~425px plate. On hover the
 * description scrambles in (Scramble, the non-numeric counterpart to CountUp)
 * where a product would count its figure.
 */
export function HomeCard({ card, index, panel = true, paper = false }: { card: HomeCardData; index: number; panel?: boolean; paper?: boolean }) {
  const [active, setActive] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(true);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const figure = compact(card.value);
  const { openProduct } = useSwitchboard();

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
      {...(card.sameTab ? {} : { target: "_blank", rel: "noreferrer noopener" })}
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
      className={`group/card relative flex ${paper ? "h-[210px] overflow-hidden" : "min-h-[210px]"} flex-col border-b border-r border-[var(--paper-rule)] px-5 py-5 transition-colors [-webkit-tap-highlight-color:transparent] ${
        active ? "bg-[var(--accent-tint)]" : ""
      }`}
    >
      {/* The reveal — in place of the resting content. Products count their
          headline figure up; papers scramble their description in (they have
          no figure, and their description was evicted from the resting card
          so the title could hold the 210px cell). */}
      {paper ? (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 flex items-center px-5 py-10 transition-opacity duration-200 ${
            active ? "opacity-100" : "opacity-0"
          }`}
          style={{ ...SANS, color: "var(--accent)" }}
        >
          <Scramble text={card.body} active={active} duration={900} className="text-[12px] leading-[1.55]" />
        </span>
      ) : (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center transition-opacity duration-200 ${
            active ? "opacity-100" : "opacity-0"
          }`}
          style={{ color: "var(--accent)" }}
        >
          <span className="leading-none tabular-nums" style={{ ...MONO, fontSize: FIGURE_SIZE }}>
            <CountUp value={figure.count} decimals={figure.decimals} suffix={figure.suffix} active={active} duration={900} />
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em]" style={SANS}>{card.unit}</span>
        </span>
      )}

      {/* Top-right on hover: go to the site. It shares this corner with the live
          dot, which fades out when the card activates.
          ⚠ FADED OUT IS NOT GONE. `opacity-0` is purely visual — the element
          keeps its box and keeps taking pointer events, and `animate-ping`
          scales the dot's ring 2×, so an invisible emerald ring sat directly
          over this arrow's centre and swallowed every hover. The grey disc was
          never missing; it was never reached. The content block below carries
          `pointer-events-none` while active for exactly this reason. Measured
          with elementFromPoint 2026-08-14 — do not "fix" it by restyling here. */}
      <span
        aria-hidden
        /* `transition-colors` as well as opacity — with opacity alone the grey
           hover disc snapped in rather than fading, which read as missing. */
        className={`absolute right-3 top-3 flex items-center justify-center rounded-full p-2 transition-[opacity,background-color] duration-200 hover:bg-[var(--paper-rule-soft)] ${active ? "opacity-100" : "opacity-0"}`}
      >
        <ArrowUpRight className="h-4 w-4 text-[var(--accent)]" />
      </span>

      <div className={`flex flex-1 flex-col transition-opacity duration-200 ${active ? "pointer-events-none opacity-0" : "opacity-100"}`}>
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] tabular-nums tracking-[0.2em] transition-colors ${active ? "text-[var(--accent)]" : "text-[var(--paper-faint)]"}`}
            style={MONO}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          {/* Live dot — top-right, opposite the index number. Decoration only,
              so it never takes a pointer: it shares this corner with the ↗. */}
          <span aria-hidden className="pointer-events-none relative flex h-[5px] w-[5px] shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-[5px] w-[5px] rounded-full bg-emerald-500" />
          </span>
        </div>
        {/* line-clamp guards the paper titles (Refresh); product titles never reach it. */}
        <h3 className="mt-3 line-clamp-4 text-[20px] leading-[1.1] transition-colors" style={{ ...SERIF, color: active ? "var(--accent)" : "var(--paper-text)" }}>
          {card.title}
        </h3>
        {/* Papers carry no resting blurb — their description lives in the hover
            reveal above, which is what keeps every paper cell at 210px. */}
        {!paper && <p className="mt-2 flex-1 text-[12px] leading-[1.5] text-[var(--paper-muted)]" style={SANS}>{card.body}</p>}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <span
          className={`inline-flex min-w-0 items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] tabular-nums transition-opacity duration-200 ${active ? "opacity-0" : "opacity-100 text-[var(--paper-faint)]"}`}
          style={MONO}
        >
          {paper ? (
            /* "Published January 10, 2026" — the paper's own date, not a stat. */
            card.footer
          ) : (
            <>
              <CountUp value={figure.count} decimals={figure.decimals} suffix={figure.suffix} />
              &nbsp;{card.unit}
            </>
          )}
        </span>
        {/* Bottom-right: open the panel. The ↗ that used to live here moved to
            the card's top-right (above) — the two affordances now sit at
            opposite corners so neither is a near-miss for the other.
            `arrowRef` still guards this one so the card's tap-to-reveal handler
            (touch devices) lets a real tap through. */}
        {/* `panel` is off for the Refresh paper cards: openProduct(index) would
            open the wrong product's view for a paper sitting in that slot. */}
        {panel && <span
          ref={arrowRef}
          className={`-m-2 flex shrink-0 items-center transition-opacity duration-200 ${active ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <button
            type="button"
            aria-label={`Open the ${card.title} panel`}
            onClick={(e) => {
              // The cell is a <Link>; without this the panel opens AND we navigate.
              e.preventDefault();
              e.stopPropagation();
              openProduct(index);
            }}
            className="flex items-center justify-center rounded-full p-2 transition-colors hover:bg-[var(--paper-rule-soft)]"
          >
            <PanelRight className="h-4 w-4 text-[var(--accent)]" />
          </button>
        </span>}
      </div>
    </Link>
  );
}
