import { CARDS } from "@/lib/home-data";

/**
 * The gate in front of the product sites (2026-10-07). Every link out to a
 * product goes through /go, which asks for a nysgpt.com sign-in, wakes the
 * product while the reader waits, then sends them on. Only a product's own
 * host may be a destination, so /go is never an open redirect.
 */

const HOSTS = new Set(CARDS.filter((c) => c.href).map((c) => new URL(c.href).host));

export function isProductUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && HOSTS.has(u.host);
  } catch {
    return false;
  }
}

/** A product URL, routed through the gate; anything else, untouched. */
export function gated(url: string): string {
  return isProductUrl(url) ? `/go?to=${encodeURIComponent(url)}` : url;
}
