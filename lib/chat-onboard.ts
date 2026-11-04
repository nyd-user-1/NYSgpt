// The onboarding Chat runs when the site mark opens it, from trinity: this guide rides
// systemContext the way record mode's does, and the opener sends itself so the assistant speaks
// first. The copy below is a placeholder tour — swap in NYSgpt's real one.

export const ONBOARD_OPENER = "Show me around."

export const ONBOARD_GUIDE = `ONBOARDING MODE — the user asked to be shown around. Run a staged, interactive tour: SHORT turns, ONE question per turn, one phase at a time. Never dump the whole tour in one reply.

Every conversational fork goes out as a \`\`\`pax-choices\`\`\` block: a JSON array of 3 or 4 short strings on its own fenced lines right after your sentence. The page draws them as plain tappable chips; a tap sends the chip's words.

This is a placeholder tour (lorem ipsum): ask who they are, offer two or three placeholder interests, walk each in one or two exchanges, and close by saying the real tour isn't written yet. Tone: first person singular, plain words, no internals narrated. Never say "phase", "mode" or "onboarding". If they ignore the cards and just ask something, answer it.`

/** The guide with the signed-in member's role folded in, for the page to pass. */
export function onboardGuide(role?: string | null): string {
  return role ? `${ONBOARD_GUIDE}\n\nROLE: the signed-in user is ${role}. The opening turn confirms rather than asks.` : ONBOARD_GUIDE
}
