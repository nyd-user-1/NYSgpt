// Trinity's question bank, as the /chat port needs it (2026-11-03): the types the chat and its
// server actions share, with resolvers that answer empty — NYSgpt holds no measured video
// questions. The chips simply never show until a bank exists behind chipsFor/resolveQuestion.

export type Answer = {
  text: string
  basis: string
  audit?: string
  citation?: string
  unlock?: string
}

export type Surface = "video-panel" | "chat"

export type ChipTab = "score" | "analysis" | "research" | "notes"
export const CHIP_TABS: ChipTab[] = ["score", "analysis", "research", "notes"]

type Register = "plain" | "technical"
export type ChipOffer = { id: string; ask: string; register: Register; position: number; propensity: number }

export async function chipsFor(_ytId: string, _surface: Surface, _exclude: string[] = [], _tab?: ChipTab): Promise<ChipOffer[]> {
  return []
}

export async function resolveQuestion(_questionId: string, _ytId: string): Promise<Answer | null> {
  return null
}
