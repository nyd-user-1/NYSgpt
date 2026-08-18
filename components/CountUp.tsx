"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number 0 → value with easeOutCubic, formatted with thousands
 * separators. `trigger="view"` (default) fires once when it scrolls into view;
 * `trigger="hover"` fires each time the nearest <a> ancestor is hovered and
 * resets on leave. Passing `active` puts the parent in control instead — it
 * runs whenever the flag turns true and resets when it turns false, which is
 * how the cards drive one figure from both hover and tap.
 * Respects prefers-reduced-motion.
 */
/**
 * What counts as "the thing being hovered" for the hover triggers.
 *
 * Historically this was `closest("a")`, because every hover-counted figure lived
 * inside a link (44B's home stat blocks link to a Dashboard lens). A figure in a
 * NON-link cell — nysgpt.com's ledger — therefore silently never animated: the
 * listener had nothing to attach to, so the count-on-view still fired and only
 * the hover was missing, which reads as "the animation is broken" rather than
 * "there is no anchor here". Opt such a cell in with `data-countup-scope`.
 */
function hoverScope(el: HTMLElement): HTMLElement | null {
  return el.closest<HTMLElement>("[data-countup-scope]") ?? el.closest<HTMLElement>("a");
}

export function CountUp({
  value,
  duration = 1400,
  decimals = 0,
  suffix = "",
  trigger = "view",
  active,
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  /**
   * "view-hover" is for a figure that must READ at rest: it counts once on
   * view like "view", then re-runs on each hover — and never resets to 0,
   * which is the one thing "hover" does that a headline stat cannot afford.
   */
  trigger?: "view" | "hover" | "view-hover";
  active?: boolean;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const cancel = () => {
      if (raf.current !== null) {
        cancelAnimationFrame(raf.current);
        raf.current = null;
      }
    };

    const run = () => {
      cancel();
      if (reduce) {
        // One frame out, not synchronously in the effect: 44b's lint treats a
        // sync setState-in-effect as an error, and a frame's deferral is
        // invisible for a static number.
        raf.current = requestAnimationFrame(() => { setDisplay(value); raf.current = null });
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(value * eased);
        if (t < 1) raf.current = requestAnimationFrame(tick);
        else {
          setDisplay(value);
          raf.current = null;
        }
      };
      raf.current = requestAnimationFrame(tick);
    };

    // Controlled: the parent owns the trigger.
    if (active !== undefined) {
      if (active) run();
      else {
        cancel();
        raf.current = requestAnimationFrame(() => { setDisplay(0); raf.current = null });
      }
      return cancel;
    }

    if (trigger === "hover") {
      const card = hoverScope(el);
      if (!card) return;
      const onEnter = () => run();
      const onLeave = () => {
        cancel();
        setDisplay(0);
      };
      card.addEventListener("mouseenter", onEnter);
      card.addEventListener("mouseleave", onLeave);
      return () => {
        card.removeEventListener("mouseenter", onEnter);
        card.removeEventListener("mouseleave", onLeave);
        cancel();
      };
    }

    // "view-hover": count on view, then re-run on hover. No leave handler and
    // no reset — the figure holds its value, so the stat still reads when the
    // pointer is elsewhere.
    let card: HTMLElement | null = null;
    const onEnter = () => run();
    if (trigger === "view-hover") {
      card = hoverScope(el);
      card?.addEventListener("mouseenter", onEnter);
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      card?.removeEventListener("mouseenter", onEnter);
      cancel();
    };
  }, [value, duration, trigger, active]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
