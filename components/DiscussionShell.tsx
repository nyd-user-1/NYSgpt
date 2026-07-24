'use client'

import { cn } from '@/lib/utils'
import { useDiscussion } from '@/lib/discussion-store'

/**
 * Wraps the routed page tree and narrows it (padding-right) when the discussion
 * drawer is open, so the panel pushes content aside rather than sheeting over it.
 * 441px = 423 (panel) + 18 (right gutter); the 18px gap between content and panel
 * comes free from AppLayout's own p-[18px]. Push only kicks in at sm+; on mobile
 * the drawer overlays full-width.
 */
export function DiscussionShell({ children }: { children: React.ReactNode }) {
  const { open, expanded } = useDiscussion()
  return (
    <div
      className={cn(
        'transition-[padding] duration-300 ease-in-out',
        open && (expanded ? 'sm:pr-[calc(50vw+18px)]' : 'sm:pr-[441px]'),
      )}
    >
      {children}
    </div>
  )
}
