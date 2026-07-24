/**
 * Compact display for the headline figures — the masthead ledger and the
 * contents-plate cards both read from this, so a count renders identically
 * wherever it appears.
 *
 * Truncates rather than rounds, so a figure never claims more than we hold.
 * One decimal below a mantissa of 100, none above, which caps every result at
 * five characters — that ceiling is what lets the cards share a single type
 * size instead of scaling per value.
 *
 *   33,598,857 → 33.5M      16,800 → 16.8K      292,754 → 292K
 *    4,300,000,000 → 4.3B      563 → 563
 */
export type Figure = { count: number; decimals: number; suffix: string };

const TIERS = [
  { limit: 1_000_000_000, suffix: "B" },
  { limit: 1_000_000, suffix: "M" },
  { limit: 1_000, suffix: "K" },
] as const;

export function compact(value: number): Figure {
  for (const tier of TIERS) {
    if (value >= tier.limit) {
      const mantissa = value / tier.limit;
      const decimals = mantissa < 100 ? 1 : 0;
      const factor = 10 ** decimals;
      return {
        count: Math.floor(mantissa * factor) / factor,
        decimals,
        suffix: tier.suffix,
      };
    }
  }
  return { count: value, decimals: 0, suffix: "" };
}
