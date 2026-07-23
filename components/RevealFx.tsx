"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function RevealFx({
  children,
  delay = 0,
  translateY = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number; // seconds
  translateY?: number; // px offset before reveal
  className?: string;
}) {
  const [on, setOn] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOn(true), Math.round(delay * 1000));
    return () => clearTimeout(t);
  }, [delay]);

  // Only remove filter after the mask transition finishes (not transform/filter)
  function handleTransitionEnd(e: React.TransitionEvent) {
    if (on && e.propertyName === "mask-position") setDone(true);
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
        WebkitMaskPosition: on ? "0 0" : "100% 0",
        maskPosition: on ? "0 0" : "100% 0",
        filter: done ? "none" : on ? "blur(0px)" : "blur(10px)",
        transform: `translateY(${on ? 0 : translateY}px)`,
        transition: [
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
