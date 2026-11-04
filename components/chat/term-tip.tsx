'use client'

// Terms of the craft, defined where they appear: a faint underline that fills in on hover and a
// small card with the glossary's own definition. decorateTerms marks the first mention of each
// term in a reply — first mention only, so the prose never turns into a field of underlines.

import { Fragment } from 'react'

import { termById } from '@/lib/glossary'

const PATTERNS: { id: string; re: RegExp }[] = [
  { id: 'hook', re: /\bhooks?\b/i },
  { id: 'concrete-number', re: /\bconcrete numbers?\b/i },
  { id: 'the-ask', re: /\bexplicit ask\b|\bthe ask\b/i },
  { id: 'resonance', re: /\bResonance\b/ },
  { id: 'stop', re: /\bEngage\b/ },
  { id: 'hold', re: /\bInterest\b/ },
  { id: 'act', re: /\bAct\b/ },
]

export function TermTip({ id, children }: { id: string; children: React.ReactNode }) {
  const t = termById(id)
  if (!t) return <>{children}</>
  return (
    <span className="group/term relative cursor-help border-b border-[var(--border)] transition-colors hover:border-pax2-blue">
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 block w-72 -translate-x-1/2 rounded-xl border border-[var(--border)] bg-pax2-surface p-3 text-left normal-case opacity-0 shadow-xl transition-opacity duration-150 group-hover/term:opacity-100"
      >
        <span className="block text-[12px] font-semibold not-italic text-[var(--txt)]">{t.full}</span>
        <span className="mt-1 block text-[12px] font-normal not-italic leading-relaxed text-[var(--muted)]">{t.definition}</span>
      </span>
    </span>
  )
}

/** Wrap the first mention of each known term in the given children. `seen` spans one reply. */
export function decorateTerms(children: React.ReactNode, seen: Set<string>): React.ReactNode {
  const splitString = (s: string, keyBase: string): React.ReactNode => {
    for (const { id, re } of PATTERNS) {
      if (seen.has(id)) continue
      const m = re.exec(s)
      if (!m) continue
      seen.add(id)
      return (
        <>
          {s.slice(0, m.index)}
          <TermTip key={`${keyBase}-${id}`} id={id}>
            {m[0]}
          </TermTip>
          {splitString(s.slice(m.index + m[0].length), `${keyBase}x`)}
        </>
      )
    }
    return s
  }
  const walk = (node: React.ReactNode, keyBase: string): React.ReactNode => {
    if (typeof node === 'string') return splitString(node, keyBase)
    if (Array.isArray(node)) return node.map((n, i) => <Fragment key={`${keyBase}-${i}`}>{walk(n, `${keyBase}-${i}`)}</Fragment>)
    return node
  }
  return walk(children, 't')
}
