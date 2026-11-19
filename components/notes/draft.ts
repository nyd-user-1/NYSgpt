// The composer's draft, apart from the composer: the Inbox holds a draft before Compose and its editor
// (tiptap, ProseMirror, markdown-it) have loaded. compose.tsx re-exports both names.

export type Draft = { to: string[]; cc: string[]; bcc: string[]; subject: string; body: string; reportType?: string; from?: string }

export const EMPTY_DRAFT: Draft = { to: [], cc: [], bcc: [], subject: "", body: "" }
