"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"

import { CardAnchor, CardTools, slug } from "@/components/dash/card-tools"
import { CarouselChevrons } from "@/components/record/chart-carousel"
import { PAX2Search, PAX2Table2 } from "@/components/pax2-table2"
import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/components/nova/card"
import { useHiddenBlocks } from "@/lib/home-blocks"
import { cn } from "@/lib/utils"

// The one block (Brendan, 2026-10-06): every dashboard block is the same card —
// the title, the searchbar beside it, the three-dot menu, the size chevron,
// and a body that scrolls inside its height. Three sizes (Brendan, 2026-10-23):
// Half View, 420px; Full View, the content's own height up to 840px, where
// the body scrolls, and every block's state on load; Collapse, the header alone. The chevron steps Half and Full; the menu
// holds all three. TableBlock, CardBlock and
// AccordionBlock are MainBlock under the variant's name, so the inspector says
// what the screen shows; only the content inside differs.

/** Half View: every block's default height. */
export const BLOCK_HEIGHT = "h-[420px]"
/** A SmallBlock's Half and Full View: its content's own height, capped. */
const SMALL_HALF = "max-h-[420px]"
const SMALL_FULL = "max-h-[840px]"
/** Full View: as tall as the content needs, never shorter than Half View, at most 840px; past it the
 *  body scrolls. */
export const BLOCK_FULL = "min-h-[420px] max-h-[840px]"
export type BlockSize = "collapsed" | "half" | "full"
const SizeCtx = React.createContext<BlockSize>("half")
/** The size of the block a component sits in, for content that shows more at Full View. */
export const useBlockSize = () => React.useContext(SizeCtx)

export type BlockProps = {
  title: string
  children: React.ReactNode
  /** Placeholder for the searchbar beside the title; omit it for no searchbar. */
  search?: string
  /** Searchbar state, for a block that filters its own rows instead of the DOM. */
  searchValue?: string
  onSearch?: (v: string) => void
  /** Controls between the title and the searchbar (a refresh, a legend). */
  tools?: React.ReactNode
  /** Controls left of the three-dot menu (a view toggle). */
  actions?: React.ReactNode
  /** What the menu's Download writes. */
  rows?: readonly Record<string, unknown>[]
  name?: string
  /** Views the three-dot menu can switch between. */
  views?: readonly { value: string; label: string }[]
  view?: string
  onView?: (value: string) => void
  defaultOpen?: boolean
  /** Half View's height when a page fills the viewport with one block (a height class). "auto" and "max"
   *  are retired: they read as the standard 420px. */
  height?: string
  /** Ignored (Brendan, 2026-10-20): every block's footer is the Glossary link alone. */
  footer?: React.ReactNode
  /** What stays showing when the block is collapsed (the first rows of a stats grid); nothing by default. */
  peek?: React.ReactNode
  /** Anchor id when the slugged title shouldn't be it. */
  id?: string
  /** Extra entries for the three-dot menu. */
  menuItems?: React.ReactNode
  className?: string
  /** A SmallBlock (the aside column's): sized to its content, not the 420px standard. */
  small?: boolean
  /** The footer link reads More and goes here (the block's own page) instead of the Glossary. */
  more?: string
  /** A side panel: the Card fills its column, the child owns body and footer, no Glossary foot. */
  panel?: boolean
  /** Fill the container (a flex column with real height) instead of any viewport-sized class. */
  fill?: boolean
}

export function MainBlock({ title, children, search, searchValue, onSearch, tools, actions, rows, name, views, view, onView, defaultOpen = true, height, peek, id, menuItems, className, small, more, panel, fill }: BlockProps) {
  const [size, setSize] = React.useState<BlockSize>(defaultOpen ? "full" : "collapsed")
  const open = size !== "collapsed"
  const half = height && height !== "auto" && height !== "max" ? height : BLOCK_HEIGHT
  // A block deleted from its page stays on the Blocks shelf and is gone from here until it is opened there.
  const path = usePathname()
  const { hidden } = useHiddenBlocks()
  if (title && hidden.includes(`${path}#${id ?? slug(title)}`)) return null
  return (
    <PAX2Table2 value={searchValue} onChange={onSearch}>
      <Card className={cn("gap-4", fill ? "min-h-0 flex-1" : panel ? "h-full min-h-0" : open && (small ? (size === "full" ? SMALL_FULL : SMALL_HALF) : size === "full" ? BLOCK_FULL : half), className)}>
        <CardHeader className={cn((open || peek) && "border-b [.border-b]:pb-2")}>
          <div className="flex items-center gap-1">
            {title ? <CardAnchor id={id}>{title}</CardAnchor> : null}
            {/* Riding in a carousel, the stepping chevrons sit right after the title. */}
            <CarouselChevrons />
            {tools}
            {search && <PAX2Search placeholder={search} />}
          </div>
          <CardAction>
            {/* A side panel fills its column at every size, so it carries no size chevron, and its menu no sizes, Pin to top or Favorite (Brendan, 2026-10-29). */}
            <CardTools rows={rows} name={name ?? title.toLowerCase()} views={views} view={view} onView={onView} size={size} onSize={panel ? undefined : setSize} panel={panel} menuItems={menuItems} title={title || undefined} anchor={title || id ? (id ?? slug(title)) : undefined}>
              {actions}
              {!panel && (
                <button type="button" aria-label={size === "half" ? `Full view ${title}` : `Half view ${title}`} onClick={() => setSize(size === "half" ? "full" : "half")} className="inline-flex size-8 items-center justify-center rounded-md text-slate-800 hover:bg-foreground/8 hover:text-foreground">
                  <ChevronDown className={cn("size-4 transition-transform", size === "full" && "rotate-180")} />
                </button>
              )}
            </CardTools>
          </CardAction>
        </CardHeader>
        {!open && peek && <CardContent>{peek}</CardContent>}
        {open && panel && (
          <div className="flex min-h-0 flex-1 flex-col">
            <SizeCtx.Provider value={size}>{children}</SizeCtx.Provider>
          </div>
        )}
        {open && !panel && (
          <CardContent className="min-h-0 flex-1 overflow-y-auto [&_[data-slot=table-container]]:overflow-visible [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card">
            <SizeCtx.Provider value={size}>{children}</SizeCtx.Provider>
          </CardContent>
        )}
        {open && !panel && (
          <CardFooter className="bg-transparent py-3 text-xs text-slate-800">
            <Link href={more ?? "/data-dictionary?tab=glossary"} className="font-medium text-slate-800 underline underline-offset-2 hover:text-pax2-light-blue">{more ? "More" : "Glossary"}</Link>
          </CardFooter>
        )}
      </Card>
    </PAX2Table2>
  )
}

/** The aside column's block (Brendan, 2026-10-23): as tall as its content, up to 420px; Full View lets it
 *  reach 840px. */
export function SmallBlock(props: BlockProps) {
  return <MainBlock {...props} small />
}

/** A side panel in the Block dress (Brendan, 2026-10-25): fills its column; body and footer are the child's. */
export function PanelBlock(props: BlockProps) {
  return <MainBlock {...props} panel />
}

/** MainBlock with a table in it: the column header pins while the rows scroll. Its rows hover as the house row
 *  does (components/row-dress.tsx, Brendan, 2026-10-31): the raised fill, the blue type, Gmail's lift. */
export function TableBlock(props: BlockProps) {
  return (
    <MainBlock
      {...props}
      className={cn(
        "[&_tbody_tr]:relative [&_tbody_tr]:transition-[color,background-color,box-shadow] [&_tbody_tr:hover]:z-10 [&_tbody_tr:hover]:bg-pax2-lift [&_tbody_tr:hover]:text-pax2-blue [&_tbody_tr:hover]:shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]",
        props.className
      )}
    />
  )
}

/** MainBlock with tiles in it; tag each tile data-find so the searchbar filters them. */
export function CardBlock(props: BlockProps) {
  return <MainBlock {...props} />
}

/** MainBlock with rows that expand in place; tag each row data-find. */
export function AccordionBlock(props: BlockProps) {
  return <MainBlock {...props} />
}

/** MainBlock with a chart in it. */
export function ChartBlock(props: BlockProps) {
  return <MainBlock {...props} />
}

/** MainBlock with progress rows in it, each a bar to 100 that expands in place to the steps that
 *  close its gap; tag each row data-find. */
export function ProgressBlock(props: BlockProps) {
  return <MainBlock {...props} />
}

/** MainBlock with a list in it; tag each row data-find. */
export function ListBlock(props: BlockProps) {
  return <MainBlock {...props} />
}

/** MainBlock with a map in it; the map fills the body. */
export function MapBlock(props: BlockProps) {
  return <MainBlock {...props} />
}

/** MainBlock with a diagram in it. */
export function DiagramBlock(props: BlockProps) {
  return <MainBlock {...props} />
}

/** MainBlock with stat cards in it (Stat2 tiles in a grid). */
export function StatBlock(props: BlockProps) {
  return <MainBlock {...props} />
}

/** MainBlock with a typeset formula in it. */
export function FormulaBlock(props: BlockProps) {
  return <MainBlock {...props} />
}

/** Two blocks side by side, two thirds and one third; give the wide one xl:col-span-2. */
export function TwoThirdBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-5 xl:grid-cols-3", className)}>{children}</div>
}

/** Two blocks side by side, half and half. */
export function TwoHalfBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-5 xl:grid-cols-2", className)}>{children}</div>
}

/** Three blocks side by side, a third each. */
export function OneThirdBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-5 xl:grid-cols-3", className)}>{children}</div>
}
