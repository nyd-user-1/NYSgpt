// Who is in Dev Comments on NYSgpt, and the gate every dev tool shares (2026-11-19). pax-trinity reads its
// members and their roles from lib/roles.ts and opens the tools to signed-in admins; NYSgpt has no admin
// role, so the tools run on the dev server alone, where one person writes: Brendan, the super admin.

export type Person = { email: string; name: string; role: "superadmin" | "admin"; photo?: string }

/** The id comments are written under on the dev server. */
export const ME = "brendan"

export const MEMBERS: Person[] = [{ email: ME, name: "Brendan Stanton", role: "superadmin" }]

export const memberByEmail = (email: string) => MEMBERS.find((m) => m.email === email.trim().toLowerCase())

/** The gate: true under `next dev` alone. A production build inlines NODE_ENV as "production", so every
 *  route that checks this answers 404 there, and the layout's mount is compiled out. */
export const devOnly = () => process.env.NODE_ENV === "development"

/** The person a dev-tools request acts for: the super admin on the dev server, nobody anywhere else. */
export function devUser(): { email: string; admin: true; superAdmin: true } | null {
  return devOnly() ? { email: ME, admin: true, superAdmin: true } : null
}

/** A first name, with the last initial when another member shares the first name. */
export function shortName(name: string): string {
  const [first = "", ...rest] = name.trim().split(/\s+/)
  const last = rest.at(-1)
  const shared = MEMBERS.some((m) => m.name.trim() !== name.trim() && m.name.trim().split(/\s+/)[0] === first)
  return shared && last ? `${first} ${last.charAt(0)}.` : first
}
