'use client'

import { CountUp } from '@/components/CountUp'
import { compact } from '@/lib/compact'
import { home, useHome } from '@/lib/home-store'
import type { BoxKind } from '@/lib/home-boxes'

/**
 * The nysgpt.com masthead (2026-11-19, brief 43, from the option 3 sketch):
 * the wordmark and the four ledger cells.
 *
 *  - each cell shows its set's word at rest (Data, Models, Platforms, Tools);
 *    hovering swaps the word for the total, counted up from zero, with its
 *    label (records, parameters, requests, AI tools). A cell wide enough for
 *    the full figure spells it out.
 *  - a click on a cell shows that set's boxes on the plate; a second click,
 *    or the wordmark, returns to the all view. The cell on show carries a rule
 *    and the enter mark in its colour.
 *
 * Before this the wordmark linked to NYSgpt's AWS Startups page and the cells
 * opened the switchboard or scrolled the rail.
 */

export type LedgerEntry = { word: string; value: number; unit: string; exact?: boolean; color: string }

const SETS: BoxKind[] = ['data', 'models', 'platforms', 'tools']

/**
 * The second page of the ledger (Brendan, 2026-11-19), as nsrgpt's masthead pages its cells (app/HomeMasthead.tsx
 * there): pages of four cells, two by two, side by side; the first shows and the rest wait off to the right until a
 * sideways scroll or the arrow keys bring them in. What these two cells hold and open is still to come.
 */
const MORE: { word: string; color: string }[] = [
  { word: 'Hugging Face', color: '#b45309' },
  { word: 'GitHub', color: 'var(--paper-text)' },
]

export function HomeMasthead({ ledger }: { ledger: LedgerEntry[] }) {
  const { set } = useHome()

  return (
    <div className="hm-mast" data-inspect="HomeMasthead">
      <div className="hm-mgrid">
        <button
          type="button"
          data-nav="masthead"
          data-inspect="Wordmark"
          className={`hm-name ${set === null ? 'hm-on' : ''}`}
          aria-label="All boxes"
          aria-pressed={set === null}
          onClick={() => home.showSet(null)}
        >
          <span className="hm-wm">NYSgpt</span>
          <span className="hm-all" aria-hidden>All</span>
        </button>

        <div className="hm-cells" data-inspect="LedgerScroll">
          <div className="hm-cpage">
          {ledger.map((l, i) => {
            const s = SETS[i]
            const fig = compact(l.value)
            const on = set === s
            return (
              <button
                type="button"
                key={l.word}
                data-nav="masthead"
                data-set={s}
                data-countup-scope
                data-inspect="LedgerCell"
                aria-pressed={on}
                aria-label={`${l.word}: ${l.value.toLocaleString('en-US')} ${l.unit.toLowerCase()}`}
                className={`hm-cell ${i < 2 ? 'hm-bb' : ''} ${on ? 'hm-on' : ''}`}
                style={{ '--kind': l.color, '--kind-tint': `color-mix(in oklab, ${l.color} 5%, var(--paper))` } as React.CSSProperties}
                onClick={() => home.toggleSet(s)}
              >
                <span className="hm-word">{l.word}</span>
                <span className="hm-figw" aria-hidden>
                  <span className={`hm-lf hm-short ${l.exact ? 'hm-has-full' : ''}`}>
                    <CountUp value={fig.count} decimals={fig.decimals} suffix={fig.suffix} duration={1400} trigger="hover" />
                  </span>
                  {l.exact && (
                    <span className="hm-lf hm-full">
                      <CountUp value={l.value} duration={1400} trigger="hover" />
                    </span>
                  )}
                  <span className="hm-lu">{l.unit}</span>
                </span>
                <span className="hm-enter" aria-hidden>
                  <svg viewBox="0 0 24 24" width="22" height="22">
                    <circle cx="12" cy="12" r="11" />
                    <path d="M12 8v8" />
                    <path d="m8 12 4 4 4-4" />
                  </svg>
                </span>
              </button>
            )
          })}
          </div>
          <div className="hm-cpage">
            {MORE.map(x => (
              <button
                type="button"
                key={x.word}
                data-nav="masthead"
                data-inspect="LedgerCell"
                className="hm-cell hm-bb"
                style={{ '--kind': x.color, '--kind-tint': `color-mix(in oklab, ${x.color} 5%, var(--paper))` } as React.CSSProperties}
              >
                <span className="hm-word">{x.word}</span>
              </button>
            ))}
            <span className="hm-cell hm-fill" aria-hidden />
            <span className="hm-cell hm-fill" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  )
}
