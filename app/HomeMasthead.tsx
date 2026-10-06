'use client'

import { CountUp } from '@/components/CountUp'
import { compact } from '@/lib/compact'
import { useSwitchboard } from '@/components/SwitchboardPanel'

/**
 * The nysgpt.com masthead — nameplate cell plus the four-figure ledger, matched
 * to 44B's home masthead.
 *
 * Two behaviours ported deliberately, because they are what makes 44B's masthead
 * feel alive and this one felt dead without them:
 *  - the nameplate is a BUTTON: hover tints the cell and turns the wordmark
 *    accent; click toggles the switchboard panel, exactly as 44B's nameplate
 *    toggles the Commons.
 *  - the ledger figures use `trigger="view-hover"` — they count up once on
 *    scroll AND re-run on hover, with the figure and its label both going accent.
 */

const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const
const SERIF = { fontFamily: 'var(--font-display), Georgia, serif' } as const

export type LedgerEntry = { value: number; unit: string }

export function HomeMasthead({ ledger }: { ledger: LedgerEntry[] }) {
  const { toggle } = useSwitchboard()

  return (
    <div data-inspect="HomeMasthead" className="grid grid-cols-1 items-stretch border-t border-b border-[var(--paper-rule)] lg:grid-cols-[auto_1fr]">
      {/* border-r closes the cell's right edge when the masthead stacks below lg.
          Side by side the ledger's own border-l closes that seam, so it is
          dropped at lg to avoid a double rule. */}
      <button
        data-inspect="Wordmark"
        onClick={toggle}
        aria-label="Open or close the switchboard"
        className="group/name self-stretch flex items-center justify-center border-l border-r lg:border-r-0 border-[var(--paper-rule)] px-6 py-8 transition-colors hover:bg-[var(--paper-quiet)] cursor-pointer sm:px-10 lg:w-[360px]"
      >
        <span
          className="text-[var(--paper-text)] leading-[0.82] transition-colors group-hover/name:text-[var(--paper-strong)]"
          style={{ ...SERIF, fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', fontWeight: 400, letterSpacing: '-0.03em' }}
        >
          NYSgpt
        </span>
      </button>

      {/* Bottom-row cells drop border-b so it does not double with the
          container's own bottom rule. */}
      <div className="grid grid-cols-2 border-t border-l border-[var(--paper-rule)] lg:border-t-0">
        {ledger.map((l, i) => {
          const fig = compact(l.value)
          return (
            <div
              key={l.unit}
              /* CountUp's hover trigger attaches to the nearest anchor by
                 default; these cells link nowhere, so mark the scope explicitly
                 or the figures animate on scroll and never again. */
              data-countup-scope
              data-inspect="LedgerCell"
              className={`group/fig flex flex-col justify-center border-r border-[var(--paper-rule)] px-5 py-6 sm:px-7 transition-colors hover:bg-[var(--paper-quiet)] ${i < 2 ? 'border-b' : ''}`}
            >
              <p
                data-inspect="LedgerFigure"
                className="text-[clamp(1.8rem,3.4vw,3rem)] leading-none text-[var(--paper-text)] tabular-nums transition-colors group-hover/fig:text-[var(--paper-strong)]"
                style={MONO}
              >
                <CountUp value={fig.count} decimals={fig.decimals} suffix={fig.suffix} duration={1400} trigger="view-hover" />
              </p>
              <p
                data-inspect="LedgerUnit"
                className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--paper-faint)] transition-colors group-hover/fig:text-[var(--paper-strong)]"
                style={SANS}
              >
                {l.unit}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
