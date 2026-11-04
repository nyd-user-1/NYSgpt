// Target selection (spec §2.1): the box never follows the raw element under the
// pointer. The raw hit is promoted to the nearest meaningful ancestor so a button,
// a search field's container, or a heading lights up as one unit.

import { SVG_NS } from "./dom";

export interface Step {
  el: Element;
  /** What happened at this node: "↑ inline", "✓ interactive", … */
  verdict: string;
}

export interface Pick {
  raw: Element | null;
  target: Element | null;
  chain: Step[];
}

const INLINE_TEXT = new Set([
  "span", "b", "i", "em", "strong", "code", "kbd", "small", "a",
  "abbr", "mark", "sub", "sup", "u", "s", "del", "ins", "time", "q", "cite", "var", "samp", "font",
]);

const MEANINGFUL_TAGS = new Set([
  "header", "nav", "main", "section", "article", "aside", "footer", "form", "table",
  "li", "h1", "h2", "h3", "h4", "h5", "h6", "p", "label", "fieldset", "details",
]);

const INTERACTIVE_TAGS = new Set(["button", "input", "select", "textarea", "summary"]);
const INTERACTIVE_ROLES = new Set(["button", "link", "tab", "menuitem", "checkbox", "switch"]);
const BLOCKISH = new Set(["block", "flex", "grid", "inline-flex", "inline-grid", "table", "flow-root", "list-item"]);

/** Frames are treated as one element: sonar never looks inside them. */
export const FRAME_TAGS = new Set(["iframe", "frame", "embed", "object"]);

const PASS_THROUGH_PX = 2;
const INTERACTIVE_REACH = 3;
const ICON_PX = 32;
const PAGE_FRACTION = 0.85;

export function isRoot(el: Element): boolean {
  const doc = el.ownerDocument;
  return el === doc.documentElement || el === doc.body;
}

export function hitTest(doc: Document, x: number, y: number, overlay: Element): Element | null {
  // elementsFromPoint already skips pointer-events:none nodes.
  for (const el of doc.elementsFromPoint(x, y)) {
    if (el === overlay) continue;
    // Sonar's own on/off control is never a target.
    if (el.closest("[data-sonar-exempt]") || el.closest("[data-devinspector]")) return null;
    return el;
  }
  return null;
}

export function isInteractive(el: Element): boolean {
  const tag = el.localName;
  if (INTERACTIVE_TAGS.has(tag)) return !(tag === "input" && (el as HTMLInputElement).type === "hidden");
  if (tag === "a" && el.hasAttribute("href")) return true;
  const role = el.getAttribute("role");
  if (role && INTERACTIVE_ROLES.has(role)) return true;
  const editable = el.getAttribute("contenteditable");
  if (editable !== null && editable !== "false") return true;
  const tabindex = el.getAttribute("tabindex");
  return tabindex !== null && tabindex.trim() !== "-1";
}

function hasSize(r: DOMRect): boolean {
  return r.width > 0 && r.height > 0;
}

/** Nearest ancestor that generates a box (skips display: contents). */
export function boxParent(el: Element): Element | null {
  let p = el.parentElement;
  while (p && getComputedStyle(p).display === "contents") p = p.parentElement;
  return p;
}

function isPassThrough(el: Element, r: DOMRect): Element | null {
  const p = boxParent(el);
  if (!p) return null;
  const pr = p.getBoundingClientRect();
  const near = (a: number, b: number) => Math.abs(a - b) <= PASS_THROUGH_PX;
  return near(r.top, pr.top) && near(r.left, pr.left) && near(r.right, pr.right) && near(r.bottom, pr.bottom)
    ? p
    : null;
}

/** A flex or grid item: the browser computes its display as block whatever the author wrote. */
function isBlockifiedItem(el: Element, display: string): boolean {
  if (display !== "block") return false;
  const p = boxParent(el);
  return !!p && /flex|grid/.test(getComputedStyle(p).display);
}

// An inline text tag still counts as inline when it's only "block" because it is a
// flex/grid item; in Tailwind-style layouts that's nearly every <span> and <kbd>.
// An explicit display: flex/grid/inline-flex span is a layout box, not a wrapper.
function isInlineTextWrapper(el: Element, display: string): boolean {
  if (!INLINE_TEXT.has(el.localName)) return false;
  if (display !== "inline" && !isBlockifiedItem(el, display)) return false;
  for (const child of el.children) {
    const d = getComputedStyle(child).display;
    if (d !== "none" && d !== "contents" && !d.startsWith("inline") && !isBlockifiedItem(child, d)) return false;
  }
  return true;
}

/** Icon-sized svg: a glyph, so it defers to its container like inline text does. */
function isIcon(el: Element, r: DOMRect): boolean {
  return el.localName === "svg" && r.width <= ICON_PX && r.height <= ICON_PX;
}

/** Modal backdrops and click-to-close layers: interactive, but not a control. */
function isPageSized(r: DOMRect, doc: Document): boolean {
  const view = doc.documentElement;
  return r.width >= view.clientWidth * PAGE_FRACTION && r.height >= view.clientHeight * PAGE_FRACTION;
}

function isSvgDescendant(el: Element): boolean {
  return el.namespaceURI === SVG_NS && (el.localName !== "svg" || !!el.parentElement?.closest("svg"));
}

function outermostSvg(el: Element): Element {
  let top = el.closest("svg") ?? el;
  for (let up = top.parentElement?.closest("svg"); up; up = up.parentElement?.closest("svg")) top = up;
  return top;
}

/** Promote a raw hit to its meaningful target. `precise` (Alt held) skips promotion. */
export function pick(raw: Element | null, precise: boolean): Pick {
  const chain: Step[] = [];
  if (!raw) return { raw, target: null, chain };

  if (precise) {
    chain.push({ el: raw, verdict: isRoot(raw) ? "· page" : "✓ precise" });
    return { raw, target: isRoot(raw) ? null : raw, chain };
  }

  // A <span> or <svg> inside a <button> always selects the button.
  let up: Element | null = raw;
  for (let level = 0; up && level <= INTERACTIVE_REACH && !isRoot(up); level++, up = up.parentElement) {
    const ur = up.getBoundingClientRect();
    if (isInteractive(up) && hasSize(ur) && (up === raw || !isPageSized(ur, up.ownerDocument))) {
      if (up !== raw) chain.push({ el: raw, verdict: `↑ interactive ${level} up` });
      chain.push({ el: up, verdict: "✓ interactive" });
      return { raw, target: up, chain };
    }
  }

  let n: Element | null = raw;
  while (n && !isRoot(n)) {
    const r = n.getBoundingClientRect();
    if (!hasSize(r)) {
      chain.push({ el: n, verdict: "↑ zero size" });
      n = n.parentElement;
      continue;
    }
    if (isSvgDescendant(n)) {
      chain.push({ el: n, verdict: "↑ svg" });
      n = outermostSvg(n);
      continue;
    }
    if (isInteractive(n)) {
      chain.push({ el: n, verdict: "✓ interactive" });
      return { raw, target: n, chain };
    }
    if (MEANINGFUL_TAGS.has(n.localName)) {
      chain.push({ el: n, verdict: "✓ landmark" });
      return { raw, target: n, chain };
    }
    const wrapper = isPassThrough(n, r);
    if (wrapper) {
      chain.push({ el: n, verdict: "↑ pass-through" });
      n = wrapper;
      continue;
    }
    const display = getComputedStyle(n).display;
    if (isInlineTextWrapper(n, display)) {
      chain.push({ el: n, verdict: "↑ inline" });
      n = n.parentElement;
      continue;
    }
    if (isIcon(n, r)) {
      chain.push({ el: n, verdict: "↑ icon" });
      n = n.parentElement;
      continue;
    }
    chain.push({ el: n, verdict: FRAME_TAGS.has(n.localName) ? "✓ frame" : BLOCKISH.has(display) ? "✓ block" : "✓ element" });
    return { raw, target: n, chain };
  }

  if (n) chain.push({ el: n, verdict: "· page" });
  return { raw, target: null, chain };
}
