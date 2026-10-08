"use client";

import { BareHeader } from "@/components/BareHeader";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { WaveLoader } from "./WaveLoader";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;

const LINES = [
  "Preparing your custom AI experience…",
  "This takes about a minute.",
  "So, how's the weather?",
  "Just kidding.",
  "It's nearly ready.",
  "Everything is ready. Have a great day.",
];
/** Every line holds exactly this long; then the reader is back on the homepage. */
const LINE_MS = 5_000;

/**
 * The screen after signing in (2026-10-07). Behind it the products start
 * waking (components/ProductStatus, mounted in the layout, knocks on all of
 * them from the moment the reader is signed in); on the homepage each card
 * then shows its spinner or its check.
 */
export function Welcome() {
  const [line, setLine] = useState(0);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const timers = LINES.slice(1).map((_, i) => setTimeout(() => setLine(i + 1), (i + 1) * LINE_MS));
    timers.push(setTimeout(() => window.location.assign("/"), LINES.length * LINE_MS));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <main className="flex min-h-dvh w-full items-center justify-center px-6">
      <BareHeader />
      <div className="flex w-full max-w-md flex-col items-center gap-10 text-center">
        {/* Each line rises into a clipped window and leaves upward as the next one rises behind it. */}
        <div className="relative h-[5.5rem] w-full overflow-hidden" aria-live="polite">
          <AnimatePresence initial={false}>
            <motion.p
              key={line}
              className="absolute inset-0 m-0 flex items-center justify-center text-3xl leading-snug text-foreground"
              style={SERIF}
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              exit={{ y: "-100%" }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              {LINES[line]}
            </motion.p>
          </AnimatePresence>
        </div>
        <WaveLoader theme={resolvedTheme === "dark" ? "dark" : "light"} />
      </div>
    </main>
  );
}
