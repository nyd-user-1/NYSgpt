// NYSgpt stand-in for pax-trinity's src/lib/partners/mailboxes.ts (brief 46): the same exports the chat imports, without pax-trinity's
// services. What it would do there is said beside each export.

// pax-trinity gives each partner organization a platform inbox. NYSgpt has none.

export type OrgBox = { box: string; org: string; name: string; email: string }

export const orgBox = (key: string | null | undefined): OrgBox | undefined => {
  void key
  return undefined
}
