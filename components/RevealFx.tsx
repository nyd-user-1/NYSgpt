"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function RevealFx({
  children,
  delay = 0,
  translateY = 0,
  active,
  className,
}: {
  children: React.ReactNode;
  delay?: number; // seconds
  translateY?: number; // px offset before reveal
  /**
   * Parent-controlled trigger (the CountUp contract): the wipe runs each time
   * this turns true and resets INSTANTLY (no transition) when it turns false,
   * so a hide under a parent's opacity fade doesn't play a reverse wipe.
   * Omit it and the component keeps its original fire-once-after-delay mount
   * behavior.
   */
  active?: boolean;
  className?: string;
}) {
  const controlled = active !== undefined;
  const [on, setOn] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (controlled) return;
    const t = setTimeout(() => setOn(true), Math.round(delay * 1000));
    return () => clearTimeout(t);
  }, [delay, controlled]);

  // Controlled hide: re-arm the blur so the next reveal starts soft again.
  useEffect(() => {
    if (controlled && !active) setDone(false);
  }, [controlled, active]);

  const shown = controlled ? active : on;

  // Only remove filter after the mask transition finishes (not transform/filter)
  function handleTransitionEnd(e: React.TransitionEvent) {
    if (shown && e.propertyName === "mask-position") setDone(true);
  }

  return (
    <div
      className={cn(className)}
      onTransitionEnd={handleTransitionEnd}
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, black 0%, black 25%, transparent 50%)",
        maskImage:
          "linear-gradient(to right, black 0%, black 25%, transparent 50%)",
        WebkitMaskSize: "400% 100%",
        maskSize: "400% 100%",
        WebkitMaskPosition: shown ? "0 0" : "100% 0",
        maskPosition: shown ? "0 0" : "100% 0",
        filter: done ? "none" : shown ? "blur(0px)" : "blur(10px)",
        transform: `translateY(${shown ? 0 : translateY}px)`,
        transition:
          controlled && !shown
            ? "none"
            : [
                "mask-position 0.7s cubic-bezier(0.25, 0.4, 0.25, 1)",
                "-webkit-mask-position 0.7s cubic-bezier(0.25, 0.4, 0.25, 1)",
                "filter 0.7s cubic-bezier(0.25, 0.4, 0.25, 1)",
                "transform 0.7s cubic-bezier(0.25, 0.4, 0.25, 1)",
              ].join(", "),
      }}
    >
      {children}
    </div>
  );
}
