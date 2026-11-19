"use client"

import * as React from "react"
import { Extension, type Editor, type Range } from "@tiptap/core"
import Mention from "@tiptap/extension-mention"
import { TableKit } from "@tiptap/extension-table"
import { PluginKey } from "@tiptap/pm/state"
import { ReactRenderer } from "@tiptap/react"
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion"
import { Heading1, Heading2, Heading3, List, ListOrdered, Minus, Quote, Table2 } from "lucide-react"

import { ICON, ROW } from "@/components/kebab-menu"
import { cn } from "@/lib/utils"

// What a note card's editor has beyond the Inbox compose's (Brendan, 2026-10-31): tables, which PAX's answers
// come back with and the toolbar inserts; the "/" menu, the Leuk editor's blocks (components/notes/notes-editor.tsx);
// and "@", which names a member of the workspace (lib/roles.ts). Each menu opens at the caret in the house menu's
// dress; arrow keys move, Enter or Tab picks, Escape lets it go. All three keep to markdown: a table is a pipe
// table, a mention its <span data-type="mention"> (tiptap-markdown keeps a node it has no syntax for as HTML).

type Row = { key: string; label: string; hint?: string; icon: React.ReactNode }
type SlashItem = Row & { run: (editor: Editor, range: Range) => void }
type Person = Row & { id: string }

const SLASH: SlashItem[] = [
  { key: "h1", label: "Heading 1", hint: "#", icon: <Heading1 />, run: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 1 }).run() },
  { key: "h2", label: "Heading 2", hint: "##", icon: <Heading2 />, run: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 2 }).run() },
  { key: "h3", label: "Heading 3", hint: "###", icon: <Heading3 />, run: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 3 }).run() },
  { key: "bullet", label: "Bulleted list", hint: "-", icon: <List />, run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { key: "ordered", label: "Numbered list", hint: "1.", icon: <ListOrdered />, run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { key: "quote", label: "Blockquote", hint: ">", icon: <Quote />, run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { key: "table", label: "Table", hint: "3×3", icon: <Table2 />, run: (e, r) => e.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { key: "divider", label: "Divider", hint: "---", icon: <Minus />, run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
]

/** The workspace's members. NYSgpt (brief 61) has no roster of members (pax-trinity's lib/roles.ts), so "@" finds no
 *  one until it has one; the menu, the mention node and its markdown are as written. */
type Member = { name: string; email?: string; photo?: string }
const MEMBERS: Member[] = []
const PEOPLE: Person[] = MEMBERS.map((m) => ({
  key: m.email ?? m.name,
  id: m.email ?? m.name,
  label: m.name,
  icon: m.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={m.photo} alt="" className="size-4 rounded-full object-cover" />
  ) : (
    <span className="flex size-4 items-center justify-center rounded-full bg-pax2-lavender text-[9px] font-semibold text-pax2-blue">{m.name[0]}</span>
  ),
}))

const matches = (label: string, query: string) => label.toLowerCase().includes(query.trim().toLowerCase())

type ListProps = { items: Row[]; pick: (item: Row) => void }
type ListHandle = { onKeyDown: (event: KeyboardEvent) => boolean }

const MenuList = React.forwardRef<ListHandle, ListProps>(function MenuList({ items, pick }, ref) {
  const [at, setAt] = React.useState(0)
  React.useEffect(() => setAt(0), [items])
  React.useImperativeHandle(
    ref,
    () => ({
      onKeyDown: (event) => {
        if (!items.length) return false
        if (event.key === "ArrowDown") setAt((i) => (i + 1) % items.length)
        else if (event.key === "ArrowUp") setAt((i) => (i - 1 + items.length) % items.length)
        else if (event.key === "Enter" || event.key === "Tab") pick(items[Math.min(at, items.length - 1)])
        else return false
        return true
      },
    }),
    [items, at, pick],
  )
  if (!items.length) return null
  return (
    <div role="menu" className="nysgpt-note flex w-56 flex-col rounded-xl border border-slate-200 bg-pax2-surface p-1 shadow-e3">
      {items.map((it, i) => (
        <button
          key={it.key}
          type="button"
          role="menuitem"
          // The editor keeps its caret: a press here doesn't take the focus.
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setAt(i)}
          onClick={() => pick(it)}
          className={cn(ROW, i === at && "bg-slate-100 text-slate-900")}
        >
          <span className={ICON}>{it.icon}</span>
          <span className="min-w-0 flex-1 truncate">{it.label}</span>
          {it.hint && <span className="shrink-0 text-[11px] text-slate-400">{it.hint}</span>}
        </button>
      ))}
    </div>
  )
})

/** A suggestion's menu: mounted on the body at the caret, below it or above when the window has no room below.
 *  `chosen` turns the picked row into what the suggestion's command takes. */
function popup<I extends Row, S>(chosen: (item: I) => S) {
  return () => {
    let r: ReactRenderer<ListHandle, ListProps> | null = null
    const place = (rect?: (() => DOMRect | null) | null) => {
      const box = rect?.()
      const el = r?.element
      if (!el || !box) return
      const h = el.offsetHeight
      Object.assign(el.style, {
        position: "fixed",
        zIndex: "70",
        left: `${Math.max(8, Math.min(box.left, window.innerWidth - 232))}px`,
        top: `${box.bottom + 6 + h > window.innerHeight - 8 ? Math.max(8, box.top - h - 6) : box.bottom + 6}px`,
      })
    }
    const props = (p: SuggestionProps<I, S>): ListProps => ({ items: p.items, pick: (item) => p.command(chosen(item as I)) })
    return {
      onStart: (p: SuggestionProps<I, S>) => {
        r = new ReactRenderer<ListHandle, ListProps>(MenuList, { props: props(p), editor: p.editor })
        document.body.appendChild(r.element)
        place(p.clientRect)
        // Its height is known once it has drawn.
        requestAnimationFrame(() => place(p.clientRect))
      },
      onUpdate: (p: SuggestionProps<I, S>) => {
        r?.updateProps(props(p))
        place(p.clientRect)
      },
      onKeyDown: ({ event }: SuggestionKeyDownProps) => r?.ref?.onKeyDown(event) ?? false,
      onExit: () => {
        r?.element.remove()
        r?.destroy()
        r = null
      },
    }
  }
}

const SlashMenu = Extension.create({
  name: "slashMenu",
  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        char: "/",
        pluginKey: new PluginKey("slashMenu"),
        // Not inside code, where a slash is a slash.
        allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
        items: ({ query }) => SLASH.filter((i) => matches(i.label, query)),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: popup<SlashItem, SlashItem>((i) => i),
      }),
    ]
  },
})

/** The note card's extensions, made for each editor. */
export function noteExtensions() {
  return [
    TableKit.configure({ table: { resizable: false } }),
    SlashMenu,
    Mention.configure({
      HTMLAttributes: { class: "mention" },
      suggestion: {
        char: "@",
        items: ({ query }) => PEOPLE.filter((p) => matches(p.label, query)),
        render: popup<Person, { id: string; label: string }>((p) => ({ id: p.id, label: p.label })),
      },
    }),
  ]
}
