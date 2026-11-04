'use client'

// The /viz boxes' three-dot menu (Brendan, 2026-11-04): trinity's kebab in place of the green
// dot. Add to Blocks puts the box on the shelf the panel's Blocks view shows; Copy link takes
// the chart's address; the foot names the chart. The wrapper eats the click so the box's own
// press (the pane) never fires under the menu.

import { Copy, EllipsisVertical, LayoutGrid } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { KebabMenu, MenuFoot, MenuRow, MenuSeparator } from '@/components/kebab-menu'
import { useShelf } from '@/lib/home-blocks'

export function VizBoxMenu({ title, anchor, href }: { title: string; anchor: string; href?: string }) {
  const path = usePathname() ?? '/viz'
  const shelf = useShelf()
  const key = `${path}#${anchor}`
  const on = shelf.has(key)
  return (
    <span className="-mr-2 -mt-1" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
      <KebabMenu
        label={`${title} options`}
        trigger={<EllipsisVertical className="size-4" />}
        triggerClassName="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--paper-faint)] outline-none transition-colors hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)] aria-expanded:bg-[var(--paper-quiet)]"
      >
        <MenuRow
          icon={<LayoutGrid />}
          label={on ? 'Remove from Blocks' : 'Add to Blocks'}
          checked={on}
          onClick={() => (on ? shelf.remove(key) : shelf.add({ key, title, path, anchor }))}
        />
        {href && <MenuRow icon={<Copy />} label="Copy the link" onClick={() => void navigator.clipboard.writeText(new URL(href, location.origin).toString())} />}
        <MenuSeparator />
        <MenuFoot title={title} sub={href?.startsWith('/viz/') ? 'Chart' : undefined} />
      </KebabMenu>
    </span>
  )
}
