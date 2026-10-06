"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Crosshair, X } from "lucide-react";
import WHERE from "@/lib/inspect-map.json";

// The Inspector, for a visitor to try on this page. GovBlock's own
// (govblock apps/web/components/dev/inspector.tsx) reads the component and the
// file out of React's development build, which a published site does not
// carry; here the page's elements are marked with data-inspect instead, and
// scripts/inspect-map.mjs records the file and line of each mark. The look is
// the original's: a crosshair, a blue rule through the pointer, a dashed box
// on what is under it, a solid one once it is picked, and the name on a chip.

const BLUE = "#3b82f6";
const RULE = "rgba(59,130,246,0.5)";
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

/** Anthropic's published cost of a 1920×1080 image on current Claude models. */
export const SCREENSHOT_TOKENS = 2691;
/** A rough count for a short brief: about four characters to a token. */
export const tokensOf = (text: string) => Math.max(1, Math.ceil(text.length / 4));

type Hit = { el: Element; chain: string; where: string; says: string };

/** The marked element under a point, with the chain of marked elements it sits in. */
function read(target: Element | null): Hit | null {
  const el = target?.closest("[data-inspect]");
  if (!el || el.closest("[data-inspector-ui]")) return null;
  const names: string[] = [];
  for (let n: Element | null = el; n; n = n.parentElement?.closest("[data-inspect]") ?? null) names.unshift(n.getAttribute("data-inspect") ?? "");
  const name = names[names.length - 1];
  const says = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 48);
  return { el, chain: names.join(" › "), where: (WHERE as Record<string, string>)[name] ?? "", says };
}

/** The line to paste into a chat: the file first, as the original writes it. */
const briefOf = (hit: Hit) => `${hit.where}  <${hit.chain}>${hit.says ? `  "${hit.says}"` : ""}`;

export function InspectorMode({ onExit }: { onExit: () => void }) {
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState<Hit | null>(null);
  const [pinned, setPinned] = useState<Hit | null>(null);
  const [copied, setCopied] = useState(false);
  // Counts scrolls and resizes, so the box is measured again when the page moves under it.
  const [, setMoved] = useState(0);
  /** What is picked, for the Escape key to read: it unpicks first, and leaves on the second press. */
  const picked = useRef<Hit | null>(null);
  useEffect(() => {
    picked.current = pinned;
  }, [pinned]);
  /** Where the pointer last was, for scrolls to re-aim from: a scroll moves the page under a still pointer. */
  const mouseAt = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const ours = (t: EventTarget | null) => t instanceof Element && !!t.closest("[data-inspector-ui]");
    const move = (e: MouseEvent) => {
      mouseAt.current = { x: e.clientX, y: e.clientY };
      setMouse({ x: e.clientX, y: e.clientY });
      setHovered(ours(e.target) ? null : read(document.elementFromPoint(e.clientX, e.clientY)));
    };
    // The click picks the element instead of pressing it: nothing on the page fires.
    const click = (e: MouseEvent) => {
      if (ours(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      setPinned(read(e.target as Element));
      setCopied(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (picked.current) setPinned(null);
      else onExit();
    };
    // A scroll or resize moves the page under a still pointer: the box must be
    // measured again AND what is under the crosshair must be read again, or the
    // rules stay on the mouse while the box drifts off with the old element —
    // two points of focus where there should be one.
    const moved = () => {
      setMoved((n) => n + 1);
      const at = mouseAt.current;
      if (at) setHovered(read(document.elementFromPoint(at.x, at.y)));
    };
    const style = document.createElement("style");
    style.textContent = "*, *::before, *::after { cursor: crosshair !important } [data-inspector-ui], [data-inspector-ui] * { cursor: auto !important } [data-inspector-ui] button { cursor: pointer !important }";
    document.head.append(style);
    window.addEventListener("mousemove", move, true);
    window.addEventListener("click", click, true);
    window.addEventListener("keydown", key, true);
    window.addEventListener("scroll", moved, true);
    window.addEventListener("resize", moved);
    return () => {
      style.remove();
      window.removeEventListener("mousemove", move, true);
      window.removeEventListener("click", click, true);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("scroll", moved, true);
      window.removeEventListener("resize", moved);
    };
  }, [onExit]);

  // A redeal can replace the node under a kept Hit (the papers plate swaps its
  // cards): a detached element measures 0×0 at the origin, so it is not drawn.
  const pin = pinned && pinned.el.isConnected ? pinned : null;
  const aim = hovered && hovered.el.isConnected && (!pin || hovered.el !== pin.el) ? hovered : null;
  const pr = pin?.el.getBoundingClientRect() ?? null;
  const ar = aim?.el.getBoundingClientRect() ?? null;
  // The chip follows the aim; a pick's chain is already spelled out in the dock.
  const chip = aim ?? pin;
  const cr = aim ? ar : pr;
  const brief = pinned ? briefOf(pinned) : "";

  return (
    <>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2147483645 }} aria-hidden>
        {/* The rules stay up while something is picked: the pick is held in the
            dock, and the crosshair keeps aiming at the next one. */}
        {mouse && (
          <>
            <div style={{ position: "fixed", top: 0, left: mouse.x, width: 1, height: "100dvh", background: RULE }} />
            <div style={{ position: "fixed", left: 0, top: mouse.y, height: 1, width: "100dvw", background: RULE }} />
          </>
        )}
        {pr && (
          <div
            style={{
              position: "fixed", top: pr.top, left: pr.left, width: pr.width, height: pr.height, boxSizing: "border-box", borderRadius: 2,
              background: "rgba(59,130,246,0.12)", border: `2px solid ${BLUE}`,
            }}
          />
        )}
        {ar && (
          <div
            style={{
              position: "fixed", top: ar.top, left: ar.left, width: ar.width, height: ar.height, boxSizing: "border-box", borderRadius: 2,
              background: "rgba(59,130,246,0.07)", border: "2px dashed rgba(59,130,246,0.7)",
            }}
          />
        )}
        {cr && chip && (
          <div
            style={{
              ...MONO, position: "fixed", left: Math.max(4, cr.left), top: cr.top > 30 ? cr.top - 26 : cr.bottom + 4, maxWidth: "calc(100vw - 8px)",
              background: BLUE, color: "#fff", fontSize: 11, lineHeight: "20px", padding: "0 8px", borderRadius: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
          >
            {chip.chain} <span style={{ opacity: 0.8 }}>{chip.where}</span>
          </div>
        )}
      </div>

      {/* The dock: what is on, what was picked, and what it would cost to send. */}
      <div data-inspector-ui className="fixed bottom-4 left-1/2 z-[2147483646] flex w-[min(52rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-xl border bg-background py-2 pr-2 pl-4 text-sm shadow-2xl ring-2 ring-[#3b82f6]">
        <Crosshair className="size-4 shrink-0 text-[#3b82f6]" aria-hidden />
        {pinned ? (
          <>
            <code className="min-w-0 flex-1 truncate text-xs" style={MONO}>{brief}</code>
            <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums md:inline">
              ~{tokensOf(brief)} tokens. A screenshot: {SCREENSHOT_TOKENS.toLocaleString("en-US")}.
            </span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(brief);
                setCopied(true);
              }}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-[#3b82f6] px-3 text-xs font-medium text-white hover:opacity-90"
            >
              {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />} {copied ? "Copied" : "Copy for AI"}
            </button>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-muted-foreground">The Inspector is on. Point at anything on the page and click it.</span>
        )}
        <button type="button" onClick={onExit} aria-label="Turn the Inspector off" title="Turn the Inspector off (Esc)" className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </>
  );
}
