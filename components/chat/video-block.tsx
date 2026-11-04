'use client'

import { Clapperboard } from 'lucide-react'

// Trinity's Remotion video block stands behind this stand-in: the same export and props, so
// chat.tsx carries over unchanged. NYSgpt has no video templates; a reply that carries a
// ```pax-video block shows this quiet card in its place.

export function VideoBlock({ templateId, title }: { templateId: string; props: unknown; parent?: string; title?: string; chatId?: string; saveKey?: string | null }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--inp-bg)] text-sm text-[var(--muted)]">
      <Clapperboard className="h-5 w-5" />
      <span>{title ?? templateId} — video templates aren&apos;t wired up here yet.</span>
    </div>
  )
}
