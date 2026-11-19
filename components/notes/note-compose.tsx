"use client"

import * as React from "react"
import Link from "next/link"

import { recipientsOf } from "./address-book"
import { Compose, EMPTY_DRAFT, type Draft } from "./compose"

// A note's Compose shape (Brendan, 2026-11-02): the note as a mail. To takes the roster's people and the agents,
// the subject is the mail's own, and the body is the note itself, the one text both shapes edit. Send goes through
// /api/inbox/send, as the Inbox's does: the allowlist guards real mail, a send to an agent is kept in its mailbox and
// never mailed, and the server keeps it in my Sent, threaded as any other. Discard clears the lines and goes back
// to the note.
// NYSgpt (brief 61): there is no mail route here (pax-trinity's /api/inbox/send) and no address book; Send answers
// "Mail is not set up here." and sends nothing until MAIL_ROUTE names one.

const BOOK: string[] = []
const MAIL_ROUTE: string | null = null

type Sent = { ok: true; threadId?: string; note: string | null } | { ok: false; error: string }

export function NoteCompose({ body, onBody, onClose }: { body: string; onBody: (body: string) => void; onClose: () => void }) {
  const [lines, setLines] = React.useState<Omit<Draft, "body">>(() => {
    const { body: _, ...rest } = EMPTY_DRAFT
    return rest
  })
  const [sending, setSending] = React.useState(false)
  const [sent, setSent] = React.useState<Sent | null>(null)
  const draft: Draft = { ...lines, body }

  const send = async (d: Draft) => {
    if (!MAIL_ROUTE) return setSent({ ok: false, error: "Mail is not set up here." })
    setSending(true)
    setSent(null)
    try {
      const res = await fetch(MAIL_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipientsOf(d.to), cc: recipientsOf(d.cc), subject: d.subject, markdown: d.body }),
      })
      const out = (await res.json().catch(() => ({}))) as { error?: string; held?: string[]; threadIds?: string[] }
      if (!res.ok || out.error) setSent({ ok: false, error: out.error ?? `Not sent (${res.status}).` })
      else {
        setSent({ ok: true, threadId: out.threadIds?.[0], note: out.held?.length ? `${out.held.length} held by the allowlist` : null })
        setLines((l) => ({ ...l, to: [], cc: [], bcc: [], subject: "" }))
      }
    } catch {
      setSent({ ok: false, error: "Not sent: the server can't be reached." })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pt-2 pb-3" data-note-compose>
      <Compose
        book={BOOK}
        placeholder="Write…"
        draft={draft}
        onChange={(d) => {
          const { body: next, ...rest } = d
          setLines(rest)
          if (next !== body) onBody(next)
        }}
        onSend={(d) => void (sending ? undefined : send(d))}
        onDiscard={() => {
          setLines((l) => ({ ...l, to: [], cc: [], bcc: [], subject: "" }))
          setSent(null)
          onClose()
        }}
      />
      {sent && (
        <p role="status" className={sent.ok ? "pt-2 text-xs text-slate-500" : "pt-2 text-xs text-pax2-red"}>
          {sent.ok ? (
            <>
              Message sent{sent.note ? ` · ${sent.note}` : ""}
              {sent.threadId && (
                <>
                  {" · "}
                  <Link href={`${MAIL_ROUTE}?thread=${encodeURIComponent(sent.threadId)}`} className="font-medium text-pax2-blue hover:underline">
                    View
                  </Link>
                </>
              )}
            </>
          ) : (
            sent.error
          )}
        </p>
      )}
    </div>
  )
}
