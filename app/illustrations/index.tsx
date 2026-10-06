"use client";

import type { ComponentType } from "react";
import { AgenticInbox } from "./AgenticInbox";
import { Classifier } from "./Classifier";
import { Clips } from "./Clips";
import { Compiler } from "./Compiler";
import { Consensus } from "./Consensus";
import { Encoder } from "./Encoder";
import { Inspector } from "./Inspector";
import { Lake } from "./Lake";
import { Loaders } from "./Loaders";
import { Pipeline } from "./Pipeline";
import { Reranker } from "./Reranker";
import type { Staged } from "./parts";

type Drawn = ComponentType<Staged & { onInspect?: () => void }>;

/** Each card's working illustration, by the card's title. */
const ILLUSTRATIONS: Record<string, Drawn> = {
  Encoder,
  Reranker,
  Classifier,
  Compiler,
  Loaders,
  Lake,
  Pipeline,
  Clips,
  Consensus,
  "Agentic Inbox": AgenticInbox,
  Inspector,
};

/**
 * The illustration fills the dialog's left side top to bottom: no dead space
 * (Brendan's standard, 2026-10-03). `onStage` tells the dialog when the reader
 * has moved it from the ordinary way to the tool's, which turns the headline.
 */
export function ToolIllustration({ title, onStage, onInspect }: { title: string; onStage?: (after: boolean) => void; onInspect?: () => void }) {
  const Drawn = ILLUSTRATIONS[title];
  if (!Drawn) return null;
  return (
    // --ink is the tools' blue, lifted in dark mode so it still reads on the dark ground.
    <div className="flex flex-col gap-3 text-[13px] [--ink:#033882] [--blue:#2563eb] [--red:#dc2626] dark:[--blue:#60a5fa] dark:[--red:#f87171] lg:min-h-0 lg:flex-1 dark:[--ink:#8ab4ff]">
      <Drawn onStage={onStage} onInspect={onInspect} />
    </div>
  );
}
