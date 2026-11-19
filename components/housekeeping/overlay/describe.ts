// Human-facing names for elements: the label over the outline (spec §2.5), the target a comment
// saves, and the short selectors used in the debug panel.

import { drawnChildren, hiddenFromReaders, stackOf, waysFrom, type Ways } from "./walk";

export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Visible text of an element, as a human would name it. */
export function visibleText(el: Element, max: number): string {
  const aria = el.getAttribute("aria-label");
  const tag = el.localName;
  let text = "";
  if (tag === "input" || tag === "textarea") {
    const input = el as HTMLInputElement;
    const isButton = ["button", "submit", "reset"].includes(input.type);
    text = aria || (isButton ? input.value : "") || input.placeholder || "";
  } else if (tag === "select") {
    const select = el as HTMLSelectElement;
    text = aria || select.selectedOptions[0]?.textContent || "";
  } else if (tag === "img") {
    text = aria || (el as HTMLImageElement).alt || "";
  } else {
    text = aria || (el instanceof HTMLElement ? el.innerText : el.textContent) || "";
  }
  return clip(text, max);
}

// How an element's kind reads to a person (PAX, 2026-10-30): "link", not "a".
const KIND: Record<string, string> = {
  a: "link", button: "button", img: "image", svg: "icon", input: "field", textarea: "field", select: "menu",
  h1: "heading", h2: "heading", h3: "heading", h4: "heading", h5: "heading", h6: "heading",
  p: "text", li: "item", ul: "list", ol: "list", table: "table", tr: "row", td: "cell", th: "cell",
  label: "label", nav: "navigation", header: "header", footer: "footer", form: "form", video: "video",
};

/**
 * The element's own name: its aria-label, else its heading when it holds just one (a card), else its
 * text. A container of several headings has no name of its own: it reads as its kind ("main"), not
 * as its first heading.
 */
function ownName(el: Element, max: number): string {
  const aria = el.getAttribute("aria-label");
  if (aria?.trim()) return clip(aria, max);
  if (!/^h[1-6]$/.test(el.localName)) {
    const headings = el.querySelectorAll("h1, h2, h3, h4, h5, h6");
    if (headings.length > 1) return "";
    const heading = headings[0];
    const text = heading instanceof HTMLElement ? heading.innerText : heading?.textContent;
    if (text?.trim()) return clip(text, max);
  }
  return visibleText(el, max);
}

/**
 * `a "Chat"`: the element's tag (and role, when it has one) and its own name. This is what a comment
 * saves as its target; the label on screen (labelOf) adds the walk's details to it.
 */
export function describe(el: Element): string {
  const role = el.getAttribute("role");
  const tag = role ? `${el.localName}[${role}]` : el.localName;
  const text = ownName(el, 32);
  return text ? `${tag} "${text}"` : tag;
}

/** The wording the comments of 2026-10-30's afternoon were saved under: `link "Chat"`. */
export function describeV2(el: Element): string {
  const kind = el.getAttribute("role") || KIND[el.localName] || "";
  const text = ownName(el, 32);
  if (!text) return kind || el.localName;
  return kind ? `${kind} "${text}"` : `"${text}"`;
}

/**
 * The label over the outline (Brendan, 2026-10-30): the tag, numbered when it is one of a stack of
 * wrappers sharing one outline (div-1 the outermost), its size, its layout (grid, flex), and its
 * name, or how many elements it holds when it has none. With it, whether screen readers skip it,
 * and which ways the keys can go from it (`chosen`: ⌘ has been used at its sibling level).
 */
export function labelOf(el: Element, chosen = false): { text: string; hidden: boolean; ways: Ways } {
  const role = el.getAttribute("role");
  const stack = stackOf(el);
  const head = `${el.localName}${stack.total > 1 ? `-${stack.index}` : ""}${role ? `[${role}]` : ""}`;
  const r = el.getBoundingClientRect();
  const parts = [head, `${Math.round(r.width)}×${Math.round(r.height)}`];
  const display = el.ownerDocument.defaultView?.getComputedStyle(el).display ?? "";
  if (/grid/.test(display)) parts.push("grid");
  else if (/flex/.test(display)) parts.push("flex");
  const name = ownName(el, 32);
  if (name) parts.push(`"${name}"`);
  else {
    const n = drawnChildren(el).length;
    if (n > 1) parts.push(`${n} items`);
  }
  return { text: parts.join(" · "), hidden: hiddenFromReaders(el), ways: waysFrom(el, chosen) };
}

/** sonar's own wording, which the first Housekeeping comments were saved under. */
export function legacyDescribe(el: Element): string {
  const kind = el.getAttribute("role") || el.localName;
  const text = visibleText(el, 24);
  return text ? `${kind} "${text}"` : kind;
}

/** The label's text, for the comment box's header. */
export function breadcrumb(el: Element): string {
  return labelOf(el).text;
}

/** `tag#id.class1.class2.class3` for display. */
export function shortSel(el: Element, maxClasses = 3): string {
  let s = el.localName;
  if (el.id) s += `#${el.id}`;
  const classes = Array.from(el.classList).slice(0, maxClasses);
  for (const c of classes) s += `.${c}`;
  return s;
}
