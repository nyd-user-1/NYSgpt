'use client'

// The Theme view for the switchboard's right panel (Brendan, 2026-11-04): the app's tokens as a live sheet.
// Every value is read from computed styles on the panel itself (a .nysgpt-app root, so the paper family
// resolves), re-read whenever <html> changes class or style, so the sheet is what the page is drawing and
// follows the light/dark toggle. A token this scope doesn't define drops out rather than showing blank.
// Click any row to copy its var name.

import { useEffect, useRef, useState } from 'react'

const COLORS: { family: string; vars: string[] }[] = [
  { family: 'Paper', vars: ['--paper', '--paper-text', '--paper-muted', '--paper-faint', '--paper-rule', '--paper-rule-soft', '--paper-quiet', '--paper-strong'] },
  {
    family: 'PAX2',
    vars: ['--pax2-surface', '--pax2-mist', '--pax2-frame', '--pax2-sidebar', '--pax2-lift', '--pax2-raised', '--pax2-blue', '--pax2-light-blue', '--pax2-lavender', '--pax2-red', '--pax2-red-deep', '--pax2-red-soft'],
  },
  {
    family: 'Signals',
    vars: ['--pax2-above', '--pax2-above-soft', '--pax2-below', '--pax2-below-soft', '--pax2-observed', '--pax2-interpretation', '--pax2-hypothesis', '--consensus-agree', '--consensus-disagree'],
  },
  { family: 'Brand', vars: ['--brand', '--highlight', '--selection', '--selection-foreground'] },
  { family: 'Night', vars: ['--color-night-700', '--color-night-800', '--color-night-900', '--color-night-950'] },
]

const FONTS = [
  { name: '--font-display', sample: 'The Legislature convenes in Albany' },
  { name: '--font-sans', sample: 'The Legislature convenes in Albany' },
  { name: '--font-mono', sample: 'S.4821-B  2026-11-04  98–47' },
]

const SHADOWS = ['--pax2-shadow-1', '--pax2-shadow-2', '--pax2-shadow-3', '--pax2-shadow-header']

const RADII = ['--radius', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl']
const SPACING = ['--spacing']

const ALL = [...COLORS.flatMap((f) => f.vars), ...FONTS.map((f) => f.name), ...SHADOWS, ...RADII, ...SPACING]

const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const
const HEAD = 'px-5 pb-2 pt-5 text-[10px] uppercase tracking-[0.28em] text-[var(--paper-faint)]'
const ROW = 'group flex w-full items-center gap-3 border-b border-[var(--paper-rule-soft)] px-5 py-2 text-left transition-colors hover:bg-[var(--paper-quiet)]'

export function ThemePanel() {
  const ref = useRef<HTMLDivElement>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const read = () => {
      const el = ref.current
      if (!el) return
      const cs = getComputedStyle(el)
      const next: Record<string, string> = {}
      for (const n of ALL) next[n] = cs.getPropertyValue(n).trim()
      setValues(next)
    }
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    return () => mo.disconnect()
  }, [])

  const copy = (name: string) => {
    void navigator.clipboard?.writeText(name).then(() => {
      setCopied(name)
      window.setTimeout(() => setCopied((c) => (c === name ? null : c)), 1200)
    })
  }

  const shown = (names: string[]) => names.filter((n) => values[n])
  const value = (name: string) => (
    <span className="max-w-[48%] shrink-0 truncate text-right text-[11px] text-[var(--paper-faint)]" style={MONO} title={values[name]}>
      {copied === name ? 'Copied' : values[name]}
    </span>
  )
  const label = (name: string) => (
    <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--paper-text)]" style={MONO}>
      {name}
    </span>
  )

  return (
    <div ref={ref} className="pb-6">
      {COLORS.map((f) => {
        const vars = shown(f.vars)
        if (!vars.length) return null
        return (
          <section key={f.family}>
            <p className={HEAD} style={MONO}>{f.family}</p>
            {vars.map((n) => (
              <button key={n} type="button" onClick={() => copy(n)} className={ROW}>
                <span className="size-5 shrink-0 rounded-[5px] border border-[var(--paper-rule-soft)]" style={{ background: `var(${n})` }} />
                {label(n)}
                {value(n)}
              </button>
            ))}
          </section>
        )
      })}

      <p className={HEAD} style={MONO}>Type</p>
      {FONTS.filter((f) => values[f.name]).map((f) => (
        <button key={f.name} type="button" onClick={() => copy(f.name)} className={`${ROW} flex-col !items-stretch !gap-1.5 !py-3`}>
          <span className="flex items-baseline gap-3">
            {label(f.name)}
            {value(f.name)}
          </span>
          <span className="truncate text-[22px] leading-tight text-[var(--paper-text)]" style={{ fontFamily: `var(${f.name})` }}>
            {f.sample}
          </span>
        </button>
      ))}

      {shown(SHADOWS).length > 0 && (
        <>
          <p className={HEAD} style={MONO}>Elevation</p>
          <div className="grid grid-cols-2 gap-4 px-5 pb-2 pt-1">
            {shown(SHADOWS).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => copy(n)}
                title={values[n]}
                className="flex h-20 items-end rounded-xl bg-[var(--paper)] p-3 text-left text-[11px] text-[var(--paper-text)]"
                style={{ ...MONO, boxShadow: `var(${n})` }}
              >
                {copied === n ? 'Copied' : n}
              </button>
            ))}
          </div>
        </>
      )}

      {shown([...RADII, ...SPACING]).length > 0 && (
        <>
          <p className={HEAD} style={MONO}>Radii and spacing</p>
          {shown(RADII).map((n) => (
            <button key={n} type="button" onClick={() => copy(n)} className={ROW}>
              <span className="size-5 shrink-0 border-[1.5px] border-[var(--paper-text)]" style={{ borderRadius: `var(${n})` }} />
              {label(n)}
              {value(n)}
            </button>
          ))}
          {shown(SPACING).map((n) => (
            <button key={n} type="button" onClick={() => copy(n)} className={ROW}>
              <span className="flex w-5 shrink-0 items-center">
                <span className="h-1 rounded-full bg-[var(--paper-text)]" style={{ width: `calc(var(${n}) * 4)` }} />
              </span>
              {label(n)}
              {value(n)}
            </button>
          ))}
        </>
      )}
    </div>
  )
}
