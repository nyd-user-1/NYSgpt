"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, EllipsisVertical, File, FileText, Inbox, PenSquare, RefreshCw, Reply, Rows3, Send, Star, Trash2, UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStage, type Staged } from "./parts";

// GovBlock's Agentic Inbox, drawn the way the product draws it (govblock
// apps/web/registry/blocks/sidebar-09): the folder rail, the Gmail-shaped
// thread list with its toolbar, and the reading pane. The three threads are
// the Clerk's real deliveries of 7 and 8 September 2026, word for word
// (govblock/apps/web/lib/agents/featured.ts); addresses of people are left out.

type Thread = {
  id: string;
  subject: string;
  reportType?: string;
  starred?: boolean;
  asked: string;
  askedAt: string;
  repliedAt: string;
  teaser: string;
  steps: [string, string][];
  body: ReactNode;
  attachment?: { name: string; meta: string };
};

const NEW = "hr155";

const THREADS: Thread[] = [
  {
    id: NEW,
    subject: "Read H.R. 155, the Let America Vote Act",
    asked: "Read H.R. 155 for me. Where does it sit, and has this idea ever gone anywhere?",
    askedAt: "2 min ago",
    repliedAt: "just now",
    teaser: "What it is. A bill of the 119th Congress to require states to let unaffiliated voters vote in primary elections",
    steps: [
      ["congress_gov", "title, sponsor, 5 cosponsors, latest action"],
      ["congress_gov", "2 actions, both 2025-01-03"],
      ["search_bills", "7 predecessors, 113th to 118th, none reported"],
    ],
    body: (
      <>
        <p className="m-0 font-semibold">H.R. 155, the Let America Vote Act</p>
        <p className="m-0"><b>What it is.</b> A bill of the 119th Congress to require states to let unaffiliated voters vote in primary elections, on pain of losing certain federal election funds. Introduced January 3, 2025 by Rep. Brian Fitzpatrick (R-PA-1). Five cosponsors.</p>
        <p className="m-0"><b>Where it sits.</b> Referred on the day of introduction to the Committee on House Administration and, in addition, to the Committee on the Judiciary, &quot;for a period to be subsequently determined by the Speaker.&quot; No hearing, no mark-up, no report. That is the whole action history as congress.gov holds it today.</p>
        <p className="m-0"><b>Its history.</b> This is the third Congress for the idea under this name. H.R. 9144 of the 118th carried the same title and died in committee. Before that the vehicle was the CLEAN Elections Act (four Congresses, 2017 to 2024) and, earlier, Rep. John Delaney&apos;s Open Our Democracy Act of 2014 and 2015, which would have imposed a nationwide top-two primary. None was ever reported.</p>
      </>
    ),
  },
  {
    id: "open-primaries",
    subject: "Open primaries: 947 bills, 13 laws, and the 2024 money",
    reportType: "Traditional Report",
    starred: true,
    asked: "I'd love to get a report on open primaries. Check all 50 states, and check sessions as far back as we can go. Congress too. Make it a real PDF a person would want to read.",
    askedAt: "4 hr ago",
    repliedAt: "3 hr ago",
    teaser: "Every bill to open, half-open or close a primary across all 50 states, the District of Columbia and Congress since 2009",
    steps: [
      ["coverage", "52 jurisdictions, 2007 to 2026, 2.3M bills"],
      ["search_bills", "947 bills matched across 43 states, DC and Congress"],
      ["classify", "339 on primary access: 277 widen, 62 narrow; 481 ranked-choice; 46 set aside"],
      ["verify", "SB16 signed 2025-04-07; HB280 laid on the table 2025-05-13; LA special session holds one bill"],
      ["congress_gov", "Let America Vote Act, Fitzpatrick, 5 cosponsors, referred 2025-01-03"],
      ["web_search", "Unite America, Article IV, Action Now (Arnold), Katherine Gehl; NV $29M, CO $15M, AK 100:1"],
      ["render_pdf", "/reports/open-primaries-2026-09-07.pdf"],
      ["deliver_report", "delivered"],
    ],
    body: (
      <>
        <p className="m-0 font-semibold">Open primaries: 947 bills, 13 laws, and the 2024 money</p>
        <p className="m-0">Every bill to open, half-open or close a primary across all 50 states, the District of Columbia and Congress since 2009, and who funded the 2024 ballot campaigns.</p>
        <p className="m-0 font-semibold">Key takeaways</p>
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-4">
          <li><b>Almost nothing passes.</b> 947 bills since 2009 touched who may vote in a primary; thirteen became law.</li>
          <li><b>The money is a network, not a movement.</b> Unite America, the Arnolds&apos; Action Now, Katherine Gehl and Kenneth Griffin bankrolled the 2024 ballot measures, about $29M in Nevada and $15M in Colorado. Both lost.</li>
          <li><b>Voters keep saying no.</b> Every 2024 measure to open a primary failed except in DC; in Alaska the reform side outspent a repeal a hundred to one and won by only 664 votes.</li>
        </ul>
      </>
    ),
    attachment: { name: "open-primaries-2026-09-07.pdf", meta: "PDF · 16 pages · 598 KB" },
  },
  {
    id: "trace",
    subject: "Open primary initiatives and funding",
    reportType: "Trace Report",
    asked: "Same question, but I want to see the work: a Trace Report on open primary initiatives and their funding.",
    askedAt: "yesterday",
    repliedAt: "yesterday",
    teaser: "Collected from the record, congress.gov, and current reporting, in stages, then synthesized",
    steps: [
      ["web_search", "Colorado Sun, Nevada Independent, Alaska Beacon — freshest first"],
      ["read_page", "26,117 chars read where a plain fetch 403s"],
      ["search_bills", "947 matched; 339 on access; 13 passed"],
      ["congress_gov", "Let America Vote Act; referred 2025-01-03"],
    ],
    body: (
      <>
        <p className="m-0 font-semibold">Trace Report — open primary initiatives and funding</p>
        <p className="m-0">Collected from the record, congress.gov, and current reporting, in stages, then synthesized. Open the attached trace to see each source, what it returned, the reasoning over it, and the reconciled findings.</p>
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-4">
          <li>947 bills since 2009; 13 became law.</li>
          <li>2024 ballot money was one donor network — Unite America, the Arnolds&apos; Action Now, Katherine Gehl, Kenneth Griffin — about $29M in Nevada and $15M in Colorado. Both lost.</li>
          <li>Every 2024 measure to open a primary failed except the District of Columbia.</li>
        </ul>
      </>
    ),
    attachment: { name: "open-primaries-trace.html", meta: "Trace Report · opens in the browser" },
  },
];

const FOLDERS: [string, LucideIcon][] = [["Inbox", Inbox], ["Sent", Send], ["Drafts", File], ["Starred", Star], ["Trash", Trash2]];

const TOOL = "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground";

/** Gmail's importance marker: lit while a task is still running. */
function Marker({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cn("size-4 shrink-0", lit ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/50")}>
      <path d="M4 5h7l5 5-5 5H4l5-5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

const Box = () => <span className="size-3.5 shrink-0 rounded-[3px] border border-muted-foreground/50" aria-hidden />;

export function AgenticInbox({ onStage }: Staged) {
  const still = useReducedMotion();
  /** The Clerk's reply to the newest task: on its way, then landed. */
  const [arrived, setArrived] = useState(!!still);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState<string[]>(still ? [NEW] : []);
  const [toast, setToast] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  // The headline turns when the reply lands: the task was left to the agent, and it is done.
  useStage(onStage, arrived);

  // The inbox checks for mail once, a moment after it opens; Refresh checks again.
  useEffect(() => {
    if (arrived) return;
    const t = setTimeout(() => setRefreshing(true), 1500);
    return () => clearTimeout(t);
  }, [arrived]);

  useEffect(() => {
    if (!refreshing) return;
    const t = setTimeout(() => {
      setRefreshing(false);
      if (arrived) return;
      setArrived(true);
      setUnread([NEW]);
      setToast(true);
    }, 900);
    return () => clearTimeout(t);
  }, [refreshing, arrived]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const read = (id: string) => {
    setOpen(id);
    setToast(false);
    setUnread((prev) => prev.filter((x) => x !== id));
  };

  const thread = THREADS.find((t) => t.id === open);

  return (
    <section className="relative flex min-h-[30rem] overflow-hidden rounded-lg border bg-background text-xs lg:min-h-0 lg:flex-1">
      {/* The folder rail. */}
      <nav className="hidden w-32 shrink-0 flex-col gap-0.5 border-r bg-muted/30 p-2 sm:flex" aria-label="Folders">
        <p className="m-0 px-2 pt-1 pb-2 text-base font-semibold">Inbox</p>
        <span className="flex h-8 items-center gap-2 rounded-md px-2 font-medium text-[var(--ink)]"><PenSquare className="size-4" aria-hidden /> Compose</span>
        <span className="px-2 pt-3 pb-1 text-[10px] text-muted-foreground">Folders</span>
        {FOLDERS.map(([name, Icon], i) => (
          <span key={name} className={cn("flex h-8 items-center gap-2 rounded-md px-2", i === 0 ? "bg-muted font-medium" : "text-muted-foreground")}>
            <Icon className="size-4" aria-hidden /> {name}
            {i === 0 && (
              <AnimatePresence>
                {unread.length > 0 && (
                  <motion.span key="count" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 18 }} className="ml-auto flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] text-background tabular-nums">
                    {unread.length}
                  </motion.span>
                )}
              </AnimatePresence>
            )}
          </span>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        {thread ? (
          <>
            <div className="flex h-10 shrink-0 items-center gap-0.5 border-b px-2">
              <button type="button" onClick={() => setOpen(null)} aria-label="Back to the inbox" className={TOOL}><ArrowLeft className="size-4" aria-hidden /></button>
              <span className={TOOL}><Star className={cn("size-4", thread.starred && "fill-yellow-400 text-yellow-500")} aria-hidden /></span>
              <span className={TOOL}><Trash2 className="size-4" aria-hidden /></span>
              <span className="mx-1 h-5 w-px bg-border" aria-hidden />
              <span className={TOOL} title="Copy the report"><Copy className="size-4" aria-hidden /></span>
              {/* eslint-disable-next-line @next/next/no-img-element -- a 16px brand mark */}
              <span className={TOOL} title="Save this report to your Google Drive"><img src="/logos/google-drive.svg" alt="" className="block size-4 object-contain" /></span>
              <span className="ml-auto flex items-center gap-0.5">
                <span className={TOOL} title="Reply"><Reply className="size-4" aria-hidden /></span>
                <span className={TOOL} title="New task"><PenSquare className="size-4" aria-hidden /></span>
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="px-4 pt-3.5 pb-1">
                <h4 className="m-0 text-base font-medium">{thread.subject}</h4>
                {thread.reportType && (
                  <span className="mt-1.5 inline-block rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{thread.reportType}</span>
                )}
              </div>

              <div className="divide-y">
                <article className="px-4 py-3">
                  <header className="flex items-start gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-200 text-blue-600 dark:bg-blue-900 dark:text-blue-200"><UserRound className="size-4" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">You</div>
                      <div className="text-muted-foreground">to Clerk</div>
                    </div>
                    <time className="shrink-0 text-muted-foreground">{thread.askedAt}</time>
                  </header>
                  <p className="m-0 mt-2 pl-[42px] text-[13px] leading-relaxed">{thread.asked}</p>
                </article>

                <article className="px-4 py-3">
                  <header className="flex items-start gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">C</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-semibold">Clerk</span>
                        <span className="text-muted-foreground">&lt;billreader@govblock&gt;</span>
                      </div>
                      <div className="text-muted-foreground">to me</div>
                    </div>
                    <time className="shrink-0 text-muted-foreground">{thread.repliedAt}</time>
                  </header>
                  <div className="mt-2 flex flex-col gap-2.5 pl-[42px]">
                    <div className="flex flex-col gap-2.5 rounded-lg bg-muted/60 p-3 text-[13px] leading-relaxed">{thread.body}</div>
                    <details className="rounded-lg border p-2.5">
                      <summary className="cursor-pointer text-muted-foreground">{thread.steps.length} tool calls</summary>
                      <ol className="m-0 flex list-none flex-col gap-1 p-0 pt-2">
                        {thread.steps.map(([name, found], i) => (
                          <li key={i} className="flex gap-2"><code className="shrink-0 text-[var(--ink)]">{name}</code><span className="text-muted-foreground">{found}</span></li>
                        ))}
                      </ol>
                    </details>
                    {thread.attachment && (
                      <div className="group flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><FileText className="size-4" aria-hidden /></span>
                        <span className="grid min-w-0 flex-1">
                          <span className="truncate text-[13px] font-medium">{thread.attachment.name}</span>
                          <span className="truncate text-muted-foreground">{thread.attachment.meta}</span>
                        </span>
                        <Download className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                      </div>
                    )}
                  </div>
                </article>
              </div>

              <div className="px-4 pt-1 pb-4 pl-[58px]">
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-medium"><Reply className="size-3.5" aria-hidden /> Reply</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-10 shrink-0 items-center gap-0.5 border-b px-3">
              <Box />
              <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
              <button type="button" onClick={() => setRefreshing(true)} aria-label="Refresh" title="Refresh" className={cn(TOOL, "ml-1")}>
                <RefreshCw className={cn("size-4", refreshing && "animate-spin")} aria-hidden />
              </button>
              <span className={TOOL}><EllipsisVertical className="size-4" aria-hidden /></span>
              <span className="ml-auto flex items-center gap-0.5 text-muted-foreground">
                <span className="px-2 tabular-nums">1–{THREADS.length} of {THREADS.length}</span>
                <ChevronLeft className="size-4 opacity-40" aria-hidden />
                <ChevronRight className="size-4 opacity-40" aria-hidden />
                <Rows3 className="ml-2 size-4" aria-hidden />
                <ChevronDown className="size-3" aria-hidden />
              </span>
            </div>

            <ul className="m-0 min-h-0 flex-1 list-none divide-y overflow-y-auto p-0">
              {THREADS.map((t) => {
                const running = t.id === NEW && !arrived;
                const bold = unread.includes(t.id);
                return (
                  <motion.li
                    key={t.id}
                    onClick={() => !running && read(t.id)}
                    animate={{ backgroundColor: bold ? ["rgba(37, 99, 235, 0.28)", "rgba(37, 99, 235, 0.07)"] : "rgba(37, 99, 235, 0)" }}
                    transition={{ duration: 1.2 }}
                    className={cn("flex h-11 items-center gap-2.5 px-3 text-[13px]", running ? "cursor-default" : "cursor-pointer")}
                  >
                    <Box />
                    <Star className={cn("size-4 shrink-0 text-muted-foreground/60", t.starred && "fill-yellow-400 text-yellow-500")} aria-hidden />
                    <Marker lit={running} />
                    <span className={cn("w-11 shrink-0 truncate", bold ? "font-semibold" : "font-medium")}>Clerk</span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className={bold ? "font-semibold" : "font-medium"}>{t.subject}</span>
                      <span className={cn("text-muted-foreground", running && "animate-pulse")}> - {running ? "congress.gov: reading the bill and its actions" : t.teaser}</span>
                    </span>
                    <span className={cn("shrink-0 text-xs tabular-nums", bold ? "font-semibold" : "text-muted-foreground")}>{running ? t.askedAt : t.repliedAt}</span>
                  </motion.li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Gmail's bar: dark, bottom left, gone in a few seconds. */}
      <AnimatePresence>
        {toast && !thread && (
          <motion.div key="toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="absolute bottom-3 left-3 z-10 flex items-center gap-4 rounded-md bg-foreground px-3.5 py-2 text-[13px] text-background shadow-lg">
            <span>New mail from Clerk</span>
            <button type="button" onClick={() => read(NEW)} className="font-medium text-blue-300 hover:underline dark:text-blue-600">View</button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
