import * as React from "react"
import { ChartColumn, FileText, LayoutGrid, Loader2, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// BlockCard (Brendan, 2026-11-01): the square tile of the right panel's shelves. The Blocks shelf, Tools'
// Lift Analysis and the Clips Reports view drew it in place four times over. It is the frame, the kind's
// icon, the title and the sub. What a tile is about comes in as props: kind picks the icon, muted is a
// block still on its page, loading spins the icon, and the frame's selected, dragging and drop-target
// states are the shelf's. A variant exists only where a kind changes the layout: "thumbnail", a short
// whose picture fills the tile with its title over it and its length in the corner.
//
// Children render last, inside the frame: the shelf's remove button sits there.

export type BlockCardKind = "block" | "lift" | "report"

const KIND_ICON: Record<BlockCardKind, LucideIcon> = { block: LayoutGrid, lift: ChartColumn, report: FileText }

type BlockCardProps = Omit<React.ComponentProps<"div">, "title"> & {
  title: React.ReactNode
  /** One line under the title (where the block lives, the wave). */
  sub?: React.ReactNode
  /** What the tile is; picks the icon at its top-left. */
  kind?: BlockCardKind
  /** An icon of the caller's own, in place of the kind's. */
  icon?: React.ReactNode
  /** "thumbnail": a short's picture fills the tile, the title over its foot. */
  variant?: "default" | "thumbnail"
  /** The thumbnail variant's picture. */
  image?: string
  /** The thumbnail variant's corner badge (the short's length). */
  badge?: React.ReactNode
  /** A block still on its page: dashed, faded, its icon grey. */
  muted?: boolean
  /** The block's page is on its way: the icon spins. */
  loading?: boolean
  /** The tile last opened from its shelf: the blue border. */
  selected?: boolean
  /** Being dragged: faded. */
  dragging?: boolean
  /** Another tile is being dragged over this one: the light blue ring. */
  dropTarget?: boolean
}

function BlockCard({ title, sub, kind = "block", icon, variant = "default", image, badge, muted, loading, selected, dragging, dropTarget, className, children, ...props }: BlockCardProps) {
  // A tile that drags shows the grab hand and fades as it goes; one that only opens shows the pointer.
  const grab = !!props.draggable
  const frame = cn(
    grab
      ? "relative aspect-square cursor-grab overflow-hidden rounded-xl border bg-pax2-surface shadow-e1 transition-[opacity,box-shadow,border-color] active:cursor-grabbing"
      : "relative aspect-square cursor-pointer overflow-hidden rounded-xl border bg-pax2-surface shadow-e1 transition-[box-shadow,border-color]",
    selected ? "border-pax2-blue" : "border-slate-200 hover:border-pax2-blue",
    dragging && "opacity-40",
    dropTarget && !dragging && "ring-2 ring-pax2-light-blue",
  )

  if (variant === "thumbnail")
    return (
      <div data-slot="block-card" data-variant="thumbnail" className={cn(frame, className)} {...props}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image && <img src={image} alt="" draggable={false} className="absolute inset-0 size-full object-cover" />}
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night-950/85 to-transparent px-2 pb-1.5 pt-6">
          <span className="line-clamp-2 text-[11px] font-semibold leading-snug text-white">{title}</span>
        </span>
        {badge && <span className="absolute right-1.5 top-1.5 rounded-md bg-night-950/70 px-1 py-0.5 font-mono text-[10px] text-white">{badge}</span>}
        {children}
      </div>
    )

  const Icon = KIND_ICON[kind]
  return (
    <div data-slot="block-card" className={cn(frame, "group flex flex-col justify-between p-2.5 hover:shadow-e2", muted && "border-dashed bg-slate-50 opacity-70", className)} {...props}>
      {loading ? <Loader2 className="size-4 animate-spin text-pax2-blue" /> : (icon ?? <Icon className={cn("size-4", muted ? "text-slate-400" : "text-pax2-blue")} />)}
      {sub != null ? (
        <span className="min-w-0">
          <span className="line-clamp-3 text-[12px] font-semibold leading-snug text-slate-900">{title}</span>
          <span className="mt-0.5 block truncate text-[10px] text-slate-500">{sub}</span>
        </span>
      ) : (
        <span className="line-clamp-3 min-w-0 text-[12px] font-semibold leading-snug text-slate-900">{title}</span>
      )}
      {children}
    </div>
  )
}

export { BlockCard }
