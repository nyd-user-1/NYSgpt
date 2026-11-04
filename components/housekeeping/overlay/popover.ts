// The comment popover (spec §2.4): anchored to the right of the pin, flipped left
// when there's no room, below when neither side fits.

import { h } from "./dom";
import { waysMarks } from "./box";
import type { Ways } from "./walk";
import type { Session } from "./index";

export interface PopoverActions {
  /** Enter or the primary button; Shift+Enter is a new line. */
  submit(): void;
  /** "Copy as prompt". */
  copy(): void;
  /** Delete a committed pin (view mode). */
  remove(): void;
  /** The menu's mode rows: one tool, two dresses (Brendan, 2026-11-01). */
  mode(m: "sonar" | "inspector"): void;
}

export type PopoverMode = "compose" | "view";

const WIDTH = 320;
const GAP = 8;
const PIN = 28;
const EDGE = 8;

export class Popover {
  readonly el: HTMLDivElement;
  readonly textarea: HTMLTextAreaElement;
  private readonly crumb: HTMLDivElement;
  private readonly chip: HTMLSpanElement;
  private readonly note: HTMLDivElement;
  private readonly compose: HTMLDivElement;
  private readonly sendBox: HTMLInputElement;
  private readonly session: HTMLSelectElement;
  private readonly copyBtn: HTMLButtonElement;
  private readonly primary: HTMLButtonElement;
  private readonly primaryLabel: HTMLSpanElement;
  private readonly shots: HTMLSpanElement;
  private pasted: { mime: string; data: string }[] = [];
  private readonly removeBtn: HTMLButtonElement;
  private readonly meta: HTMLDivElement;
  private readonly menu: HTMLDivElement;
  private sonarOn!: HTMLSpanElement;
  private inspectorOn!: HTMLSpanElement;
  private readonly win: Window;
  private size = { w: WIDTH, h: 0 };
  /** Dragged or resized: the box stays where the reader put it (Brendan, 2026-11-01). */
  private moved = false;
  mode: PopoverMode = "compose";
  isOpen = false;

  constructor(doc: Document, parent: ShadowRoot, actions: PopoverActions) {
    this.win = doc.defaultView ?? window;
    this.el = h(doc, "div", "popover");
    this.el.hidden = true;

    this.crumb = h(doc, "div", "pc-crumb");
    // The walk's marks for the element the box is on, where "@Housekeeping" stood (Brendan, 2026-10-30):
    // the arrows still walk while the box is empty, so the box says which ways are open.
    this.chip = h(doc, "span", "pc-ways");
    this.note = h(doc, "div", "pc-note");
    this.textarea = h(doc, "textarea", "pc-text");
    this.textarea.placeholder = "Leave a comment…";
    this.textarea.rows = 2;

    // Options row: send toggle, session (PAX: dictation is gone, Brendan 2026-10-30)
    const sendLabel = h(doc, "label", "pc-check");
    this.sendBox = h(doc, "input");
    this.sendBox.type = "checkbox";
    this.sendBox.checked = true;
    sendLabel.append(this.sendBox, h(doc, "span", "", "Send to Housekeeping"));
    // PAX: one destination, so neither the toggle nor the session menu shows.
    sendLabel.hidden = true;
    this.shots = h(doc, "span", "pc-note");


    this.session = h(doc, "select", "pc-session");
    const options = h(doc, "div", "pc-row");
    options.append(sendLabel, this.session, this.shots);

    // Actions row
    this.copyBtn = h(doc, "button", "pc-link", "Copy as prompt");
    this.copyBtn.type = "button";
    this.removeBtn = h(doc, "button", "pc-link", "Delete");
    this.removeBtn.type = "button";
    this.primary = h(doc, "button", "pc-primary");
    this.primary.type = "button";
    this.primaryLabel = h(doc, "span", "", "Send");
    this.primary.append(this.primaryLabel, h(doc, "kbd", "", "↵"));
    const actionsRow = h(doc, "div", "pc-row pc-actions");
    actionsRow.append(this.copyBtn, this.removeBtn, h(doc, "span", "pc-grow"), this.primary);

    this.compose = h(doc, "div", "pc-compose");
    this.compose.append(this.textarea, options);

    // The note card's wrapper (Brendan, 2026-11-01): the tinted frame, a header with the grip, the
    // title and the three-dot menu, then the dark comment box as the card's body, and the resize
    // corner — dragged and resized the drawn note's way.
    const head = h(doc, "div", "pc-head");
    const grip = h(doc, "span", "pc-grip");
    grip.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>';
    grip.title = "Move";
    const title = h(doc, "span", "pc-title", "Comment");
    const grow = h(doc, "span", "pc-grow2");
    const kebab = h(doc, "button", "pc-kebab");
    kebab.type = "button";
    kebab.setAttribute("aria-label", "Comment box options");
    kebab.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
    // The walk's marks ride the header, after the title (Brendan, 2026-11-01).
    head.append(grip, title, this.chip, grow, kebab);

    this.menu = h(doc, "div", "pc-menu");
    this.menu.hidden = true;
    // Each mode row wears its cursor: sonar the dot crosshair, inspector the hairline plus.
    const SONAR_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/><line x1="12" y1="2" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="22"/><line x1="2" y1="12" x2="7" y2="12"/><line x1="17" y1="12" x2="22" y2="12"/></svg>';
    const INSPECTOR_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="3" x2="12" y2="21" stroke-dasharray="2 2.5"/><line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="2 2.5"/><line x1="12" y1="8.5" x2="12" y2="15.5" stroke-width="2.5"/><line x1="8.5" y1="12" x2="15.5" y2="12" stroke-width="2.5"/></svg>';
    const row = (icon: string, text: string) => {
      const b = h(doc, "button", "pc-mi");
      b.type = "button";
      b.innerHTML = icon;
      b.append(h(doc, "span", "", text));
      return b;
    };
    const sonarRow = row(SONAR_ICON, "Sonar mode");
    this.sonarOn = h(doc, "span", "pc-mi-on", "\u2713");
    sonarRow.append(this.sonarOn);
    const inspectorRow = row(INSPECTOR_ICON, "Inspector mode");
    this.inspectorOn = h(doc, "span", "pc-mi-on", "\u2713");
    this.inspectorOn.hidden = true;
    inspectorRow.append(this.inspectorOn);
    this.menu.append(sonarRow, inspectorRow);

    this.meta = h(doc, "div", "pc-meta");
    const inner = h(doc, "div", "pc-inner");
    inner.append(this.crumb, this.meta, this.note, this.compose, actionsRow);
    const corner = h(doc, "span", "pc-size");
    corner.setAttribute("aria-label", "Resize");
    this.el.append(head, inner, this.menu, corner);
    parent.appendChild(this.el);

    kebab.addEventListener("click", (e) => {
      e.stopPropagation();
      this.menu.hidden = !this.menu.hidden;
    });
    sonarRow.addEventListener("click", () => {
      this.menu.hidden = true;
      actions.mode("sonar");
    });
    inspectorRow.addEventListener("click", () => {
      this.menu.hidden = true;
      actions.mode("inspector");
    });
    this.el.addEventListener("pointerdown", (e) => {
      if (!this.menu.hidden && !this.menu.contains(e.target as Node) && e.target !== kebab && !kebab.contains(e.target as Node)) this.menu.hidden = true;
    });

    // The grip moves the card, held inside the window — the drawn note's drag.
    let drag: { dx: number; dy: number } | null = null;
    grip.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      grip.setPointerCapture(e.pointerId);
      const r = this.el.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    });
    grip.addEventListener("pointermove", (e) => {
      if (!drag) return;
      this.moved = true;
      const vw = this.win.innerWidth;
      const vh = this.win.innerHeight;
      const r = this.el.getBoundingClientRect();
      this.el.style.left = `${Math.max(8, Math.min(e.clientX - drag.dx, vw - r.width - 8))}px`;
      this.el.style.top = `${Math.max(8, Math.min(e.clientY - drag.dy, vh - r.height - 8))}px`;
    });
    grip.addEventListener("pointerup", () => (drag = null));

    // The bottom-right corner resizes it — the drawn note's corner, same floors.
    let from: { x: number; y: number; w: number; h: number } | null = null;
    corner.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      corner.setPointerCapture(e.pointerId);
      const r = this.el.getBoundingClientRect();
      from = { x: e.clientX, y: e.clientY, w: r.width, h: r.height };
    });
    corner.addEventListener("pointermove", (e) => {
      if (!from) return;
      this.moved = true;
      const r = this.el.getBoundingClientRect();
      const w = Math.max(320, Math.min(from.w + e.clientX - from.x, this.win.innerWidth - 8 - r.left));
      const ht = Math.max(200, Math.min(from.h + e.clientY - from.y, this.win.innerHeight - 8 - r.top));
      this.el.style.width = `${Math.round(w)}px`;
      this.el.style.height = `${Math.round(ht)}px`;
      this.measure();
    });
    corner.addEventListener("pointerup", () => (from = null));

    this.textarea.addEventListener("input", () => this.autosize());
    // Screenshots pasted into the box ride along with the comment.
    this.textarea.addEventListener("paste", (e) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      e.preventDefault();
      for (const f of files.slice(0, 4 - this.pasted.length)) {
        const reader = new FileReader();
        reader.onload = () => {
          this.pasted.push({ mime: f.type, data: String(reader.result) });
          this.shots.textContent = `${this.pasted.length} screenshot${this.pasted.length === 1 ? "" : "s"} attached`;
          this.measure();
        };
        reader.readAsDataURL(f);
      }
    });
    this.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        actions.submit();
      }
    });
    this.sendBox.addEventListener("change", () => this.refresh());
    this.session.addEventListener("change", () => this.refresh());
    this.primary.addEventListener("click", () => actions.submit());
    this.copyBtn.addEventListener("click", () => actions.copy());
    this.removeBtn.addEventListener("click", () => actions.remove());
  }

  get value(): string {
    return this.textarea.value;
  }

  /** The screenshots pasted since the box opened. */
  get images(): { mime: string; data: string }[] {
    return [...this.pasted];
  }

  get sendToClaude(): boolean {
    return this.sendBox.checked;
  }

  get sessionId(): string | null {
    return this.session.disabled ? null : this.session.value || null;
  }

  open(o: { mode: PopoverMode; crumb: string; sessions?: Session[]; text?: string }): void {
    this.mode = o.mode;
    this.isOpen = true;
    this.el.hidden = false;
    this.el.classList.toggle("viewing", o.mode === "view");
    this.crumb.textContent = o.crumb;
    this.note.textContent = o.mode === "view" ? o.text ?? "" : "";
    this.textarea.value = o.mode === "compose" ? o.text ?? "" : "";
    this.pasted = [];
    this.moved = false;
    this.el.style.width = "";
    this.el.style.height = "";
    this.menu.hidden = true;
    this.meta.textContent = "";
    this.shots.textContent = "";
    this.shots.style.color = "";
    this.setSessions(o.sessions ?? []);
    this.refresh();
    this.autosize();
    this.el.animate([{ opacity: 0, translate: "0 4px" }, { opacity: 1, translate: "0 0" }], { duration: 120, easing: "cubic-bezier(.2,.8,.2,1)" });
    if (o.mode === "compose") this.textarea.focus({ preventScroll: true });
  }

  close(): void {
    this.isOpen = false;
    this.el.hidden = true;
  }

  /** The walk's marks for the element the box is on. */
  setWays(ways: Ways): void {
    this.chip.replaceChildren(waysMarks(this.el.ownerDocument, ways));
    this.chip.hidden = false;
    this.measure();
  }

  setCrumb(text: string): void {
    this.crumb.textContent = text;
  }

  /** The menu's check follows the dress in force. */
  setModeChecked(m: "sonar" | "inspector"): void {
    this.sonarOn.hidden = m !== "sonar";
    this.inspectorOn.hidden = m !== "inspector";
  }

  /** The DOM's live line (tag · size · layout · "name"), context under the crumb (Brendan, 2026-11-01). */
  setMeta(text: string): void {
    if (this.meta.textContent !== text) this.meta.textContent = text;
  }

  /** Brief nudge when a click can't unlock because there's a draft. */
  nudge(): void {
    this.el.animate([{ translate: "0 0" }, { translate: "-4px 0" }, { translate: "4px 0" }, { translate: "0 0" }], { duration: 180 });
    this.textarea.focus({ preventScroll: true });
  }

  /** Says a send failed, under the box. */
  fail(text: string): void {
    this.shots.textContent = text;
    this.shots.style.color = "#f87171";
    this.measure();
  }

  flashCopied(): void {
    const label = this.copyBtn.textContent;
    this.copyBtn.textContent = "Copied";
    setTimeout(() => (this.copyBtn.textContent = label), 1200);
  }

  /** Position next to the pin whose tip is at `p`. */
  place(p: { x: number; y: number }): void {
    if (!this.isOpen || this.moved) return;
    const doc = this.el.ownerDocument;
    const vw = doc.documentElement.clientWidth;
    const vh = this.win.innerHeight;
    const { w, h: ht } = this.size;
    let left = p.x + PIN + GAP;
    let top = p.y - PIN;
    if (left + w > vw - EDGE) left = p.x - GAP - w;
    if (left < EDGE) {
      left = Math.min(Math.max(p.x - w / 2, EDGE), vw - w - EDGE);
      top = p.y + GAP;
    }
    top = Math.min(Math.max(top, EDGE), Math.max(EDGE, vh - ht - EDGE));
    this.el.style.left = `${Math.round(left)}px`;
    this.el.style.top = `${Math.round(top)}px`;
  }

  rect(): DOMRect {
    return this.el.getBoundingClientRect();
  }

  /** Visible buttons, for drivers that can't reach into the closed shadow root. */
  controls(): Record<string, DOMRect> {
    const out: Record<string, DOMRect> = {};
    const all = { copy: this.copyBtn, primary: this.primary, remove: this.removeBtn, send: this.sendBox };
    for (const [name, el] of Object.entries(all)) if (!el.hidden && el.getClientRects().length) out[name] = el.getBoundingClientRect();
    return out;
  }

  get primaryText(): string {
    return this.primaryLabel.textContent ?? "";
  }

  // --- internals ---

  setSessions(sessions: Session[]): void {
    const doc = this.el.ownerDocument;
    const sorted = [...sessions].sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
    this.session.replaceChildren(
      ...(sorted.length
        ? sorted.map((s) => {
            const o = h(doc, "option", "", `${s.id.slice(0, 8)}${s.cwd ? ` · ${s.cwd.split("/").filter(Boolean).pop()}` : ""}`);
            o.value = s.id;
            return o;
          })
        : [h(doc, "option", "", "No session")]),
    );
    this.session.disabled = sorted.length === 0;
    this.refresh();
  }

  // The primary action follows what's possible: send to a live session, copy the
  // prompt when there's none, or keep the pin as a note when Send is off. The
  // separate "Copy as prompt" link shows only when the primary isn't already that.
  private refresh(): void {
    const send = this.sendBox.checked;
    const canSend = send && !!this.sessionId;
    this.chip.hidden = !send || !this.chip.childElementCount;
    this.session.hidden = true;
    this.primaryLabel.textContent = !send ? "Save" : canSend ? "Send" : "Copy as prompt";
    this.copyBtn.hidden = this.mode === "compose" && send && !canSend;
    this.removeBtn.hidden = this.mode !== "view";
    this.primary.hidden = this.mode === "view";
    this.measure();
  }

  private autosize(): void {
    const t = this.textarea;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
    this.measure();
  }

  private measure(): void {
    if (this.el.hidden) return;
    this.size = { w: this.el.offsetWidth || WIDTH, h: this.el.offsetHeight };
  }

}
