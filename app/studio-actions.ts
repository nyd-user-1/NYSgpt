"use server"

// Trinity's studio actions stand behind this stand-in: the + menu's Voices drawer calls narrate to
// hear a sample line and plays the returned url, with a catch for silence. NYSgpt has no narration
// pipeline (Polly/ElevenLabs), so every call rejects and the drawer's row quietly unspins.

export async function narrate(_text: string, _voice: string): Promise<{ url: string }> {
  throw new Error("Narration isn't wired up here yet.")
}
