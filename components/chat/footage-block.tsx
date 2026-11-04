'use client'

import type { FootageFocus, FootageShow } from '@/lib/footage'
import type { VideoProvider } from '@/lib/video-model-options'

// Trinity's footage library (shots, graphics, b-roll under a script card) stands behind these
// stand-ins: the same exports, so chat.tsx carries over unchanged. NYSgpt holds no footage
// library, so a script card simply shows nothing beneath it.

export function FootageBlock(_props: { script: string; videoModel: VideoProvider; show?: FootageShow; focus?: FootageFocus | null }) {
  return null
}

export function BrollBlock(_props: { id: string; videoModel: VideoProvider }) {
  return null
}
