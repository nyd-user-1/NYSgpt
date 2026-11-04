// The blue box (spec §2.2). It tweens top/left/width/height between targets
// (never transform: scale, which blurs the 2px border), snaps when the same target
// merely moves (scroll, resize, layout), and unfolds from the pointer on first show.

import { h, sameRect, snapRect, svg, type Rect } from "./dom";
import type { Ways } from "./walk";

const TWEEN_MS = 120;
const CHIP_GAP = 4;
const EDGE = 4;

export class Box {
  readonly el: HTMLDivElement;
  private readonly chip: HTMLDivElement;
  private shown = false;
  private rect: Rect | null = null;
  private tweenUntil = 0;
  private chipWidth = 0;
  private chipHeight = 0;
  private labelKey = "";

  constructor(doc: Document, parent: ShadowRoot) {
    this.el = h(doc, "div", "box");
    this.chip = h(doc, "div", "chip");
    this.el.appendChild(this.chip);
    parent.appendChild(this.el);
  }

  get visible(): boolean {
    return this.shown;
  }

  /** Move to a new target: tween, or unfold from the pointer if hidden. */
  to(r: DOMRect, from: { x: number; y: number }, now: number): void {
    const next = snapRect(r);
    if (!this.shown) {
      this.el.classList.add("snap");
      this.el.classList.remove("on");
      this.write({ left: Math.round(from.x), top: Math.round(from.y), width: 0, height: 0 });
      void this.el.offsetWidth; // commit the 0×0 start so the next write transitions
      this.el.classList.remove("snap");
      this.el.classList.add("on");
      this.shown = true;
    } else {
      this.el.classList.remove("snap");
    }
    this.write(next);
    this.tweenUntil = now + TWEEN_MS + 20;
  }

  /** Same target, re-measured. Snap to it unless a tween is still in flight. */
  track(r: DOMRect, now: number): void {
    if (!this.shown) return;
    const next = snapRect(r);
    if (sameRect(next, this.rect)) return;
    this.el.classList.toggle("snap", now >= this.tweenUntil);
    this.write(next);
  }

  /** Locked: the box stops following the pointer and fills a little more. */
  lock(on: boolean): void {
    this.el.classList.toggle("locked", on);
  }

  get locked(): boolean {
    return this.el.classList.contains("locked");
  }

  hide(): void {
    if (!this.shown) return;
    this.shown = false;
    this.el.classList.remove("on");
  }

  /** The label: its text, a closed eye when screen readers skip the element, and the walk's marks,
   *  ↑ ↓ ⌘, each dimmed when that way is closed (Brendan, 2026-10-30). */
  setLabel(text: string, extra: { hidden?: boolean; ways?: Ways } = {}): void {
    const key = `${text}|${extra.hidden ? 1 : 0}|${extra.ways ? Object.values(extra.ways).map(Number).join("") : ""}`;
    if (this.labelKey === key) return;
    this.labelKey = key;
    const doc = this.chip.ownerDocument;
    const parts: Element[] = [h(doc, "span", "chip-text", text)];
    if (extra.hidden) parts.push(icon(doc, EYE_OFF, "Hidden from screen readers"));
    if (extra.ways) parts.push(waysMarks(doc, extra.ways));
    this.chip.replaceChildren(...parts);
    this.chipWidth = this.chip.offsetWidth;
    this.chipHeight = this.chip.offsetHeight;
    this.chip.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 100, easing: "linear" });
    if (this.rect) this.placeChip(this.rect);
  }

  private write(r: Rect): void {
    this.rect = r;
    const s = this.el.style;
    s.top = `${r.top}px`;
    s.left = `${r.left}px`;
    s.width = `${r.width}px`;
    s.height = `${r.height}px`;
    this.placeChip(r);
  }

  // The chip rides the box: it is a child, so it moves with the tween. Only its
  // offset changes, to keep it inside the viewport.
  private placeChip(r: Rect): void {
    const view = this.el.ownerDocument.documentElement.clientWidth;
    this.chip.classList.toggle("inside", r.top < this.chipHeight + CHIP_GAP + EDGE);
    // chip x = box left + 2px border + offset
    let offset = -2;
    if (r.left + offset + 2 < EDGE) offset = EDGE - r.left - 2;
    if (r.left + offset + 2 + this.chipWidth > view - EDGE) offset = Math.max(EDGE - r.left - 2, view - EDGE - this.chipWidth - r.left - 2);
    this.chip.style.left = `${offset}px`;
  }
}

const EYE_OFF = [
  "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
  "M14.084 14.158a3 3 0 0 1-4.242-4.242",
  "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
  "m2 2 20 20",
];

/** A 10px stroke icon from lucide paths; `off` dims it. */
function icon(doc: Document, paths: string[], title: string, off = false): SVGElement {
  const el = svg(doc, "svg", { width: 10, height: 10, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" });
  el.setAttribute("class", off ? "chip-icon off" : "chip-icon");
  if (title) {
    const t = svg(doc, "title");
    t.textContent = title;
    el.appendChild(t);
  }
  for (const d of paths) el.appendChild(svg(doc, "path", { d }));
  return el;
}

/**
 * The walk's marks (walk.ts), on the label and in the comment box's header: ↑ the parent, ↓ a child (dim
 * at a sibling level until ⌘ has been used there), ⌘ siblings to cycle with ⌘↑ / ⌘↓.
 */
export function waysMarks(doc: Document, ways: Ways): HTMLSpanElement {
  const group = h(doc, "span", "chip-ways");
  const cmd = h(doc, "span", ways.cmd ? "chip-cmd" : "chip-cmd off", "⌘");
  cmd.title = ways.cmd ? "⌘↑ / ⌘↓ cycle the siblings" : "No siblings here";
  group.append(icon(doc, ["m18 15-6-6-6 6"], "", !ways.up), icon(doc, ["m6 9 6 6 6-6"], "", !ways.down), cmd);
  return group;
}
