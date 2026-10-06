"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ImageIcon } from "lucide-react";
import type { HomeCardData } from "@/lib/home-data";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

/** The page ground of a full-page shot, sampled from the shots themselves, so a contained image sits on its own color. */
const SHOT_GROUND = "#18181b";

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
  const step = (by: number) => {
    setAt((at + by + srcs.length) % srcs.length);
    setMissing(false);
  };
  // A listed shot is a full page with its own framing: show all of it on its
  // own ground. The one-file default fills the frame from the top, as before.
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
      <div className={contain ? "relative w-full aspect-[1600/922]" : "relative min-h-0 flex-1"} style={contain ? { background: SHOT_GROUND } : undefined}>
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
          <img key={src} src={src} alt={`${card.title}: a screen from the product`} onError={() => setMissing(true)} className={`absolute inset-0 size-full ${contain ? "object-contain" : "object-cover object-top"}`} />
        )}
      </div>
      {srcs.length > 1 && (
        <div className="flex h-9 shrink-0 items-center justify-between border-t bg-muted/50 px-3 text-[10px] uppercase tracking-[0.28em] text-muted-foreground" style={MONO}>
          <button type="button" onClick={() => step(-1)} className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Prev
          </button>
          <span className="tabular-nums">{at + 1} / {srcs.length}</span>
          <button type="button" onClick={() => step(1)} className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            Next <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
    </figure>
  );
}
