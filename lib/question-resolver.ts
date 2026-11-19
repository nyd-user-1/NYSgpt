// NYSgpt stand-in for pax-trinity's src/lib/question-resolver.ts (brief 46): the same exports the chat imports, without pax-trinity's
// services. What it would do there is said beside each export.

// The types the chat reads, as pax-trinity writes them (lib/question-resolver.ts, lib/question-bank.ts).

export type Register = "video" | "field" | "action"

export type Answer = {
  id: string
  ask: string
  /** The answer, markdown, scientific voice. Empty when `unlock` stands in for it. */
  text: string
  basis: string
  /** The census audit line, once, quietly. */
  audit?: string
  /** A grounded recommendation's citation; present only where a measured lift backs it. */
  citation?: string
  /** What the reader does when this video lacks the measurement. */
  unlock?: string
}

export type Surface = "video-panel" | "chat"
/** The video page's wide-column tabs; each draws its chips from its own questions. */
export type ChipTab = "score" | "analysis" | "research" | "notes"
export const CHIP_TABS: ChipTab[] = ["score", "analysis", "research", "notes"]
export type ChipOffer = { id: string; ask: string; register: Register; position: number; propensity: number }
