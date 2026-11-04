// Who is who, NYSgpt's own cast (ported shape from pax-trinity's lib/roles, 2026-11-04;
// trinity's people and partners stayed home). One super admin; more arrive when Brendan adds them.

export type Role = "superadmin" | "admin" | "staff" | "partner"

/** A member's sign-in address, and any others that are the same person. */
export type Member = { name: string; email?: string; aliases?: string[]; role: Role; /** The headshot in public/. */ photo?: string; /** A partner account's organization (PARTNERS' id). */ partner?: string }

export const MEMBERS: Member[] = [
  { name: "Brendan Stanton", email: "brendan@nysgpt.com", aliases: ["brendan.stanton@gmail.com"], role: "superadmin" },
]

export type Partner = { id: string; name: string; youtube: string | null }

export const PARTNERS: Partner[] = []

export const memberByEmail = (email: string) => {
  const e = email.toLowerCase()
  return MEMBERS.find((m) => m.email?.toLowerCase() === e || m.aliases?.some((a) => a.toLowerCase() === e))
}

/** A person's name where the UI lists people by first name: the first name, with the last
 *  name's initial when another member shares it. */
export function shortName(name: string): string {
  const [first = "", ...rest] = name.trim().split(/\s+/)
  const last = rest.at(-1)
  const shared = MEMBERS.some((m) => m.name.trim() !== name.trim() && m.name.trim().split(/\s+/)[0] === first)
  return shared && last ? `${first} ${last[0]}.` : first
}

/** The super admin, the developer: the one role that edits and resolves. */
export const isSuperAdmin = (email: string) => memberByEmail(email)?.role === "superadmin"
