'use client'

// The Dev tools view for the switchboard's right panel (Brendan, 2026-11-04) — trinity's
// DevToolsRows (discussion-panel.tsx, 2026-11-01) rehomed: Dev Comments is the housekeeping
// thread (comments + the Claude loop), Point and Click is the pointer, Live edit rewrites
// text in place and files itself as a comment, Inspector (X-ray until 2026-11-05 — the same
// tool) arms the crosshair, shows its dock and embeds the classifier, Settings the hold key
// and the dock's corner. The rows stay ordinary ground while a mode runs (data-sonar-exempt +
// data-devinspector) so any mode can be turned off here.

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Crosshair, MessageSquareText, PencilLine, SlidersHorizontal, SquareDashedMousePointer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePointer } from '@/components/housekeeping/tool'
import { useLiveEdit } from '@/components/housekeeping/live-edit'
import { useInspector } from '@/components/dev/inspector-state'

export const INSPECTOR_EMBED = 'inspector:embed'

const HousekeepingView = dynamic(() => import('@/components/housekeeping/view').then((m) => m.HousekeepingView), { ssr: false })

type Sub = 'rows' | 'comments' | 'settings'

export function DevToolsPanel() {
  const [sub, setSub] = useState<Sub>('rows')
  const [pointerOn, togglePointer] = usePointer()
  const [liveOn, toggleLive] = useLiveEdit()

  if (sub !== 'rows')
    return (
      <div data-sonar-exempt data-devinspector className="flex min-h-0 flex-1 flex-col">
        <button
          type="button"
          onClick={() => setSub('rows')}
          className="flex shrink-0 items-center gap-2 border-b border-[var(--paper-rule)] px-5 py-3 text-left text-[13px] text-[var(--paper-muted)] transition-colors hover:text-[var(--paper-text)]"
        >
          <ArrowLeft className="size-3.5" /> Dev tools
        </button>
        {sub === 'comments' ? <HousekeepingView /> : <EmbedSlot view="settings" />}
      </div>
    )

  return (
    <div data-sonar-exempt data-devinspector className="flex min-h-0 flex-1 flex-col px-2 pt-1">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Row icon={<MessageSquareText />} label="Dev Comments" sub="Comments on the app, and the thread Claude answers" onClick={() => setSub('comments')} />
        <ToggleRow icon={<SquareDashedMousePointer />} label="Point and Click" sub="Point, click, and leave edit notes." on={pointerOn} onToggle={togglePointer} />
        <ToggleRow icon={<PencilLine />} label="Live edit" sub="The page freezes; arrows climb the DOM; rewrite text in place and the edit files itself with its component and file." on={liveOn} onToggle={toggleLive} />
        <InspectorRow />
      </div>
      <div className="shrink-0 border-t border-[var(--paper-rule)]">
        <Row icon={<SlidersHorizontal />} label="Settings" sub="The hold key and the Inspector's corner" onClick={() => setSub('settings')} />
      </div>
    </div>
  )
}

function Row({ icon, label, sub, onClick }: { icon: React.ReactNode; label: string; sub?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 border-b border-[var(--paper-rule)] px-3 py-3 text-left transition-colors hover:bg-[var(--paper-quiet)]"
    >
      <span className="flex size-[18px] shrink-0 items-center justify-center text-[var(--paper-faint)] transition-colors group-hover:text-[var(--paper-text)] [&_svg]:size-[18px] [&_svg]:stroke-[1.75]">{icon}</span>
      <span className="flex-1">
        <span className="block text-[15px] text-[var(--paper-text)]">{label}</span>
        {sub && <span className="block text-xs text-[var(--paper-faint)]">{sub}</span>}
      </span>
    </button>
  )
}

function ToggleRow({ icon, label, sub, on, onToggle }: { icon: React.ReactNode; label: string; sub?: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className="group flex w-full items-center gap-3 border-b border-[var(--paper-rule)] px-3 py-3 text-left transition-colors hover:bg-[var(--paper-quiet)]"
    >
      <span className="flex size-[18px] shrink-0 items-center justify-center text-[var(--paper-faint)] transition-colors group-hover:text-[var(--paper-text)] [&_svg]:size-[18px] [&_svg]:stroke-[1.75]">{icon}</span>
      <span className="flex-1">
        <span className="block text-[15px] text-[var(--paper-text)]">{label}</span>
        {sub && <span className="block text-xs text-[var(--paper-faint)]">{sub}</span>}
      </span>
      <span aria-hidden className={cn('inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors', on ? 'bg-emerald-600' : 'bg-[var(--paper-rule)]')}>
        <span className={cn('size-3 rounded-full bg-[var(--paper)] shadow-sm transition-transform', on && 'translate-x-3')} />
      </span>
    </button>
  )
}

/** The Inspector: on is armed — the crosshair, the dock in its corner, and the classifier drawn into a
 *  slot beneath the row. The dock's crosshair and Escape turn it off too; this switch follows them. */
function InspectorRow() {
  const [on, toggle] = useInspector()
  const slot = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!on) return
    window.dispatchEvent(new CustomEvent(INSPECTOR_EMBED, { detail: { slot: slot.current, view: 'classifier' } }))
    return () => void window.dispatchEvent(new CustomEvent(INSPECTOR_EMBED, { detail: null }))
  }, [on])
  return (
    <>
      <ToggleRow icon={<Crosshair />} label="Inspector" sub="Point at any element for its component, file, and layer" on={on} onToggle={toggle} />
      {on && (
        <div className="relative my-2 flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-xl border border-[var(--paper-rule)] bg-[var(--paper)]">
          <div ref={slot} className="flex min-h-0 flex-1 flex-col overflow-y-auto" />
        </div>
      )}
    </>
  )
}

/** A dock panel drawn into this view's slot (the dock portals it in; one slot at a time). */
function EmbedSlot({ view }: { view: 'classifier' | 'settings' }) {
  const slot = useRef<HTMLDivElement>(null)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(INSPECTOR_EMBED, { detail: { slot: slot.current, view } }))
    return () => void window.dispatchEvent(new CustomEvent(INSPECTOR_EMBED, { detail: null }))
  }, [view])
  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pt-2">
      <div ref={slot} className="flex min-h-0 flex-1 flex-col overflow-y-auto" />
    </div>
  )
}
