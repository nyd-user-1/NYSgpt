"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { ChevronsUpDown, Copy, Download, EllipsisVertical, GripVertical, LayoutGrid, MessagesSquare, Megaphone, Send, ShoppingBasket, Star, StickyNote, Trash2, X, type LucideIcon } from "lucide-react"
import { generateJSON, type Editor, type JSONContent } from "@tiptap/react"

import { createMyNote, removeNote, saveNote } from "@/lib/notes-store"
import { KebabMenu, MenuFlyout, MenuFoot, MenuRow, MenuSeparator } from "@/components/kebab-menu"
import { useShellPanel } from "@/components/shell"
import { useShelf } from "@/lib/home-blocks"
import { NOTES_CHANGED, readDefaultShape, useDefaultShape, useNoteFavorites, type NoteShape } from "@/lib/drawn-notes"
import { pageContext } from "@/lib/page-text"
import { TaskSurface, TaskToolbar, useTaskEditor } from "./rich-body"

import { NoteCollect } from "./note-collect"
import { NoteCompose } from "./note-compose"
import { NoteTeam } from "./note-team"
import { noteExtensions } from "./note-menus"
import { PaxReply, turnsOf } from "./pax-reply"

// A drawn note (Brendan, 2026-10-31): the card a Shift-drag draws (draw-notes.tsx), where it was drawn and as large,
// in the model card's shape as Nav is: the tinted frame titled Note, the inbox rows' grip before it and the three-dot
// menu opposite, and in the white card the Agentic Inbox compose's editor (TipTap, markdown in and out) under its
// toolbar. It keeps itself once there is something in it, 700ms after the last keystroke, as one of the reader's
// own notes, the Inbox's My notes. Since 2026-11-02 (Brendan) the header switches the card between its shapes, and
// the reader picks the one it opens on.
// NYSgpt (brief 61): kept in this browser (lib/notes-store.ts); the chat is NYSgpt's /api/chat; Team, Compose and
// Collect are NYSgpt's (note-team.tsx, note-compose.tsx, note-collect.tsx).

/** NYSgpt's Blocks hold the home page's boxes alone (lib/home-blocks.ts useShelf), so a note can't go on the shelf there. */
const SHELF_TAKES_NOTES = false

export type Rect = { x: number; y: number; w: number; h: number }

/** A note's title: its first line, the markdown's marks and tags taken off. */
const titleOf = (md: string) => md.split("\n").map((l) => l.replace(/<[^>]+>/g, "").replace(/^[#>\-*+\s]+|\d+\.\s+/g, "").replace(/[*_`]/g, "").trim()).find(Boolean) ?? "Note"

const SORRY = "Something went wrong. Please try again."

/** The card's shapes, in the switcher's order (Brendan, 2026-11-02): the note, PAX's chat beside it, the note as a
 *  mail, a basket carried across pages, and the note posted to the team (admins, as Dev Comments, Slack and Discord
 *  are). The star beside each makes it the reader's default, the shape a card opens on. */
const SHAPES: { shape: NoteShape; label: string; icon: LucideIcon; admin?: boolean }[] = [
  { shape: "note", label: "Note", icon: StickyNote },
  { shape: "chat", label: "Chat", icon: MessagesSquare },
  { shape: "compose", label: "Compose", icon: Send },
  { shape: "collect", label: "Collect", icon: ShoppingBasket },
  { shape: "team", label: "Team", icon: Megaphone, admin: true },
]
const shapeOf = (s: NoteShape | null, admin: boolean): NoteShape => (s && SHAPES.some((x) => x.shape === s && (admin || !x.admin)) ? s : "note")

/** tiptap-markdown's storage on an editor: its types leave the parser out. */
const mdOf = (editor: Editor) => (editor.storage as unknown as { markdown: { getMarkdown(): string; parser: { parse(md: string): string } } }).markdown

export function FloatingNote({ rect, id: firstId, body: firstBody, chat: firstChat, onClose }: { rect: Rect; id: string | null; body: string; chat: string; onClose: () => void }) {
  const [body, setBody] = React.useState(firstBody)
  const [chat, setChat] = React.useState(firstChat)
  // The last save failed: the next keystroke tries again.
  const [failed, setFailed] = React.useState(false)
  const [pos, setPos] = React.useState({ left: rect.x, top: rect.y })
  const [size, setSize] = React.useState({ w: rect.w, h: rect.h })
  // Both editors take tables, headings and the "/" and "@" menus (note-menus.tsx); the chat's carries PAX's replies.
  const [noteExt] = React.useState(noteExtensions)
  const [chatExt] = React.useState(() => [...noteExtensions(), PaxReply])
  // The note's text, which Compose edits too: the editor follows it when Compose changes it.
  const editor = useTaskEditor({ value: body, onChange: setBody, placeholder: "Write a note…", extensions: noteExt, headings: true })
  const { askAbout, admin } = useShellPanel()
  const shapes = SHAPES.filter((x) => admin || !x.admin)
  const { favs, toggle: toggleFav } = useNoteFavorites()
  const shelf = useShelf()

  // The card is a note or a chat (Brendan, 2026-10-31), switched from its header; a kept note with only a chat opens
  // on it. The chat is one text (pax-reply.ts), kept with the note: Shift Enter sends what the reader wrote since PAX
  // last answered, with the pages open on screen (lib/page-text.ts) and the note as its context, and the answer
  // streams into the text with a fresh line under it.
  // It opens on the reader's default shape (Brendan, 2026-11-02), Note until they pick one.
  const [mode, setMode] = React.useState<NoteShape>(() => (firstBody.trim() || !firstChat.trim() ? shapeOf(readDefaultShape(), admin) : "chat"))
  const { shape: preferred, choose } = useDefaultShape()
  const mine = shapeOf(preferred, admin)
  const talk = useTaskEditor({ value: firstChat, onChange: setChat, placeholder: "Ask the chat. Shift Enter sends.", extensions: chatExt, headings: true })
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    if (mode === "chat") talk?.commands.focus("end")
    else if (mode === "note") editor?.commands.focus("end")
  }, [mode, talk, editor])
  const send = async () => {
    const ed = talk
    if (!ed || busy) return
    const turns = turnsOf(mdOf(ed).getMarkdown())
    if (turns[turns.length - 1]?.role !== "user") return
    setBusy(true)
    // The reply goes at the end, in an empty last line's place, and a fresh line after it takes the caret.
    const { doc } = ed.state
    const end = doc.content.size
    const tail = doc.lastChild
    const from = tail?.type.name === "paragraph" && tail.content.size === 0 ? end - tail.nodeSize : end
    const waiting: JSONContent[] = [{ type: "paragraph", content: [{ type: "text", text: "…" }] }]
    ed.chain().insertContentAt({ from, to: end }, [{ type: "paxReply", attrs: { live: true }, content: waiting }, { type: "paragraph" }]).focus("end").scrollIntoView().run()
    // The reply rewritten from the markdown so far, wherever the reader's edits have moved it. False once it is gone.
    const write = (text: string, done = false) => {
      let at = -1
      ed.state.doc.forEach((n, offset) => {
        if (n.type.name === "paxReply" && n.attrs.live) at = offset
      })
      const old = at < 0 ? null : ed.state.doc.nodeAt(at)
      if (!old) return false
      try {
        const blocks = ((generateJSON(mdOf(ed).parser.parse(text), ed.extensionManager.extensions).content ?? []) as JSONContent[]).filter((b) => b.type !== "paxReply")
        const node = ed.schema.nodeFromJSON({ type: "paxReply", attrs: { live: !done }, content: blocks.length ? blocks : waiting })
        ed.view.dispatch(ed.state.tr.replaceWith(at, at + old.nodeSize, node).scrollIntoView())
      } catch {
        // Markdown the reply can't hold leaves it as it was until the next chunk.
      }
      return true
    }
    let text = ""
    let frame = 0
    let gone = false
    const paint = () => {
      frame = 0
      if (!write(text)) gone = true
    }
    const note = latest.current.body.trim() ? `The reader's note, which this chat sits beside:\n\n${latest.current.body}` : ""
    // The note first: the chat route keeps the first 80,000 characters, and a long page is what gets cut.
    const systemContext = [note, pageContext()].filter(Boolean).join("\n\n")
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: turns, ...(systemContext ? { systemContext } : {}) }),
      })
      if (!res.ok || !res.body) text = SORRY
      else {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          text += decoder.decode(value, { stream: true })
          if (gone) {
            void reader.cancel()
            break
          }
          if (!frame) frame = requestAnimationFrame(paint)
        }
      }
    } catch {
      text ||= SORRY
    } finally {
      cancelAnimationFrame(frame)
      write(text.trim() ? text : SORRY, true)
      setBusy(false)
    }
  }
  const download = (ext: "md" | "txt") => {
    const text = ext === "md" ? body : body.replace(/\*\*|__|`/g, "").replace(/^(#+|>)\s?/gm, "")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([text], { type: ext === "md" ? "text/markdown" : "text/plain" }))
    a.download = `${titleOf(body).replace(/[^\w -]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "note"}.${ext}`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  // Saves run one after another, so the first one's id is there for the next.
  const id = React.useRef(firstId)
  const chain = React.useRef<Promise<void>>(Promise.resolve())
  const kept = React.useRef({ body: firstBody, chat: firstChat })
  const latest = React.useRef({ body: firstBody, chat: firstChat })
  latest.current = { body, chat }
  const save = React.useCallback(() => {
    chain.current = chain.current.then(async () => {
      const now = latest.current
      if (now.body === kept.current.body && now.chat === kept.current.chat) return
      try {
        const note = id.current ? await saveNote(id.current, now.body, now.chat) : await createMyNote(now.body, now.chat)
        if (!note) return
        id.current = note.id
        kept.current = now
        setFailed(false)
        window.dispatchEvent(new Event(NOTES_CHANGED))
      } catch {
        setFailed(true)
      }
    })
    return chain.current
  }, [])
  React.useEffect(() => {
    if (body === kept.current.body && chat === kept.current.chat) return
    const t = window.setTimeout(save, 700)
    return () => window.clearTimeout(t)
  }, [body, chat, save])
  // Closing keeps what was typed since the last save.
  const close = () => void save().finally(onClose)

  // The grip moves the card, held inside the window.
  const box = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef<{ dx: number; dy: number } | null>(null)
  const grip = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      drag.current = { dx: e.clientX - pos.left, dy: e.clientY - pos.top }
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!drag.current) return
      setPos({ left: Math.max(8, Math.min(e.clientX - drag.current.dx, window.innerWidth - size.w - 8)), top: Math.max(8, Math.min(e.clientY - drag.current.dy, window.innerHeight - size.h - 8)) })
    },
    onPointerUp: () => void (drag.current = null),
  }

  // The bottom-right corner resizes the card (Brendan, 2026-10-31): down for height, right for width, down and right
  // for both, no smaller than 300 by 240 and no larger than the window has room for.
  const from = React.useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const corner = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      from.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h }
    },
    onPointerMove: (e: React.PointerEvent) => {
      const f = from.current
      if (!f) return
      const w = Math.max(300, Math.min(f.w + e.clientX - f.x, window.innerWidth - 8 - pos.left))
      const h = Math.max(240, Math.min(f.h + e.clientY - f.y, window.innerHeight - 8 - pos.top))
      setSize({ w: Math.round(w), h: Math.round(h) })
    },
    onPointerUp: () => void (from.current = null),
  }

  return createPortal(
    <div
      ref={box}
      data-note
      role="dialog"
      aria-label="Note"
      style={{ left: pos.left, top: pos.top, width: size.w, height: size.h }}
      className="nysgpt-note fixed z-[55] flex flex-col rounded-[18px] border border-slate-200 bg-slate-50 p-1 shadow-e3"
    >
      <div className="flex shrink-0 items-center gap-1.5 pt-1.5 pr-1.5 pb-2 pl-2">
        <span {...grip} aria-label="Move" title="Move" className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center text-slate-400 active:cursor-grabbing">
          <GripVertical className="size-4" />
        </span>
        {/* The header as lucide.dev's titles (dash/card-tools.tsx CardAnchor): the muted ground on hover, and at its
            end the page switcher's up-down mark, which opens Note and Chat. */}
        <div className="min-w-0 flex-1">
          <KebabMenu
            label="Shape"
            align="left"
            width="w-56"
            trigger={
              <>
                {shapes.find((x) => x.shape === mode)?.label ?? "Note"}
                <ChevronsUpDown className="size-3.5 text-slate-400 opacity-0 transition-opacity group-hover/anchor:opacity-100 group-aria-expanded/anchor:opacity-100" />
              </>
            }
            triggerClassName="group/anchor inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[15px] font-semibold text-slate-900 outline-none transition-colors select-none hover:bg-muted aria-expanded:bg-muted focus-visible:outline-1 focus-visible:outline-ring"
          >
            {shapes.map(({ shape, label, icon: Icon }) => (
              <div key={shape} className="flex items-center gap-0.5">
                <div className="min-w-0 flex-1">
                  <MenuRow icon={<Icon />} label={label} checked={mode === shape} onClick={() => setMode(shape)} />
                </div>
                {/* The reader's default: the shape every card opens on. */}
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={mine === shape}
                  aria-label={mine === shape ? `${label} is my default` : `Make ${label} my default`}
                  title={mine === shape ? "My default" : "Make this my default"}
                  onClick={(e) => {
                    e.stopPropagation()
                    choose(shape)
                  }}
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
                >
                  <Star className={mine === shape ? "size-3.5 fill-amber-400 text-amber-400" : "size-3.5"} />
                </button>
              </div>
            ))}
          </KebabMenu>
        </div>
        <KebabMenu label="Note options" width="w-52" trigger={<EllipsisVertical className="size-4" />} triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-slate-800 outline-none hover:bg-foreground/8 hover:text-foreground aria-expanded:bg-foreground/8">
          {/* The block menu's (dash/card-tools.tsx; Brendan, 2026-10-31), what of it a note takes: Favorite, Add to
              Blocks (the shelf's tile opens the note's card), Ask PAX, Download and Delete; Pin to top, Refresh, the
              sizes and View don't apply. Copy as Markdown and Close are the note's own. */}
          <MenuRow icon={<Star className={id.current && favs.includes(id.current) ? "fill-amber-400 text-amber-400" : undefined} />} label={id.current && favs.includes(id.current) ? "Unfavorite" : "Favorite"} disabled={!id.current} onClick={() => id.current && toggleFav(id.current)} />
          <MenuRow
            icon={<LayoutGrid />}
            label={id.current && shelf.has(`note:${id.current}`) ? "Remove from Blocks" : "Add to Blocks"}
            checked={!!id.current && shelf.has(`note:${id.current}`)}
            disabled={!id.current || !SHELF_TAKES_NOTES}
            onClick={() => {
              const key = `note:${id.current}`
              if (!id.current) return
              if (shelf.has(key)) shelf.remove(key)
              else shelf.add({ key, title: titleOf(body.trim() ? body : chat), path: "/agentic-inbox", anchor: `note-${id.current}` })
            }}
          />
          <MenuRow icon={<MessagesSquare />} label="Ask in chat" onClick={() => askAbout({ context: () => `My note, "${titleOf(body)}":\n\n${body}` })} />
          <MenuSeparator />
          <MenuRow icon={<Copy />} label="Copy as Markdown" onClick={() => void navigator.clipboard.writeText(body)} />
          <MenuFlyout id="download" icon={<Download />} label="Download">
            <MenuRow label="Markdown" onClick={() => download("md")} />
            <MenuRow label="Text" onClick={() => download("txt")} />
          </MenuFlyout>
          <MenuRow icon={<X />} label="Close" onClick={close} />
          <MenuSeparator />
          <MenuRow
            icon={<Trash2 />}
            label="Delete note"
            danger
            onClick={async () => {
              if (id.current) await removeNote(id.current)
              window.dispatchEvent(new Event(NOTES_CHANGED))
              onClose()
            }}
          />
          <MenuSeparator />
          <MenuFoot title="My notes" sub={failed ? "Not saved: this browser didn't keep it" : undefined} />
        </KebabMenu>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-pax2-surface shadow-e1">
        {mode === "compose" ? (
          <NoteCompose body={body} onBody={setBody} onClose={() => setMode("note")} />
        ) : mode === "collect" ? (
          <NoteCollect />
        ) : mode === "team" ? (
          <NoteTeam editor={editor} body={body} />
        ) : mode === "note" ? (
          <>
            <TaskToolbar editor={editor} className="shrink-0 border-b border-slate-200 px-2 py-1" />
            <div className="min-h-0 flex-1 cursor-text overflow-y-auto px-4 py-3" onClick={() => editor?.commands.focus()}>
              <TaskSurface editor={editor} className="min-h-full [&_.ProseMirror]:min-h-full" />
            </div>
          </>
        ) : (
          <>
            <TaskToolbar editor={talk} className="shrink-0 border-b border-slate-200 px-2 py-1" />
            {/* Shift Enter sends; Enter keeps its new line. */}
            <div
              className="min-h-0 flex-1 cursor-text overflow-y-auto px-4 py-3"
              onClick={() => talk?.commands.focus()}
              onKeyDownCapture={(e) => {
                if (e.key !== "Enter" || !e.shiftKey || e.nativeEvent.isComposing) return
                e.preventDefault()
                e.stopPropagation()
                void send()
              }}
            >
              <TaskSurface editor={talk} className="min-h-full [&_.ProseMirror]:min-h-full [&_[data-pax]]:my-3 [&_[data-pax]]:border-l-[3px] [&_[data-pax]]:border-pax2-lavender [&_[data-pax]]:pl-3 [&_[data-pax]]:text-slate-600" />
            </div>
          </>
        )}
      </div>
      <span {...corner} aria-label="Resize" className="absolute right-0 bottom-0 size-4 cursor-nwse-resize touch-none" />
    </div>,
    document.body,
  )
}
