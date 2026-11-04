import Link from 'next/link'

import { AppLayout } from '@/components/AppLayout'
import { PAPER_BRIDGE } from '@/components/editorial/PaperBridge'

// The /viz chart pages' frame: the app's own shell (AppLayout in paper mode, as / and the /viz
// index wear it), so every chart page follows the app's light/dark mode like any other page
// (Brendan, 2026-11-04: "i want all of them dropped in the standard appshell design"). The
// wordmark row stays the sign-in page's — 28px, -0.03em — in the paper's ink; the charts
// themselves take the theme through useEChart.

const SERIF = { fontFamily: 'var(--font-display), Georgia, serif' } as const
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const

export function VizShell({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <AppLayout paperMode>
      <div className="flex-1 overflow-y-auto no-scrollbar text-[var(--paper-text)]" style={{ backgroundColor: 'var(--paper)', ...PAPER_BRIDGE }}>
        <div className="mx-auto w-full max-w-[1360px] px-6 sm:px-10 md:px-14 pt-2 pb-10">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-[28px] leading-none transition-opacity hover:opacity-70" style={{ ...SERIF, letterSpacing: '-0.03em' }}>
              NYSgpt
            </Link>
            <Link href="/viz" className="text-[13px] uppercase tracking-[0.2em] text-[var(--paper-muted)] transition-opacity hover:opacity-70" style={MONO}>
              ← Viz
            </Link>
          </div>
          <h1 className="mt-6 text-[30px] leading-[1.1]" style={{ ...SERIF, letterSpacing: '-0.02em' }}>{title}</h1>
          <p className="mt-2 max-w-3xl text-[13px] leading-[1.65] text-[var(--paper-muted)]" style={SANS}>{note}</p>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </AppLayout>
  )
}
