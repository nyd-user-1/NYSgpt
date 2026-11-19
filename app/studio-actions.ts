"use server"

// NYSgpt stand-in for pax-trinity's src/app/studio-actions.ts (brief 46): the same exports the chat imports, without pax-trinity's
// services. What it would do there is said beside each export.

// pax-trinity narrates a script with Amazon Polly or ElevenLabs and stores the mp3 in S3. NYSgpt has no
// narration: the + menu's voice-over answers with this error.

import type { VoiceId, WordMark } from "@/lib/studio-style"

export type Narration = { url: string; marks: WordMark[]; seconds: number; voice: VoiceId; key: string }

export async function narrate(text: string, voice: VoiceId): Promise<Narration> {
  void text
  void voice
  throw new Error("Voice-over is not connected on NYSgpt.")
}
