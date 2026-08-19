"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Text scramble-in: glyphs cycle randomly and resolve left→right into the
 * target. Ported from 44b (src/components/Scramble.tsx) — the house effect for
 * non-numeric reveals, the counterpart to CountUp. Two triggers, mirroring
 * CountUp's contract:
 *  - uncontrolled (no `active`): fires once when scrolled into view;
 *  - controlled (`active` passed): runs each time the flag turns true and
 *    settles back to the plain text when it turns false, which is how the
 *    paper cards drive the description from both hover and tap.
 * Respects prefers-reduced-motion.
 */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function Scramble({
  text,
  duration = 700,
  active,
  className,
}: {
  text: string;
  duration?: number;
  active?: boolean;
  className?: string;
}) {
  const [out, setOut] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf: number | null = null;

    const cancel = () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };

    const run = () => {
      cancel();
      if (reduce) {
        raf = requestAnimationFrame(() => { setOut(text); raf = null });
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const solved = Math.floor(p * text.length);
        setOut(
          text.slice(0, solved) +
            Array.from({ length: text.length - solved }, (_, i) =>
              text[solved + i] === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
            ).join(""),
        );
        if (p < 1) raf = requestAnimationFrame(tick);
        else {
          setOut(text);
          raf = null;
        }
      };
      raf = requestAnimationFrame(tick);
    };

    // Controlled: the parent owns the trigger. Settle (don't scramble) on
    // deactivate so the fade-out still shows readable text.
    if (active !== undefined) {
      if (active) run();
      else {
        cancel();
        raf = requestAnimationFrame(() => { setOut(text); raf = null });
      }
      return cancel;
    }

    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancel();
    };
  }, [text, duration, active]);

  return (
    <span ref={ref} className={className}>
      {out}
    </span>
  );
}
