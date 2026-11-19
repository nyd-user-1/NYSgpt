// A script's footage: the shots a text-to-video model generates (the opening shot, and the b-roll behind
// each line) and the graphics Remotion draws at no cost (the checklist card, a callout, a stat card, a
// quote, an intro, end credits). One plan per script text, written once and kept in S3, so everyone who
// picks the same script gets the same plan, and every clip made for it is paid for once.

export type Shot = { id: string; kind: "opening" | "broll"; line?: string; prompt: string; seconds: number }

export type Graphics = {
  checklist: { title: string; items: string[]; footer: string }
  callout: { text: string; highlight: string }
  stat: { value: string; label: string }
  quote: { text: string; by: string }
  intro: { title: string; sub: string }
  end: { ask: string; handle: string }
}

export type GraphicKind = keyof Graphics

export type FootagePlan = { key: string; shots: Shot[]; graphics: Graphics }

/** Where the plus menu sends a script: its shots, its graphics, or one graphic. */
export type FootageFocus = "shots" | "graphics" | GraphicKind

/** Which of a script's two cards a chat message shows: Generate video brings the shots, Graphics the graphics. */
export type FootageShow = "shots" | "graphics"

// ---------- generic b-roll ----------
// Generate video's second list (Brendan, 2026-10-23): footage that belongs to no one script, each made once
// on tap with the composer's model and kept for everyone, like a script's shots.

export const BROLL: { id: string; label: string; prompt: string; seconds: number }[] = [
  { id: "rally", label: "Crowd at a rally", prompt: "Vertical 9:16 handheld footage of a diverse crowd at an outdoor civic rally, people holding blank hand-made signs, daylight, shallow depth of field, no readable text, no logos.", seconds: 5 },
  { id: "polling", label: "Polling place", prompt: "Vertical 9:16 footage inside a community polling place: voters at private booths and a poll worker's table, warm gymnasium light, faces out of focus, no readable text.", seconds: 5 },
  { id: "ballot", label: "Ballot being marked", prompt: "Vertical 9:16 close-up of a hand filling in an oval on a paper ballot with a pen, soft natural light, the ballot's printing blurred and unreadable.", seconds: 5 },
  { id: "statehouse", label: "State house", prompt: "Vertical 9:16 slow push-in on a classical gold-domed state house, flags moving in the wind, blue sky, morning light.", seconds: 5 },
  { id: "mainstreet", label: "Small-town main street", prompt: "Vertical 9:16 steady shot of a New England small-town main street: brick storefronts, people walking, late-afternoon sun, signs out of focus.", seconds: 5 },
  { id: "city", label: "City sidewalk", prompt: "Vertical 9:16 footage of a busy city sidewalk at golden hour, commuters crossing, traffic moving behind them, shallow depth of field.", seconds: 5 },
  { id: "townhall", label: "Town hall meeting", prompt: "Vertical 9:16 footage of a town hall meeting: residents in folding chairs, one person standing to speak at a microphone, warm indoor light, faces soft.", seconds: 5 },
  { id: "doors", label: "Door knocking", prompt: "Vertical 9:16 footage of a volunteer with a clipboard knocking on a suburban front door, autumn leaves on the walk, daylight.", seconds: 5 },
  { id: "kitchen", label: "Kitchen table", prompt: "Vertical 9:16 footage of a family at a kitchen table sorting mail and bills, warm morning light, faces soft.", seconds: 5 },
  { id: "phone", label: "Phone scrolling", prompt: "Vertical 9:16 close-up of a thumb scrolling a smartphone feed, the screen abstract and blurred, cozy indoor light.", seconds: 5 },
  { id: "handshake", label: "Handshake", prompt: "Vertical 9:16 close-up of two people shaking hands outdoors, shallow depth of field, daylight.", seconds: 5 },
  { id: "aerial", label: "Aerial landscape", prompt: "Vertical 9:16 aerial drone shot over New England autumn hills and a small town with a white church steeple, golden light.", seconds: 5 },
]

export const GRAPHIC_KINDS: { id: GraphicKind; label: string; about: string; seconds: number }[] = [
  { id: "checklist", label: "Checklist card", about: "A title, three checked rows and a footer bar, over the lower half", seconds: 5 },
  { id: "callout", label: "Callout", about: "One phrase from the script on screen, its key word in color", seconds: 3 },
  { id: "stat", label: "Stat card", about: "The script's number, large, with what it counts", seconds: 4 },
  { id: "quote", label: "Quote", about: "The strongest line, set as a pull quote", seconds: 4 },
  { id: "intro", label: "Intro", about: "A title card for the first seconds", seconds: 3 },
  { id: "end", label: "End credits", about: "The ask, full screen, over the close", seconds: 4 },
]

// ---------- the brand kit ----------
// The graphics' dress, picked from the Graphics card's palette (Brendan, 2026-10-23): a preset, a
// typeface, two colors and a logo, saved to the script with its footage.

export type BrandFont = "jakarta" | "condensed" | "serif"
export type Brand = { name: string; logo: string | null; primary: string; accent: string; font: BrandFont }

export const FONTS: Record<BrandFont, { label: string; stack: string }> = {
  // Plus Jakarta Sans by name where Remotion loads it (Studio, the renderer), and by --font-sans in the app,
  // where next/font gives it a hashed family; the var keeps a fallback, or the whole list fails without it.
  jakarta: { label: "Sans", stack: "'Plus Jakarta Sans', var(--font-sans, 'Inter'), system-ui, sans-serif" },
  condensed: { label: "Condensed", stack: "'Arial Narrow', 'Roboto Condensed', 'Helvetica Neue', sans-serif" },
  serif: { label: "Serif", stack: "Georgia, 'Times New Roman', serif" },
}

export const BRAND_PRESETS: Brand[] = [
  // The campaign's blue and orange as its Wave 2 cards draw them (Brendan, 2026-10-30): measured from Report 2's
  // frames and the tested videos, the same two values as src/video/theme.ts YES_ON_3; keep them in step.
  { name: "Yes on 3", logo: "/logos/channels/UC-rKSUWdEqPmP-UM7yV6Ssw.jpg", primary: "#003486", accent: "#e66026", font: "jakarta" },
  { name: "PAX", logo: null, primary: "#1e3a8a", accent: "#dc2626", font: "jakarta" },
]
