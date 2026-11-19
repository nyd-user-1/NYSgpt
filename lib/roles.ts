// NYSgpt stand-in for pax-trinity's src/lib/roles.ts (brief 46): the same exports the chat imports, without pax-trinity's
// services. What it would do there is said beside each export.

// pax-trinity's members and partner organizations, which @ reaches in the chat and the Blocks' menu
// names. Placeholders until NYSgpt's are named.

export type Role = "superadmin" | "admin" | "staff" | "partner"
export type Member = { name: string; email?: string; aliases?: string[]; role: Role; photo?: string; partner?: string }
export type Partner = { id: string; name: string; youtube: string | null }

export const MEMBERS: Member[] = [{ name: "Placeholder person", email: "placeholder@example.invalid", role: "staff" }]
export const PARTNERS: Partner[] = [{ id: "placeholder-organization", name: "Placeholder organization", youtube: null }]
