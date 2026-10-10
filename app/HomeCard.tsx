"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, PanelRight } from "lucide-react";
import { ClassicSpinner } from "@/components/ClassicSpinner";
import { CountUp } from "@/components/CountUp";
import { useProductStatus } from "@/components/ProductStatus";
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

/** How long a product's check shows once it comes up, before the live dot returns. */
const CHECK_MS = 2_500;

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
 * description fades in where a product would count its figure — a plain 200ms
 * fade, and that is a RULING, not an omission: Scramble was tried (letter
 * churn, "too, too much") and then RevealFx's mask wipe was tried and cut the
 * same night. No entrance effect on this paragraph.
 */
export function HomeCard({ card, index, productIndex, category, featured = false, rest, panel = true, paper = false, large = false, onOpen }: { card: HomeCardData; index: number; /** The card's place among the products, for the switchboard; its printed number follows `index`. */ productIndex?: number; /** The box's family, printed bottom-left (AI Platforms, AI Tooling, Dev Tools). */ category?: string; /** Keeps the ↗ though it links nowhere (the Dev Tools box). */ featured?: boolean; /** The look at rest: its hover colours ("accent"), or a light grey ("grey"). */ rest?: "accent" | "grey"; panel?: boolean; paper?: boolean; /** One of two boxes that fill the plate between them (the in-house plate). */ large?: boolean; onOpen?: () => void }) {
  const [active, setActive] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(true);
  const arrowRef = useRef<HTMLSpanElement>(null);
  /** The top-right ↗ — the ONE outbound affordance on a product card. */
  const topArrowRef = useRef<HTMLSpanElement>(null);
  const figure = compact(card.value);
  /** Tools without a measured figure print their footer and keep their blurb on hover. */
  const hasFigure = card.value > 0;
  /** A tool with no public page renders the same cell, but as a plain block. */
  const linked = card.href !== "";
  const { openProduct, open: panelOpen, view, cards: panelCards } = useSwitchboard();
  /** The box whose product the open switchboard is showing: it wears its hover colours, with none of the hover's motion. */
  const selected = panelOpen && view.kind === "product" && panelCards[view.index]?.title === card.title;
  /** The hover colours: on hover, while selected in the switchboard, or always for a box that rests in them. */
  const lit = active || selected || rest === "accent";
  /** Whether the top-right ↗ shows: a link out, or a featured box's own move. */
  const arrow = linked || featured;
  /** "~ rows" marks an approximate figure: the tilde prints before the number. */
  const approx = card.unit.startsWith("~");
  const unit = card.unit.replace(/^~\s*/, "");
  const { statusOf, linkProps } = useProductStatus();
  const status = paper ? "idle" : statusOf(card.href);
  const link = linkProps(card.href);
  /** The check shows for a moment when the product comes up, then gives way to the live dot. */
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (status !== "ready") return setChecked(false);
    setChecked(true);
    const t = setTimeout(() => setChecked(false), CHECK_MS);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    const sync = () => setHoverCapable(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <Cell
      data-inspect="HomeCard"
      linked={linked}
      href={link.href}
      newTab={!card.sameTab}
      style={
        {
          "--accent": card.accent,
          "--accent-tint": `color-mix(in oklab, ${card.accent} 5%, var(--paper))`,
        } as React.CSSProperties
      }
      onMouseEnter={() => hoverCapable && setActive(true)}
      onMouseLeave={() => hoverCapable && setActive(false)}
      onClick={(e) => {
        // A product still waking: the ↗ shows the notice instead of leaving.
        if (link.onClick && topArrowRef.current?.contains(e.target as Node)) return link.onClick(e);
        // The BLOCK opens the card dialog (2026-10-02; before that, product
        // blocks opened the panel, which now has only its own corner icon).
        // The top-right ↗ is the one outbound affordance. Papers keep the link.
        if (onOpen && !paper) {
          if (arrowRef.current?.contains(e.target as Node)) return; // the panel icon's own handler
          // ↗ → let the href fire. A featured box with no link has no href: its ↗ opens like its body.
          if (linked && topArrowRef.current?.contains(e.target as Node)) return;
          if (!hoverCapable && !active && e.detail !== 0) {
            e.preventDefault();
            setActive(true);
            return;
          }
          e.preventDefault();
          // The sidebar's visitor log listens for this: a box was opened.
          window.dispatchEvent(new CustomEvent("nysgpt:box", { detail: card.title }));
          onOpen();
          return;
        }
        if (panel && !paper) {
          if (arrowRef.current?.contains(e.target as Node)) return; // PanelRight's own handler
          if (topArrowRef.current?.contains(e.target as Node)) return; // ↗ → let the href fire
          if (!hoverCapable && !active && e.detail !== 0) {
            // touch: first tap still reveals; the second opens the panel
            e.preventDefault();
            setActive(true);
            return;
          }
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("nysgpt:box", { detail: card.title }));
          openProduct(productIndex ?? index);
          return;
        }
        if (hoverCapable) return; // mouse: the whole card navigates, as before
        if (e.detail === 0) return; // keyboard Enter: navigate, don't toggle
        if (arrowRef.current?.contains(e.target as Node)) return; // the arrow navigates
        e.preventDefault();
        setActive((v) => !v);
      }}
      className={`group/card relative flex ${paper ? "h-[210px] overflow-hidden px-5 py-5" : large ? "min-h-[300px] px-8 py-8 lg:min-h-[421px]" : "min-h-[210px] px-5 py-5"} flex-col border-b border-r border-[var(--paper-rule)] transition-colors [-webkit-tap-highlight-color:transparent] ${
        lit ? "bg-[var(--accent-tint)]" : rest === "grey" ? "bg-[var(--paper-quiet)]" : ""
      }`}
    >
      {/* The reveal — in place of the resting content. Products count their
          headline figure up; papers fade their description in (they have
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
          <span className="text-[12px] leading-[1.55]">{card.body}</span>
        </span>
      ) : hasFigure && (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center transition-opacity duration-200 ${
            active ? "opacity-100" : "opacity-0"
          }`}
          style={{ color: "var(--accent)" }}
        >
          <span className="leading-none tabular-nums" style={{ ...MONO, fontSize: FIGURE_SIZE }}>
            {approx && "~"}
            <CountUp value={figure.count} decimals={figure.decimals} suffix={figure.suffix} active={active} duration={900} />
          </span>
          {/* Under the figure, its unit label. */}
          <span className="text-[10px] uppercase tracking-[0.2em]" style={SANS}>{unit}</span>
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
      {arrow && <span
        ref={topArrowRef}
        /* `transition-colors` as well as opacity — with opacity alone the grey
           hover disc snapped in rather than fading, which read as missing.
           Clicks here bubble to the card <Link> UNprevented — this corner is
           where the outbound navigation lives now that the block itself opens
           the panel. */
        className={`absolute right-3 top-3 flex items-center justify-center rounded-full p-2 transition-[opacity,background-color] duration-200 hover:bg-[var(--paper-rule-soft)] ${active ? "opacity-100" : "opacity-0"}`}
      >
        <ArrowUpRight className="h-4 w-4 text-[var(--accent)]" />
      </span>}

      <div className={`flex flex-1 flex-col transition-opacity duration-200 ${active && hasFigure ? "pointer-events-none opacity-0" : "opacity-100"}`}>
        {/* The title opens the box, with the live dot opposite its first line;
            the number moved to the foot, opposite the tag (2026-10-08). */}
        <div className="flex items-start justify-between gap-3">
          {/* line-clamp guards the paper titles (Refresh); product titles never reach it. */}
          <h3 data-inspect="CardTitle" className={`m-0 line-clamp-4 transition-colors ${large ? "text-[44px] leading-[1.05]" : "text-[20px] leading-[1.1]"}`} style={{ ...SERIF, color: lit ? "var(--accent)" : "var(--paper-text)" }}>
            {card.title}
          </h3>
          <span className={`flex shrink-0 items-center ${large ? "h-[46px]" : "h-[22px]"}`}>
            {/* Live dot — top-right, level with the title's first line. Decoration only,
                so it never takes a pointer: it shares this corner with the ↗.
                Signed in, it says whether the product is awake: a spinner while
                it wakes, a check once it answers (components/ProductStatus).
                It steps aside on hover for the ↗ even on a card with no figure,
                whose content block stays put (2026-10-08, Consensus). */}
            <span className={`flex shrink-0 transition-opacity duration-200 ${active && arrow ? "opacity-0" : ""}`}>
            {status === "loading" ? (
              <span aria-label="Loading" className="pointer-events-none flex h-[5px] w-[5px] shrink-0 items-center justify-center">
                <ClassicSpinner className="shrink-0 scale-[0.4]" />
              </span>
            ) : status === "ready" && checked ? (
              <span aria-label="Ready" className="pointer-events-none flex h-[5px] w-[5px] shrink-0 items-center justify-center">
                <Check className="size-3.5 shrink-0 text-emerald-500" strokeWidth={3} />
              </span>
            ) : status === "ready" ? (
              // Awake: the live dot again, larger and ringed in grey so it reads as on.
              <span aria-label="Ready" className="pointer-events-none flex h-[5px] w-[5px] shrink-0 items-center justify-center">
                <span className="flex size-[13px] shrink-0 items-center justify-center rounded-full ring-1 ring-zinc-300 dark:ring-zinc-600">
                  <span className="relative flex size-[7px]">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex size-[7px] rounded-full bg-emerald-500" />
                  </span>
                </span>
              </span>
            ) : (
              <span aria-hidden className="pointer-events-none relative flex h-[5px] w-[5px] shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-[5px] w-[5px] rounded-full bg-emerald-500" />
              </span>
            )}
            </span>
          </span>
        </div>
        {/* Papers carry no resting blurb — their description lives in the hover
            reveal above, which is what keeps every paper cell at 210px. */}
        {!paper && <p data-inspect="CardBlurb" className={`flex-1 text-[var(--paper-muted)] ${large ? "mt-4 max-w-[34rem] text-[17px] leading-[1.5]" : "mt-2 text-[12px] leading-[1.5]"}`} style={SANS}>{card.body}</p>}
      </div>

      <div className="relative mt-4 flex items-end justify-between gap-3">
        <span
          data-inspect="CardFooter"
          className={`inline-flex min-w-0 items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] tabular-nums transition-opacity duration-200 ${active && hasFigure ? "opacity-0" : "opacity-100 text-[var(--paper-faint)]"}`}
          style={MONO}
        >
          {category && !paper ? (
            // The box's kind, in its colour.
            <span className="font-medium text-[var(--accent)]">{category}</span>
          ) : !paper && card.sources ? (
            /* The sources line came off the cards (Brendan, 2026-10-05). The
               span stays so the panel button keeps its bottom-right seat. */
            null
          ) : paper || !hasFigure ? (
            /* "Published January 10, 2026" — the paper's own date, not a stat. */
            card.footer
          ) : (
            <>
              <CountUp value={figure.count} decimals={figure.decimals} suffix={figure.suffix} />
              &nbsp;{unit}
            </>
          )}
        </span>
        {/* Bottom-right: the number, and on hover the panel button over it. The ↗ that used to live here moved to
            the card's top-right (above) — the two affordances now sit at
            opposite corners so neither is a near-miss for the other.
            `arrowRef` still guards this one so the card's tap-to-reveal handler
            (touch devices) lets a real tap through. */}
        {/* `panel` is off for the Refresh paper cards: openProduct(index) would
            open the wrong product's view for a paper sitting in that slot. */}
        <span
          data-inspect="CardIndex"
          className={`shrink-0 text-[10px] tabular-nums tracking-[0.2em] transition-[opacity,color] duration-200 ${active && (hasFigure || panel) ? "opacity-0" : ""} ${lit ? "text-[var(--accent)]" : "text-[var(--paper-faint)]"}`}
          style={MONO}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        {panel && <span
          ref={arrowRef}
          className={`absolute -right-2 -bottom-2 flex shrink-0 items-center transition-opacity duration-200 ${active ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <button
            type="button"
            aria-label={`Open the ${card.title} panel`}
            onClick={(e) => {
              // The cell is a <Link>; without this the panel opens AND we navigate.
              e.preventDefault();
              e.stopPropagation();
              openProduct(productIndex ?? index);
            }}
            className="flex items-center justify-center rounded-full p-2 transition-colors hover:bg-[var(--paper-rule-soft)]"
          >
            <PanelRight className="h-4 w-4 text-[var(--accent)]" />
          </button>
        </span>}
      </div>
    </Cell>
  );
}

/** The cell itself: a real <Link> when the card has a page, else a plain block. */
function Cell({ linked, href, newTab, children, ...rest }: { linked: boolean; href: string; newTab: boolean; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  if (!linked) return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
  return (
    <Link href={href} {...(newTab ? { target: "_blank", rel: "noreferrer noopener" } : {})} {...(rest as React.HTMLAttributes<HTMLAnchorElement>)}>
      {children}
    </Link>
  );
}
