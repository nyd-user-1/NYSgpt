'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

/** The hover the headers' title and buttons share: the ink at 14% over the paper. */
export const HOVER = 'hover:bg-[color-mix(in_oklab,var(--paper-text)_14%,var(--paper))]'

/** Copy the header's title (Brendan, 2026-11-06): shows on the title's hover, copies its text, and ticks once copied. */
export function CopyTitle({ title }: { title: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy "${title}"`}
      title="Copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(title);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-[var(--paper-faint,#94a3b8)] opacity-0 transition-opacity ${HOVER} hover:text-[var(--paper-text)] focus-visible:opacity-100 group-hover/title:opacity-100`}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
