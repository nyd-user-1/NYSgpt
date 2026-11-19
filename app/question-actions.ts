"use server"

// NYSgpt stand-in for pax-trinity's src/app/question-actions.ts (brief 46): the same exports the chat imports, without pax-trinity's
// services. What it would do there is said beside each export.

// pax-trinity draws question chips for a video from its question bank and answers them from stored
// measurements. NYSgpt has no question bank: no chips are offered.

import type { Answer, ChipOffer, ChipTab, Surface } from "@/lib/question-resolver"

export async function chipOffers(ytId: string, surface: Surface, exclude: string[] = [], tab?: ChipTab): Promise<ChipOffer[]> {
  void ytId
  void surface
  void exclude
  void tab
  return []
}

export async function answerChip(questionId: string, ytId: string): Promise<Answer | null> {
  void questionId
  void ytId
  return null
}
