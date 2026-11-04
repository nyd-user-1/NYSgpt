"use server"

import { CHIP_TABS, chipsFor, resolveQuestion, type Answer, type ChipOffer, type ChipTab, type Surface } from "@/lib/question-resolver"

// The question bank's chips and answers, from the browser to the stored measurements. No model
// call. NYSgpt's resolver answers empty until a bank exists (lib/question-resolver.ts).

const YT = /^[\w-]{11}$/

/** The chips for a video on a surface, drawn fresh; `exclude` holds the chips already tapped this session. */
export async function chipOffers(ytId: string, surface: Surface, exclude: string[] = [], tab?: ChipTab): Promise<ChipOffer[]> {
  if (!YT.test(ytId) || (surface !== "video-panel" && surface !== "chat")) return []
  return chipsFor(ytId, surface, exclude.slice(0, 60).map(String), tab && CHIP_TABS.includes(tab) ? tab : undefined)
}

/** One chip's answer for a video. */
export async function answerChip(questionId: string, ytId: string): Promise<Answer | null> {
  if (!YT.test(ytId)) return null
  return resolveQuestion(String(questionId), ytId)
}
