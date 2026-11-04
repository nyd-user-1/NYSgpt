// Walking the page with the keys (Brendan, 2026-10-30): ↑ the parent and ↓ the child travel the tree,
// decoration and hidden layers included. Where an element has siblings, ⌘↑ and ⌘↓ cycle through them in
// a circle, and the label shows ⌘ there in place of ← and →; at such a level a plain ↓ waits until ⌘ has
// been used on it, so the walk never descends into a sibling nobody chose; ↑ always climbs out. Two
// things the walk reports rather than hides: wrappers that share one outline (numbered div-1, div-2…
// from the outermost, so a stack of identical boxes reads as a stack), and which ways are open (the
// label's marks). The one place it stops early is a word split into a span per character (PAX's
// letters, a counter's digits): the span holding the whole word is the bottom; a bold or styled part
// inside text is still a level of its own.

import { boxParent, isRoot } from "./targeting";

const SKIP = new Set(["script", "style", "template", "link", "meta", "noscript", "sonar-root", "head", "title", "base"]);

/** An element's children that are drawn, with `display: contents` wrappers opened up. */
export function drawnChildren(el: Element): Element[] {
  const out: Element[] = [];
  for (const c of Array.from(el.children)) {
    if (SKIP.has(c.localName)) continue;
    const view = c.ownerDocument.defaultView;
    if (view && view.getComputedStyle(c).display === "contents") {
      out.push(...drawnChildren(c));
      continue;
    }
    if (c.getClientRects().length > 0) out.push(c);
  }
  return out;
}

/** A word split into one span per character or two: the walk stops at the span that holds it. */
export function isSplitText(el: Element): boolean {
  const kids = drawnChildren(el);
  return (
    kids.length >= 2 &&
    kids.every((k) => {
      const n = (k.textContent ?? "").trim().length;
      return k.children.length === 0 && n >= 1 && n <= 2;
    })
  );
}

/** The element's siblings as the walk sees them: its parent's drawn children. */
export function siblingsOf(el: Element): Element[] {
  const p = boxParent(el);
  return p ? drawnChildren(p) : [el];
}

export function parentOf(el: Element): Element | null {
  const p = boxParent(el);
  return p && !isRoot(p) ? p : null;
}

/** The child ↓ goes to: the one on top under the point, else the one whose box holds it, else the first. */
export function childAt(el: Element, x: number, y: number, overlay: Element): Element | null {
  if (isSplitText(el)) return null;
  const kids = drawnChildren(el);
  if (!kids.length) return null;
  const doc = el.ownerDocument;
  const hits = doc.elementsFromPoint(x, y).filter((e) => e !== overlay && !overlay.contains(e));
  const under = kids.find((k) => hits.some((e) => k === e || k.contains(e)));
  if (under) return under;
  const holds = kids.find((k) => {
    const r = k.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  });
  return holds ?? kids[0];
}

/** The sibling ⌘↑ (-1) or ⌘↓ (+1) goes to, round the circle; null when the element has none. */
export function siblingCycle(el: Element, dir: 1 | -1): Element | null {
  const sibs = siblingsOf(el);
  const i = sibs.indexOf(el);
  if (i < 0 || sibs.length < 2) return null;
  return sibs[(i + dir + sibs.length) % sibs.length];
}

export const hasSiblings = (el: Element) => siblingsOf(el).length > 1;

export interface Ways {
  up: boolean;
  /** A plain ↓: a child to go to, and, at a sibling level, ⌘ already used there. */
  down: boolean;
  /** Siblings to cycle with ⌘↑ / ⌘↓. */
  cmd: boolean;
}

/** `chosen`: whether ⌘ has been used at this element's sibling level. */
export function waysFrom(el: Element, chosen = false): Ways {
  const cmd = hasSiblings(el);
  return {
    up: !!parentOf(el),
    down: !isSplitText(el) && drawnChildren(el).length > 0 && (!cmd || chosen),
    cmd,
  };
}

const sameBox = (a: DOMRect, b: DOMRect) =>
  Math.abs(a.left - b.left) <= 1 && Math.abs(a.top - b.top) <= 1 && Math.abs(a.width - b.width) <= 1 && Math.abs(a.height - b.height) <= 1;

/** Where the element sits in a stack of wrappers drawn with one outline: 1 is the outermost. */
export function stackOf(el: Element): { index: number; total: number } {
  const r = el.getBoundingClientRect();
  let above = 0;
  for (let p = parentOf(el); p && sameBox(p.getBoundingClientRect(), r); p = parentOf(p)) above++;
  let below = 0;
  for (let d: Element | undefined = el; d; ) {
    d = drawnChildren(d).find((k) => sameBox(k.getBoundingClientRect(), r));
    if (d) below++;
  }
  return { index: above + 1, total: above + 1 + below };
}

/** Hidden from screen readers: aria-hidden on it or an ancestor, or a presentation role. */
export function hiddenFromReaders(el: Element): boolean {
  if (el.closest('[aria-hidden="true"]')) return true;
  const role = el.getAttribute("role");
  return role === "presentation" || role === "none";
}
