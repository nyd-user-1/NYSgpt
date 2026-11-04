"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Check, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

// The three-dot menu, after Code/hq's sidebar-row kebab (app/ui/sidebar-recents.tsx), in PAX's light
// dress: the thing's identity leads (a mono line that copies on click), then icon rows, rows that open
// a flyout on hover (marked with a chevron), separators, and context at the foot. Portaled and fixed off
// its trigger so no scroll container clips it; closes on an outside click, Escape, or scroll.

type Ctx = { close: () => void; flyout: string | null; setFlyout: (k: string | null) => void; side: "left" | "right" }
const MenuCtx = React.createContext<Ctx>({ close: () => {}, flyout: null, setFlyout: () => {}, side: "right" })

export const ROW = "group/row flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
export const ICON = "flex size-4 shrink-0 items-center justify-center text-slate-400 transition-colors group-hover/row:text-pax2-blue [&_svg]:size-4"

/** One action. It runs, then the menu closes. `checked` marks the current choice in a set. */
export function MenuRow({ icon, label, onClick, checked, danger, hint, disabled }: { icon?: React.ReactNode; label: React.ReactNode; onClick: () => void; checked?: boolean; danger?: boolean; hint?: React.ReactNode; disabled?: boolean }) {
  const { close } = React.useContext(MenuCtx)
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
        close()
      }}
      className={cn(ROW, danger && "text-destructive hover:text-destructive", checked && "font-medium text-slate-900", disabled && "pointer-events-none opacity-40")}
    >
      {icon !== undefined && <span className={ICON}>{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="shrink-0 text-[11px] text-slate-400">{hint}</span>}
      {checked && <Check className="size-3.5 shrink-0 text-pax2-light-blue" />}
    </button>
  )
}

/** A row that opens a submenu beside the menu while the pointer is on it. */
export function MenuFlyout({ id, icon, label, hint, children }: { id: string; icon?: React.ReactNode; label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  const { flyout, setFlyout, side } = React.useContext(MenuCtx)
  const open = flyout === id
  return (
    <div
      className="relative"
      onMouseOver={(e) => {
        e.stopPropagation()
        setFlyout(id)
      }}
    >
      <div role="menuitem" aria-haspopup="menu" aria-expanded={open} tabIndex={0} onFocus={() => setFlyout(id)} className={cn(ROW, "cursor-default", open && "bg-slate-100 text-slate-900")}>
        {icon !== undefined && <span className={cn(ICON, open && "text-pax2-blue")}>{icon}</span>}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {hint && <span className="shrink-0 text-[11px] text-slate-400">{hint}</span>}
        <ChevronRight className="size-3.5 shrink-0 text-slate-400" />
      </div>
      {open && (
        <div className={cn("absolute top-0 z-50", side === "left" ? "right-full pr-1" : "left-full pl-1")}>
          <div role="menu" className="flex min-w-44 flex-col whitespace-nowrap rounded-xl border border-slate-200 bg-pax2-surface p-1 shadow-e3">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-slate-200" />
}

/** The identity line that leads the menu; a click copies `copy` (a link, an id). */
export function MenuHeader({ text, copy }: { text: string; copy: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <button
      type="button"
      role="menuitem"
      title={`Copy ${copy}`}
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(copy)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1200)
      }}
      className="flex items-center rounded-lg px-2.5 py-1.5 text-left font-mono text-[11px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
    >
      <span className="min-w-0 truncate">{copied ? "copied ✓" : text}</span>
    </button>
  )
}

/** Context at the foot: what this is, and where it lives in mono under it. */
export function MenuFoot({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-2.5 pb-1.5 pt-1">
      <span className="min-w-0 truncate text-[13px] text-slate-700">{title}</span>
      {sub && <span className="min-w-0 truncate font-mono text-[11px] text-slate-400">{sub}</span>}
    </div>
  )
}

/** The trigger and its menu. `align` sets which edge the menu hangs from; flyouts open toward the
 *  roomier side (left for a menu hung from the right edge). */
export function KebabMenu({
  trigger,
  label,
  children,
  align = "right",
  width = "w-60",
  triggerClassName,
}: {
  trigger: React.ReactNode
  label: string
  children: React.ReactNode
  align?: "left" | "right"
  width?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [flyout, setFlyout] = React.useState<string | null>(null)
  const [pos, setPos] = React.useState<{ top: number; left?: number; right?: number } | null>(null)
  const btn = React.useRef<HTMLButtonElement>(null)
  const menu = React.useRef<HTMLDivElement>(null)
  const close = React.useCallback(() => {
    setOpen(false)
    setFlyout(null)
  }, [])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    window.addEventListener("click", close)
    window.addEventListener("keydown", onKey)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("click", close)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [open, close])

  // Too near the foot of the window, the menu opens upward instead.
  React.useLayoutEffect(() => {
    if (!open || !menu.current || !btn.current || !pos) return
    const h = menu.current.getBoundingClientRect().height
    const r = btn.current.getBoundingClientRect()
    if (pos.top + h > window.innerHeight - 8 && r.top - h - 4 > 8) setPos((p) => (p ? { ...p, top: r.top - h - 4 } : p))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (open) return close()
    const r = btn.current?.getBoundingClientRect()
    if (r) setPos(align === "right" ? { top: r.bottom + 4, right: window.innerWidth - r.right } : { top: r.bottom + 4, left: r.left })
    setOpen(true)
  }

  return (
    <>
      <button ref={btn} type="button" onClick={toggle} aria-label={label} aria-haspopup="menu" aria-expanded={open} className={triggerClassName}>
        {trigger}
      </button>
      {open &&
        pos &&
        createPortal(
          <MenuCtx.Provider value={{ close, flyout, setFlyout, side: align === "right" ? "left" : "right" }}>
            <div
              ref={menu}
              role="menu"
              onClick={(e) => e.stopPropagation()}
              onMouseOver={() => setFlyout(null)}
              style={{ top: pos.top, left: pos.left, right: pos.right }}
              className={cn("fixed z-[70] flex flex-col whitespace-nowrap rounded-xl border border-slate-200 bg-pax2-surface p-1 shadow-e3", width)}
            >
              {children}
            </div>
          </MenuCtx.Provider>,
          document.body,
        )}
    </>
  )
}
