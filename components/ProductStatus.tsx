"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { gated, isProductUrl } from "@/lib/gate";
import type { HomeCardData } from "@/lib/home-data";
import { ClassicSpinner } from "./ClassicSpinner";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;

/** Between knocks on a product still waking. */
const WAKING_MS = 5_000;
/** Between knocks on a product that answered, so its check stays true (it pauses after 5 idle minutes). */
const AWAKE_MS = 4 * 60_000;

export type Status = "idle" | "loading" | "ready";

type LinkProps = { href: string; onClick?: (e: React.MouseEvent) => void };

type Ctx = {
  /** The signed-in reader's email; null while signed out or not yet known. */
  email: string | null;
  /** "idle" while signed out (or not yet known); then loading → ready per product. */
  statusOf: (url: string) => Status;
  /** Where a product link goes and what a click does, given the reader and the product's state. */
  linkProps: (url: string) => LinkProps;
};

const ProductStatusContext = createContext<Ctx>({ email: null, statusOf: () => "idle", linkProps: (url) => ({ href: gated(url) }) });

export const useProductStatus = () => useContext(ProductStatusContext);

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
};

/**
 * Which products are awake, for a signed-in reader (2026-10-07). On load it
 * knocks on all of them at once through /api/warm, every five seconds until
 * each answers, then every four minutes while the tab is visible, so a green
 * check is always true. Signed out, nothing is knocked and every product link
 * goes through the sign-in gate. A click on a product still waking shows a
 * notice instead of leaving.
 */
export function ProductStatusProvider({ cards, children }: { cards: HomeCardData[]; children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const signedIn = email !== null;
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const products = cards.filter((c) => c.href && isProductUrl(c.href));
    const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

    const watch = async (card: HomeCardData) => {
      const host = hostOf(card.href);
      while (live) {
        if (document.hidden) {
          await sleep(WAKING_MS);
          continue;
        }
        const res = await fetch(`/api/warm?to=${encodeURIComponent(card.href)}`, { cache: "no-store" }).catch(() => null);
        if (!live || res?.status === 401 || res?.status === 429) return;
        const ready = !!(res && ((await res.json().catch(() => ({}))) as { ready?: boolean }).ready);
        setStatus((s) => ({ ...s, [host]: ready ? "ready" : "loading" }));
        await sleep(ready ? AWAKE_MS : WAKING_MS);
      }
    };

    (async () => {
      const me = (await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json()).catch(() => ({}))) as { user?: { email?: string } | null };
      if (!live || !me.user) return;
      setEmail(me.user.email ?? "");
      setStatus(Object.fromEntries(products.map((c) => [hostOf(c.href), "loading" as Status])));
      products.forEach((c) => void watch(c));
    })();
    return () => {
      live = false;
    };
  }, [cards]);

  const statusOf = useCallback((url: string): Status => (signedIn && isProductUrl(url) ? status[hostOf(url)] ?? "loading" : "idle"), [signedIn, status]);

  const linkProps = useCallback(
    (url: string): LinkProps => {
      if (!isProductUrl(url)) return { href: url };
      if (!signedIn) return { href: gated(url) };
      if (statusOf(url) === "ready") return { href: url };
      const title = cards.find((c) => c.href && hostOf(c.href) === hostOf(url))?.title ?? "This site";
      return {
        href: url,
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          setNotice(title);
        },
      };
    },
    [signedIn, statusOf, cards]
  );

  return (
    <ProductStatusContext.Provider value={{ email, statusOf, linkProps }}>
      {children}
      <AnimatePresence>
        {notice && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNotice(null)}
            role="dialog"
            aria-modal
            aria-label={`${notice} is still loading`}
          >
            <motion.div
              className="flex w-full max-w-md flex-col items-center gap-8 rounded-2xl bg-background px-8 py-10 text-center shadow-lg"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="m-0 text-3xl leading-snug text-foreground" style={SERIF}>
                {notice} is still loading. You&apos;ll see a green check mark when it has finished.
              </p>
              <ClassicSpinner />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ProductStatusContext.Provider>
  );
}
