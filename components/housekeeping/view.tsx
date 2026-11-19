"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { Archive, ArrowBigDown, ArrowBigUp, Bookmark, Check, ChevronDown, ChevronRight, Copy, ImagePlus, Loader2, MapPin, Minus, Pencil, Plus, RotateCcw, SendHorizontal, SquareTerminal, X } from "lucide-react"

import { DiffBar } from "@/components/dev/diff-bar"
import { diffStats } from "@/lib/diff/stats"
import { ADMIN, CLAUDE, CLAUDE_MARK, grouped } from "@/lib/housekeeping-thread"
import { shortName } from "@/lib/housekeeping-people"
import { cn } from "@/lib/utils"
import { goToComment, HOUSEKEEPING_CHANGED, HOUSEKEEPING_OPEN, shrink, takeFocus } from "./tool"

// Housekeeping in the right panel (Brendan, 2026-10-30): a chat stream. "Everyone" is the stream
// every admin reads and writes, pointed comments included; each other person opens a one-to-one
// thread. The list holds what is open; resolving moves a message to the archive (the box icon),
// where reopening brings it back. A pointed comment's pin opens its page with its element outlined.
// The super admin alone resolves, reopens and edits, and sees beside each message the prompt that
// would address it (the terminal icon), or "Prompt unavailable" where no change could be read.
// Screenshots attach by paste, drop or the image button.
// Every message is a thread (Brendan, 2026-11-01; lib/housekeeping-thread.ts): its replies hang off it on
// the branched comment design's lines (components/comment-thread.tsx), a trunk from its avatar and an
// elbow into each reply, and Reply opens a reply of your own at the foot. The super admin can send a
// pointed comment to Claude (the Claude mark beside its pin and prompt); Claude's reply joins the thread
// with the same mark, and the thread then offers Approve (resolve) or a reply, which sends it back. A reply
// of Claude's that carries the diff of what it changed ends in a folded row, Diff · its files · its commit,
// which opens govblock's GitHub diff (components/dev/unified-diff.tsx). The composer and the reply box grow
// with their text, as the sonar popover's does, up to 40% of the window, then scroll.

// The diff view, and CodeMirror's diff with it, load only when a diff is opened.
const UnifiedDiff = dynamic(() => import("@/components/dev/unified-diff").then((m) => m.UnifiedDiff), {
  ssr: false,
  loading: () => <Loader2 className="my-2 size-4 animate-spin text-(--pax2-blue)" />,
})

/** The sonar popover's autosize (overlay/popover.ts): as tall as its text, from its own two rows up to 40%
 *  of the window, past which it scrolls. */
function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = "auto"
  el.style.height = `${Math.min(el.scrollHeight + 2, Math.round(window.innerHeight * 0.4))}px`
}

/** The pinned Bookmarks thread's id among the threads' fold states. */
const BOOKMARKS = "bookmarks"

const PROMPT_UNAVAILABLE = "Prompt unavailable"
/** NYSgpt writes no prompt beside a comment (lib/housekeeping.ts), so the chip that shows one stays off. */
const PROMPTS = false

type Person = { email: string; name: string; role: string; photo?: string }
type Message = {
  pk: string
  sk: string
  id: string
  author: string
  authorName: string
  text: string
  kind: "comment" | "message" | "reply"
  replyTo?: string
  commit?: string
  diff?: string
  feedback?: "up" | "down"
  bookmarked?: boolean
  route?: string
  target?: string
  path?: string
  images?: string[]
  status: "open" | "resolved" | "claude" | "answered"
  resolvedBy?: string
  editedAt?: string
  createdAt: string
  prompt?: string
}
type Thread = { me: { email: string; superAdmin: boolean }; people: Person[]; messages: Message[] }

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
/** A message's date in full, for its name's hover: the stream's head rows show the name alone. */
const fullDate = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

/** A textarea as tall as its text. */
function grow(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight + 2}px`
}

export function HousekeepingView() {
  const router = useRouter()
  const [withEmail, setWith] = React.useState<string | null>(null)
  // The Admin channel (the super admin and Claude): first among the chips, and where his panel opens until he picks another.
  const [adminChan, setAdminChan] = React.useState(false)
  const picked = React.useRef(false)
  /** My email as the focus-take knows it (the effect outlives any one thread load). */
  const meRef = React.useRef<string | undefined>(undefined)
  const pick = (to: { admin?: boolean; email?: string | null }) => {
    picked.current = true
    setAdminChan(!!to.admin)
    setWith(to.admin ? null : (to.email ?? null))
  }
  const [archive, setArchive] = React.useState(false)
  const [thread, setThread] = React.useState<Thread | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [text, setText] = React.useState("")
  const [shots, setShots] = React.useState<{ mime: string; data: string }[]>([])
  const [sending, setSending] = React.useState(false)
  const [editing, setEditing] = React.useState<{ id: string; field: "text" | "prompt"; text: string } | null>(null)
  // Messages showing their prompt in place of their text, and prompts being written.
  const [showing, setShowing] = React.useState<Set<string>>(new Set())
  const [writing, setWriting] = React.useState<Set<string>>(new Set())
  const [focus, setFocus] = React.useState<string | null>(null)
  // The thread a reply is being written on, and its draft; comments just sent to Claude, flashing Sent.
  const [replying, setReplying] = React.useState<{ id: string; text: string } | null>(null)
  const [sent, setSent] = React.useState<Set<string>>(new Set())
  // Claude's replies whose diff is open.
  const [diffOpen, setDiffOpen] = React.useState<Set<string>>(new Set())
  // Threads folded at their circle or line, and the thread whose line is under the pointer.
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())
  const [lineHover, setLineHover] = React.useState<string | null>(null)
  // Screenshots pasted into the reply being written, and the Bookmarks thread (the super admin's).
  const [replyShots, setReplyShots] = React.useState<{ mime: string; data: string }[]>([])
  const [marks, setMarks] = React.useState<{ reply: Message; parent: Message }[] | null>(null)
  const replyFileRef = React.useRef<HTMLInputElement>(null)
  const composerRef = React.useRef<HTMLTextAreaElement>(null)
  const replyRef = React.useRef<HTMLTextAreaElement>(null)
  React.useLayoutEffect(() => autosize(composerRef.current), [text])
  React.useLayoutEffect(() => autosize(replyRef.current), [replying?.text, replying?.id])
  const listRef = React.useRef<HTMLDivElement>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  // Each load's number: an answer for a thread no longer shown (a slow first fetch of the stream landing after
  // the Admin channel's) is dropped rather than drawn over the right one (NYSgpt, 2026-11-19).
  const loads = React.useRef(0)
  const load = React.useCallback(async () => {
    const n = ++loads.current
    const res = await fetch(`/api/housekeeping${adminChan ? "?channel=admin" : withEmail ? `?with=${encodeURIComponent(withEmail)}` : ""}`, { cache: "no-store" })
    const body = await res.json().catch(() => ({ error: "Dev Comments did not answer." }))
    if (n !== loads.current) return
    if (!res.ok) return setError(body.error ?? "Dev Comments did not load.")
    setError(null)
    setThread(body as Thread)
    meRef.current = (body as Thread).me?.email
    // The super admin's panel opens on the Admin channel.
    if (!picked.current && (body as Thread).me?.superAdmin && !adminChan) {
      picked.current = true
      setAdminChan(true)
      return
    }
    // The Bookmarks thread rides on the Admin channel, with the rest of his and Claude's.
    if (adminChan && (body as Thread).me?.superAdmin) {
      const b = await fetch("/api/housekeeping?bookmarks=1", { cache: "no-store" }).catch(() => null)
      setMarks(b?.ok ? ((await b.json()) as { bookmarks: { reply: Message; parent: Message }[] }).bookmarks : null)
    }
  }, [withEmail, adminChan])

  React.useEffect(() => {
    setThread(null)
    void load()
    const t = window.setInterval(() => void load(), 15000)
    const changed = () => void load()
    window.addEventListener(HOUSEKEEPING_CHANGED, changed)
    return () => {
      window.clearInterval(t)
      window.removeEventListener(HOUSEKEEPING_CHANGED, changed)
    }
  }, [load])

  // A comment just sent, or a page marker pressed: its own thread, with that message in view. The focus
  // carries the message's partition, so the super admin's comments open the Admin channel.
  React.useEffect(() => {
    const take = () => {
      const f = takeFocus()
      if (!f) return
      picked.current = true
      const admin = f.pk === ADMIN
      setAdminChan(admin)
      setWith(admin || !f.pk?.startsWith("DM#") ? null : (f.pk.slice(3).split("|").find((e) => e !== meRef.current) ?? null))
      setArchive(false)
      setFocus(f.id)
    }
    take()
    window.addEventListener(HOUSEKEEPING_OPEN, take)
    return () => window.removeEventListener(HOUSEKEEPING_OPEN, take)
  }, [])

  const list = grouped(thread?.messages ?? []).filter(({ message: m }) => (archive ? m.status === "resolved" : m.status !== "resolved"))

  // The newest message in view whenever the list grows, or the focused one once it has arrived.
  const count = list.length
  React.useEffect(() => {
    if (focus) {
      const el = listRef.current?.querySelector(`[data-message="${focus}"]`)
      if (!el) return
      el.scrollIntoView({ block: "center", behavior: "smooth" })
      const t = window.setTimeout(() => setFocus(null), 2400)
      return () => window.clearTimeout(t)
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [count, withEmail, archive, focus])

  const addFiles = async (files: FileList | File[]) => {
    const images = [...files].filter((f) => f.type.startsWith("image/")).slice(0, 4 - shots.length)
    const read = await Promise.all(
      images.map(
        (f) =>
          new Promise<{ mime: string; data: string }>((resolve) => {
            const r = new FileReader()
            r.onload = () => resolve({ mime: f.type, data: String(r.result) })
            r.readAsDataURL(f)
          }),
      ),
    )
    setShots((prev) => [...prev, ...read].slice(0, 4))
  }

  const send = async () => {
    if (sending || (!text.trim() && !shots.length)) return
    setSending(true)
    const images = await Promise.all(shots.map(shrink))
    const res = await fetch("/api/housekeeping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "message", text, to: adminChan ? null : withEmail, images, ...(adminChan ? { channel: "admin" } : {}) }) })
    setSending(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "That did not send.")
    setText("")
    setShots([])
    setArchive(false)
    await load()
  }

  /** A reply of the reader's own on a message's thread, with any screenshots pasted into it (shrunk as the stream's are). */
  const sendReply = async (m: Message) => {
    const draft = replying?.id === m.id ? replying.text.trim() : ""
    if ((!draft && !replyShots.length) || sending) return
    setSending(true)
    const images = await Promise.all(replyShots.map(shrink))
    const res = await fetch("/api/housekeeping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "reply", pk: m.pk, sk: m.sk, text: draft, images }) })
    setSending(false)
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "That reply did not send.")
    setReplying(null)
    setReplyShots([])
    await load()
  }

  /** Opens the reply box on a thread, unfolding it. */
  const openReply = (id: string) => {
    setReplying({ id, text: "" })
    setReplyShots([])
    setCollapsed((c) => {
      const n = new Set(c)
      n.delete(id)
      return n
    })
  }

  const addReplyFiles = async (files: FileList | File[]) => {
    const images = [...files].filter((f) => f.type.startsWith("image/")).slice(0, 4 - replyShots.length)
    const read = await Promise.all(
      images.map(
        (f) =>
          new Promise<{ mime: string; data: string }>((resolve) => {
            const r = new FileReader()
            r.onload = () => resolve({ mime: f.type, data: String(r.result) })
            r.readAsDataURL(f)
          }),
      ),
    )
    setReplyShots((prev) => [...prev, ...read].slice(0, 4))
  }

  /** The super admin's feedback or bookmark on a reply of Claude's: shown at once, then saved. */
  const reactTo = async (r: Message, patch: { feedback?: "up" | "down" | null; bookmarked?: boolean }) => {
    const apply = (x: Message): Message =>
      x.id !== r.id ? x : { ...x, ...(patch.feedback !== undefined ? { feedback: patch.feedback ?? undefined } : {}), ...(patch.bookmarked !== undefined ? { bookmarked: patch.bookmarked || undefined } : {}) }
    setThread((t) => (t ? { ...t, messages: t.messages.map(apply) } : t))
    setMarks((list) => (list ? list.map((b) => ({ ...b, reply: apply(b.reply) })).filter((b) => b.reply.bookmarked) : list))
    const res = await fetch("/api/housekeeping", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pk: r.pk, sk: r.sk, ...patch }) })
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "That did not save.")
    await load()
  }

  /** The super admin sends a pointed comment to Claude: its status goes "claude", and the mark flashes Sent. */
  const sendToClaude = async (m: Message) => {
    const res = await fetch("/api/housekeeping", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pk: m.pk, sk: m.sk, status: "claude" }) })
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "That did not go to Claude.")
    setSent((s) => new Set(s).add(m.id))
    window.setTimeout(
      () =>
        setSent((s) => {
          const n = new Set(s)
          n.delete(m.id)
          return n
        }),
      1600,
    )
    await load()
  }

  const change = async (m: Message, patch: { status?: "open" | "resolved"; text?: string; prompt?: string }) => {
    const res = await fetch("/api/housekeeping", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pk: m.pk, sk: m.sk, ...patch }) })
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "That did not save.")
    setEditing(null)
    await load()
  }

  /** Shows a message's prompt in place of its text (or its text again), writing it first if none is stored. */
  const togglePrompt = async (m: Message) => {
    const next = new Set(showing)
    if (next.has(m.id)) next.delete(m.id)
    else next.add(m.id)
    setShowing(next)
    if (!next.has(m.id) || m.prompt || writing.has(m.id)) return
    setWriting((w) => new Set(w).add(m.id))
    const res = await fetch("/api/housekeeping/prompt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pk: m.pk, sk: m.sk }) })
    setWriting((w) => {
      const n = new Set(w)
      n.delete(m.id)
      return n
    })
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "The prompt was not written.")
    await load()
  }

  const me = thread?.me
  const people = thread?.people ?? []
  const others = people.filter((p) => p.email !== me?.email)
  const partner = others.find((p) => p.email === withEmail)
  const photoOf = (email: string) => people.find((p) => p.email === email)?.photo

  // ── the thread's pieces ───────────────────────────────────────────────────
  // Reddit's thread (Brendan, 2026-11-01): the branch line highlights under the pointer and a press anywhere on
  // it folds the thread; the circled −/+ sits on it where the message ends. Thread ids are messages' ids, and
  // BOOKMARKS for the pinned Bookmarks thread.
  const toggleCollapse = (id: string) =>
    setCollapsed((c) => {
      const n = new Set(c)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const lineProps = (id: string) => ({
    onClick: () => toggleCollapse(id),
    onMouseEnter: () => setLineHover(id),
    onMouseLeave: () => setLineHover((h) => (h === id ? null : h)),
  })
  /** The line from a message's avatar down: a 12px hit area around the 1px line. */
  const line = (id: string, cls: string) => (
    <span aria-hidden {...lineProps(id)} className={cn("absolute left-6 w-3 -translate-x-1/2 cursor-pointer", cls)}>
      <span className={cn("absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors", lineHover === id ? "bg-(--pax2-light-blue)" : "bg-slate-300")} />
    </span>
  )
  /** The line running on past a reply to the next one. */
  const segment = (id: string) => (
    <span aria-hidden {...lineProps(id)} className="absolute bottom-0 left-4 top-0 w-3 -translate-x-1/2 cursor-pointer">
      <span className={cn("absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors", lineHover === id ? "bg-(--pax2-light-blue)" : "bg-slate-300")} />
    </span>
  )
  /** The elbow turning into a reply, in the accent for the reader's own. */
  const elbow = (id: string, mine: boolean) => (
    <span aria-hidden {...lineProps(id)} className={cn("absolute left-4 top-0 h-4 w-5 cursor-pointer rounded-bl-[10px] border-b-[1.5px] border-l-[1.5px] transition-colors", lineHover === id || mine ? "border-(--pax2-light-blue)" : "border-slate-300")} />
  )
  /** The circled −/+ on the line at the message's foot: folds and unfolds its replies. */
  const circle = (id: string, n: number) => {
    const shut = collapsed.has(id)
    return (
      <button
        type="button"
        {...lineProps(id)}
        aria-expanded={!shut}
        aria-label={shut ? (n === 1 ? "Show the reply" : `Show the ${n} replies`) : "Hide the replies"}
        title={shut ? "Show the replies" : "Hide the replies"}
        className={cn("absolute bottom-1 left-6 z-10 flex size-[18px] -translate-x-1/2 items-center justify-center rounded-full border bg-(--pax2-surface) transition-colors", lineHover === id ? "border-(--pax2-light-blue) text-(--pax2-light-blue)" : "border-slate-400 text-slate-500")}
      >
        {shut ? <Plus className="size-3" strokeWidth={2.25} /> : <Minus className="size-3" strokeWidth={2.25} />}
      </button>
    )
  }

  /** Feedback (up or down, toggling) and the bookmark on a reply of Claude's: the super admin's, instant. */
  const reactions = (r: Message) => {
    const vote = (v: "up" | "down") => {
      const on = r.feedback === v
      const Icon = v === "up" ? ArrowBigUp : ArrowBigDown
      return (
        <button
          type="button"
          aria-pressed={on}
          aria-label={v === "up" ? "Upvote" : "Downvote"}
          title={v === "up" ? "Upvote" : "Downvote"}
          onClick={() => void reactTo(r, { feedback: on ? null : v })}
          className={cn("flex size-7 items-center justify-center rounded-full transition-colors hover:bg-slate-100", on ? (v === "up" ? "text-(--pax2-light-blue)" : "text-(--pax2-red)") : "text-slate-500 hover:text-(--pax2-blue)")}
        >
          <Icon className={cn("size-[18px]", on && "fill-current")} />
        </button>
      )
    }
    return (
      <div className="flex shrink-0 items-center gap-0.5">
        {vote("up")}
        {vote("down")}
        <button
          type="button"
          aria-pressed={!!r.bookmarked}
          aria-label={r.bookmarked ? "Remove the bookmark" : "Bookmark"}
          title={r.bookmarked ? "Remove the bookmark" : "Bookmark"}
          onClick={() => void reactTo(r, { bookmarked: !r.bookmarked })}
          className={cn("flex size-7 items-center justify-center rounded-full transition-colors hover:bg-slate-100", r.bookmarked ? "text-(--pax2-blue)" : "text-slate-500 hover:text-(--pax2-blue)")}
        >
          <Bookmark className={cn("size-4", r.bookmarked && "fill-current")} />
        </button>
      </div>
    )
  }

  /** The folded diff, a flat row: the chevron, the file's path (or the count of files), what it added and
   *  deleted and govblock's five squares; the commit on hover. */
  const diffRow = (r: Message) => {
    const stats = diffStats(r.diff ?? "")
    const open = diffOpen.has(r.id)
    return (
      <button
        type="button"
        aria-expanded={open}
        title={r.commit ? `Commit ${r.commit}` : undefined}
        onClick={() =>
          setDiffOpen((o) => {
            const n = new Set(o)
            if (n.has(r.id)) n.delete(r.id)
            else n.add(r.id)
            return n
          })
        }
        className="mt-1 flex w-full min-w-0 items-center gap-2 py-1 text-left text-xs text-slate-700 hover:text-(--pax2-blue)"
      >
        {open ? <ChevronDown className="size-4 shrink-0 text-slate-400" /> : <ChevronRight className="size-4 shrink-0 text-slate-400" />}
        <span className="min-w-0 truncate font-mono text-[13px]">{stats.length === 1 ? stats[0].path : `${stats.length} files`}</span>
        <DiffBar added={stats.reduce((n, f) => n + f.added, 0)} deleted={stats.reduce((n, f) => n + f.deleted, 0)} className="shrink-0" />
      </button>
    )
  }

  /** A message's or a reply's screenshots, as thumbnails; a tap opens the full size. */
  const shots_ = (images?: string[]) =>
    images?.length ? (
      <div className="mt-2 flex flex-wrap gap-2">
        {images.map((k) => (
          <a key={k} href={`/api/housekeeping/image?key=${encodeURIComponent(k)}`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 bg-(--pax2-surface)">
            {/* eslint-disable-next-line @next/next/no-img-element -- a private screenshot through its signed link */}
            <img src={`/api/housekeeping/image?key=${encodeURIComponent(k)}`} alt="Screenshot" className="h-24 w-auto max-w-[220px] object-cover" />
          </a>
        ))}
      </div>
    ) : null

  /** A bookmarked reply's thread: the stream or the direct messages it is in, its message in view. */
  const openThread = (p: Message) => {
    const other = p.pk.startsWith("DM#") ? p.pk.slice(3).split("|").find((e) => e !== me?.email) ?? null : null
    pick(p.pk === ADMIN ? { admin: true } : { email: other })
    setArchive(p.status === "resolved")
    setCollapsed((c) => {
      const n = new Set(c)
      n.delete(p.id)
      return n
    })
    setFocus(p.id)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The threads (Brendan's mock, 2026-11-01): Admin (the super admin and Claude) first and his alone, All
          (everyone's stream), then one-to-one with each person; the archive at the right. Point and Click's switch owns
          the pointer, so the crosshair that sat here is gone. */}
      {/* pt-4: room under the panel header, which the row sat wedged against (Brendan, 2026-11-01). */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-5 pt-4 pb-3">
        {me?.superAdmin && (
          <ThreadChip on={adminChan} onClick={() => pick({ admin: true })}>
            Admin
          </ThreadChip>
        )}
        <ThreadChip on={!adminChan && !withEmail} onClick={() => pick({})}>
          All
        </ThreadChip>
        {others.map((p) => (
          <ThreadChip key={p.email} on={!adminChan && withEmail === p.email} onClick={() => pick({ email: p.email })}>
            {shortName(p.name)}
          </ThreadChip>
        ))}
        <span className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => setArchive((a) => !a)}
            aria-pressed={archive}
            className={cn("flex size-8 items-center justify-center rounded-full shadow-(--shadow-e1) transition-colors", archive ? "bg-(--pax2-blue) text-white" : "bg-(--pax2-surface) text-(--pax2-blue) hover:bg-(--pax2-lavender)")}
            aria-label={archive ? "Back to open messages" : "Archive: resolved messages"}
            title={archive ? "Back to open messages" : "Archive: resolved messages"}
          >
            <Archive className="size-4" />
          </button>
        </span>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto border-t border-slate-200/70 px-5 py-4">
        {archive && <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">Archive</p>}
        {error && <p className="mb-3 rounded-lg bg-(--pax2-surface) px-3 py-2 text-xs text-(--pax2-red) shadow-(--shadow-e1)">{error}</p>}
        {!thread && !error && <Loader2 className="mx-auto mt-6 size-5 animate-spin text-(--pax2-blue)" />}
        {thread && list.length === 0 && (
          <p className="mt-6 text-center text-sm text-slate-500">
            {archive ? "Nothing resolved here yet." : adminChan ? "Nothing open." : partner ? `No messages with ${partner.name} yet.` : "Nothing open. Point at something on any page, or write below."}
          </p>
        )}
        <div className="flex flex-col gap-4">
          {/* The Bookmarks thread: every reply of Claude's the super admin bookmarked, a live view (GET ?bookmarks=1), pinned at the top of the Admin channel. */}
          {me?.superAdmin && adminChan && !archive && marks && marks.length > 0 && (
            <div key={BOOKMARKS}>
              <div className="relative -mx-2 flex gap-3 rounded-xl px-2 py-1">
                {line(BOOKMARKS, collapsed.has(BOOKMARKS) ? "top-10 bottom-[13px]" : "-bottom-2 top-10")}
                {circle(BOOKMARKS, marks.length)}
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-(--pax2-lavender) text-(--pax2-blue)">
                  <Bookmark className="size-4 fill-current" />
                </span>
                <div className="min-w-0 flex-1 pb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-900">Bookmarks</span>
                    <span className="text-[11px] text-slate-400">{marks.length}</span>
                  </div>
                </div>
              </div>
              {!collapsed.has(BOOKMARKS) && (
                <ul className="mt-2 flex flex-col">
                  {marks.map(({ reply: r, parent: p }, i) => (
                    <li key={r.id} className="relative pb-2 pl-11 pt-1 last:pb-0">
                      {i < marks.length - 1 && segment(BOOKMARKS)}
                      {elbow(BOOKMARKS, false)}
                      <div className="flex gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element -- the Claude mark from public/ */}
                        <img src={CLAUDE_MARK} alt="" className="mt-0.5 size-6 shrink-0 rounded-full bg-(--pax2-surface) object-contain p-1 shadow-(--shadow-e1)" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-slate-900">{r.authorName}</span>
                            <span className="text-[11px] text-slate-400">{when(r.createdAt)}</span>
                          </div>
                          <p className="mt-0.5 line-clamp-4 text-sm whitespace-pre-wrap text-slate-700">{r.text}</p>
                          <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                            <button type="button" onClick={() => openThread(p)} className="min-w-0 truncate text-left text-slate-500 hover:text-(--pax2-blue) hover:underline">
                              On {p.authorName}: {p.text.slice(0, 90)}
                            </button>
                            {reactions(r)}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {list.map(({ message: m, replies }) => {
            const resolved = m.status === "resolved"
            const photo = photoOf(m.author)
            const asPrompt = !!me?.superAdmin && showing.has(m.id)
            const isWriting = writing.has(m.id)
            const shown = asPrompt ? m.prompt : m.text
            const composing = replying?.id === m.id
            const branch = replies.length > 0 || composing
            const shut = collapsed.has(m.id)
            const pointed = m.kind === "comment" && !!m.route && !!m.path
            return (
              <div key={m.id}>
              <div data-message={m.id} className={cn("group relative -mx-2 flex gap-3 rounded-xl px-2 py-1 transition-colors duration-700", focus === m.id && "bg-(--pax2-lavender)")}>
                {/* Reddit's thread: the branch line leaves the avatar and runs down into the replies, the circled −/+ on it where the message ends. */}
                {branch && line(m.id, shut ? "top-10 bottom-[13px]" : "-bottom-2 top-10")}
                {branch && circle(m.id, replies.length)}
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a 32px headshot from public/
                  <img src={photo} alt="" className="mt-0.5 size-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-(--pax2-blue) text-[11px] font-semibold text-white">{initials(m.authorName)}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    {/* The name alone at the head of a thread; the date on hover. Replies keep theirs. */}
                    <span className="text-sm font-semibold text-slate-900" title={fullDate(m.createdAt)}>
                      {m.authorName}
                    </span>
                    {m.editedAt && <span className="text-[11px] text-slate-400">edited</span>}
                    {me?.superAdmin && (m.status === "claude" || m.status === "answered") && (
                      <span className="rounded-full bg-(--pax2-lavender) px-1.5 py-px text-[10px] font-semibold text-(--pax2-blue)">{m.status === "claude" ? "With Claude" : "Answered"}</span>
                    )}
                    {me?.superAdmin && editing?.id !== m.id && (
                      <span className="ml-auto flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {asPrompt && m.prompt && m.prompt !== PROMPT_UNAVAILABLE && (
                          <IconAction label="Copy the prompt" onClick={() => void navigator.clipboard.writeText(m.prompt!)}>
                            <Copy className="size-3.5" />
                          </IconAction>
                        )}
                        <IconAction label={resolved ? "Reopen" : "Resolve"} onClick={() => void change(m, { status: resolved ? "open" : "resolved" })}>
                          {resolved ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
                        </IconAction>
                        {!(asPrompt && !m.prompt) && (
                          <IconAction label={asPrompt ? "Edit the prompt" : "Edit"} onClick={() => setEditing({ id: m.id, field: asPrompt ? "prompt" : "text", text: (asPrompt ? m.prompt : m.text) ?? "" })}>
                            <Pencil className="size-3.5" />
                          </IconAction>
                        )}
                      </span>
                    )}
                  </div>
                  {(pointed || me?.superAdmin) && (
                    <div className="mt-1 flex gap-1.5">
                      {pointed && (
                        <Chip label={`Go to the comment on ${m.route}`} onClick={() => goToComment(m.route!, m.path!, m.target, (href) => router.push(href))}>
                          <MapPin className="size-3.5" />
                        </Chip>
                      )}
                      {PROMPTS && me?.superAdmin && (
                        <Chip label={asPrompt ? "Show the comment" : "Show the prompt"} on={asPrompt} onClick={() => void togglePrompt(m)}>
                          <SquareTerminal className="size-3.5" />
                        </Chip>
                      )}
                      {me?.superAdmin && pointed && !resolved && (
                        <Chip label={sent.has(m.id) ? "Sent to Claude" : m.status === "claude" ? "With Claude: send again" : "Send to Claude"} on={m.status === "claude"} onClick={() => void sendToClaude(m)}>
                          {sent.has(m.id) ? (
                            <Check className="size-3.5" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element -- the Claude mark from public/
                            <img src={CLAUDE_MARK} alt="" className="size-3.5" />
                          )}
                        </Chip>
                      )}
                    </div>
                  )}
                  {editing?.id === m.id ? (
                    <div className="mt-1.5">
                      <textarea
                        ref={grow}
                        value={editing.text}
                        onChange={(e) => {
                          setEditing({ ...editing, text: e.target.value })
                          grow(e.target)
                        }}
                        className={cn("w-full resize-y overflow-hidden rounded-lg border border-slate-200 bg-(--pax2-surface) p-2 text-sm outline-none focus:border-(--pax2-light-blue)", editing.field === "prompt" && "font-mono text-[12px]")}
                      />
                      <div className="mt-1 flex justify-end gap-2 text-xs">
                        <button type="button" onClick={() => setEditing(null)} className="rounded-md px-2 py-1 text-slate-500 hover:bg-(--pax2-surface)">
                          Cancel
                        </button>
                        <button type="button" onClick={() => void change(m, editing.field === "prompt" ? { prompt: editing.text } : { text: editing.text })} className="rounded-md bg-(--pax2-blue) px-2.5 py-1 font-medium text-white">
                          Save
                        </button>
                      </div>
                    </div>
                  ) : asPrompt && !m.prompt ? (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-500">
                      {isWriting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      {isWriting ? "Writing the prompt…" : PROMPT_UNAVAILABLE}
                    </p>
                  ) : (
                    shown && (
                      // Flat on the panel's ground, Reddit's way: the text, and the prompt in its place, with no box around either.
                      <p className={cn("mt-1 text-sm whitespace-pre-wrap text-slate-700", resolved && "text-slate-400", asPrompt && "font-mono text-[12px] leading-relaxed", asPrompt && shown === PROMPT_UNAVAILABLE && "font-sans text-slate-400 italic")}>{shown}</p>
                    )
                  )}
                  {shots_(m.images)}
                  {editing?.id !== m.id && (
                    <div className="mt-1 flex items-center gap-3 text-xs">
                      {!composing && (
                        <button type="button" onClick={() => openReply(m.id)} className="font-medium text-(--pax2-blue) hover:underline">
                          Reply
                        </button>
                      )}
                      {shut && <span className="text-slate-400">{replies.length === 1 ? "1 reply" : `${replies.length} replies`}</span>}
                    </div>
                  )}
                </div>
              </div>
              {branch && !shut && (
                <ul className="mt-2 flex flex-col">
                  {replies.map((r, i) => {
                    const last = i === replies.length - 1 && !composing
                    const byClaude = r.author === CLAUDE
                    const mine = r.author === me?.email
                    const rPhoto = byClaude ? null : photoOf(r.author)
                    const opened = byClaude && !!r.diff && diffOpen.has(r.id)
                    return (
                      <React.Fragment key={r.id}>
                        <li className="relative pb-2 pl-11 pt-1 last:pb-0">
                          {/* The trunk runs on past this reply to the next; the elbow turns into this one. */}
                          {!last && segment(m.id)}
                          {elbow(m.id, mine)}
                          <div className="flex gap-2.5">
                            {byClaude ? (
                              // eslint-disable-next-line @next/next/no-img-element -- the Claude mark from public/
                              <img src={CLAUDE_MARK} alt="" className="mt-0.5 size-6 shrink-0 rounded-full bg-(--pax2-surface) object-contain p-1 shadow-(--shadow-e1)" />
                            ) : rPhoto ? (
                              // eslint-disable-next-line @next/next/no-img-element -- a 24px headshot from public/
                              <img src={rPhoto} alt="" className="mt-0.5 size-6 shrink-0 rounded-full object-cover" />
                            ) : (
                              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-(--pax2-blue) text-[10px] font-semibold text-white">{initials(r.authorName)}</span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className={cn("text-xs font-semibold", mine ? "text-(--pax2-blue)" : "text-slate-900")}>{r.authorName}</span>
                                <span className="text-[11px] text-slate-400">{when(r.createdAt)}</span>
                              </div>
                              {r.text && <p className={cn("mt-0.5 text-sm whitespace-pre-wrap text-slate-700", resolved && "text-slate-400")}>{r.text}</p>}
                              {shots_(r.images)}
                              {byClaude && me?.superAdmin && (
                                // Brendan's row (his DOM edit, 2026-11-01): Approve and Reply at the left, feedback and the bookmark at the right.
                                <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-3">
                                    {m.status === "answered" && i === replies.length - 1 && (
                                      <button type="button" onClick={() => void change(m, { status: "resolved" })} className="font-medium text-(--pax2-blue) hover:underline">
                                        Approve
                                      </button>
                                    )}
                                    <button type="button" onClick={() => openReply(m.id)} className="font-medium text-(--pax2-blue) hover:underline">
                                      Reply
                                    </button>
                                  </div>
                                  {reactions(r)}
                                </div>
                              )}
                              {byClaude && r.diff ? diffRow(r) : byClaude && r.commit ? <p className="mt-1 font-mono text-[11px] text-slate-500">{r.commit.slice(0, 7)}</p> : null}
                            </div>
                          </div>
                        </li>
                        {/* Open, the diff breaks out of the thread's indent to the list's width, 20px in from each edge of the panel, in its own bordered box. */}
                        {opened && (
                          <li className="my-2 overflow-hidden rounded-xl border border-slate-200">
                            <UnifiedDiff text={r.diff!} anchor={`hk-${r.id}`} flush />
                          </li>
                        )}
                      </React.Fragment>
                    )
                  })}
                  {composing && (
                    <li className="relative pb-0 pl-11 pt-1">
                      <span aria-hidden className="absolute left-4 top-0 h-4 w-5 rounded-bl-[10px] border-b-[1.5px] border-l-[1.5px] border-(--pax2-light-blue)" />
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          void sendReply(m)
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault()
                          void addReplyFiles(e.dataTransfer.files)
                        }}
                        className="flex flex-col gap-2"
                      >
                        {replyShots.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {replyShots.map((s, k) => (
                              <span key={k} className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element -- a pasted screenshot before it is sent */}
                                <img src={s.data} alt="" className="h-14 w-auto rounded-md border border-slate-200" />
                                <button type="button" aria-label="Remove" onClick={() => setReplyShots((prev) => prev.filter((_, j) => j !== k))} className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-(--night-900) text-white">
                                  <X className="size-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <textarea
                          ref={replyRef}
                          autoFocus
                          value={replying.text}
                          onChange={(e) => setReplying({ id: m.id, text: e.target.value })}
                          onPaste={(e) => {
                            if (e.clipboardData.files.length) {
                              e.preventDefault()
                              void addReplyFiles(e.clipboardData.files)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                              e.preventDefault()
                              void sendReply(m)
                            }
                          }}
                          placeholder="Add a reply"
                          rows={2}
                          className="max-h-[40vh] w-full resize-none overflow-y-auto rounded-xl border border-slate-200 bg-(--pax2-surface) px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-(--pax2-blue)"
                        />
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <button type="button" onClick={() => replyFileRef.current?.click()} className="mr-auto flex size-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Attach a screenshot" title="Attach a screenshot">
                            <ImagePlus className="size-4" />
                          </button>
                          <input ref={replyFileRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && void addReplyFiles(e.target.files)} />
                          <button type="button" onClick={() => setReplying(null)} className="rounded-full px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-100">
                            Cancel
                          </button>
                          <button type="submit" disabled={(!replying.text.trim() && !replyShots.length) || sending} className="rounded-full bg-(--pax2-blue) px-3 py-1.5 font-medium text-white disabled:opacity-50">
                            Reply
                          </button>
                        </div>
                      </form>
                    </li>
                  )}
                </ul>
              )}
              </div>
            )
          })}
        </div>
      </div>

      {/* The composer: to the stream, or to the one person picked above. */}
      <div
        className="shrink-0 px-4 pb-4 pt-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          void addFiles(e.dataTransfer.files)
        }}
      >
        <div className="rounded-2xl border border-slate-200 bg-(--pax2-surface) px-3 pt-2.5 pb-2 shadow-(--shadow-e1) focus-within:border-(--pax2-light-blue)">
          {shots.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {shots.map((s, i) => (
                <span key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a pasted screenshot before it is sent */}
                  <img src={s.data} alt="" className="h-14 w-auto rounded-md border border-slate-200" />
                  <button type="button" aria-label="Remove" onClick={() => setShots((prev) => prev.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-(--night-900) text-white">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <textarea
            ref={composerRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => {
              if (e.clipboardData.files.length) {
                e.preventDefault()
                void addFiles(e.clipboardData.files)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void send()
              }
            }}
            rows={2}
            placeholder={adminChan ? "Message Claude…" : partner ? `Message ${partner.name}…` : "Message everyone…"}
            className="max-h-[40vh] w-full resize-none overflow-y-auto bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => fileRef.current?.click()} className="flex size-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Attach a screenshot" title="Attach a screenshot">
              <ImagePlus className="size-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && void addFiles(e.target.files)} />
            <button type="button" onClick={() => void send()} disabled={sending || (!text.trim() && !shots.length)} className="flex size-8 items-center justify-center rounded-xl bg-(--pax2-blue) text-white disabled:opacity-30" aria-label="Send">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ThreadChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-[color,background-color,box-shadow]", on ? "bg-(--pax2-lift) text-(--pax2-blue) shadow-(--shadow-e1)" : "text-slate-500 hover:bg-(--pax2-lift)/70 hover:text-(--pax2-blue)")}
    >
      {children}
    </button>
  )
}

/** An icon-only chip under a message's name: its element, its prompt. */
function Chip({ label, on = false, onClick, children }: { label: string; on?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      title={label}
      className={cn("flex h-7 w-9 items-center justify-center rounded-lg shadow-(--shadow-e1) transition-colors", on ? "bg-(--pax2-blue) text-white" : "bg-(--pax2-surface) text-(--pax2-blue) hover:bg-(--pax2-lavender)")}
    >
      {children}
    </button>
  )
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="flex size-6 items-center justify-center rounded-md text-slate-500 hover:bg-(--pax2-surface) hover:text-(--pax2-blue)">
      {children}
    </button>
  )
}
