'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { HomeCard } from './HomeCard'
import { APIS, IN_HOUSE, KINDS, SWITCHBOARD, PRODUCT_EXTRAS, TOOLS, HF_MODELS, type HomeCardData, type Kind } from '@/lib/home-data'
import dynamic from 'next/dynamic'
import { CardDialog } from './CardDialog'
import { X } from 'lucide-react'
import { useSwitchboard } from '@/components/SwitchboardPanel'

// The Inspector's overlay loads when a reader turns it on, not with the page.
const InspectorMode = dynamic(() => import('./InspectorMode').then(m => m.InspectorMode), { ssr: false })

/**
 * The contents rail (2026-10-08) — every box on one sideways scroll.
 *
 * The products and the tools, A–Z, sit two rows tall in one rounded frame a
 * screen wide, and scroll sideways inside it: five columns to the frame on
 * desktop, two on a tablet, one on a phone. The Dev Tools box is among them; it opens
 * no dialog but slides the rail to a second frame, set apart by a gap, that
 * holds the two dev tools (HQ and the Inspector) as large boxes. Scrolling
 * back returns to the rest. No heading and no arrow buttons: the rail is
 * scrolled by trackpad, wheel or swipe.
 *
 * Before this the products, the tools and the dev tools were three plates
 * each a screen wide, with a heading and a pair of arrows above them, and a
 * refresh that dealt recent papers into the plate (retired with the heading).
 */

/**
 * Off the rail (2026-10-08, the tightening): Sports, which fits none of the
 * four verticals; Solar, the same app as Energy, whose box now carries both;
 * and Compiler, Lake and Loaders, which the Pipeline box now speaks for. They
 * stay in the data, the switchboard and the gate.
 */
const OFF_RAIL = new Set(['Sports', 'Solar', 'Compiler', 'Lake', 'Loaders'])

/** The box that opens the Dev Tools frame. */
const DEV_TOOLS = 'Dev Tools'

/** A rounded frame matching the app shell. The grid inside sits 1px outward
 *  (-m-px), so its own edge rules fall under the frame's border and are
 *  clipped, leaving one rounded outline; it grows to fill the frame (flex-1)
 *  since the rail stretches both frames to the taller. */
const FRAME = 'isolate flex shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[var(--paper-rule)]'

export function HomeContents({ initial: products }: { initial: HomeCardData[] }) {
  /** Every box but the dev tools, A–Z; each product carries its dialog from
   *  PRODUCT_EXTRAS. A box wears its kind's colour (KINDS), not its own. */
  const boxes = useMemo(
    () =>
      [...products.map(c => ({ ...c, ...PRODUCT_EXTRAS[c.title], tag: 'Platform' })), ...TOOLS, ...APIS]
        .filter(c => !OFF_RAIL.has(c.title))
        .map(c => (c.tag ? { ...c, accent: KINDS[c.tag as Kind] } : c))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [products],
  )
  /** The dev tools are tools: they wear the Tool colour and chip. */
  const devTools = useMemo(() => IN_HOUSE.map(c => ({ ...c, tag: 'Tool', accent: KINDS.Tool })), [])
  /** A product's place in the switchboard, by title. */
  const productIndex = useMemo(() => new Map(SWITCHBOARD.map((c, i) => [c.title, i])), [])
  const columns = Math.ceil(boxes.length / 2)

  /** The card whose dialog is open. */
  const [open, setOpen] = useState<HomeCardData | null>(null)
  /** The composer banner over the plate, until the reader dismisses it. */
  const [notice, setNotice] = useState(true)
  const { openMenu } = useSwitchboard()
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

  const rail = useRef<HTMLDivElement>(null)
  const devFrame = useRef<HTMLDivElement>(null)
  const modelsFrame = useRef<HTMLDivElement>(null)
  const toDevTools = () => {
    const el = rail.current
    const to = devFrame.current
    if (el && to) el.scrollTo({ left: to.offsetLeft - el.offsetLeft, behavior: 'smooth' })
  }
  const toModels = () => {
    const el = rail.current
    const to = modelsFrame.current
    if (el && to) el.scrollTo({ left: to.offsetLeft - el.offsetLeft, behavior: 'smooth' })
  }

  // The masthead "Tools" cell dispatches this event so it can scroll the rail
  // without prop-drilling across the two client islands (2026-10-10).
  useEffect(() => {
    const handler = () => toDevTools()
    window.addEventListener('scroll-to-dev-tools', handler)
    return () => window.removeEventListener('scroll-to-dev-tools', handler)
  }, [])

  // The masthead "Models" cell scrolls to slide 4 (2026-10-10).
  useEffect(() => {
    const handler = () => toModels()
    window.addEventListener('scroll-to-models', handler)
    return () => window.removeEventListener('scroll-to-models', handler)
  }, [])

  /** The dialog's arrows: the box before or after the open one, among those that open a dialog. */
  const step = (by: -1 | 1) => {
    const deck = open && devTools.some(c => c.title === open.title) ? devTools : boxes.filter(c => c.title !== DEV_TOOLS)
    setOpen(now => {
      const i = now ? deck.findIndex(c => c.title === now.title) : -1
      return i < 0 ? now : deck[(i + by + deck.length) % deck.length]
    })
  }

  return (
    <>
      {/* The rail holds two frames, each a screen wide: the boxes, and the dev
          tools beyond a gap. The boxes scroll inside their own frame, so its
          rounded ends always show; that scroll stops at its end
          (overscroll-contain) rather than spilling into the rail, so the dev
          tools arrive only from their box. A column is a fifth of the frame on
          desktop, a half on a tablet, the whole frame on a phone. */}
      {/* The composer banner: a notice docked to the plate's top edge, as a chat
          app docks one to its input. It sits outside the rail, so it stays put
          while the plate scrolls sideways. Its foot tucks 16px under the plate, whose
          rounded top corners sit over it, as a chat app's input sits over its banner. A sample (2026-10-08). */}
      {/* The plate keeps its place whether or not the banner shows: the banner is
          out of the flow, anchored above the plate and tucked 16px behind it. */}
      <div className="relative mt-[72px]">
      <div
        data-inspect="ContentsPlate"
        ref={rail}
        className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto [--col:100%] sm:[--col:50%] lg:[--col:20%]"
      >
        {/* The frame keeps its rounded corners and sits over the banner's tucked-in foot. */}
        <div className={`${FRAME} relative z-10 w-full bg-[var(--paper)]`}>
          <div className="no-scrollbar -m-px flex-1 snap-x snap-proximity overflow-x-auto overscroll-x-contain">
            <div
              className="grid h-full grid-flow-col grid-rows-[repeat(2,minmax(210px,auto))] border-t border-l border-[var(--paper-rule)] [&>*]:snap-start"
              style={{ width: `calc(${columns} * var(--col))`, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {boxes.map((card, i) => (
                <HomeCard
                  key={card.href + card.title}
                  card={card}
                  index={i}
                  productIndex={productIndex.get(card.title)}
                  category={card.tag}
                  rest={card.title === DEV_TOOLS ? 'grey' : undefined}
                  featured={card.title === DEV_TOOLS}
                  panel={productIndex.has(card.title)}
                  onOpen={card.title === DEV_TOOLS ? toDevTools : () => setOpen(card)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* The dev tools, off screen until the Dev Tools box slides them in. */}
        <div ref={devFrame} className={`${FRAME} w-full`}>
          <div className="-m-px grid flex-1 grid-cols-1 border-t border-l border-[var(--paper-rule)] sm:grid-cols-2">
            {devTools.map((card, i) => (
              <HomeCard key={card.href + card.title} card={card} index={i} category={card.tag} panel={false} large onOpen={() => setOpen(card)} />
            ))}
          </div>
        </div>

        {/* Slide 4: the six public NYSgpt models on Hugging Face (2026-10-10).
            Standard card size (no `large`) so the frame matches the plate's
            existing height. 3 cols × 2 rows. No dialog — each card is a plain
            link that opens its HF page in a new tab (panel=false, no onOpen). */}
        <div ref={modelsFrame} className={`${FRAME} w-full`}>
          <div
            className="-m-px grid flex-1 border-t border-l border-[var(--paper-rule)]"
            style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gridTemplateRows: 'repeat(2, minmax(210px, auto))' }}
          >
            {HF_MODELS.map((card, i) => (
              <HomeCard key={card.href + card.title} card={card} index={i} category={card.tag} panel={false} />
            ))}
          </div>
        </div>
      </div>
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
