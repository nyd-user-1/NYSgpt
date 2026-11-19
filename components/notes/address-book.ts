// A note's Compose address book (brief 61). pax-trinity's (lib/agents/inbox.ts) lists its agents, staff, partners and
// channels; NYSgpt has none of them, so the book is empty and a recipient is an address typed in full: the composer
// offers what was typed as the one entry while it looks like an e-mail address (compose.tsx). The names and the
// shape of an address are pax-trinity's, so compose.tsx and face.tsx read them as written.

export type Address = {
  /** The handle a chip carries: here the address itself. */
  agent: string
  name: string
  email: string
  monogram: string
  speciality: string
  kind: "person" | "agent" | "partner" | "channel" | "group"
  image?: string
}

/** The book's groups, as pax-trinity's composer takes them. NYSgpt has no book. */
export const ADDRESS_GROUPS: { value: string; items: Address[] }[] = []

/** What a handle reads as: one in the book (none here), or an address typed in full. */
export const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

export function addressFor(handle: string): Address | null {
  const email = handle.trim()
  if (!looksLikeEmail(email)) return null
  return { agent: email, name: email, email, monogram: email.slice(0, 2).toUpperCase(), speciality: "", kind: "person" }
}

export const nameOf = (handle: string) => addressFor(handle)?.name ?? handle

/** The chips on a line as the mail route takes them, as pax-trinity's recipientsOf. */
export function recipientsOf(handles: string[]): { email: string; name?: string }[] {
  return handles.flatMap((handle) => {
    const a = addressFor(handle)
    if (!a) return handle.includes("@") ? [{ email: handle }] : []
    if (a.kind === "agent") return [{ email: a.email }]
    if (a.kind === "person" || a.kind === "partner") return [{ email: a.email, name: a.name }]
    return []
  })
}
