// DOM helpers. Everything here builds nodes with DOM APIs and styles with CSSOM,
// never innerHTML or style attributes, so the overlay survives strict page CSP and
// Trusted Types whether it runs in an extension's isolated world or a host page.

export const SVG_NS = "http://www.w3.org/2000/svg";

export function h<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export function svg(doc: Document, tag: string, attrs: Record<string, string | number> = {}): SVGElement {
  const el = doc.createElementNS(SVG_NS, tag) as SVGElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/** Attach a stylesheet to a document or shadow root; returns a function that removes it. */
export function adopt(target: Document | ShadowRoot, css: string): () => void {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];
    return () => {
      target.adoptedStyleSheets = target.adoptedStyleSheets.filter((s) => s !== sheet);
    };
  } catch {
    const doc = target instanceof Document ? target : target.ownerDocument;
    const style = doc.createElement("style");
    style.textContent = css;
    (target instanceof Document ? target.head ?? target.documentElement : target).appendChild(style);
    return () => style.remove();
  }
}

export function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.localName;
  return tag === "input" || tag === "textarea" || tag === "select" || (el as HTMLElement).isContentEditable;
}

export type Rect = { top: number; left: number; width: number; height: number };

export function snapRect(r: DOMRect): Rect {
  const left = Math.round(r.left);
  const top = Math.round(r.top);
  return { left, top, width: Math.round(r.right) - left, height: Math.round(r.bottom) - top };
}

export function sameRect(a: Rect | null, b: Rect | null): boolean {
  return !!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

/** How far (px) a point lies outside a rect; 0 when inside. */
export function outsideBy(r: DOMRect, x: number, y: number): number {
  const dx = Math.max(r.left - x, 0, x - r.right);
  const dy = Math.max(r.top - y, 0, y - r.bottom);
  return Math.max(dx, dy);
}
