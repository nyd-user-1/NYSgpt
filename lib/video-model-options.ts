// The chat's text-to-video models, the shape of model-options.ts: the picker and the enhance flow
// both read it. The order below is also the fallback order — a demo cannot know which account has
// credits left, so a failed provider hands the prompt to the next one down this list.

export type VideoProvider = "kling" | "veo" | "higgsfield" | "elevenlabs"

export type VideoModelOption = { id: VideoProvider; label: string; description: string; logo: string | null }

export const VIDEO_MODEL_OPTIONS: VideoModelOption[] = [
  { id: "kling", label: "Kling 3.0 Turbo", description: "Kuaishou", logo: "/logos/KLING.jpg" },
  { id: "veo", label: "Veo 3.1", description: "Google", logo: "/logos/VEO.png" },
  { id: "higgsfield", label: "Seedance 2.5", description: "ByteDance, through Higgsfield", logo: "/logos/HIGGSFIELD.png" },
  { id: "elevenlabs", label: "Seedance", description: "ByteDance, through ElevenLabs", logo: "/logos/11ELVEN LABS.png" },
]

export const DEFAULT_VIDEO_MODEL = VIDEO_MODEL_OPTIONS[0].id
export const videoModelById = (id: string | undefined) => VIDEO_MODEL_OPTIONS.find((m) => m.id === id) ?? VIDEO_MODEL_OPTIONS[0]

/** The chosen provider first, then the rest in list order. */
export const fallbackChain = (first: VideoProvider): VideoProvider[] => [first, ...VIDEO_MODEL_OPTIONS.map((m) => m.id).filter((id) => id !== first)]
