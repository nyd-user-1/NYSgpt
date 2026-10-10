'use client'

import { CountUp } from '@/components/CountUp'
import { compact } from '@/lib/compact'
import { useSwitchboard } from '@/components/SwitchboardPanel'

/**
 * The nysgpt.com masthead — nameplate cell plus the four-layer ledger, matched
 * to 44B's home masthead.
 *
 *  - the nameplate links to NYSgpt's AWS startup page: hover dissolves the
 *    wordmark into the AWS mark; the first ledger cell toggles the switchboard.
 *  - each ledger cell shows its layer's word at rest (Data, Models, Platforms,
 *    Tools); hovering swaps the word for the figure, counted up from zero with
 *    its label, and leaving resets it (2026-10-08).
 */

const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const
const SERIF = { fontFamily: 'var(--font-display), Georgia, serif' } as const

export type LedgerEntry = { word: string; value: number; unit: string; exact?: boolean; color: string }

const FADE = 'transition-opacity duration-200'

/** NYSgpt's page on the AWS Startups showcase. */
const AWS_STARTUP = 'https://startups.aws.com/showcase/startup-details/ea42a691-3fe8-4572-8edf-70be4999ec83'

/**
 * The cell width an exact figure needs before it is spelled out, by its length
 * with separators (at the cell-relative size below, a 14-character figure
 * fits from 22rem, 13 from 20rem, 9 from 12rem). Narrower cells, whether a
 * small window or one squeezed by the side panels, show the short form.
 * Whole class names, so Tailwind can see them.
 */
const SPELL = (chars: number) =>
  chars <= 9 ? ['@min-[12rem]:hidden', '@min-[12rem]:block'] : chars <= 13 ? ['@min-[20rem]:hidden', '@min-[20rem]:block'] : ['@min-[22rem]:hidden', '@min-[22rem]:block']

export function HomeMasthead({ ledger }: { ledger: LedgerEntry[] }) {
  const { toggle } = useSwitchboard()

  return (
    // A rounded frame matching the app shell (2026-10-08); the grid inside sits
    // 1px outward so its own edge rules fall under the frame and are clipped.
    <div className="overflow-hidden rounded-2xl border border-[var(--paper-rule)]">
    <div data-inspect="HomeMasthead" className="-m-px grid grid-cols-1 items-stretch border-t border-b border-[var(--paper-rule)] lg:grid-cols-[auto_1fr]">
      {/* border-r closes the cell's right edge when the masthead stacks below lg.
          Side by side the ledger's own border-l closes that seam, so it is
          dropped at lg to avoid a double rule. */}
      {/* The nameplate links to NYSgpt's AWS startup page (2026-10-08): on hover
          the wordmark dissolves into the AWS mark, which zooms in a little, and
          a click opens the page in a new tab. The Data cell opens the switchboard. */}
      <a
        data-inspect="Wordmark"
        href={AWS_STARTUP}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="NYSgpt on AWS Startups"
        className="group/name relative self-stretch flex items-center justify-center border-l border-r lg:border-r-0 border-[var(--paper-rule)] px-6 py-8 no-underline transition-colors hover:bg-[var(--paper-quiet)] sm:px-10 lg:w-[360px]"
      >
        <span
          className="text-[var(--paper-text)] leading-[0.82] transition-opacity duration-500 group-hover/name:opacity-0"
          style={{ ...SERIF, fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', fontWeight: 400, letterSpacing: '-0.03em' }}
        >
          NYSgpt
        </span>
        {/* The AWS mark dissolves in over the wordmark, with a small zoom. */}
        <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 transition-opacity duration-500 group-hover/name:opacity-100">
          <img
            src="/aws-logo.png"
            alt=""
            className="h-auto w-[44%] max-w-[150px] scale-95 transition-transform duration-500 ease-out group-hover/name:scale-105"
          />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>Built on</span>
        </span>
      </a>

      {/* Bottom-row cells drop border-b so it does not double with the
          container's own bottom rule. */}
      <div className="grid grid-cols-2 border-t border-l border-[var(--paper-rule)] lg:border-t-0">
        {ledger.map((l, i) => {
          const fig = compact(l.value)
          const [short, full] = SPELL(l.value.toLocaleString('en-US').length)
          return (
            <div
              key={l.word}
              /* CountUp's hover trigger attaches to the nearest anchor by
                 default; these cells link nowhere, so mark the scope explicitly. */
              data-countup-scope
              data-inspect="LedgerCell"
              /* The first cell toggles the switchboard. */
              {...(i === 0
                ? {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': 'Open or close the switchboard',
                    onClick: toggle,
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggle()
                      }
                    },
                  }
                : i === 1
                ? {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': 'Scroll to Models',
                    onClick: () => window.dispatchEvent(new CustomEvent('scroll-to-models')),
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        window.dispatchEvent(new CustomEvent('scroll-to-models'))
                      }
                    },
                  }
                : i === 3
                ? {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': 'Scroll to Dev Tools',
                    onClick: () => window.dispatchEvent(new CustomEvent('scroll-to-dev-tools')),
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        window.dispatchEvent(new CustomEvent('scroll-to-dev-tools'))
                      }
                    },
                  }
                : {})}
              className={`@container group/fig relative grid min-h-[7.5rem] items-center border-r border-[var(--paper-rule)] px-5 py-6 sm:px-7 transition-colors hover:bg-[var(--kind-tint)] ${i < 2 ? 'border-b' : ''} ${i === 0 || i === 1 || i === 3 ? 'cursor-pointer' : ''}`}
              /* The word's kind colour, as the boxes of that kind wear it on hover. */
              style={{ '--kind': l.color, '--kind-tint': `color-mix(in oklab, ${l.color} 5%, var(--paper))` } as React.CSSProperties}
            >
              {/* At rest: the layer's word. The word and the figure share one
                  grid cell, so the box keeps its size as they swap. */}
              <p
                data-inspect="LedgerWord"
                className={`[grid-area:1/1] m-0 text-[clamp(1.8rem,3.4vw,3rem)] leading-none text-[var(--paper-text)] ${FADE} group-hover/fig:opacity-0`}
                style={{ ...SERIF, letterSpacing: '-0.02em' }}
              >
                {l.word}
              </p>

              {/* On hover: the figure, counted up, with its label. An exact
                  figure in a cell wide enough for it (measured on the cell, not
                  the window, since the side panels narrow it) is spelled out. */}
              <div aria-hidden className={`[grid-area:1/1] opacity-0 ${FADE} group-hover/fig:opacity-100`}>
                <p
                  data-inspect="LedgerFigure"
                  className={`m-0 text-[clamp(1.8rem,3.4vw,3rem)] leading-none text-[var(--kind)] tabular-nums ${l.exact ? short : ''}`}
                  style={MONO}
                >
                  <CountUp value={fig.count} decimals={fig.decimals} suffix={fig.suffix} duration={1400} trigger="hover" />
                </p>
                {l.exact && (
                  <p className={`m-0 hidden text-[clamp(1.4rem,9cqw,2.6rem)] leading-none text-[var(--kind)] tabular-nums ${full}`} style={MONO}>
                    <CountUp value={l.value} duration={1400} trigger="hover" />
                  </p>
                )}
                <p data-inspect="LedgerUnit" className="m-0 mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--kind)]" style={SANS}>
                  {l.unit}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
    </div>
  )
}
