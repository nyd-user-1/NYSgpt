'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import {
  ArrowUpLeft,
  ArrowUpRight,
  Bell,
  BookOpen,
  EllipsisVertical,
  Grid3x3,
  GripVertical,
  History,
  House,
  KeyRound,
  Link2,
  PanelRight,
  Search,
  Settings,
  Trash2,
  User,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useSwitchboard } from '@/components/SwitchboardPanel'
import { useShellPanel, type NavAt, type Side } from '@/components/shell'
import { boxSlug, isEmbedded } from '@/lib/pane'

const SERIF = { fontFamily: 'var(--font-display), Georgia, serif' } as const
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const

/**
 * The Nav, ported from pax-trinity's go-to-menu (2026-10-31/11-02) in the
 * paper dress: Shift and a right-click anywhere opens a page switcher at the
 * pointer. Type to find; Recent, Pages and the Boxes otherwise. Enter or a
 * click opens a page on the side the menu opened over — the main page, or the
 * second panel (components/shell.tsx) — and ⌥ Enter or a row's arrow on the
 * other; a box opens its page in the second panel (⌥: the main page), and a
 * box row's ↗ leaves for its site. A plain right-click on a header's empty run
 * opens the same card (the shell's headerMenu). Shift and a right-click on one
 * of this app's links sends the link to the second panel instead (the shell). A link, a control, a text field, or an open
 * menu or dialog keeps the browser's menu, as does a right-click a surface
 * has already taken. A second Shift right-click moves the card to its point.
 * Firefox never hands a page Shift and a right-click (it shows its own menu
 * by design), so the gesture is Chrome's and Safari's.
 */

/** A text field or a select, whose menu is the browser's under every gesture. */
const FIELD = "input, textarea, select, [contenteditable]:not([contenteditable='false'])"
/** What keeps its own menu, the browser's, even with Shift. */
const NATIVE_MENU = `a, button, ${FIELD}, [role=button], [role=combobox], [role=menu], [role=dialog]`

const WIDTH = 296
const RECENT = 5
const STORE = 'nysgpt-nav-recents'

/** The pages a reader can go to, with their sidebar-grade icons. */
const PAGES: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Home', icon: House },
  { href: '/legislative-api/dictionary', label: 'Data dictionary', icon: BookOpen },
  { href: '/legislative-api/coverage', label: 'Coverage', icon: Grid3x3 },
  { href: '/account/api', label: 'API console', icon: KeyRound },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
]

type Entry = {
  key: string
  label: string
  icon: LucideIcon
  href: string
  /** A box: its page opens in the second panel unless ⌥ sends it to the main page. */
  box?: boolean
  /** A box's site, for the row's ↗. */
  out?: string
}

function readRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? '[]') as string[]
  } catch {
    return []
  }
}

/** A search's order: the label starting with it, then a word in it starting with it, then anywhere in it. */
function rank(label: string, needle: string) {
  const l = label.toLowerCase()
  if (l.startsWith(needle)) return 0
  if (l.split(/\s+/).some(w => w.startsWith(needle))) return 1
  return 2
}

export function ShiftNav() {
  const path = usePathname()
  const { cards } = useSwitchboard()
  const { nav, openNav, closeNav, goTo, paneHref, mainHere } = useShellPanel()
  const latest = useRef({ openNav, paneHref, mainHere })
  latest.current = { openNav, paneHref, mainHere }

  // Every page seen lands at the head of Recent, kept in this browser — the main page's and the panel's.
  useEffect(() => {
    if (!path) return
    try {
      localStorage.setItem(STORE, JSON.stringify([path, ...readRecents().filter(h => h !== path)].slice(0, 12)))
    } catch {
      /* nothing lost but the trail */
    }
  }, [path])

  // The gesture: Shift and a right-click anywhere that keeps no menu of its own. Over the second panel's
  // header the card drives the panel; inside the panel's frame, the frame's own Nav opens for the panel it is.
  useEffect(() => {
    const on = (e: MouseEvent) => {
      if (!e.shiftKey || e.defaultPrevented) return
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest(NATIVE_MENU)) return
      e.preventDefault()
      const { openNav, paneHref, mainHere } = latest.current
      const side: Side = isEmbedded() || target?.closest('[data-pane-host]') ? 'pane' : 'main'
      const here = isEmbedded() ? window.location.pathname + window.location.search : side === 'pane' ? (paneHref ?? '') : mainHere()
      openNav({ x: e.clientX, y: e.clientY, side, here })
    }
    window.addEventListener('contextmenu', on)
    return () => window.removeEventListener('contextmenu', on)
  }, [])

  if (!nav) return null
  return <NavCard at={nav} cards={cards} onOpen={goTo} onClose={closeNav} />
}

function NavCard({
  at,
  cards,
  onOpen,
  onClose,
}: {
  at: NavAt
  cards: { title: string; href: string }[]
  onOpen: (href: string, to: Side) => void
  onClose: () => void
}) {
  const { side, here } = at
  const other: Side = side === 'main' ? 'pane' : 'main'
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [menu, setMenu] = useState(false)
  const [pos, setPos] = useState({ left: at.x, top: at.y })
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [recents, setRecents] = useState<string[]>([])
  useEffect(() => setRecents(readRecents()), [])

  const close = useCallback(() => onClose(), [onClose])

  const entry = useCallback(
    (page: (typeof PAGES)[number]): Entry => ({
      key: page.href,
      label: page.label,
      icon: page.icon,
      href: page.href,
    }),
    [],
  )

  const sections = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const recent: Entry[] = recents
      .filter(h => h !== here)
      .map(h => PAGES.find(p => p.href === h))
      .filter((p): p is (typeof PAGES)[number] => !!p)
      .slice(0, RECENT)
      .map(p => ({ ...entry(p), key: `recent:${p.href}`, icon: History }))
    const pages = PAGES.map(entry)
    const boxes: Entry[] = cards.map(c => ({
      key: `box:${c.title}`,
      label: c.title,
      icon: PanelRight,
      href: `/box/${boxSlug(c.title)}`,
      box: true,
      out: c.href || undefined,
    }))
    if (needle) {
      const hits = [...pages, ...boxes].filter(e => e.label.toLowerCase().includes(needle))
      return [{ label: null, entries: hits.sort((a, b) => rank(a.label, needle) - rank(b.label, needle)) }]
    }
    return [
      { label: 'Recent', entries: recent },
      { label: 'Pages', entries: pages },
      { label: 'Boxes', entries: boxes },
    ].filter(s => s.entries.length)
  }, [q, recents, here, cards, entry])
  const flat = sections.flatMap(s => s.entries)
  useEffect(() => setActive(0), [q])

  // Held inside the window: a right-click near an edge opens the menu toward the room.
  useLayoutEffect(() => {
    const h = box.current?.offsetHeight ?? 0
    setPos({
      left: Math.max(8, Math.min(at.x, window.innerWidth - WIDTH - 8)),
      top: Math.max(8, Math.min(at.y, window.innerHeight - h - 8)),
    })
  }, [at])

  useEffect(() => {
    // A second Shift right-click moves the card to its point, so its press doesn't close it.
    const down = (e: MouseEvent) =>
      !(e.button === 2 && e.shiftKey) && !box.current?.contains(e.target as Node) && close()
    const away = () => close()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', key)
    document.addEventListener('mousedown', down)
    window.addEventListener('resize', away)
    window.addEventListener('blur', away)
    return () => {
      document.removeEventListener('keydown', key)
      document.removeEventListener('mousedown', down)
      window.removeEventListener('resize', away)
      window.removeEventListener('blur', away)
    }
  }, [close])

  // The grip moves the card: pressed, it follows the pointer, held inside the window.
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const grip = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      drag.current = { dx: e.clientX - pos.left, dy: e.clientY - pos.top }
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!drag.current) return
      const h = box.current?.offsetHeight ?? 0
      setPos({
        left: Math.max(8, Math.min(e.clientX - drag.current.dx, window.innerWidth - WIDTH - 8)),
        top: Math.max(8, Math.min(e.clientY - drag.current.dy, window.innerHeight - h - 8)),
      })
    },
    onPointerUp: () => (drag.current = null),
  }

  /** Where a row goes: its side, or with ⌥ (or its arrow) the other. A box's side is the second panel. */
  const target = (e: Entry, alt: boolean): Side => (e.box ? (alt ? 'main' : 'pane') : alt ? other : side)
  const go = (e: Entry, alt = false) => {
    close()
    onOpen(e.href, target(e, alt))
  }

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('button, [role=menu]')) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const n = flat.length
      if (n) setActive(i => (i + (e.key === 'ArrowDown' ? 1 : -1) + n) % n)
    }
    if (e.key === 'Enter' && flat[active]) {
      e.preventDefault()
      go(flat[active], e.altKey)
    }
  }

  // Keep the active row in view as the arrows walk the list.
  useEffect(() => {
    box.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  let i = -1
  return createPortal(
    // `nysgpt-app` on the portaled root: the paper tokens are scoped to it.
    <div
      ref={box}
      role="dialog"
      aria-label="Nav"
      onKeyDown={onKey}
      onContextMenu={e => e.preventDefault()}
      style={{ left: pos.left, top: pos.top, width: WIDTH }}
      className="nysgpt-app fixed z-[70] flex flex-col overflow-hidden rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper)] shadow-[0_4px_32px_rgba(0,0,0,0.18)]"
    >
      <div className="relative flex shrink-0 items-center gap-1.5 border-b border-[var(--paper-rule)] py-2 pr-2 pl-2.5">
        <span
          {...grip}
          aria-label="Move"
          title="Move"
          className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-[var(--paper-faint)] active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[15px] text-[var(--paper-text)]" style={SERIF}>
          Nav
        </h3>
        <button
          onClick={() => setMenu(v => !v)}
          aria-label="Nav options"
          aria-expanded={menu}
          className="shrink-0 rounded-lg p-1.5 text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)] aria-expanded:bg-[var(--paper-quiet)]"
        >
          <EllipsisVertical className="h-4 w-4" />
        </button>
        {menu && (
          <div
            role="menu"
            className="absolute top-full right-2 z-10 mt-1 w-56 overflow-hidden rounded-xl border border-[var(--paper-rule)] bg-[var(--paper)] py-1 shadow-[0_4px_32px_rgba(0,0,0,0.18)]"
          >
            <MenuRow
              icon={Link2}
              label="Copy this page's link"
              onClick={() => {
                void navigator.clipboard?.writeText(`${window.location.origin}${here}`)
                setMenu(false)
                input.current?.focus()
              }}
            />
            <MenuRow
              icon={Trash2}
              label="Clear recent pages"
              disabled={!recents.length}
              onClick={() => {
                try {
                  localStorage.removeItem(STORE)
                } catch {
                  /* already gone */
                }
                setRecents([])
                setMenu(false)
                input.current?.focus()
              }}
            />
            <MenuRow icon={X} label="Close" onClick={close} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 border-b border-[var(--paper-rule)] px-3.5 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-[var(--paper-faint)]" />
        <input
          ref={input}
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Go to…"
          aria-label="Go to a page"
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--paper-text)] outline-none placeholder:text-[var(--paper-faint)]"
          style={SANS}
        />
      </div>
      <div className="no-scrollbar max-h-[min(380px,64vh)] overflow-y-auto py-1" role="listbox">
        {!flat.length && (
          <p className="px-4 py-3 text-sm text-[var(--paper-muted)]" style={SANS}>
            Nothing matches.
          </p>
        )}
        {sections.map(s => (
          <div key={s.label ?? 'hits'} className="pb-1">
            {s.label && (
              <p
                className="px-4 pt-2.5 pb-1 text-[10px] uppercase tracking-[0.18em] text-[var(--paper-faint)]"
                style={MONO}
              >
                {s.label}
              </p>
            )}
            {s.entries.map(e => {
              i += 1
              const me = i
              const on = me === active
              return (
                <div
                  key={e.key}
                  role="option"
                  aria-selected={on}
                  data-active={on}
                  onMouseMove={() => setActive(me)}
                  onClick={ev => go(e, ev.altKey)}
                  className={`group/nav flex cursor-pointer items-center gap-2.5 px-4 py-1.5 text-sm transition-colors ${
                    on ? 'bg-[var(--paper-quiet)] text-[var(--paper-strong)]' : 'text-[var(--paper-text)]'
                  }`}
                  style={SANS}
                >
                  <e.icon className={`h-4 w-4 shrink-0 ${on ? 'text-[var(--paper-strong)]' : 'text-[var(--paper-faint)]'}`} />
                  <span className="min-w-0 flex-1 truncate">{e.label}</span>
                  {(() => {
                    const alt = target(e, true)
                    return (
                      <button
                        type="button"
                        aria-label={`Open ${e.label} in ${alt === 'pane' ? 'the second panel' : 'the main page'}`}
                        title={alt === 'pane' ? 'Panel 2' : 'Main page'}
                        onClick={ev => {
                          ev.stopPropagation()
                          go(e, true)
                        }}
                        className={`flex size-6 shrink-0 items-center justify-center rounded-md text-[var(--paper-faint)] hover:bg-[var(--paper-rule-soft)] hover:text-[var(--paper-strong)] ${
                          on ? '' : 'opacity-0 group-hover/nav:opacity-100'
                        }`}
                      >
                        {alt === 'pane' ? <PanelRight className="h-3.5 w-3.5" /> : <ArrowUpLeft className="h-3.5 w-3.5" />}
                      </button>
                    )
                  })()}
                  {e.out && (
                    <a
                      href={e.out}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`Open ${e.label}'s site`}
                      title="Open the site"
                      onClick={ev => {
                        ev.stopPropagation()
                        close()
                      }}
                      className={`flex size-6 shrink-0 items-center justify-center rounded-md text-[var(--paper-faint)] hover:bg-[var(--paper-rule-soft)] hover:text-[var(--paper-strong)] ${
                        on ? '' : 'opacity-0 group-hover/nav:opacity-100'
                      }`}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>,
    document.body,
  )
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-[var(--paper-text)] transition-colors hover:bg-[var(--paper-quiet)] disabled:opacity-40 disabled:hover:bg-transparent"
      style={SANS}
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--paper-faint)]" />
      {label}
    </button>
  )
}
