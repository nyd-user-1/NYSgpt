// Dev Comments' threads (Brendan, 2026-11-01): the pure rules the store (lib/housekeeping.ts), its routes
// and the panel (components/housekeeping/view.tsx) share. A message becomes a thread of replies, each a
// row of its own under the same partition, pointing at its parent's sort key. Replies are a person's
// (the panel's composer) or Claude's (written through the loop's API). The super admin can send a
// pointed comment to Claude: its status goes "claude" until Claude replies ("answered"); Claude may add a
// follow-up or a correction while it stands answered (Brendan, 2026-11-01); a person's reply on an answered
// thread sends it back to "claude". A reply of Claude's may carry the commit and the unified diff of what it
// changed. The super admin's feedback on a reply of Claude's (up or down, his training signal to the loop)
// and his bookmark on it ride on the reply's row; the Bookmarks thread is a view of every bookmarked reply,
// not a copy. Claude's replies, those two statuses, the prompt, the locator bundle, and a reply's commit,
// diff, feedback and bookmark are the super admin's alone: every read path passes its rows through forReader.

/** The Admin channel's partition (Brendan, 2026-11-01): the super admin and Claude. Everything he writes
 *  there goes straight to Claude, as a pointed comment sent to Claude does; none of it reaches anyone else. */
export const ADMIN = "ADMIN"

/** The author id of Claude's replies, and the name and mark they show with. */
export const CLAUDE = "claude"
export const CLAUDE_NAME = "Claude"
export const CLAUDE_MARK = "/logos/models/anthropic.webp"

export type Status = "open" | "resolved" | "claude" | "answered"

/** The fields every reader may see, and the ones that stay the super admin's. */
type Row = { pk?: string; author: string; kind: string; status: string; replyTo?: string; prompt?: string; promptAt?: string; bundle?: string; claudeAt?: string; answeredAt?: string; commit?: string; diff?: string; feedback?: string; bookmarked?: boolean }

/** A thread's rows as one reader may see them: all of it for the super admin; for anyone else, nothing of
 *  the Admin channel, no reply of Claude's, no prompt, bundle, commit, diff, feedback or bookmark, and a
 *  comment with Claude (or answered) reading as open. */
export function forReader<T extends Row>(rows: T[], superAdmin: boolean): T[] {
  if (superAdmin) return rows
  return rows
    .filter((r) => r.author !== CLAUDE && r.pk !== ADMIN)
    .map((r) => {
      const { prompt: _p, promptAt: _pa, bundle: _b, claudeAt: _c, answeredAt: _a, commit: _cm, diff: _d, feedback: _f, bookmarked: _bm, ...rest } = r
      return { ...rest, status: r.status === "claude" || r.status === "answered" ? "open" : r.status } as T
    })
}

/** Whether Claude may reply: on a comment with Claude, or again on one it answered (a follow-up or a
 *  correction before the super admin responds). Not on an open or resolved one. */
export const claudeMayReply = (status: Status) => status === "claude" || status === "answered"

/** A comment's status once a reply lands: Claude's answers it, from "claude" or again from "answered" (a
 *  follow-up, its answeredAt fresh); a person's reply on an answered comment sends it back to Claude;
 *  anything else leaves the status as it is (null). */
export function statusAfterReply(status: Status, byClaude: boolean): Status | null {
  if (byClaude) return claudeMayReply(status) ? "answered" : null
  return status === "answered" ? "claude" : null
}

/** Top-level messages in their order, each with its replies in theirs (rows arrive oldest first). A reply
 *  whose parent is not in the list (past the read's limit) is left out rather than shown loose. */
export function grouped<T extends { sk: string; kind: string; replyTo?: string }>(rows: T[]): { message: T; replies: T[] }[] {
  const top = rows.filter((r) => r.kind !== "reply")
  const by = new Map(top.map((m) => [m.sk, [] as T[]]))
  for (const r of rows) if (r.kind === "reply" && r.replyTo) by.get(r.replyTo)?.push(r)
  return top.map((message) => ({ message, replies: [...(by.get(message.sk) ?? [])].sort((a, b) => a.sk.localeCompare(b.sk)) }))
}

/** Replies of Claude's that pass a test, each with the message it answers, newest first: the Bookmarks
 *  thread (bookmarked) and the loop's feedback list (any feedback). Rows from several partitions may mix;
 *  a reply's parent is in its own partition. A reply whose parent is gone is left out. */
export function repliesWith<T extends { pk: string; sk: string; kind: string; author: string; replyTo?: string }>(rows: T[], test: (r: T) => boolean): { reply: T; parent: T }[] {
  const parents = new Map(rows.filter((r) => r.kind !== "reply").map((r) => [`${r.pk}\u0001${r.sk}`, r]))
  return rows
    .filter((r) => r.kind === "reply" && r.author === CLAUDE && test(r))
    .flatMap((reply) => {
      const parent = parents.get(`${reply.pk}\u0001${reply.replyTo}`)
      return parent ? [{ reply, parent }] : []
    })
    .sort((a, b) => b.reply.sk.localeCompare(a.reply.sk))
}
