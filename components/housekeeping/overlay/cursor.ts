// Custom cursor (spec §2.3): a crosshair pinned to the pointer and a dot that lags
// it by a per-frame lerp, which reads as "alive" without costing precision.

import { h, svg } from "./dom";

const LERP = 0.35;

export class Cursor {
  private readonly layer: HTMLDivElement;
  private readonly dot: HTMLDivElement;
  private readonly cross: SVGElement;
  private readonly hx: HTMLDivElement;
  private readonly hy: HTMLDivElement;
  private x = 0;
  private y = 0;
  private dx = 0;
  private dy = 0;
  private placed = false;

  constructor(doc: Document, parent: ShadowRoot) {
    this.layer = h(doc, "div", "cursor-off");
    this.dot = h(doc, "div", "dot");
    this.cross = svg(doc, "svg", { class: "cross", width: 14, height: 14, viewBox: "0 0 14 14", "shape-rendering": "crispEdges" });
    for (const cls of ["halo", "line"]) {
      const g = svg(doc, "g", { class: cls });
      for (const [x1, y1, x2, y2] of [[7, 0, 7, 5], [7, 9, 7, 14], [0, 7, 5, 7], [9, 7, 14, 7]]) {
        g.appendChild(svg(doc, "line", { x1, y1, x2, y2 }));
      }
      this.cross.appendChild(g);
    }
    this.hx = h(doc, "div", "hair h");
    this.hy = h(doc, "div", "hair v");
    this.layer.append(this.hx, this.hy, this.cross, this.dot);
    parent.appendChild(this.layer);
  }

  /** Inspector dress: the two hairlines and no dot; sonar's dot otherwise (Brendan, 2026-11-01). */
  setMode(m: "sonar" | "inspector"): void {
    this.layer.classList.toggle("inspector", m === "inspector");
  }

  move(x: number, y: number): void {
    this.x = x;
    this.y = y;
    if (!this.placed) {
      this.dx = x;
      this.dy = y;
      this.placed = true;
    }
  }

  show(on: boolean): void {
    this.layer.classList.toggle("cursor-off", !on);
  }

  frame(): void {
    if (!this.placed) return;
    this.cross.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    this.hx.style.transform = `translate3d(0, ${this.y}px, 0)`;
    this.hy.style.transform = `translate3d(${this.x}px, 0, 0)`;
    this.dx += (this.x - this.dx) * LERP;
    this.dy += (this.y - this.dy) * LERP;
    if (Math.abs(this.x - this.dx) < 0.1 && Math.abs(this.y - this.dy) < 0.1) {
      this.dx = this.x;
      this.dy = this.y;
    }
    this.dot.style.transform = `translate3d(${this.dx}px, ${this.dy}px, 0)`;
  }
}
