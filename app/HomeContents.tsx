'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'
import { HomeCard } from './HomeCard'
import { IN_HOUSE, PRODUCT_EXTRAS, TOOLS, type HomeCardData } from '@/lib/home-data'
import dynamic from 'next/dynamic'
import { CardDialog } from './CardDialog'

// The Inspector's overlay loads when a reader turns it on, not with the page.
const InspectorMode = dynamic(() => import('./InspectorMode').then(m => m.InspectorMode), { ssr: false })

/** Each of our own plates' heading. Papers keep "Recent papers". */
const PLATE_HEADING = ['Custom AI', 'Custom Tools', 'Dev Tools']

/**
 * The contents plate — the section heading with its refresh, and the 5×2 grid.
 *
 * ── What "Refresh" does
 * The plate opens on the ten products. Refresh replaces them with the ten
 * papers most recently harvested into the 44b Library; refresh again and it
 * walks back ten more (page 1, 2, …), so repeated clicks keep turning up new
 * work rather than re-dealing the same ten. Data: /api/recent-papers.
 *
 * ── The pager (papers mode only)
 * A Prev · Next pair sits opposite the heading in both views — the 44b
 * breadcrumb pager, inline. Next deals the next ten (the refresh icon's exact
 * move; from the products it deals the newest ten); Prev walks back toward
 * the newest ten and, from the first page, returns the plate to the ten
 * products. On the products view Prev is present but disabled — there is
 * nothing before the table of contents. Everything runs through
 * one deal(page) — page -1 IS the products view, so the back-to-products path
 * gets the same skeleton beat as a fetch and the plate never snaps.
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
/** The last of the three plates on the rail. */
const LAST_PLATE = 2
/** Skeleton bar widths per cell — varied like real titles, one set per row of five. */
const SKELETON = [
  ['82%', '58%'], ['66%', '74%'], ['90%', '46%'], ['71%', '63%'], ['60%', '80%'],
  ['77%', '52%'], ['64%', '69%'], ['86%', '57%'], ['58%', '75%'], ['73%', '61%'],
]

const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const

export function HomeContents({ initial: products }: { initial: HomeCardData[] }) {
  // The products carry their source line and dialog from PRODUCT_EXTRAS.
  const initial = useMemo(() => products.map(c => ({ ...c, ...PRODUCT_EXTRAS[c.title] })), [products])
  const [cards, setCards] = useState<HomeCardData[]>(initial)
  /** The card whose dialog is open. */
  const [open, setOpen] = useState<HomeCardData | null>(null)
  /** The Inspector is on over the page (its card's dialog button, or a held ⌘C). */
  const [inspecting, setInspecting] = useState(false)

  /**
   * Long-press ⌘C (Ctrl+C elsewhere) toggles the Inspector from anywhere on
   * the page — GovBlock's binding (apps/web/components/dev/inspector.tsx),
   * ported: 600 ms, releasing early cancels, and the default is never
   * prevented — a quick ⌘C still copies, only a held one toggles this.
   * GovBlock gates its inspector to dev because it reads React's development
   * build; this one reads the page's own data-inspect marks, which ship, so
   * the binding is always live.
   */
  useEffect(() => {
    let timer: number | null = null
    const cancel = () => {
      if (timer !== null) window.clearTimeout(timer)
      timer = null
    }
    const down = (e: KeyboardEvent) => {
      const mod = navigator.platform.startsWith('Mac') ? e.metaKey : e.ctrlKey
      if (e.key !== 'c' || !mod || e.repeat || timer !== null) return
      timer = window.setTimeout(() => {
        timer = null
        // A toggle, as on GovBlock: the press that opens it closes it.
        setOpen(null)
        setInspecting(v => !v)
      }, 600)
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'Meta' || e.key === 'Control') cancel()
    }
    document.addEventListener('keydown', down)
    document.addEventListener('keyup', up)
    return () => {
      document.removeEventListener('keydown', down)
      document.removeEventListener('keyup', up)
      cancel()
    }
  }, [])
  const [papers, setPapers] = useState(false)
  /** Which plate of our own is up: 0 the products, 1 the tools, 2 the in-house instruments. */
  const [plate, setPlate] = useState(0)
  const [dealing, setDealing] = useState(false)
  // Next page of papers to ask for. Lives in a ref: it's bookkeeping, not view.
  const nextPage = useRef(0)

  /** Deal the plate to `page` of papers; page -1 is the ten products. */
  const deal = useCallback(async (page: number) => {
    if (dealing) return
    setDealing(true)
    const beat = new Promise<void>(r => setTimeout(r, BEAT_MS))
    if (page < 0) {
      // Back to the products — local data, but it gets the same beat so the
      // return reads as a deal, not a snap.
      await beat
      setCards(initial)
      setPapers(false)
      setPlate(0)
      nextPage.current = 0
      setDealing(false)
      return
    }
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
  }, [dealing, initial])

  const refresh = useCallback(() => deal(nextPage.current), [deal])

  /** The three plates, now same-shape pages on one sideways rail. */
  const PLATES = useMemo(() => [initial, TOOLS, IN_HOUSE], [initial])
  /** The dialog's arrows: the card before or after the open one, round its own plate. */
  const step = useCallback((by: -1 | 1) => {
    const deck = papers ? cards : PLATES[Math.min(plate, LAST_PLATE)]
    setOpen(now => {
      const i = now ? deck.findIndex(c => c.title === now.title) : -1
      return i < 0 ? now : deck[(i + by + deck.length) % deck.length]
    })
  }, [papers, cards, PLATES, plate])
  // The page on display is nextPage - 1, so back = nextPage - 2; below zero
  // deal() reads it as the products view.
  const prev = useCallback(() => deal(Math.max(nextPage.current - 2, -1)), [deal])

  /**
   * The plate scrolls sideways — hermes's rail (src/components/scroll-row.tsx):
   * hidden scrollbar, snap, chevrons that page by 0.8 widths, the left one
   * fading in once scrolling starts. Re-dressed in this page's chrome.
   */
  const rail = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ left: false, right: false })
  const measure = useCallback(() => {
    const el = rail.current
    if (!el) return
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }, [])
  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])
  // A deal replaces the cards: back to the start of the rail, then re-measure.
  useEffect(() => {
    rail.current?.scrollTo({ left: 0 })
    measure()
  }, [cards, dealing, measure])
  const pageRail = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth, behavior: 'smooth' })
  /** Scroll keeps the chevrons and the heading honest: the plate on show is the page under the viewport. */
  const onRailScroll = () => {
    measure()
    const el = rail.current
    if (el && !papers && !dealing) setPlate(Math.min(LAST_PLATE, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))))
  }
  const chevron = (show: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded-full border border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-faint)] shadow-sm transition-[opacity,color,background-color] duration-200 hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)] ${show ? '' : 'pointer-events-none opacity-0'}`

  return (
    <>
      <div data-inspect="PlateHeader" className="mt-6 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h2 data-inspect="PlateHeading" className="text-[10px] uppercase tracking-[0.32em] text-[var(--paper-faint)]" style={MONO}>
            {papers ? 'Recent papers' : PLATE_HEADING[plate]}
          </h2>
          {/* Turn the plate: the ten most recent papers, then the ten before those. */}
          <button
            type="button"
            data-inspect="RefreshButton"
            aria-label={papers ? 'Ten more recent papers' : 'Show the ten most recent papers'}
            onClick={refresh}
            disabled={dealing}
            className="rounded p-1 text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)] disabled:cursor-default"
          >
            <RotateCw className={`h-3.5 w-3.5 ${dealing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* The rail's arrows — hermes's pair in this page's round-button
            chrome, and the ONE pager (the Prev · Next text pair is gone,
            2026-10-05). On the plates they scroll a page; on the papers the
            left walks back toward the newest ten and home to the products,
            the right deals the next ten. */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <button
            type="button"
            aria-label={papers ? 'Newer papers, or back to the products' : 'Scroll the plate left'}
            onClick={papers ? prev : () => pageRail(-1)}
            className={chevron(papers ? !dealing : edge.left)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={papers ? 'The next ten papers' : 'Scroll the plate right'}
            onClick={papers ? refresh : () => pageRail(1)}
            className={chevron(papers ? !dealing : edge.right)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Contents plates — three same-shape pages on one sideways rail: the
          ten products (5×2), the tools (5×2), and the in-house pair (1×2 at
          the same height). The chevrons and Prev·Next scroll between pages;
          no scrollbar shows (hermes's rail). Papers deal into a single page
          in the same frame. */}
      <div
        aria-busy={dealing}
        data-inspect="ContentsPlate"
        ref={rail}
        onScroll={onRailScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {dealing ? (
          <div className="w-full shrink-0 snap-start">
            <div className="grid grid-cols-1 border-t border-l border-[var(--paper-rule)] sm:grid-cols-2 lg:grid-cols-5">
              {SKELETON.map(([a, b], i) => (
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
              ))}
            </div>
          </div>
        ) : papers ? (
          <div className="w-full shrink-0 snap-start">
            <div className="grid grid-cols-1 border-t border-l border-[var(--paper-rule)] sm:grid-cols-2 lg:grid-cols-5">
              {cards.map((card, i) => (
                <HomeCard key={card.href + card.title} card={card} index={i} panel={false} paper />
              ))}
            </div>
          </div>
        ) : (
          PLATES.map((deck, p) => (
            <div key={p} className="w-full shrink-0 snap-start">
              <div className={`grid grid-cols-1 border-t border-l border-[var(--paper-rule)] sm:grid-cols-2 ${p === LAST_PLATE ? '' : 'lg:grid-cols-5'}`}>
                {deck.map((card, i) => (
                  <HomeCard key={card.href + card.title} card={card} index={i} panel={p === 0} large={p === LAST_PLATE} onOpen={() => setOpen(card)} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <CardDialog
        card={open}
        onClose={() => setOpen(null)}
        onStep={step}
        onInspect={() => {
          setOpen(null)
          setInspecting(true)
        }}
      />
      {inspecting && <InspectorMode onExit={() => setInspecting(false)} />}
    </>
  )
}
