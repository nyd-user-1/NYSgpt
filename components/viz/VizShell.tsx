import Link from 'next/link'

// The /viz chart pages' frame. The header is the sign-in page's (BareHeader): the NYSgpt wordmark
// at the LEFT, 28px, -0.03em — copied, not restyled (Brendan, 2026-11-04, after it drifted). The
// way back to the index sits at the right.

const SERIF = { fontFamily: 'var(--font-display), Georgia, serif' } as const
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const

export function VizShell({ title, note, dark = false, children }: { title: string; note: string; dark?: boolean; children: React.ReactNode }) {
  const ink = dark ? '#e2e8f0' : '#16181d'
  const muted = dark ? 'rgba(226,232,240,0.55)' : 'rgba(22,24,29,0.58)'
  return (
    <div className="flex min-h-dvh flex-col" style={{ background: dark ? '#05070d' : '#f9f9f9', color: ink }}>
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="text-[28px] leading-none transition-opacity hover:opacity-70" style={{ ...SERIF, color: ink, letterSpacing: '-0.03em' }}>
          NYSgpt
        </Link>
        <Link href="/viz" className="text-[13px] uppercase tracking-[0.2em] transition-opacity hover:opacity-70" style={{ ...MONO, color: muted }}>
          ← Viz
        </Link>
      </header>
      <div className="px-6">
        <h1 className="text-[30px] leading-[1.1]" style={{ ...SERIF, letterSpacing: '-0.02em' }}>{title}</h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-[1.65]" style={{ ...SANS, color: muted }}>{note}</p>
      </div>
      <main className="min-h-0 flex-1 px-2 pb-6 pt-2 sm:px-6">{children}</main>
    </div>
  )
}
