"use client"

import * as React from "react"
import { MessageSquareText } from "lucide-react"
import type { Editor } from "@tiptap/react"

import { cn } from "@/lib/utils"
import { TEAM_PLACES, teamText, type TeamPlace } from "@/lib/note-team"
import { TaskSurface, TaskToolbar } from "./rich-body"

// A note's Team shape (Brendan, 2026-11-02): the note posted to the team with the page it was written on. One row
// checks where, each place with its mark: a Dev Comment on this page (the stream every admin reads), Slack's #pax2,
// Discord's #pax, any one, two or all three. Post sends the note's text and the page's link to each place checked
// (app/api/notes/team, one post a place) and says, place by place, where it went and where it didn't. The note is
// the one text every shape edits.
// NYSgpt (brief 61): the Dev Comment goes through NYSgpt's comments kit (app/api/housekeeping, a message in the
// stream with the page's link); Slack and Discord have no webhook here and answer "not set up here" until Brendan
// supplies them. Every place stays checkable, as no route says which are connected.

type Result = { place: TeamPlace; label: string } & ({ ok: true } | { ok: false; error: string })

export function NoteTeam({ editor, body }: { editor: Editor | null; body: string }) {
  const [to, setTo] = React.useState<TeamPlace[]>(["comments"])
  const [open] = React.useState<Partial<Record<TeamPlace, boolean>>>({ comments: true })
  const [busy, setBusy] = React.useState(false)
  const [results, setResults] = React.useState<Result[] | null>(null)
  // A place that can't take a post leaves the checked ones.
  const chosen = to.filter((p) => open[p] !== false)
  const toggle = (place: TeamPlace) => setTo((t) => (t.includes(place) ? t.filter((p) => p !== place) : TEAM_PLACES.map((x) => x.place).filter((p) => p === place || t.includes(p))))
  const [here, setHere] = React.useState("")
  React.useEffect(() => {
    setHere(`${window.location.pathname}${window.location.search}`)
  }, [])

  const post = async () => {
    if (!body.trim() || !chosen.length || busy) return
    setBusy(true)
    setResults(null)
    const one = async (place: TeamPlace): Promise<Result> => {
      const label = TEAM_PLACES.find((x) => x.place === place)?.label ?? place
      if (place !== "comments") return { place, label, ok: false, error: "not set up here" }
      try {
        const res = await fetch("/api/housekeeping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "message", text: teamText(place, body, window.location.href, ""), page: document.title, route: window.location.pathname }),
        })
        const out = (await res.json().catch(() => ({}))) as { message?: unknown; error?: string }
        return res.ok && out.message ? { place, label, ok: true } : { place, label, ok: false, error: out.error ?? `It answered ${res.status}.` }
      } catch {
        return { place, label, ok: false, error: "The server can't be reached." }
      }
    }
    setResults(await Promise.all(chosen.map(one)))
    setBusy(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-note-team>
      <TaskToolbar editor={editor} className="shrink-0 border-b border-slate-200 px-2 py-1" />
      <div className="min-h-0 flex-1 cursor-text overflow-y-auto px-4 py-3" onClick={() => editor?.commands.focus()}>
        <TaskSurface editor={editor} className="min-h-full [&_.ProseMirror]:min-h-full" />
      </div>
      <div className="shrink-0 border-t border-slate-200 px-3 py-2">
        <div role="group" aria-label="Post to" className="flex flex-wrap gap-1.5">
          {TEAM_PLACES.map(({ place, label, mark }) => {
            const ready = open[place] !== false
            const on = ready && to.includes(place)
            return (
              <button
                key={place}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={!ready}
                title={ready ? label : `${label} isn't connected`}
                onClick={() => toggle(place)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-40",
                  on ? "border-pax2-light-blue bg-pax2-lavender text-pax2-blue" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {mark ? <img src={mark} alt="" className="size-3.5 shrink-0 object-contain" /> : <MessageSquareText className="size-3.5 shrink-0" />}
                {label}
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-400" title={here}>
            {here}
          </span>
          <button type="button" disabled={!body.trim() || !chosen.length || busy} onClick={() => void post()} className="rounded-full bg-pax2-blue px-3.5 py-1 text-xs font-medium text-white disabled:opacity-40">
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
        {results && (
          <ul role="status" className="pt-1.5 text-xs">
            {results.map((r) => (
              <li key={r.place} className={r.ok ? "text-slate-500" : "text-pax2-red"}>
                {r.ok ? `Posted to ${r.label}` : `Not posted to ${r.label}: ${r.error}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
