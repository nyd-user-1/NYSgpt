"use client"

import * as React from "react"
import { ArrowDown, ArrowUp } from "lucide-react"

import { registerPageBlock, useHiddenBlocks } from "@/lib/home-blocks"
import { PAGE_BLOCK_MIME, readPageBlockDrag } from "@/lib/shelf-drag"
import { cn } from "@/lib/utils"

// GovBlock's block order (components/admin/blocks/block-order.tsx): every block is one full-width row, so
// moving one is an up or a down. The arrows show at a block's top right while the pointer is on it, and the
// order is kept per page in this browser. Blocks move with CSS `order`, not remounting, so charts keep state.
// Every ordered block also sits on the Blocks shelf (Brendan, 2026-10-23): Delete takes it off the page,
// and dragging its tile from the shelf onto the page puts it back where it drops. A page name is shared by
// every page of its kind (all video pages are one layout), so a deletion holds on all of them.

const OrderContext = React.createContext<{ page: string; order: string[]; move: (id: string, by: number) => void; pin: (id: string) => void; place: (id: string, before: string | null) => void } | null>(null)
/** The block's own place in its column, for its menu's Pin to top and Delete. */
const PinContext = React.createContext<{ pin: () => void; first: boolean; hide: () => void } | null>(null)
export const usePinTop = () => React.useContext(PinContext)

/** The hidden-block key of an ordered block. */
export const orderedKey = (page: string, id: string) => `${page}/${id}`

export function BlockOrder({ page, initial, children }: { page: string; initial: string[]; children: React.ReactNode }) {
  const [order, setOrder] = React.useState(initial)
  const key = `block-order:${page}`
  const { show } = useHiddenBlocks()
  React.useEffect(() => {
    try {
      const kept = JSON.parse(window.localStorage.getItem(key) ?? "null") as unknown
      if (Array.isArray(kept) && kept.length === initial.length && initial.every((id) => kept.includes(id))) setOrder(kept as string[])
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const save = React.useCallback(
    (next: string[]) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {}
      return next
    },
    [key],
  )
  const move = React.useCallback(
    (id: string, by: number) =>
      setOrder((current) => {
        const from = current.indexOf(id)
        const to = from + by
        if (from < 0 || to < 0 || to >= current.length) return current
        const next = [...current]
        ;[next[from], next[to]] = [next[to], next[from]]
        return save(next)
      }),
    [save],
  )
  const pin = React.useCallback(
    (id: string) =>
      setOrder((current) => {
        if (current.indexOf(id) <= 0) return current
        return save([id, ...current.filter((x) => x !== id)])
      }),
    [save],
  )
  /** Moves `id` to just before `before` (null: to the end). */
  const place = React.useCallback(
    (id: string, before: string | null) =>
      setOrder((current) => {
        if (!current.includes(id) || id === before) return current
        const rest = current.filter((x) => x !== id)
        const at = before == null ? rest.length : rest.indexOf(before)
        rest.splice(at < 0 ? rest.length : at, 0, id)
        return save(rest)
      }),
    [save],
  )
  const value = React.useMemo(() => ({ page, order, move, pin, place }), [page, order, move, pin, place])
  // A tile dropped in the column's open space comes back at the column's end.
  const onDrop = (e: React.DragEvent) => {
    const d = readPageBlockDrag(e.dataTransfer)
    if (!d || d.page !== page) return
    e.preventDefault()
    show(orderedKey(d.page, d.id))
    place(d.id, null)
  }
  return (
    <OrderContext.Provider value={value}>
      <div className="flex flex-col" onDragOver={(e) => e.dataTransfer.types.includes(PAGE_BLOCK_MIME) && e.preventDefault()} onDrop={onDrop}>
        {children}
      </div>
    </OrderContext.Provider>
  )
}

export function OrderedBlock({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const ctx = React.useContext(OrderContext)
  const { hidden, hide, show } = useHiddenBlocks()
  const [over, setOver] = React.useState(false)
  const page = ctx?.page
  const gone = !!page && hidden.includes(orderedKey(page, id))
  React.useEffect(() => (page ? registerPageBlock({ page, id, label }) : undefined), [page, id, label])
  const at = ctx ? ctx.order.indexOf(id) : 0
  const last = ctx ? ctx.order.length - 1 : 0
  const pinned = React.useMemo(() => (ctx ? { pin: () => ctx.pin(id), first: at <= 0, hide: () => hide(orderedKey(ctx.page, id)) } : null), [ctx, id, at, hide])
  if (gone) return null
  const arrow = "inline-flex size-6 items-center justify-center rounded-md text-slate-800 transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-3.5"
  // A shelf tile dropped on this block comes back just above it.
  const onDrop = (e: React.DragEvent) => {
    setOver(false)
    const d = readPageBlockDrag(e.dataTransfer)
    if (!d || !ctx || d.page !== ctx.page) return
    e.preventDefault()
    e.stopPropagation()
    show(orderedKey(d.page, d.id))
    ctx.place(d.id, id)
  }
  return (
    <div
      id={page ? `block-${page}-${id}` : undefined}
      style={{ order: at }}
      className={cn("group/block relative mt-5 scroll-mt-20 rounded-xl transition-shadow", over && "ring-2 ring-pax2-light-blue ring-offset-4")}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(PAGE_BLOCK_MIME)) return
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      {ctx && (
        <div className={cn("absolute -top-3 right-6 z-10 flex items-center gap-0.5 rounded-lg border bg-pax2-surface p-0.5 opacity-0 shadow-xs transition-opacity", "group-hover/block:opacity-100 focus-within:opacity-100")}>
          <button type="button" aria-label={`Move ${label} up`} disabled={at <= 0} onClick={() => ctx.move(id, -1)} className={arrow}>
            <ArrowUp />
          </button>
          <button type="button" aria-label={`Move ${label} down`} disabled={at >= last} onClick={() => ctx.move(id, 1)} className={arrow}>
            <ArrowDown />
          </button>
        </div>
      )}
      <PinContext.Provider value={pinned}>{children}</PinContext.Provider>
    </div>
  )
}
