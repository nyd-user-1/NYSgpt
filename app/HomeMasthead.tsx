'use client'

import { useState } from 'react'
import { CountUp } from '@/components/CountUp'
import { compact } from '@/lib/compact'
import { home, useHome } from '@/lib/home-store'
import { BOXES, isGitHub, SOURCE_KINDS, SOURCES, TYPE_COLOR, type BoxKind } from '@/lib/home-boxes'
import { TypeIcon } from './HomeIcons'

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
 * The ledger's later pages (Brendan, 2026-11-19), as nsrgpt's masthead pages its cells (app/HomeMasthead.tsx there):
 * pages of four cells, two by two, side by side; the first shows and the rest wait off to the right until a sideways
 * scroll or the arrow keys bring them in. These are the five outside sources, A to Z, left to right and top to bottom.
 * Each is a set like the first four: a click shows its boxes on the plate. Its figure is the number of boxes it holds.
 */
const MORE: (LedgerEntry & { set: BoxKind })[] = SOURCE_KINDS.map(k => ({
  set: k,
  word: SOURCES[k].word,
  unit: SOURCES[k].unit,
  value: BOXES.filter(b => b.kind === k).length,
  color: TYPE_COLOR[k],
}))

export function HomeMasthead({ ledger }: { ledger: LedgerEntry[] }) {
  const { set } = useHome()
  const all = [...ledger.map((l, i) => ({ ...l, set: SETS[i] })), ...MORE]
  const pages = Array.from({ length: Math.ceil(all.length / 4) }, (_, p) => all.slice(p * 4, p * 4 + 4))
  // The page of cells in view. On GitHub's page, or with one of its sets on show, the nameplate wears GitHub's mark.
  const [page, setPage] = useState(0)
  const gh = isGitHub(pages[page]?.[0]?.set) || isGitHub(set)

  return (
    <div className="hm-mast" data-inspect="HomeMasthead">
      <div className="hm-mgrid">
        <button
          type="button"
          data-nav="masthead"
          data-inspect="Wordmark"
          className={`hm-name ${set === null ? 'hm-on' : ''} ${gh ? 'hm-gh' : ''}`}
          aria-label="All boxes"
          aria-pressed={set === null}
          onClick={() => home.showSet(null)}
        >
          <span className="hm-wm">NYSgpt</span>
          <span className="hm-ghm" aria-hidden>
            <TypeIcon icon="github" />
          </span>
          <span className="hm-all" aria-hidden>All</span>
        </button>

        <div
          className="hm-cells"
          data-inspect="LedgerScroll"
          onScroll={e => {
            const el = e.currentTarget
            const p = Math.round(el.scrollLeft / (el.clientWidth || 1))
            if (p !== page) setPage(p)
          }}
        >
          {pages.map((cells, p) => (
          <div className="hm-cpage" key={p}>
          {cells.map((l, i) => {
            const s = l.set
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
          {Array.from({ length: 4 - cells.length }, (_, k) => (
            <span key={k} className="hm-cell hm-fill" aria-hidden />
          ))}
          </div>
          ))}
        </div>
      </div>
    </div>
  )
}
