import type { CSSProperties } from "react";

/**
 * Editorial tablet corner radius. Matches the FormulaTablet treatment so every
 * bordered surface reads as the same design family.
 */
export const TABLET_RADIUS = 3;

/**
 * Wrap any subtree with this style to re-map the app's neutral surface palette
 * onto the editorial paper palette. Lets existing chrome (panels, tooltips,
 * borrowed button classes) sit visually on the paper background without rewrites.
 */
export const PAPER_BRIDGE: CSSProperties = {
  ["--surface" as string]: "var(--paper)",
  ["--bg" as string]: "var(--paper)",
  ["--border" as string]: "var(--paper-rule)",
  ["--border2" as string]: "var(--paper-rule-soft)",
  ["--inp-bg" as string]: "var(--paper-quiet)",
  ["--txt" as string]: "var(--paper-text)",
  ["--txt2" as string]: "var(--paper-text)",
  ["--muted" as string]: "var(--paper-muted)",
  ["--muted2" as string]: "var(--paper-faint)",
  ["--row-hover" as string]: "var(--paper-quiet)",
};
