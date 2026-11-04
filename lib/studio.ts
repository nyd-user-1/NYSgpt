// Remotion Studio's address inside PAX, for /studio and the right panel's Studio view. The Studio is a
// static bundle served at /studio-app (src/app/studio-app); it names a composition by query string,
// /studio-app?/v-lift-card-2, not by path.

/** A Remotion composition id: a template (lift-card), a graphic (graphic-checklist), or a saved version (v-lift-card-2). */
export const isCompositionId = (id: unknown): id is string => typeof id === "string" && /^[a-zA-Z0-9-]{1,120}$/.test(id)

export const studioSrc = (id?: string | null) => (id && isCompositionId(id) ? `/studio-app?/${id}` : "/studio-app")

/** Fired on window whenever a video version is saved ({ detail: { id } }), so an open Studio reloads onto it. */
export const VERSIONS_CHANGED = "video-versions:changed"

/** Opens the right panel on the Studio (the shell and the panel listen). */
export const STUDIO_OPEN = "studio:open"

// What the panel should open on when it next mounts or hears STUDIO_OPEN, as Housekeeping's openHousekeeping.
let pending: { id: string | null } | null = null
export const takeStudio = () => {
  const was = pending
  pending = null
  return was
}

/** Opens the right panel's Studio on a composition: a chat video's saved version, or its template. */
export function openStudio(id: string | null) {
  pending = { id: id && isCompositionId(id) ? id : null }
  window.dispatchEvent(new Event(STUDIO_OPEN))
}

// ---------- a chat's video blocks and the versions they were saved as ----------

/** A short stable hash of a block's JSON (djb2), to tell the blocks in one message apart. */
function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/** The key a chat's video block is saved under: its chat, its message, and its own JSON. The same block
 *  drawn again, or read back from the saved chat, has the same key, so it is saved once. */
export const blockKey = (chatId: string | undefined, messageId: string, json: string) => `${chatId ?? "chat"}#${messageId}#${hash(json.trim())}`

const drawn = new Map<string, string>()
/** A block was saved (or found saved) as this version. */
export const noteDrawn = (key: string, id: string) => void drawn.set(key, id)

const BLOCK = /```pax-video\s*\n([\s\S]*?)```/g

/** A reply as the model reads it back: each video block it wrote carries, as "version", the version it was
 *  saved as, so a revision can name its parent. The reply on screen is unchanged. */
export function withVersions(content: string, keyOf: (json: string) => string): string {
  return content.replace(BLOCK, (whole, json: string) => {
    const id = drawn.get(keyOf(json))
    if (!id) return whole
    try {
      const v: unknown = JSON.parse(json)
      if (!v || typeof v !== "object" || Array.isArray(v)) return whole
      return "```pax-video\n" + JSON.stringify({ ...v, version: id }) + "\n```"
    } catch {
      return whole
    }
  })
}
