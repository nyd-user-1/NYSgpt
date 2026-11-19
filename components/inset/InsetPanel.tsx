"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from "react";

import { PAPER_TAB, RailToggle, useRailClosed } from "@/components/rail-toggle";
import { RowTip } from "@/components/sidebar/RowTip";
import { cn } from "@/lib/utils";

// /graph's two inset panels on one frame, so they can't drift (Brendan, 2026-11-08): the left panel's type, spacing and
// hover (INSET), the right panel's gripper, the left panel's 284 px starting width, the settings panel's tooltip
// (InsetTip). LeftInsetPanel.tsx and RightInsetPanel.tsx are the two panels.

export type InsetSide = "left" | "right";

const W = { start: 284, min: 280, max: 720 };
/** The canvas keeps at least this much while a panel is dragged wider. */
const CANVAS_MIN = 480;

/** The left panel's type, spacing and hover: every list in either panel is set in these. */
export const INSET = {
  header: "flex items-center gap-2 border-b p-3",
  title: "text-sm font-semibold text-[var(--paper-text)]",
  section: "px-3 pb-1 pt-4 text-[10px] uppercase tracking-wide text-[var(--paper-muted)]",
  row: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--paper-text)] transition-colors hover:bg-[var(--paper-quiet)]",
  icon: "h-3.5 w-3.5 shrink-0 text-[var(--paper-muted)]",
  count: "ml-auto shrink-0 font-mono text-xs text-[var(--paper-muted)]",
  note: "p-3 text-xs text-[var(--paper-muted)]",
};

/** A panel's scrolling content, with the one bottom margin both panels share. */
export function InsetBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto pb-4", className)}>{children}</div>;
}

type Layer = { key: string; depth: number; node: ReactNode };

/** A panel's drill-down layers (Brendan, 2026-11-08): a deeper layer pushes in from the right as the sidebar opens
 *  (AppLayout.tsx, 500 ms ease-in-out), the one it covers sliding out to the left; back runs it in reverse. `layerKey`
 *  names the layer on screen and `depth` orders the layers. */
export function InsetLayers({ layerKey, depth, children }: { layerKey: string; depth: number; children: ReactNode }) {
  const shown = useRef<Layer>({ key: layerKey, depth, node: children });
  const [out, setOut] = useState<{ layer: Layer; dir: 1 | -1; run: boolean } | null>(null);
  // After every render: a new layer turns the one last on screen into the leaving layer, before the browser paints.
  useLayoutEffect(() => {
    const was = shown.current;
    if (was.key !== layerKey) setOut({ layer: was, dir: depth >= was.depth ? 1 : -1, run: false });
    shown.current = { key: layerKey, depth, node: children };
  });
  // Both layers paint at their starting places, then move; the leaving one goes once the move is done.
  useEffect(() => {
    if (!out || out.run) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setOut((o) => (o && !o.run ? { ...o, run: true } : o)));
    });
    return () => cancelAnimationFrame(frame);
  }, [out]);
  useEffect(() => {
    if (!out?.run) return;
    const t = setTimeout(() => setOut(null), 500);
    return () => clearTimeout(t);
  }, [out]);
  const layer = "absolute inset-0 flex min-h-0 flex-col bg-[var(--paper)]";
  const move = out?.run ? "transition-transform duration-[500ms] ease-in-out" : "";
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      {out && (
        <div key={out.layer.key} aria-hidden className={cn(layer, move, "pointer-events-none")} style={{ transform: `translateX(${out.run ? -out.dir * 100 : 0}%)` }}>
          {out.layer.node}
        </div>
      )}
      <div key={layerKey} className={cn(layer, move)} style={{ transform: `translateX(${out && !out.run ? out.dir * 100 : 0}%)` }}>
        {children}
      </div>
    </div>
  );
}

/** The settings panel's tooltip, for both panels: the row's name in a paper card beside the row, on the canvas's side
 *  (Brendan dropped the descriptions, 2026-11-08). It renders in a portal above the canvas, so no panel edge clips it. */
export function InsetTip({ name, side, children }: { name: string; side: InsetSide; children: ReactElement }) {
  return <RowTip name={name} side={side}>{children}</RowTip>;
}

/** One inset panel: the rail tab on its inner edge closes and opens it (<html data-rail-left|right>); the shell's
 *  gripper on the same edge (components/shell.tsx, pax-trinity's) drags its width from 280 to 720 px, remembered per
 *  browser, double-click for 284, arrow keys in 24 px steps; 500 ms open and close, none while dragging. `tabs` ride
 *  the inner edge under the rail tab. */
export function InsetPanel({ side, storageKey, tabs, children }: { side: InsetSide; storageKey: string; tabs?: ReactNode; children: ReactNode }) {
  const closed = useRailClosed(side);
  // The server and the first client render both draw the 284 px start; the width this browser remembers is read after
  // mount (2026-11-11: reading localStorage in the initial state made /elpis/book's rail 280 on the client and 284 on the
  // server, a hydration mismatch). The panel loads closed, so the change is never seen.
  const [w, setW] = useState(W.start);
  const [read, setRead] = useState(false);
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(storageKey));
      if (v >= W.min && v <= W.max) setW(v);
    } catch {}
    setRead(true);
  }, [storageKey]);
  const [dragging, setDragging] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (dragging || !read) return;
    try { localStorage.setItem(storageKey, String(w)); } catch {}
  }, [w, dragging, read, storageKey]);
  useEffect(() => {
    if (!dragging) return;
    const s = document.body.style;
    const prev = [s.cursor, s.userSelect];
    s.cursor = "col-resize"; s.userSelect = "none";
    return () => { s.cursor = prev[0]; s.userSelect = prev[1]; };
  }, [dragging]);
  const clamp = (v: number) => Math.max(W.min, Math.min(v, W.max, window.innerWidth - CANVAS_MIN));
  // The panel's inner edge follows the pointer.
  const resizeTo = (x: number) => {
    const r = box.current?.getBoundingClientRect();
    setW(clamp(side === "left" ? x - (r?.left ?? 0) : (r?.right ?? window.innerWidth) - x));
  };
  const grow = side === "left" ? "ArrowRight" : "ArrowLeft";
  const shrink = side === "left" ? "ArrowLeft" : "ArrowRight";
  return (
    <div
      ref={box}
      style={{ width: closed ? 0 : w }}
      className={cn("relative hidden h-full shrink-0", side === "left" ? "lg:block" : "md:block", !dragging && "transition-[width] duration-[500ms] ease-in-out")}
    >
      <RailToggle
        side={side}
        className={cn(
          PAPER_TAB,
          side === "left" ? "right-0 border-l-0" : "left-0 border-r-0",
        )}
      />
      {tabs}
      {!closed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the panel"
          tabIndex={0}
          onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); }}
          onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && resizeTo(e.clientX)}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onLostPointerCapture={() => setDragging(false)}
          onDoubleClick={() => setW(W.start)}
          onKeyDown={(e) => {
            if (e.key !== grow && e.key !== shrink) return;
            e.preventDefault();
            setW((v) => clamp(v + (e.key === grow ? 24 : -24)));
          }}
          className={cn(
            "group absolute top-1/2 z-40 flex h-16 w-[18px] -translate-y-1/2 cursor-col-resize touch-none items-center justify-center outline-none",
            side === "left" ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2",
          )}
        >
          <span className={`h-8 w-1 rounded-full transition-colors group-hover:bg-[#033882] group-focus-visible:bg-[#033882] ${dragging ? "bg-[#033882]" : "bg-[rgba(22,24,29,0.5)] dark:bg-[rgba(240,233,216,0.55)]"}`} />
        </div>
      )}
      <div className={cn("flex h-full w-full overflow-hidden", side === "right" && "justify-end")}>
        <div style={{ width: w }} className={cn("flex h-full min-h-0 shrink-0 flex-col bg-[var(--paper)]", side === "left" ? "border-r" : "border-l")}>
          {children}
        </div>
      </div>
    </div>
  );
}
