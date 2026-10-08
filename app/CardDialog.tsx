"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, ArrowUpRight, SquareDashedMousePointer, X } from "lucide-react";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogPopup, DialogTitle } from "@/components/animate-ui/components/base/dialog";
import { compact } from "@/lib/compact";
import { useProductStatus } from "@/components/ProductStatus";
import { TOOLS, type HomeCardData } from "@/lib/home-data";
import { CARD_ICONS } from "./card-icons";
import { ApiPanel } from "./ApiPanel";
import { ProductShot } from "./ProductShot";
import { ApiSample } from "./ApiSample";
import { ApiPricer } from "./ApiPricer";
import { useCatalog, type CatalogTable } from "./useCatalog";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const MONO = { fontFamily: "var(--font-mono), ui-monospace, monospace" } as const;

// The illustrations load with the first dialog that draws one, not with the homepage.
const ToolIllustration = dynamic(() => import("./illustrations").then((m) => m.ToolIllustration), { ssr: false });

const TOOL = "flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

/** How long the skeleton stands in while the headline and the copy change. */
const SWAP_MS = 420;

/** The headline and the copy as bars of their own shape, while the words change. */
function CopySkeleton() {
  const bar = "animate-pulse rounded bg-muted";
  return (
    <div aria-hidden>
      <div className="mb-5 flex min-h-[5.4rem] flex-col gap-2.5 pt-1">
        <span className={`${bar} h-5 w-full`} />
        <span className={`${bar} h-5 w-3/5`} />
      </div>
      <div className="flex flex-col gap-2">
        <span className={`${bar} h-3 w-full`} />
        <span className={`${bar} h-3 w-2/3`} />
      </div>
      {[["w-full", "w-full", "w-11/12", "w-2/5"], ["w-full", "w-full", "w-3/4"]].map((lines, i) => (
        <div key={i} className="mt-6 flex flex-col gap-2.5">
          {lines.map((w, j) => (
            <span key={j} className={`${bar} h-3 ${w}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * The card dialog: on the left a tool's working illustration or a product's
 * screenshot; on the right the statement and the copy (stacked on a narrow
 * screen). The popup is GovBlock's animate-ui base dialog, made wide and tall
 * enough to hold the illustration (2026-10-03).
 *
 * A tool's statement and story come in two halves: the ordinary way first, and
 * the tool's answer once the reader presses the illustration's button. Between
 * the two, and between one card and the next, a skeleton stands in for the
 * words. `onStep` turns to the card before or after this one on the same
 * plate; `onInspect` closes the dialog and turns the Inspector on over the page.
 */
export function CardDialog({ card, onClose, onStep, onInspect }: { card: HomeCardData | null; onClose: () => void; onStep?: (by: -1 | 1) => void; onInspect?: () => void }) {
  // The last card stays drawn while the dialog closes, so it leaves at its own size.
  const [shown, setShown] = useState(card);
  const { linkProps } = useProductStatus();
  /** Whether the reader has pressed the illustration's button: the copy follows it. */
  const [after, setAfter] = useState(false);
  /** The table picked in an API box's endpoint list; none shows the box's own example. */
  const [picked, setPicked] = useState<string | null>(null);
  if (card && card !== shown) {
    setShown(card);
    setAfter(false);
    setPicked(null);
  }
  const tables = useCatalog(shown?.catalog);
  /** An API box's chosen tables, shared by the endpoint table and the control panel; every table to start. */
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [selectedFor, setSelectedFor] = useState<CatalogTable[] | null>(null);
  if (tables !== selectedFor) {
    setSelectedFor(tables);
    setSelected(tables ? new Set(tables.map((t) => t.path)) : null);
  }
  const toggle = (path: string | null) => {
    if (!path || !selected) return;
    const next = new Set(selected);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelected(next);
  };
  // A box without a readout of its own opens on its largest table.
  const pickedTable = tables?.find((t) => t.path === picked) ?? (shown?.readout ? null : tables?.[0] ?? null);

  // The words on show trail the words wanted by one skeleton's length.
  const want = `${shown?.title}|${after}`;
  const [have, setHave] = useState(want);
  useEffect(() => {
    if (want === have) return;
    const t = setTimeout(() => setHave(want), SWAP_MS);
    return () => clearTimeout(t);
  }, [want, have]);
  const swapping = want !== have;

  const drawn = !!shown && (TOOLS.some((t) => t.title === shown.title) || shown.title === "Inspector");
  const figure = shown && shown.value > 0 ? compact(shown.value) : null;
  const approx = shown?.unit.startsWith("~");
  const unit = shown?.unit.replace(/^~\s*/, "") ?? "";
  const statement = Array.isArray(shown?.statement) ? shown.statement[after ? 1 : 0] : shown?.statement;
  // A card with a story tells it in two halves; one without keeps its blurb and three paragraphs.
  const [lead, ...paragraphs] = shown?.story
    ? shown.story[after ? "after" : "before"]
    : shown
      ? [shown.body, ...(shown.pas ? [shown.pas.problem, shown.pas.agitate, shown.pas.solution] : [])]
      : [];
  const Icon = shown ? CARD_ICONS[shown.title] : undefined;

  return (
    <Dialog open={!!card} onOpenChange={(open) => !open && onClose()}>
      <DialogPopup from="top" showCloseButton={false} className="w-[min(1100px,calc(100vw-2rem))] rounded-2xl border-0 bg-sidebar p-2 shadow-lg sm:max-w-none">
        {shown && (
          <div className="flex max-h-[88vh] min-h-0 flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
            <DialogHeader className="flex h-14 shrink-0 flex-row items-center justify-between gap-3 border-b pr-3 pl-5">
              <DialogTitle className="flex items-center gap-2.5 text-xl font-normal text-foreground" style={SERIF}>
                {Icon && <Icon className="size-5 shrink-0" aria-hidden />}
                {shown.dialogTitle ?? shown.title}
              </DialogTitle>
              <DialogDescription className="sr-only">{shown.body}</DialogDescription>
              {/* The arrows turn to the card before and the card after on the same
                  plate; they sit just before the close. */}
              <span className="flex items-center gap-0.5">
                {onStep && (
                  <>
                    <button type="button" onClick={() => onStep(-1)} aria-label="The card before this one" className={TOOL}><ArrowLeft className="size-4" aria-hidden /></button>
                    <button type="button" onClick={() => onStep(1)} aria-label="The card after this one" className={TOOL}><ArrowRight className="size-4" aria-hidden /></button>
                  </>
                )}
                <DialogClose className={TOOL}>
                  <X className="size-4" aria-hidden />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </span>
            </DialogHeader>

            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto lg:flex lg:h-[min(600px,calc(88vh-8.5rem))] lg:flex-none lg:overflow-hidden">
              <div className="thin-scrollbar border-b bg-muted/40 p-4 lg:flex lg:min-h-0 lg:min-w-0 lg:flex-[1.75] lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0">
                {drawn ? <ToolIllustration key={shown.title} title={shown.title} onStage={setAfter} onInspect={onInspect} /> : shown.catalog && shown.api ? <ApiPanel className="m-0" api={shown.api} live tables={tables} chosen={selected} onPick={toggle} /> : <ProductShot key={shown.title} card={shown} />}
              </div>
              {shown.catalog && shown.api ? (
                // An API box: the picked table's record, and the checkout pinned to the bottom,
                // level with the bottom of the endpoint table beside it.
                <div className="flex flex-col p-4 lg:min-h-0 lg:min-w-0 lg:flex-1">
                  <ApiPricer key={shown.catalog} dataset={shown.catalog} name={shown.title} tables={tables} selected={selected ?? new Set()} onSelect={setSelected} />
                </div>
              ) : (
              <div className="thin-scrollbar p-5 lg:min-h-0 lg:min-w-0 lg:flex-1 lg:overflow-y-auto">
                {swapping ? (
                  <CopySkeleton />
                ) : (
                  <>
                    {/* A paired statement holds three lines' height, so the copy below keeps its place when it changes. */}
                    {statement && <p className="m-0 mb-5 text-[22px] leading-[1.3] font-medium text-foreground" style={SERIF}>{statement}</p>}
                    {shown.story ? (
                      // A story is plain paragraphs under the headline (about 140 words a side).
                      [lead, ...paragraphs].map((text, i) => (
                        <p key={text} className={`m-0 text-[15px] leading-relaxed ${i ? "mt-5" : ""}`}>{text}</p>
                      ))
                    ) : (
                      <>
                        <p className="m-0 text-sm text-muted-foreground">{lead}</p>
                        {shown.api ? (
                          // The API reference stands in for the prose.
                          <>
                          <ApiPanel api={shown.api} />
                          </>
                        ) : (
                          paragraphs.map((text) => (
                            <p key={text} className="m-0 mt-5 text-sm leading-relaxed">{text}</p>
                          ))
                        )}
                      </>
                    )}
                    {/* The Inspector's card closes on its own button, down here under the copy. */}
                    {shown.title === "Inspector" && onInspect && (
                      <button type="button" onClick={onInspect} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-[15px] font-medium text-background hover:opacity-90">
                        <SquareDashedMousePointer className="size-4" aria-hidden /> Turn on the Inspector
                      </button>
                    )}
                  </>
                )}
              </div>
              )}
            </div>

            <footer className="flex h-14 shrink-0 items-center justify-between gap-3 border-t px-5 text-xs text-muted-foreground">
              <span className="tabular-nums uppercase tracking-[0.16em]" style={MONO}>
                {figure ? `${approx ? "~" : ""}${figure.count.toFixed(figure.decimals)}${figure.suffix} ${unit}` : ""}
              </span>
              {shown.href && (
                <a {...linkProps(shown.href)} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 font-medium text-foreground hover:underline">
                  Open <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              )}
            </footer>
          </div>
        )}
      </DialogPopup>
    </Dialog>
  );
}
