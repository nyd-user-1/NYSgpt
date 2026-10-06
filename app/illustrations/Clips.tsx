"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, FileText, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { MONO, SERIF, useStage, type Staged } from "./parts";
import { STATUTE } from "./statute";

// The document is 15 U.S.C. § 261 with its notes; every caption states something in it.

const SCENES = [
  { figure: "9", caption: "The United States keeps nine standard time zones." },
  { figure: "1918", caption: "Congress set them in 1918, in what is known as the Calder Act." },
  { figure: "−4 to +10", caption: "Each zone is fixed by its hours from Coordinated Universal Time." },
  { figure: "5 → 8 → 9", caption: "Five zones became eight in 1966, and nine in 2000." },
  { figure: "DOT", caption: "The Secretary of Transportation draws the lines between them." },
];

export function Clips({ onStage }: Staged) {
  /** The document first; the clip takes its place when the reader presses play. */
  const [clip, setClip] = useState(false);
  /** The scene the reel is showing, read from how far it has been scrolled. */
  const [at, setAt] = useState(0);
  const reel = useRef<HTMLDivElement>(null);
  const last = at >= SCENES.length - 1;
  useStage(onStage, clip);

  /** The next screen of the clip; from the last one, back to the first. */
  const next = () => {
    const el = reel.current;
    if (el) el.scrollTo({ top: last ? 0 : (at + 1) * el.clientHeight, behavior: "smooth" });
  };

  return (
    <div className={cn("relative min-h-[29rem] overflow-hidden rounded-lg border transition-colors duration-500 lg:min-h-0 lg:flex-1", "bg-background")}>
      <AnimatePresence mode="wait" initial={false}>
        {clip ? (
          // The clip stands where the document was: a 9:16 reel, a screen at a time.
          <motion.div key="clip" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.3, ease: "easeOut" }} className="absolute inset-0 flex justify-center p-3 text-white">
            <div className="relative aspect-9/16 h-full overflow-hidden rounded-2xl bg-[#0a1730] shadow-2xl ring-1 ring-white/10">
              <div
                ref={reel}
                onScroll={(e) => setAt(Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight))}
                className="absolute inset-0 snap-y snap-mandatory overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {SCENES.map((scene) => (
                  <section key={scene.figure} className="flex h-full snap-start flex-col items-center justify-center gap-5 px-5 text-center">
                    <span className={cn("leading-none tracking-tight", scene.figure.length > 4 ? "text-4xl" : "text-7xl")} style={SERIF}>{scene.figure}</span>
                    <span className="rounded-md bg-black/45 px-2.5 py-1.5 text-[13px] leading-snug font-medium">{scene.caption}</span>
                  </section>
                ))}
              </div>

              <div className="pointer-events-none absolute inset-x-0 top-0 flex gap-1 p-2.5">
                {SCENES.map((scene, i) => (
                  <span key={scene.figure} className={cn("h-0.5 flex-1 rounded-full transition-colors duration-300", i <= at ? "bg-white" : "bg-white/25")} />
                ))}
              </div>
              <button type="button" onClick={() => { setClip(false); setAt(0); }} aria-label="Back to the document" title="Back to the document" className="absolute top-5 left-2.5 flex size-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
                <FileText className="size-4" aria-hidden />
              </button>
              <span className="pointer-events-none absolute bottom-5 left-3.5 text-[10px] tabular-nums text-white/70" style={MONO}>{at + 1} / {SCENES.length}</span>
              <span className="absolute right-2.5 bottom-2.5 flex flex-col gap-2">
                {at > 0 && (
                  <button type="button" onClick={() => reel.current?.scrollTo({ top: (at - 1) * reel.current.clientHeight, behavior: "smooth" })} aria-label="Previous screen" className="flex size-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
                    <ArrowUp className="size-5" aria-hidden />
                  </button>
                )}
                {!last && (
                  <button type="button" onClick={next} aria-label="Next screen" className="flex size-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
                    <ArrowDown className="size-5" aria-hidden />
                  </button>
                )}
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div key="document" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.22 }} className="absolute inset-0">
            <article className="absolute inset-0 overflow-y-auto px-8 pt-6 pb-20 text-[11.5px] leading-[1.55] text-foreground/85" style={SERIF}>
              {STATUTE.map((block, i) =>
                block.kind === "title" ? (
                  <h4 key={i} className="m-0 mb-2 text-[14px] font-bold">{block.text}</h4>
                ) : block.kind === "heading" ? (
                  <h5 key={i} className="m-0 mt-4 mb-0.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.08em]">{block.text}</h5>
                ) : (
                  <p key={i} className="m-0 mt-2 text-justify">
                    {block.lead && <b>{block.lead} </b>}
                    {block.text}
                  </p>
                ),
              )}
            </article>
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-background to-transparent" aria-hidden />
            <button type="button" onClick={() => setClip(true)} aria-label="Play the clip" title="Play the clip" className="absolute right-5 bottom-5 flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105">
              <Play className="size-6 translate-x-0.5 fill-current" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
