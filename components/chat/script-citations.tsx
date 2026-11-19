'use client'

import * as React from 'react'
import Link from 'next/link'

import { citeEvidence } from '@/app/chat-actions'
import type { ScriptCite } from '@/lib/chat-fields'
import { cn } from '@/lib/utils'

// A chat script's Citations, in the right panel: the /scripts library's ladder (a numbered note per
// cited line, then the evidence under it and its source) for a script the chat wrote. A number the
// script states that appears in none of PAX2's facts is named at the top.

type Cite = { finding: string; research: { label: string; diff: number; low: number; high: number; ads: number; outcome: 'votechoice' | 'favorability' } | null; channel: { label: string; points: number; low: number; high: number; channels: number; scope: string } | null; source: { label: string; href: string } | null }

const pts = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}`
const OUTCOME = { votechoice: 'vote choice', favorability: 'favorability' } as const

/** Numbers of two digits or more, so "Question 3" is not one. */
const numbersIn = (text: string) => [...new Set(text.match(/\d[\d,.]*\d%?|\d{2,}%?/g) ?? [])].map((n) => n.replace(/[.,]$/, ''))

function SourceLink({ source }: { source: { label: string; href: string } }) {
  const cls = 'w-fit text-xs font-medium text-pax2-light-blue hover:underline'
  return source.href.startsWith('http') ? (
    <a href={source.href} target="_blank" rel="noreferrer" className={cls}>
      {source.label}
    </a>
  ) : (
    <Link href={source.href} className={cls}>
      {source.label}
    </Link>
  )
}

export function ScriptCitations({ text, cites, hot, onHot }: { text: string; cites: ScriptCite[]; hot?: number | null; onHot?: (n: number | null) => void }) {
  const [data, setData] = React.useState<{ cites: Record<string, Cite>; facts: string[] } | null>(null)
  const [own, setOwn] = React.useState<number | null>(null)
  const lit = hot ?? own
  const setLit = onHot ?? setOwn
  // Keyed on the ids, not the array: the card hands a fresh array on every render.
  const ids = cites.flatMap((c) => c.ids).join('|')
  React.useEffect(() => {
    citeEvidence(ids ? ids.split('|') : [])
      .then((d) => setData(d as { cites: Record<string, Cite>; facts: string[] }))
      .catch(() => setData({ cites: {}, facts: [] }))
  }, [ids])
  if (!data) return <p className="text-sm text-slate-400">Reading the evidence…</p>
  const unsourced = numbersIn(text).filter((n) => !data.facts.some((f) => f.includes(n)))
  return (
    <div className="flex flex-col gap-5">
      {unsourced.length > 0 && (
        <p className="rounded-xl bg-pax2-red-soft px-3 py-2 text-sm leading-relaxed text-pax2-red-deep">
          Not in PAX2&apos;s records: {unsourced.join(', ')}. Check {unsourced.length === 1 ? 'this number' : 'these numbers'} before recording.
        </p>
      )}
      <ol className="flex flex-col gap-4">
        {cites.map((c, k) => {
          const found = c.ids.map((id) => data.cites[id]).filter((x): x is Cite => !!x)
          const sources = [...new Map(found.filter((f) => f.source).map((f) => [f.source!.href, f.source!])).values()]
          return (
            <li key={k} onMouseEnter={() => setLit(k + 1)} onMouseLeave={() => setLit(null)} className={cn('-m-2 flex gap-2.5 rounded-xl p-2 transition-colors', lit === k + 1 && 'bg-pax2-lavender/50')}>
              <span className={cn('mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors', lit === k + 1 ? 'bg-pax2-light-blue text-white' : 'bg-pax2-lavender text-pax2-blue')}>{k + 1}</span>
              <div className="flex min-w-0 flex-col gap-1.5">
                {c.note && <p className="text-sm leading-relaxed text-slate-700">{c.note}</p>}
                {found.map((f, i) =>
                  f.research ? (
                    <p key={i} className="tabular text-xs leading-relaxed text-slate-500">
                      In {f.research.ads} Swayable-tested ads, “{f.research.label}” moved {OUTCOME[f.research.outcome]} {pts(f.research.diff)} points ({f.research.low.toFixed(1)} to {f.research.high.toFixed(1)}).
                    </p>
                  ) : f.channel ? (
                    <p key={i} className="tabular text-xs leading-relaxed text-slate-500">
                      On {f.channel.channels} {f.channel.scope}, the share of shorts reaching 3x their channel&apos;s median ran {pts(f.channel.points)} points with “{f.channel.label}” ({pts(f.channel.low)} to {pts(f.channel.high)}).
                    </p>
                  ) : (
                    <p key={i} className="tabular text-xs leading-relaxed text-slate-500">{f.finding}</p>
                  ),
                )}
                {sources.map((s) => (
                  <SourceLink key={s.href} source={s} />
                ))}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
