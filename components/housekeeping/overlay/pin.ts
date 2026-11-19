// The pin (spec §2.3): a 28px avatar whose pointed bottom-left corner marks the
// click point. The point is stored as a fraction of the target's rect, so the pin
// stays on the same spot of the element through scroll, resize, and reflow.

import { h, svg } from "./dom";

export type PinState = "draft" | "sent" | "copied" | "saved";

const SIZE = 28;

export class Pin {
  readonly el: HTMLDivElement;
  private readonly badge: HTMLSpanElement;
  target: Element;
  private fx = 0;
  private fy = 0;
  state: PinState = "draft";

  constructor(doc: Document, parent: ShadowRoot, initial: string, target: Element, x: number, y: number, photo?: string) {
    this.el = h(doc, "div", "pin", photo ? "" : initial.slice(0, 1).toUpperCase());
    if (photo) {
      const img = h(doc, "img");
      img.src = photo;
      img.alt = "";
      this.el.appendChild(img);
    }
    this.badge = h(doc, "span", "badge");
    const tick = svg(doc, "svg", { width: 8, height: 8, viewBox: "0 0 10 10" });
    tick.appendChild(svg(doc, "path", { d: "M2 5.2 4.2 7.4 8 3", fill: "none", stroke: "#fff", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    this.badge.appendChild(tick);
    this.el.appendChild(this.badge);
    this.target = target;
    this.anchor(target, x, y);
    parent.appendChild(this.el);
    this.place();
    this.el.animate([{ scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1 }], { duration: 140, easing: "cubic-bezier(.2,.8,.2,1)" });
  }

  /** Pin to (x, y), expressed relative to `target`. */
  anchor(target: Element, x: number, y: number): void {
    this.target = target;
    const r = target.getBoundingClientRect();
    const frac = (v: number, start: number, size: number) => (size > 0 ? Math.min(1, Math.max(0, (v - start) / size)) : 0);
    this.fx = frac(x, r.left, r.width);
    this.fy = frac(y, r.top, r.height);
  }

  /** The click point in viewport coordinates. */
  point(): { x: number; y: number } {
    const r = this.target.getBoundingClientRect();
    return { x: r.left + this.fx * r.width, y: r.top + this.fy * r.height };
  }

  place(): void {
    const hidden = !this.target.isConnected;
    this.el.hidden = hidden;
    if (hidden) return;
    const p = this.point();
    this.el.style.transform = `translate3d(${p.x}px, ${p.y - SIZE}px, 0)`;
  }

  setState(state: PinState): void {
    this.state = state;
    this.el.classList.toggle("done", state === "sent" || state === "copied");
    this.el.classList.toggle("note", state === "saved");
  }

  remove(): void {
    this.el.remove();
  }
}
