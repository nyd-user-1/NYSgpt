"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import type { HomeCardData } from "@/lib/home-data";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

/** "Artificial Intelligence" → /products/artificial-intelligence.png: where a product's screenshot is kept. */
export const shotOf = (title: string) => `/products/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`;

/**
 * A product's screenshot in a browser frame, for its card dialog. Until the
 * file is in public/products/, the frame holds a placeholder; on the dev
 * server the placeholder names the file it is waiting for.
 */
export function ProductShot({ card }: { card: HomeCardData }) {
  const srcs = card.shots ?? [shotOf(card.title)];
  const [at, setAt] = useState(0);
  const src = srcs[at] ?? srcs[0];
  const [missing, setMissing] = useState(false);
  const go = (i: number) => {
    setAt(i);
    setMissing(false);
  };
  // A listed shot is cropped at the browser's edge, so the frame takes the
  // shot's own height: no bands. The one-file default fills the frame from the top, as before.
  const contain = !!card.shots;
  const address = card.domain ?? card.href.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  return (
    // Listed shots keep their own aspect, so the frame hugs the image exactly —
    // no letterbox bands — and the whole frame centers in the column instead.
    <figure className={`m-0 flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm ${contain ? "lg:my-auto" : "min-h-[20rem] lg:min-h-0 lg:flex-1"}`}>
      <div className="flex h-9 shrink-0 items-center gap-3 border-b bg-muted/50 px-3">
        <span className="flex w-10 gap-1.5" aria-hidden>
          {/* The window's three lights, in a Mac's colours and order. */}
          {["#ff5f57", "#febc2e", "#28c840"].map((colour) => (
            <span key={colour} className="size-2.5 rounded-full" style={{ background: colour }} />
          ))}
        </span>
        <span className="mx-auto flex h-6 w-1/2 min-w-0 items-center justify-center rounded-md bg-background px-3 text-[11px] text-foreground" style={MONO}>
          <span className="truncate">{address}</span>
        </span>
        <span className="w-10" aria-hidden />
      </div>
      <div className={`group relative ${contain ? (missing ? "w-full aspect-[16/9]" : "w-full") : "min-h-0 flex-1"}`}>
        {missing ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
            style={{ backgroundImage: `repeating-linear-gradient(135deg, color-mix(in oklab, ${card.accent} 7%, transparent) 0 14px, transparent 14px 28px)` }}
          >
            <span className="flex size-12 items-center justify-center rounded-full" style={{ color: card.accent, background: `color-mix(in oklab, ${card.accent} 12%, transparent)` }}>
              <ImageIcon className="size-5" aria-hidden />
            </span>
            <span className="text-2xl" style={SERIF}>{card.title}</span>
            {process.env.NODE_ENV === "development" && <code className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground" style={MONO}>public{src}</code>}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- a local file that may not exist yet; the fallback is the placeholder
          contain ? (
            // Every shot is drawn, stacked. The current one fades in on top while
            // the one it replaces stays at full strength beneath, then drops away
            // once covered: an additive dissolve, with no dip to the ground between.
            srcs.map((shot, i) => (
              <img
                key={shot}
                src={shot}
                alt={i === at ? `${card.title}: a screen from the product` : ""}
                aria-hidden={i !== at}
                onError={() => i === at && setMissing(true)}
                className={i === at ? "relative z-10 block h-auto w-full opacity-100 transition-opacity duration-500 ease-out" : "absolute inset-0 size-full object-cover object-top opacity-0 transition-opacity delay-500 duration-0"}
              />
            ))
          ) : (
            <img key={src} src={src} alt={`${card.title}: a screen from the product`} onError={() => setMissing(true)} className="absolute inset-0 size-full object-cover object-top" />
          )
        )}
        {srcs.length > 1 && !missing && (
          <>
            {/* The arrows show on hover, one at each side of the shot. */}
            <button type="button" onClick={() => go((at - 1 + srcs.length) % srcs.length)} aria-label="The screen before" className="absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center z-20 rounded-full bg-background/90 text-foreground opacity-0 shadow-md ring-1 ring-black/5 backdrop-blur transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-background left-3">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => go((at + 1) % srcs.length)} aria-label="The screen after" className="absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center z-20 rounded-full bg-background/90 text-foreground opacity-0 shadow-md ring-1 ring-black/5 backdrop-blur transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-background right-3">
              <ChevronRight className="size-5" aria-hidden />
            </button>
            {/* One dot per shot, over the shot's foot; the current one stretches into a pill and the pill slides as the shot changes. */}
            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center rounded-full bg-black/45 px-1.5 py-0.5 backdrop-blur-sm">
              {srcs.map((shot, i) => (
                <button
                  key={shot}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Screen ${i + 1} of ${srcs.length}`}
                  aria-current={i === at}
                  className="flex h-6 items-center px-1"
                >
                  <span className={`block h-2.5 rounded-full transition-all duration-300 ease-out ${i === at ? "w-7 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"}`} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </figure>
  );
}
