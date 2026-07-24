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
  trigger?: "view" | "hover";
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
        setDisplay(value);
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
        setDisplay(0);
      }
      return cancel;
    }

    if (trigger === "hover") {
      const card = el.closest("a");
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
