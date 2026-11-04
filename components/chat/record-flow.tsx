'use client'

import { Video } from 'lucide-react'

import type { VideoProvider } from '@/lib/video-model-options'

// Trinity's record flow (camera, teleprompter, template chooser) stands behind this stand-in: the
// same exports, so chat.tsx carries over unchanged. NYSgpt has no recording pipeline — pressing
// Record on a script card lands here, a quiet card instead of the camera.

/** The scoring a finished recording comes back with, as the chat walks it through. */
export type Analysis = { title?: string; seconds: number; summary: string; forecast?: string; findings: string[] }

export function RecordFlow({ script, onDone, onAnalysis }: { script: string; videoModel: VideoProvider; onDone?: () => void; onAnalysis?: (a: Analysis) => void }) {
  void script; void onDone; void onAnalysis
  return (
    <div className="my-3 flex items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--inp-bg)] px-4 py-3 text-sm text-[var(--muted)]">
      <Video className="h-4 w-4 shrink-0" />
      <span>Recording isn&apos;t wired up here yet.</span>
    </div>
  )
}
