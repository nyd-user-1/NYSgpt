"use client"

// NYSgpt stand-in for pax-trinity's src/components/chat/record-flow.tsx (brief 46): the same exports the chat imports, without pax-trinity's
// services. What it would do there is said beside each export.

// pax-trinity's record flow (camera, upload, Remotion's template chooser, scoring) does not come across.

/** A recorded video's analysis, as pax-trinity's myAnalysis returns it (app/original-actions.ts). */
export type Analysis = { title: string | null; seconds: number; summary: string; forecast: string | null; findings: string[] }

export function RecordFlow(props: Record<string, unknown>) {
  void props
  return null
}
