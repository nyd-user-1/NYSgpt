// The locator bundle (spec §2.5): plain text Claude reads in the transcript.
// Production pages carry no source stamps, so it leads with what Claude can grep
// for: visible text, classes, and the element's neighbors.

import { clip, describe, visibleText } from "./describe";
import { reactSource } from "./react";

/** A class or id usable in a selector without escaping (skips `hover:x`, `w-[3px]`, `:r1:`). */
const PLAIN = /^[A-Za-z_][\w-]*$/;

export function selPart(el: Element, maxClasses = 3): string {
  let s = el.localName;
  if (el.id && PLAIN.test(el.id)) s += `#${el.id}`;
  const classes = Array.from(el.classList).filter((c) => PLAIN.test(c)).slice(0, maxClasses);
  return s + classes.map((c) => `.${c}`).join("");
}

/**
 * A CSS path that finds this element and no other (PAX, 2026-10-30). Each step is the tag, and its
 * place among same-tag siblings when it has any; it climbs until the path matches one element, or
 * stops at an id that is the page's only one. cssPath's class paths matched every card in a row, so
 * a comment's location chip opened the first card, whichever card the comment was on.
 */
export function uniquePath(el: Element): string {
  const doc = el.ownerDocument;
  const parts: string[] = [];
  let n: Element | null = el;
  while (n && n !== doc.documentElement) {
    if (n.id && PLAIN.test(n.id) && doc.querySelectorAll(`#${n.id}`).length === 1) {
      parts.unshift(`#${n.id}`);
      break;
    }
    const tag = n.localName;
    const parent: Element | null = n.parentElement;
    const same = parent ? Array.from(parent.children).filter((c) => c.localName === tag) : [];
    parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(n) + 1})` : tag);
    try {
      if (doc.querySelectorAll(parts.join(" > ")).length === 1) break;
    } catch {
      /* a tag name a selector can't hold: keep climbing */
    }
    n = parent;
  }
  return parts.join(" > ");
}

/** Short CSS path: up to 6 ancestors, ids and up to 3 classes per node. */
export function cssPath(el: Element, maxAncestors = 6): string {
  const doc = el.ownerDocument;
  const parts = [selPart(el)];
  let n = el.parentElement;
  for (let i = 0; n && i < maxAncestors && n !== doc.body && n !== doc.documentElement; i++, n = n.parentElement) {
    parts.unshift(selPart(n));
  }
  return parts.join(" > ");
}

const SKIP = new Set(["script", "style", "template", "link", "meta", "noscript", "sonar-root"]);

function rendered(el: Element): boolean {
  return !SKIP.has(el.localName) && el.getClientRects().length > 0;
}

function sibling(el: Element, dir: "previousElementSibling" | "nextElementSibling"): Element | null {
  let s = el[dir];
  while (s && !rendered(s)) s = s[dir];
  return s;
}

/** How a neighbor reads to someone grepping the source: `h2 "Index"`, `input[placeholder="…"]`. */
function brief(el: Element): string {
  const tag = el.localName;
  if (tag === "input" || tag === "textarea" || tag === "select") {
    for (const attr of ["placeholder", "aria-label", "name", "type"]) {
      const v = el.getAttribute(attr);
      if (v) return `${tag}[${attr}="${clip(v, 40)}"]`;
    }
    return selPart(el, 2);
  }
  const text = visibleText(el, 24);
  return text ? `${el.id && PLAIN.test(el.id) ? `${tag}#${el.id}` : tag} "${text}"` : selPart(el, 2);
}

export function nearby(el: Element): string {
  const parts: string[] = [];
  const parent = el.parentElement;
  if (parent && parent !== el.ownerDocument.body) parts.push(`parent ${selPart(parent)}`);
  const prev = sibling(el, "previousElementSibling");
  if (prev) parts.push(`prev sibling ${brief(prev)}`);
  const next = sibling(el, "nextElementSibling");
  if (next) parts.push(`next sibling ${brief(next)}`);
  return parts.join("; ");
}

/**
 * data-src / data-source on the element or an ancestor, else React's dev-mode
 * _debugSource. React's fiber lives in the page's JS world: readable directly when
 * the overlay runs there (a host page), otherwise through the main-world probe
 * (src/probe.ts), which answers a synchronous DOM event with a temporary attribute.
 */
export function sourceHint(el: Element): string | null {
  const stamped = el.closest("[data-src], [data-source]");
  if (stamped) {
    const attr = stamped.hasAttribute("data-src") ? "data-src" : "data-source";
    return `${attr}="${stamped.getAttribute(attr)}"`;
  }
  const direct = reactSource(el);
  if (direct) return `${direct}  (React _debugSource)`;
  el.dispatchEvent(new CustomEvent("sonar:probe"));
  const probed = el.getAttribute("data-sonar-source");
  if (probed !== null) el.removeAttribute("data-sonar-source");
  return probed ? `${probed}  (React _debugSource)` : null;
}

export interface BundleInput {
  target: Element;
  comment: string;
  /** Absolute path of an attached crop (milestone 5). */
  screenshot?: string;
}

export function locatorBundle({ target, comment, screenshot }: BundleInput): string {
  const doc = target.ownerDocument;
  const win = doc.defaultView ?? window;
  const loc = win.location;
  const route = loc.pathname + (loc.hash.startsWith("#/") ? loc.hash : "");
  const r = target.getBoundingClientRect();
  const lines = [
    "[sonar comment]",
    `page: ${loc.href}  (route: ${route})`,
    `target: ${describe(target)}`,
    `path: ${uniquePath(target)}`,
  ];
  const classes = target.getAttribute("class")?.replace(/\s+/g, " ").trim();
  if (classes) lines.push(`classes: ${classes}`);
  const text = visibleText(target, 120);
  if (text) lines.push(`text: "${text}"`);
  lines.push(
    `rect: ${Math.round(r.width)}×${Math.round(r.height)} at (${Math.round(r.left)}, ${Math.round(r.top)}) in a ${doc.documentElement.clientWidth}×${win.innerHeight} viewport`,
  );
  const near = nearby(target);
  if (near) lines.push(`nearby: ${near}`);
  const source = sourceHint(target);
  if (source) lines.push(`source hint: ${source}`);
  if (screenshot) lines.push(`screenshot: @${screenshot}`);
  const note = comment.trim();
  if (note) lines.push("", `comment: ${note}`);
  return lines.join("\n");
}
