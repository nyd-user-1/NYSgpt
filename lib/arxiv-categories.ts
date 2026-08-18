import CATEGORIES from './arxiv-categories.json'

/**
 * arXiv category code → its published name. `cs.AI` → "Artificial Intelligence".
 *
 * ── WHY THE CODE IS KEPT ALONGSIDE THE NAME
 * Names are NOT unique. `cs.LG` and `stat.ML` are both officially "Machine
 * Learning"; `cs.IT` and `math.IT` are both "Information Theory"; `cs.SY` and
 * `eess.SY` are both "Systems and Control"; `cs.NA` and `math.NA` are both
 * "Numerical Analysis". These are genuine cross-listings in arXiv's taxonomy,
 * and two of them (cs.LG / stat.ML) routinely appear in the same nightly top
 * six. Render the name alone and a reader sees "Machine Learning 164 · Machine
 * Learning 68" with no way to tell them apart — so `categoryLabel()` keeps the
 * code in parentheses. Do not "clean that up".
 *
 * ── WHY JSON AND NOT A .ts CONSTANT
 * `scripts/discord-digest.mjs` posts the same figures to Discord and runs on the
 * worker box as a standalone .mjs with no bundler — it cannot import from `@/lib`.
 * It reads THIS FILE off disk (the box holds a full checkout at `$HOME/44b`,
 * git-reset to origin/main by `ops/box/run-due`). JSON is the one format both a
 * Next server component and a bare Node script can share without a build step,
 * so the vocabulary cannot drift between the panel and the channel.
 *
 * The map covers arXiv's full published taxonomy, not just what the corpus has
 * seen — 90 distinct codes appeared in a single week (measured 2026-08-14), and
 * the tail moves. An unknown code falls back to itself rather than to a guess.
 */
const NAMES: Record<string, string> = CATEGORIES

/** "cs.AI" → "Artificial Intelligence". Unknown codes return themselves. */
export function categoryName(code: string): string {
  return NAMES[code] ?? code
}

/**
 * "cs.AI" → "Artificial Intelligence (cs.AI)" — the display form, everywhere.
 * An unknown code renders bare rather than as "cs.ZZ (cs.ZZ)".
 */
export function categoryLabel(code: string): string {
  const name = NAMES[code]
  return name ? `${name} (${code})` : code
}
