"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export type ThreadComment = { id: string; author: string; avatar: string; text: string; likes: number; published: string }
export type Thread = ThreadComment & { replies: ThreadComment[]; replyCount: number }

type Mine = { id: string; text: string; at: string }

const COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 })
const ago = (iso: string) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  const days = Math.round(mins / 1440)
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.round(days / 30)}mo ago`
  return `${Math.round(days / 365)}y ago`
}

function Body({ c, you }: { c: ThreadComment; you?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline gap-2 text-xs">
        <span className={cn("truncate font-medium", you ? "text-pax2-blue" : "text-slate-900")}>{c.author}</span>
        <span className="shrink-0 text-slate-500">{ago(c.published)}</span>
      </div>
      <p className="line-clamp-4 whitespace-pre-line break-words text-sm leading-relaxed text-slate-800">{c.text}</p>
      {c.likes > 0 && <span className="tabular text-xs text-pax2-blue">{COMPACT.format(c.likes)} likes</span>}
    </div>
  )
}

/**
 * The video's comments with their replies hanging off them on the branched menu's tree lines: a trunk
 * under the comment's avatar, a rounded elbow into each reply, the line drawn in the accent for the
 * reader's own. Replies the reader writes live in this browser.
 */
/** A commenter's picture; with none (YouTube sent no URL), their initial in a circle instead of an empty src. */
function Avatar({ src, name, className }: { src?: string; name?: string; className: string }) {
  if (src) return <img src={src} alt="" className={cn("shrink-0 rounded-full bg-slate-100 object-cover", className)} referrerPolicy="no-referrer" />
  return <span aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-500", className)}>{(name?.replace(/^@/, "").trim()[0] ?? "?").toUpperCase()}</span>
}

export function CommentThread({ videoId, threads }: { videoId: string; threads: Thread[] }) {
  const key = `pax2:replies:${videoId}`
  const [mine, setMine] = React.useState<Record<string, Mine[]>>({})
  const [open, setOpen] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState("")
  React.useEffect(() => setMine(JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, Mine[]>), [key])
  const post = (threadId: string) => {
    const text = draft.trim()
    if (!text) return
    const next = { ...mine, [threadId]: [...(mine[threadId] ?? []), { id: `${Date.now()}`, text, at: new Date().toISOString() }] }
    setMine(next)
    localStorage.setItem(key, JSON.stringify(next))
    setDraft("")
    setOpen(null)
  }

  return (
    <ul className="flex flex-col divide-y divide-slate-100">
      {threads.map((t) => {
        const replies = [...t.replies.map((r) => ({ c: r, you: false })), ...(mine[t.id] ?? []).map((m) => ({ c: { id: m.id, author: "You", avatar: "", text: m.text, likes: 0, published: m.at }, you: true }))]
        return (
          <li key={t.id} className="py-3 first:pt-0 last:pb-0">
            <div className="relative flex gap-3">
              {/* The trunk leaves the avatar and runs down into the replies. */}
              {(replies.length > 0 || open === t.id) && <span aria-hidden className="absolute -bottom-2 left-4 top-10 w-px bg-slate-300" />}
              <Avatar src={t.avatar} name={t.author} className="size-8 text-xs" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Body c={t} />
                <div className="flex items-center gap-3 text-xs">
                  <button type="button" onClick={() => (setOpen(open === t.id ? null : t.id), setDraft(""))} className="font-medium text-pax2-blue hover:underline">
                    Reply
                  </button>
                  {t.replyCount > t.replies.length && <span className="text-slate-500">{t.replyCount - t.replies.length} more on YouTube</span>}
                </div>
              </div>
            </div>
            {(replies.length > 0 || open === t.id) && (
              <ul className="mt-2 flex flex-col">
                {replies.map(({ c, you }, i) => {
                  const last = i === replies.length - 1 && open !== t.id
                  return (
                    <li key={c.id} className="relative pb-2 pl-11 pt-1 last:pb-0">
                      {/* The trunk runs on past this reply to the next; the elbow turns into this one. */}
                      {!last && <span aria-hidden className="absolute bottom-0 left-4 top-0 w-px bg-slate-300" />}
                      <span aria-hidden className={cn("absolute left-4 top-0 h-4 w-5 rounded-bl-[10px] border-b-[1.5px] border-l-[1.5px]", you ? "border-pax2-light-blue" : "border-slate-300")} />
                      <div className="flex gap-2.5">
                        {you ? (
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-pax2-lavender text-[10px] font-semibold text-pax2-blue">You</span>
                        ) : (
                          <Avatar src={c.avatar} name={c.author} className="size-6 text-[10px]" />
                        )}
                        <Body c={c} you={you} />
                      </div>
                    </li>
                  )
                })}
                {open === t.id && (
                  <li className="relative pb-0 pl-11 pt-1">
                    <span aria-hidden className="absolute left-4 top-0 h-4 w-5 rounded-bl-[10px] border-b-[1.5px] border-l-[1.5px] border-pax2-light-blue" />
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        post(t.id)
                      }}
                      className="flex flex-col gap-2"
                    >
                      <textarea
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Add a reply"
                        rows={2}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-pax2-surface px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-pax2-blue"
                      />
                      <div className="flex justify-end gap-2 text-xs">
                        <button type="button" onClick={() => setOpen(null)} className="rounded-full px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-100">
                          Cancel
                        </button>
                        <button type="submit" disabled={!draft.trim()} className="rounded-full bg-pax2-blue px-3 py-1.5 font-medium text-white disabled:opacity-50">
                          Reply
                        </button>
                      </div>
                    </form>
                  </li>
                )}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}
