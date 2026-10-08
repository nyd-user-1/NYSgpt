'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { useCatalog } from '@/app/useCatalog'
import { price } from '@/lib/api-pricing'

const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const
const SHORT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const DOLLARS = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

/** The plan the switchboard sells: the ticked tables at 100,000 calls a month, monthly, internal use. */
const PLAN = { calls: '100k', term: '1', license: 'internal' }

/**
 * An API's page in the switchboard: every endpoint it serves, ticked to build
 * a plan, and a footer that checks it out (lib/api-pricing.ts prices it; the
 * server prices it again at checkout).
 */
export function SwitchboardApiList({ dataset }: { dataset: string }) {
  const tables = useCatalog(dataset)
  const [off, setOff] = useState<Set<string>>(new Set())
  if (!tables) return null
  const chosen = tables.filter((t) => !off.has(t.path))
  const rows = Object.fromEntries(tables.map((t) => [t.path, t.rows]))
  const cost = price({ dataset, tables: chosen.map((t) => t.path), ...PLAN }, rows)
  const toggle = (path: string) => {
    const next = new Set(off)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    setOff(next)
  }

  return (
    <>
      <ul className="m-0 list-none p-0" style={MONO}>
        {tables.map((t) => {
          const on = !off.has(t.path)
          return (
            <li key={t.path}>
              <button
                type="button"
                onClick={() => toggle(t.path)}
                className="flex w-full items-center gap-3 border-b border-[var(--paper-rule-soft)] px-5 py-3 text-left text-[13px] transition-colors hover:bg-[var(--paper-quiet)]"
              >
                <span className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border ${on ? 'border-[var(--paper-text)] bg-[var(--paper-text)] text-[var(--paper)]' : 'border-[var(--paper-rule)]'}`}>
                  {on && <Check className="size-3" strokeWidth={3} aria-hidden />}
                </span>
                <span className={`min-w-0 flex-1 truncate ${on ? 'text-[var(--paper-text)]' : 'text-[var(--paper-faint)]'}`}>/{t.path}</span>
                <span className="shrink-0 tabular-nums text-[var(--paper-faint)]">{SHORT.format(t.rows)}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <form
        action="/api/checkout"
        method="post"
        className="sticky bottom-0 z-10 mt-auto flex items-center gap-3 border-t border-[var(--paper-rule)] bg-[var(--paper)]/85 px-5 py-4 backdrop-blur-md"
      >
        <input type="hidden" name="dataset" value={dataset} />
        <input type="hidden" name="tables" value={chosen.length === tables.length ? '*' : chosen.map((t) => t.path).join(',')} />
        {Object.entries(PLAN).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <span className="min-w-0 flex-1 text-[12px] text-[var(--paper-muted)]" style={MONO}>
          {chosen.length} of {tables.length} · {DOLLARS.format(cost)} / month
        </span>
        <button
          type="submit"
          disabled={!chosen.length}
          className="shrink-0 rounded-lg bg-[var(--paper-text)] px-4 py-2 text-[13px] font-medium text-[var(--paper)] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Checkout
        </button>
      </form>
    </>
  )
}
