// The Studio's design variables (requirement 1, the camera-free path), one record per take so the
// Studio is an experiment generator: every choice is written onto the original as its `style` and
// becomes a pre-publish feature the hit model can read once PAX2's own videos have outcomes. Shared by
// the composition (src/components/studio/script-video.tsx), the page and the server actions; nothing
// else defines these lists.

export type Look = { id: string; label: string; background: string; ink: string; accent: string; muted: string }
export const LOOKS: Look[] = [
  { id: "navy", label: "Navy", background: "#1e3a8a", ink: "#ffffff", accent: "#fca5a5", muted: "#3b5bb5" },
  { id: "paper", label: "Paper", background: "#f8fafc", ink: "#0f172a", accent: "#dc2626", muted: "#e2e8f0" },
  { id: "flag", label: "Red", background: "#b91c1c", ink: "#ffffff", accent: "#bfdbfe", muted: "#dc2626" },
  { id: "night", label: "Night", background: "#0b1120", ink: "#f8fafc", accent: "#60a5fa", muted: "#1e293b" },
]

export type Motion = "rise" | "zoom" | "type"
export const MOTIONS: { id: Motion; label: string }[] = [
  { id: "rise", label: "Rise" },
  { id: "zoom", label: "Zoom" },
  { id: "type", label: "Word by word" },
]

export type Font = "display" | "serif" | "mono"
export const FONTS: { id: Font; label: string; family: string }[] = [
  { id: "display", label: "Display", family: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { id: "serif", label: "Serif", family: "Georgia, 'Times New Roman', serif" },
  { id: "mono", label: "Mono", family: "ui-monospace, Menlo, Consolas, monospace" },
]

export type Size = "s" | "m" | "l"
export const SIZES: { id: Size; label: string; scale: number }[] = [
  { id: "s", label: "Small", scale: 0.82 },
  { id: "m", label: "Medium", scale: 1 },
  { id: "l", label: "Large", scale: 1.18 },
]

export type Position = "center" | "lower"
export const POSITIONS: { id: Position; label: string }[] = [
  { id: "center", label: "Centered" },
  { id: "lower", label: "Lower third" },
]

/** Voices: twelve from ElevenLabs (premade; ids as its /v1/voices lists them, 2026-10-19), which read
 *  more naturally and return character timings, and four Amazon Polly neural voices, the three the
 *  project used for its stand-in takes and one more, which need no outside account. ElevenLabs voices
 *  need ELEVENLABS_API_KEY on the server; the free tier is 10,000 characters a month, about 30 scripts,
 *  and a script already narrated in a voice is served from S3 without spending any. */
export type VoiceId = "none" | "Ruth" | "Stephen" | "Danielle" | "Matthew" | `el:${string}`
export type Voice = { id: VoiceId; label: string; provider: "ElevenLabs" | "Polly" | "none" }
export const VOICES: Voice[] = [
  { id: "none", label: "Silent", provider: "none" },
  { id: "el:EXAVITQu4vr4xnSDxMaL", label: "Sarah", provider: "ElevenLabs" },
  { id: "el:XrExE9yKIg1WjnnlVkGX", label: "Matilda", provider: "ElevenLabs" },
  { id: "el:cjVigY5qzO86Huf0OWal", label: "Eric", provider: "ElevenLabs" },
  { id: "el:nPczCjzI2devNBz1zQrb", label: "Brian", provider: "ElevenLabs" },
  { id: "el:TX3LPaxmHKxFdv7VOQHJ", label: "Liam", provider: "ElevenLabs" },
  { id: "el:FGY2WhTYpPnrIDTdsKH5", label: "Laura", provider: "ElevenLabs" },
  { id: "el:cgSgspJ2msm6clMCkdW9", label: "Jessica", provider: "ElevenLabs" },
  { id: "el:pqHfZKP75CvOlQylNhV4", label: "Bill", provider: "ElevenLabs" },
  { id: "el:onwK4e9ZLuTAKqWW03F9", label: "Daniel", provider: "ElevenLabs" },
  { id: "el:Xb7hH8MSUJpSbSDYk0k2", label: "Alice", provider: "ElevenLabs" },
  { id: "el:JBFqnCBsd6RMkjVDRZzb", label: "George", provider: "ElevenLabs" },
  { id: "el:pNInz6obpgDQGcFmaJgB", label: "Adam", provider: "ElevenLabs" },
  { id: "Ruth", label: "Ruth", provider: "Polly" },
  { id: "Danielle", label: "Danielle", provider: "Polly" },
  { id: "Stephen", label: "Stephen", provider: "Polly" },
  { id: "Matthew", label: "Matthew", provider: "Polly" },
]
export const voiceLabel = (id: VoiceId) => VOICES.find((v) => v.id === id)?.label ?? id

/** The sound beds scripts/studio/music-beds.mjs synthesizes, under studio/music/ in the bucket. */
export type MusicId = "none" | "calm" | "pulse" | "bright"
export const MUSIC: { id: MusicId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "calm", label: "Calm" },
  { id: "pulse", label: "Pulse" },
  { id: "bright", label: "Bright" },
]

export type StyleRecord = {
  version: 2
  color: string
  motion: Motion
  /** Words a minute the lines are paced at when silent; narrated, the voice sets the pace. */
  wpm: number
  font: Font
  size: Size
  /** Numbers and names in the accent color. */
  emphasis: boolean
  position: Position
  /** A title card with the script's first number or question before the lines. */
  hookCard: boolean
  /** The closing card with the ask. */
  endCard: boolean
  /** A small text mark on every scene; off by default, and never a campaign's logo. */
  mark: boolean
  markText: string
  voice: VoiceId
  music: MusicId
}

export const DEFAULT_STYLE: StyleRecord = { version: 2, color: "navy", motion: "rise", wpm: 150, font: "display", size: "m", emphasis: true, position: "center", hookCard: false, endCard: true, mark: false, markText: "", voice: "none", music: "none" }

export const WPM_MIN = 110
export const WPM_MAX = 190

export const FPS = 30
export const END_FRAMES = 75
export const HOOK_FRAMES = 60

/** The lines a script is drawn as: its paragraphs, split on newlines. */
export const linesOf = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean)

/** A line's time on screen when silent: its words at the pace, floored at 1.6 seconds, capped at 7. */
export const sceneSeconds = (line: string, wpm: number) => Math.min(7, Math.max(1.6, (line.split(/\s+/).filter(Boolean).length / wpm) * 60))
export const sceneFrames = (line: string, wpm: number) => Math.round(sceneSeconds(line, wpm) * FPS)

/** Word timings from Polly's speech marks: the second each word starts. */
export type WordMark = { t: number; w: string }

/** A line's spoken words: tokens with a letter or digit, so a lone dash is not counted, as Polly does not mark it. */
export const isWord = (token: string) => /[\p{L}\p{N}]/u.test(token)
export const wordCount = (line: string) => line.split(/\s+/).filter((w) => w && isWord(w)).length

/** When narrated, each line starts where its first word is spoken and the last line ends a beat after the last word. */
export function narratedStarts(lines: string[], marks: WordMark[]): { starts: number[]; end: number } {
  const starts: number[] = []
  let k = 0
  for (const line of lines) {
    starts.push(marks[Math.min(k, marks.length - 1)]?.t ?? 0)
    k += wordCount(line)
  }
  const last = marks[marks.length - 1]?.t ?? 0
  return { starts, end: last + 1.2 }
}

/** Frames of the whole video for a style: hook card, the lines at the pace or the voice, the end card. */
export function timeline(lines: string[], style: StyleRecord, marks: WordMark[] | null): { from: number[]; durations: number[]; hook: number; end: number; total: number } {
  const hook = style.hookCard ? HOOK_FRAMES : 0
  const end = style.endCard ? END_FRAMES : 0
  const from: number[] = []
  const durations: number[] = []
  if (marks && marks.length) {
    const { starts, end: lastSec } = narratedStarts(lines, marks)
    const edges = [...starts.map((s) => Math.round(s * FPS)), Math.round(lastSec * FPS)]
    lines.forEach((_, i) => {
      from.push(hook + edges[i])
      durations.push(Math.max(FPS, edges[i + 1] - edges[i]))
    })
  } else {
    let at = hook
    for (const l of lines) {
      const d = sceneFrames(l, style.wpm)
      from.push(at)
      durations.push(d)
      at += d
    }
  }
  const body = from.length ? from[from.length - 1] + durations[durations.length - 1] - hook : 0
  return { from, durations, hook, end, total: hook + body + end }
}

export const styleLabel = (s: StyleRecord) => {
  const look = LOOKS.find((l) => l.id === s.color)?.label ?? s.color
  const motion = MOTIONS.find((m) => m.id === s.motion)?.label ?? s.motion
  const voice = s.voice === "none" ? "silent" : `read by ${s.voice}`
  const music = s.music === "none" ? "" : `, ${s.music} bed`
  return `${look}, ${motion}, ${voice}${music}`
}
