'use client'

import { useCallback, useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { HomeCard } from './HomeCard'
import type { HomeCardData } from '@/lib/home-data'

/**
 * The contents plate — the section heading with its refresh, and the 5×2 grid.
 *
 * ── What "Refresh" does
 * The plate opens on the ten products. Refresh replaces them with the ten
 * papers most recently harvested into the 44b Library; refresh again and it
 * walks back ten more (page 1, 2, …), so repeated clicks keep turning up new
 * work rather than re-dealing the same ten. Data: /api/recent-papers.
 *
 * ── The skeleton beat, ported from 44b's /chat "AI Headlines"
 * 44b redeals its starters instantly, then holds a ~420 ms skeleton so the
 * change reads as "a new edition being set" instead of a flicker. Same here:
 * the icon spins, the ten cells go to pulsing bars, and the new cards land
 * together — never one at a time. The fetch runs UNDER the beat: we wait for
 * whichever is later, the data or the 420 ms, so a fast response still gets
 * the beat and a slow one just holds the skeleton a little longer.
 *
 * ── Failure keeps the plate
 * An empty or failed response leaves the current cards in place and stops the
 * spin. A marketing page never shows an empty grid because a database blinked.
 *
 * ── Why the paper cards get `panel={false}` and `paper`
 * HomeCard's ↘ opens the switchboard's PRODUCT view by index; a paper at
 * index 3 is not the fourth product, so the panel affordance is dropped.
 * `paper` switches the cell to the paper shape: fixed 210px (the plate caps at
 * ~425px), no resting blurb, a "Published …" footer, and the description
 * fading in on hover where a product counts its figure.
 */

const BEAT_MS = 420
/** Skeleton bar widths per cell — varied like real titles, one set per row of five. */
const SKELETON = [
  ['82%', '58%'], ['66%', '74%'], ['90%', '46%'], ['71%', '63%'], ['60%', '80%'],
  ['77%', '52%'], ['64%', '69%'], ['86%', '57%'], ['58%', '75%'], ['73%', '61%'],
]

const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const

export function HomeContents({ initial }: { initial: HomeCardData[] }) {
  const [cards, setCards] = useState<HomeCardData[]>(initial)
  const [papers, setPapers] = useState(false)
  const [dealing, setDealing] = useState(false)
  // Next page of papers to ask for. Lives in a ref: it's bookkeeping, not view.
  const nextPage = useRef(0)

  const refresh = useCallback(async () => {
    if (dealing) return
    setDealing(true)
    const beat = new Promise<void>(r => setTimeout(r, BEAT_MS))
    const page = nextPage.current
    const load = fetch(`/api/recent-papers?page=${page}`)
      .then(r => (r.ok ? r.json() : null))
      .then((d: { cards?: HomeCardData[] } | null) => d?.cards ?? [])
      .catch(() => [] as HomeCardData[])
    const [next] = await Promise.all([load, beat])
    if (next.length > 0) {
      setCards(next)
      setPapers(true)
      nextPage.current = page + 1
    } else if (page > 0) {
      // Walked off the end of the Library — start over from the newest.
      nextPage.current = 0
    }
    setDealing(false)
  }, [dealing])

  return (
    <>
      <div className="mt-6 mb-4 flex items-center gap-1.5">
        <h2 className="text-[10px] uppercase tracking-[0.32em] text-[var(--paper-faint)]" style={MONO}>
          {papers ? 'Recent papers' : 'Refresh'}
        </h2>
        {/* Turn the plate: the ten most recent papers, then the ten before those. */}
        <button
          type="button"
          aria-label={papers ? 'Ten more recent papers' : 'Show the ten most recent papers'}
          onClick={refresh}
          disabled={dealing}
          className="rounded p-1 text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)] disabled:cursor-default"
        >
          <RotateCw className={`h-3.5 w-3.5 ${dealing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Contents plate — each cell indexed 01–10 like a table of contents. */}
      <div
        aria-busy={dealing}
        className="grid grid-cols-1 border-t border-l border-[var(--paper-rule)] sm:grid-cols-2 lg:grid-cols-5"
      >
        {dealing
          ? SKELETON.map(([a, b], i) => (
              <div
                key={`s-${i}`}
                aria-hidden
                className="flex min-h-[210px] flex-col border-b border-r border-[var(--paper-rule)] px-5 py-5"
              >
                {/* Index, a two-line title, the Published footer — the paper
                    card's resting shape, which is all a deal ever lands on. */}
                <span className="h-[10px] w-[18px] animate-pulse rounded bg-[var(--paper-rule-soft)]" />
                <span className="mt-4 h-[16px] animate-pulse rounded bg-[var(--paper-rule-soft)]" style={{ width: a }} />
                <span className="mt-2 h-[16px] animate-pulse rounded bg-[var(--paper-rule-soft)]" style={{ width: b }} />
                <span className="mt-auto h-[10px] w-[55%] animate-pulse rounded bg-[var(--paper-rule-soft)]" />
              </div>
            ))
          : cards.map((card, i) => (
              <HomeCard key={card.href + card.title} card={card} index={i} panel={!papers} paper={papers} />
            ))}
      </div>
    </>
  )
}
