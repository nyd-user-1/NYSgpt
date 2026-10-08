"use client";

import { motion } from "motion/react";

/** Twelve spokes fading in turn: a product still waking (2026-10-07). 32px; scale it down where it sits small. */
export function ClassicSpinner({ className = "" }: { className?: string }) {
  return (
    <div className={`relative h-8 w-8 ${className}`} aria-hidden>
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-0 left-[14px] h-[8px] w-[4px] origin-[2px_16px] rounded-full bg-zinc-400 dark:bg-zinc-200"
          style={{ rotate: i * 30 }}
          animate={{ opacity: [1, 0.2] }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear", delay: i * (1 / 12) }}
        />
      ))}
    </div>
  );
}
