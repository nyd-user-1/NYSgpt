// The debug panel (breadcrumb + promotion chain) and the status pill. Both are
// pointer-events: none and move out of the pointer's way instead of blocking it.

import { h } from "./dom";
import { shortSel } from "./describe";
import type { Step } from "./targeting";

export interface DebugView {
  crumb: string;
  chain: Step[];
  rect: DOMRect | null;
  pending: { el: Element | null; age: number } | null;
}

abstract class Floating {
  readonly el: HTMLDivElement;
  private box: DOMRect | null = null;

  constructor(doc: Document, parent: ShadowRoot, cls: string) {
    this.el = h(doc, "div", `panel ${cls}`);
    parent.appendChild(this.el);
  }

  /** Flip to the other edge while the pointer is over the panel. */
  dodge(x: number, y: number): void {
    if (this.el.hidden) return;
    this.box ??= this.el.getBoundingClientRect();
    const b = this.box;
    const over = x >= b.left - 8 && x <= b.right + 8 && y >= b.top - 8 && y <= b.bottom + 8;
    if (over) {
      this.el.classList.toggle("dodge");
      this.box = null;
    }
  }

  protected changed(): void {
    this.box = null;
  }
}

export class DebugPanel extends Floating {
  private key = "";
  private readonly doc: Document;

  constructor(doc: Document, parent: ShadowRoot, visible: boolean) {
    super(doc, parent, "debug");
    this.doc = doc;
    this.el.hidden = !visible;
  }

  toggle(): void {
    this.el.hidden = !this.el.hidden;
    this.key = "";
    this.changed();
  }

  render(v: DebugView): void {
    if (this.el.hidden) return;
    const r = v.rect;
    const rect = r ? `${Math.round(r.width)}×${Math.round(r.height)} at (${Math.round(r.left)}, ${Math.round(r.top)})` : "no target";
    const pending = v.pending ? `→ ${v.pending.el ? shortSel(v.pending.el) : "none"} ${Math.round(v.pending.age)}ms` : "";
    const key = [v.crumb, rect, pending, ...v.chain.map((s) => s.verdict + shortSel(s.el))].join("|");
    if (key === this.key) return;
    this.key = key;

    const d = this.doc;
    const rows = v.chain.map((s, i) => {
      const row = h(d, "div", "row");
      const hit = i === v.chain.length - 1 && s.verdict.startsWith("✓");
      row.append(h(d, "span", "sel", shortSel(s.el)), h(d, "span", hit ? "verdict hit" : "verdict", s.verdict));
      return row;
    });
    this.el.replaceChildren(
      h(d, "div", "crumb", v.crumb || "—"),
      h(d, "div", "keys", "⌥ precise · ↑↓ walk · esc exit · d hide"),
      ...rows,
      h(d, "div", "meta", pending ? `${rect} · ${pending}` : rect),
    );
    this.changed();
  }
}

export class StatusPill extends Floating {
  private readonly led: HTMLSpanElement;
  private readonly session: HTMLSpanElement;

  constructor(doc: Document, parent: ShadowRoot) {
    super(doc, parent, "pill");
    this.session = h(doc, "span", "", "—");
    this.led = h(doc, "span", "led");
    // PAX: the pill names the mode and the way out; the session and its light stay hidden.
    this.session.hidden = true;
    this.led.hidden = true;
    this.el.append(h(doc, "span", "", "Commenting · ↑↓←→ to walk · Esc to exit"), this.session, this.led);
  }

  set(sessionShortId: string | null, reachable: boolean): void {
    this.session.textContent = sessionShortId ?? "—";
    this.led.classList.toggle("ok", reachable);
    this.changed();
  }
}
