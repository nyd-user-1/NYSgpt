/**
 * What an API costs, from the reader's choices in its box's control panel
 * (2026-10-08). One function for the panel and for checkout, so the price on
 * the button is the price charged: the server recomputes it from the choices
 * and never takes a figure from the browser.
 *
 * Free is a key with 1,000 calls a month over any tables. The dial runs from
 * there to "everything", which costs what the dataset's ceiling says. Gov's
 * ceiling is GovBlock Complete on AWS Data Exchange ($7,500 a month; $40,500
 * for 6 months; $66,000 for 12, set 2026-10-06), and its terms carry the same
 * discounts. The other ceilings are scaled to their data against that anchor.
 */

/** A dataset's price with every table, unlimited calls and a commercial license, per month. */
export const CEILING: Record<string, number> = {
  gov: 7_500, health: 5_000, ai: 3_000, energy: 3_000, tariffs: 2_000,
  science: 1_000, solar: 1_000, childcare: 500, insurance: 500, sports: 500,
};

/** Calls a month: the API Gateway usage plan each tier is issued on, and its share of the ceiling. */
export const CALLS = [
  { id: "1k", label: "1,000 calls", plan: "bsayrn", share: 0 },
  { id: "10k", label: "10,000 calls", plan: "urgiho", share: 0.12 },
  { id: "100k", label: "100,000 calls", plan: "ty621f", share: 0.35 },
  { id: "1m", label: "1 million calls", plan: "ko2idd", share: 0.65 },
  { id: "max", label: "Unlimited", plan: "pmsbfu", share: 1 },
] as const;

/** The term, with AWS Data Exchange's own discounts: 6 months for 5.4 and 12 for 8.8. */
export const TERMS = [
  { id: "1", label: "Monthly", months: 1, factor: 1 },
  { id: "6", label: "6 months", months: 6, factor: 5.4 },
  { id: "12", label: "12 months", months: 12, factor: 8.8 },
] as const;

/** Internal use, or building it into something sold. */
export const LICENSES = [
  { id: "internal", label: "Internal use", factor: 0.8 },
  { id: "commercial", label: "Commercial", factor: 1 },
] as const;

export type Choice = { dataset: string; tables: string[]; calls: string; term: string; license: string };

/**
 * The price in whole dollars for the term, from the share of the dataset's
 * records chosen (square-rooted, so the first tables carry most of the value
 * and a single big table is not priced like the whole set), the calls, the
 * term and the license. Rounded to a figure a person would quote.
 */
export function price(c: Choice, rows: Record<string, number>) {
  const calls = CALLS.find((x) => x.id === c.calls) ?? CALLS[0];
  if (!calls.share) return 0;
  const total = Object.values(rows).reduce((s, n) => s + n, 0) || 1;
  const chosen = c.tables.reduce((s, t) => s + (rows[t] ?? 0), 0);
  const share = Math.sqrt(Math.min(chosen / total, 1));
  const term = TERMS.find((x) => x.id === c.term) ?? TERMS[0];
  const license = LICENSES.find((x) => x.id === c.license) ?? LICENSES[1];
  const monthly = (CEILING[c.dataset] ?? 500) * share * calls.share * license.factor;
  const step = monthly < 100 ? 5 : monthly < 1_000 ? 25 : 100;
  return Math.max(step, Math.round((monthly * term.factor) / step) * step);
}
