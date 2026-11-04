"use server"

// Trinity's studio actions stand behind this stand-in: the + menu's Voices drawer calls narrate to
// hear a sample line. NYSgpt has no narration pipeline (Polly/ElevenLabs), so the ear gets nothing
// and the drawer's play button quietly does not play.

export async function narrate(_text: string, _voice: string): Promise<{ url: string } | { error: string }> {
  return { error: "Narration isn't wired up here yet." }
}
