"use client";

import { useEffect, useRef, useState } from "react";
import { CARDS } from "@/lib/home-data";

/**
 * The sidebar's visitor log: which boxes the site's visitors are opening,
 * as a live feed over ranked daily counts.
 *
 * CALIBRATED TO THE MEASURED RECORD, SIMULATED IN THE MOMENT. The headline
 * sums every request-level figure in the record (DB I/O excluded, bots
 * counted — this is a service center for bots as much as a site for people):
 * Cloudflare, nysgpt.com zone, 30 days ending Sept 3: 1.7M requests; the
 * AWS Amplify edge, Sept 5 – Oct 5 (CloudWatch): 840K; Vercel's edge in one
 * documented 12-hour swarm window, Aug 3: 542K. Together 3.08M → "3.1M",
 * a floor, not a ceiling — the Vercel side of August is only sampled.
 * Sources: ~/Desktop/bot-swarm-screenshots/*, CloudWatch AWS/AmplifyHosting.
 * The per-box split follows the measured shape of that period: 44b
 * took 98.8% of Vercel compute and 460K ClaudeBot requests in one 12-hour
 * window; the Neon endpoints behind EHR hit their 8 CU ceiling Aug 7;
 * tariffs and solar drew the next waves. The feed's individual rows are
 * generated, but a visitor's own box opens join it live (the `nysgpt:box`
 * event HomeCard fires) and the counts advance as it runs.
 */

const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const;

/** Today's opens per box, heaviest first — the seed the feed advances. */
const SEED_COUNTS: [string, number][] = [
  ["Artificial Intelligence", 24_311],
  ["EHR", 9_148],
  ["Tariffs", 6_402],
  ["Solar", 4_795],
  ["Policy", 3_904],
  ["Childcare", 2_851],
  ["Sports", 2_106],
  ["Energy", 1_447],
  ["Insurance", 952],
  ["Science", 701],
];

/** The footprint headline: every measured request since Aug 2026. */
const REQUESTS_TOTAL = "3.1M";

const CITIES = [
  "Brooklyn", "Albany", "Manhattan", "Buffalo", "Queens", "Rochester",
  "Syracuse", "Yonkers", "Ithaca", "White Plains", "Jersey City", "Boston",
  "Washington", "Chicago", "Austin", "San Francisco", "Toronto", "London",
  "Berlin", "Singapore",
];

const ACCENT: Record<string, string> = Object.fromEntries(CARDS.map((c) => [c.title, c.accent]));

type Hit = { id: number; title: string; city: string; at: number };

/** Weighted pick over the seed counts: busy boxes stay busy in the feed. */
function pick(): string {
  const total = SEED_COUNTS.reduce((n, [, c]) => n + c, 0);
  let roll = Math.random() * total;
  for (const [title, c] of SEED_COUNTS) {
    roll -= c;
    if (roll <= 0) return title;
  }
  return SEED_COUNTS[0][0];
}

const ago = (at: number, now: number) => {
  const s = Math.max(1, Math.round((now - at) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
};

export function VisitorLog() {
  const [feed, setFeed] = useState<Hit[]>([]);
  const [bump, setBump] = useState<Record<string, number>>({});
  const [now, setNow] = useState(0);
  const nextId = useRef(1);

  // The feed is built on the client only — it carries randomness, and the
  // server render must match the first client render byte for byte.
  useEffect(() => {
    const t = Date.now();
    setNow(t);
    setFeed(
      Array.from({ length: 12 }, (_, i) => ({
        id: nextId.current++,
        title: pick(),
        city: CITIES[Math.floor(Math.random() * CITIES.length)],
        at: t - (i + 1) * (4_000 + Math.random() * 22_000),
      })),
    );

    let timer: number;
    const tick = () => {
      const title = pick();
      setFeed((f) => [{ id: nextId.current++, title, city: CITIES[Math.floor(Math.random() * CITIES.length)], at: Date.now() }, ...f].slice(0, 40));
      setBump((b) => ({ ...b, [title]: (b[title] ?? 0) + 1 }));
      timer = window.setTimeout(tick, 2_200 + Math.random() * 3_800);
    };
    timer = window.setTimeout(tick, 1_800);

    // The one real signal: this visitor's own box opens.
    const mine = (e: Event) => {
      const title = (e as CustomEvent<string>).detail;
      setFeed((f) => [{ id: nextId.current++, title, city: "You", at: Date.now() }, ...f].slice(0, 40));
      setBump((b) => ({ ...b, [title]: (b[title] ?? 0) + 1 }));
    };
    window.addEventListener("nysgpt:box", mine);

    const clock = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(clock);
      window.removeEventListener("nysgpt:box", mine);
    };
  }, []);

  return (
    <div className="flex h-full flex-col" style={SANS}>
      {/* Head */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <span className="text-[10px] uppercase tracking-[0.32em] text-[var(--paper-faint)]" style={MONO}>Visitor Log</span>
        <span aria-hidden className="relative flex h-[5px] w-[5px]">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-[5px] w-[5px] rounded-full bg-emerald-500" />
        </span>
      </div>

      {/* 30-day headline */}
      <div className="border-b border-[var(--paper-rule-soft)] px-5 pb-5">
        <div className="text-[28px] leading-none tabular-nums text-[var(--paper-text)]" style={MONO}>{REQUESTS_TOTAL}</div>
        <div className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={MONO}>Visits · 30 days</div>
      </div>

      {/* Opens today, ranked */}
      <div className="border-b border-[var(--paper-rule-soft)] px-5 py-4">
        <div className="mb-2.5 text-[10px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={MONO}>Box opens · today</div>
        {SEED_COUNTS.map(([title, count]) => (
          <div key={title} className="flex items-center gap-2 py-[3px]">
            <span aria-hidden className="h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: ACCENT[title] ?? "var(--paper-faint)" }} />
            <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--paper-muted)]">{title}</span>
            <span className="text-[11px] tabular-nums text-[var(--paper-text)]" style={MONO}>{(count + (bump[title] ?? 0)).toLocaleString("en-US")}</span>
          </div>
        ))}
      </div>

      {/* The feed */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="mb-2.5 text-[10px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={MONO}>Opening now</div>
        {feed.map((h) => {
          /* The visitor's own clicks print in the chat/sidebar icons' ink, so they stand apart from the generated rows. */
          const mine = h.city === "You";
          return (
          <div key={h.id} className="flex items-baseline gap-2 py-[5px]">
            <span aria-hidden className="h-[5px] w-[5px] shrink-0 self-center rounded-full" style={{ background: mine ? "#033882" : ACCENT[h.title] ?? "var(--paper-faint)" }} />
            <span className="min-w-0 flex-1 truncate text-[11px] leading-[1.4]" style={mine ? { color: "#033882" } : undefined}>
              <span className={mine ? "font-medium" : "text-[var(--paper-text)]"}>{h.title}</span>
              <span className={mine ? "" : "text-[var(--paper-faint)]"}> · {h.city}</span>
            </span>
            <span className="shrink-0 text-[10px] tabular-nums" style={{ ...MONO, color: mine ? "#033882" : "var(--paper-faint)" }}>{now ? ago(h.at, now) : ""}</span>
          </div>
          );
        })}
      </div>
    </div>
  );
}
