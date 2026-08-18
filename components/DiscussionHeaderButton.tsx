'use client'

import { MessagesSquare } from 'lucide-react'
import { useSwitchboard } from '@/components/SwitchboardPanel'

/**
 * Header trigger for the switchboard drawer — sits next to the theme toggle in
 * the AppLayout header. Toggles the same persistent panel the nameplate does.
 *
 * `bare` drops the circular border/background chrome (just the icon), for the
 * relocated placement under the PageNav rule.
 */
export function DiscussionHeaderButton({ paperMode, bare }: { paperMode?: boolean; bare?: boolean }) {
  const { toggle, open } = useSwitchboard()

  const chrome = bare
    ? `mr-2 ${paperMode
        ? (open ? 'text-[var(--paper-strong)]' : 'text-[var(--paper-faint)] hover:text-[var(--paper-text)]')
        : (open ? 'text-[var(--paper-strong)]' : 'text-[var(--muted)] hover:text-[var(--txt)]')}`
    : `h-10 w-10 rounded-full shadow-md mr-2 ${paperMode
        ? `border bg-[var(--paper)] ${open ? 'border-[var(--paper-strong)] text-[var(--paper-strong)]' : 'border-[var(--paper-rule)] text-[var(--paper-faint)] hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)]'}`
        : `border bg-[var(--surface)] ${open ? 'border-[var(--paper-strong)] text-[var(--paper-strong)]' : 'border-[var(--border)] text-[var(--muted)] hover:bg-[var(--inp-bg)] hover:text-[var(--txt)]'}`}`

  return (
    <button
      onClick={toggle}
      aria-label="Open the switchboard"
      aria-pressed={open}
      className={`relative hidden sm:flex items-center justify-center transition-colors ${chrome}`}
    >
      <MessagesSquare className="h-4 w-4" style={{ color: '#033882', fill: '#dbe7fa' }} />
      {/* Unseen-activity dot — disabled for now (keep for later re-enable):
      {!seen && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      )}
      */}
    </button>
  )
}
