'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Columns2, Columns3, ArrowRight, ArrowUpRight, Blocks, Wrench } from 'lucide-react'
// brief 50: the published animated icons (animate-ui's registry, as written), played by their button or row.
import { X } from '@/components/animate-ui/icons/x'
import { ArrowLeft } from '@/components/animate-ui/icons/arrow-left'
import { AnimateOnHover } from '@/components/animate-on-hover'
import { CountUp } from '@/components/CountUp'
import { compact } from '@/lib/compact'
import { useProductStatus } from '@/components/ProductStatus'
import type { HomeCardData } from '@/lib/home-data'
import { SwitchboardApiList } from './SwitchboardApiList'
import { AwsConsole, AwsRegister, type AwsPlan, type AwsSubscription } from './MarketplaceViews'
import type { Digest } from '@/lib/digest'
import { FeedbackDialog } from '@/components/FeedbackDialog'
import { BOXES, KIND_NOUN, SET_INFO, SOURCES, TYPE_COLOR, brandOf, isSource, type Box, type BoxKind } from '@/lib/home-boxes'
import { boxKey, getHome, home, shelfItems, shelfSlots, useHome, type ShelfItem } from '@/lib/home-store'
import { compactNum, loadCatalog, type Table } from '@/lib/home-catalog'
import { Icon, TypeIcon } from '@/app/HomeIcons'
import { FieldsTable, TableDetail } from '@/app/TableDetail'
import { BlockView } from '@/components/blocks/BlockView'
import { hasPayload } from '@/lib/blocks'
import { setShelfDrag } from '@/lib/shelf-drag'
import '@/app/home.css'
import { DEV_TOOLS, DEV_TOOLS_TITLE, DevToolsEntry, DevToolsSubView, type DevToolsSub } from '@/components/dev/devtools-slots'

/**
 * The nysgpt.com switchboard panel — the right-hand drawer, and the store that
 * drives it. Ported from 44b's src/app/nysgpt-site/NysgptPanel.tsx, where it
 * shipped first (nysgpt.com was hosted on the 44b shell until 2026-08). Here it
 * lives in the ROOT LAYOUT — like the Commons panel it replaced — so it follows
 * the reader across routes.
 *
 * ── ⚠ WHY IT PORTALS TO document.body — this is load-bearing
 * A `position: fixed` element resolves against the nearest ancestor carrying a
 * CSS `transform`, NOT the viewport. The masthead sits inside `RevealFx`, which
 * animates with a transform, so a panel rendered in place docks against the
 * masthead's box and clips off-screen. (Shipped exactly that bug on 2026-08-13.)
 * Do not un-portal this.
 *
 * ── Two views, one stack
 * `menu` is the switchboard; `product` is one product's detail. The header dot
 * becomes a back arrow and the title becomes the product name at depth 1 —
 * that's the whole navigation model, so no view stack is warranted.
 */

const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const
const SERIF = { fontFamily: 'var(--font-display), Georgia, serif' } as const

/** Absolute, not a bare path: documents live on 44B, and this host is nysgpt. */
const SITE = 'https://44b.nysgpt.com'
const fmt = (v: number) => v.toLocaleString('en-US')

/** The three channels, in one place — the row, the header and the drill-down
 *  all read from this, so a URL or a name can only be wrong once. */
export const CHANNELS: Record<ChannelId, { name: string; href: string; sameTab?: boolean; blurb: string }> = {
  slack: {
    name: 'Slack',
    href: 'https://nysgptworkspace.slack.com',
    blurb: 'The working workspace — build logs, incident threads, and the day-to-day of running ten products.',
  },
  discord: {
    name: 'Discord',
    href: 'https://discord.com/channels/1537459604626219018/1537459605469405259',
    blurb: 'The public channel. Every night the harvest posts what it found — new documents, new patents, new models.',
  },
  ask: {
    name: 'Ask NYSgpt',
    href: 'https://44b.nysgpt.com/chat',
    sameTab: true,
    blurb: 'A cited answer over the whole corpus — papers, patents, models, benchmarks — with its sources attached.',
  },
}


/** An AWS Marketplace buyer's view: registration after subscribing, or their console. */
export type AwsView =
  | { kind: 'aws-register'; plan: AwsPlan; signedIn: string | null }
  | { kind: 'aws-console'; sub: AwsSubscription }

/** `channel` is the Slack / Discord / Ask drill-down; `product` is one card. */
type View =
  | { kind: 'menu' }
  /* `sub`: a view the Dev Tools entry's menu opens (Dev Comments, Settings), on the dev server alone
     (components/dev/devtools-slots.tsx, brief 44). */
  | { kind: 'product'; index: number; sub?: DevToolsSub }
  | { kind: 'channel'; id: ChannelId }
  | AwsView
  /* 2026-11-19, brief 43 (the option 3 sketch): the Blocks shelf, one box,
     and the data: the databases, one database's tables, one table. */
  | { kind: 'blocks' }
  | { kind: 'box'; key: string }
  /* Brief 52: a payload block (lib/blocks.ts), opened from its Blocks tile. */
  | { kind: 'block'; key: string }
  | { kind: 'data'; db?: string; table?: number; rows?: boolean }
  /* Brief 51: rows a Command K command fetched or loaded (Call API, Get sample API results). */
  | ({ kind: 'result' } & PanelResult)

export type ChannelId = 'slack' | 'discord' | 'ask'

type Ctx = {
  open: boolean
  /** The panel's width, a CSS length: a third of the window (the default, 2026-11-19), half,
   *  or whatever the drag handle set; kept in this browser (2026-11-19).
   *  Lives here, not in the panel, because SwitchboardShell sizes the page's
   *  padding from it — the push has to match the panel's actual width. */
  width: string
  setWidth: (w: string) => void
  view: View
  setView: (v: View) => void
  cards: HomeCardData[]
  digest: Digest
  toggle: () => void
  close: () => void
  openMenu: () => void
  openProduct: (index: number) => void
  openChannel: (id: ChannelId) => void
  openAws: (view: AwsView) => void
  openBox: (key: string) => void
  /** A database at its first table, or the list of databases. */
  openData: (db: string | null) => void
  openBlocks: () => void
  /** Rows to show in the panel (brief 51, the palette's Call API and Get sample API results). */
  openResult: (r: PanelResult) => void
}

const PanelCtx = createContext<Ctx | null>(null)

export function useSwitchboard() {
  const ctx = useContext(PanelCtx)
  if (!ctx) throw new Error('useSwitchboard must be used inside <SwitchboardProvider>')
  return ctx
}

export function SwitchboardProvider({ cards, digest, children }: { cards: HomeCardData[]; digest: Digest; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [width, setWidthState] = useState('33.3333vw')
  const [view, setView] = useState<View>({ kind: 'menu' })

  /* the width: set on the root as --sbw (the panel, the page's push and the
     split handle all read it), and remembered in this browser */
  useEffect(() => {
    try {
      const w = localStorage.getItem(WIDTH_KEY)
      if (w) setWidthState(w)
    } catch {}
  }, [])
  useEffect(() => {
    document.documentElement.style.setProperty('--sbw', width)
  }, [width])
  const setWidth = useCallback((w: string) => {
    setWidthState(w)
    try {
      localStorage.setItem(WIDTH_KEY, w)
    } catch {}
  }, [])

  const close = useCallback(() => setOpen(false), [])
  const openMenu = useCallback(() => { setView({ kind: 'menu' }); setOpen(true) }, [])
  const openProduct = useCallback((index: number) => { setView({ kind: 'product', index }); setOpen(true) }, [])
  const openChannel = useCallback((id: ChannelId) => { setView({ kind: 'channel', id }); setOpen(true) }, [])
  const openAws = useCallback((v: AwsView) => { setView(v); setOpen(true) }, [])
  const openBox = useCallback((key: string) => { setView({ kind: 'box', key }); setOpen(true) }, [])
  const openData = useCallback((db: string | null) => { setView(db ? { kind: 'data', db, table: 0 } : { kind: 'data' }); setOpen(true) }, [])
  const openBlocks = useCallback(() => { setView({ kind: 'blocks' }); setOpen(true) }, [])
  const openResult = useCallback((r: PanelResult) => { setView({ kind: 'result', ...r }); setOpen(true) }, [])
  // Toggle always returns to the menu, so the trigger is a switch rather than a
  // way to resume wherever you happened to leave off.
  const toggle = useCallback(() => setOpen(v => { if (!v) setView({ kind: 'menu' }); return !v }), [])

  return (
    <PanelCtx.Provider value={{ open, width, setWidth, view, setView, cards, digest, toggle, close, openMenu, openProduct, openChannel, openAws, openBox, openData, openBlocks, openResult }}>
      {children}
      <SwitchboardPanel />
    </PanelCtx.Provider>
  )
}

/**
 * Wraps the routed page tree and narrows it (padding-right) when the drawer is
 * open, so the panel pushes content aside rather than sheeting over it.
 *
 * ⚠ The padding goes on this wrapper OUTSIDE AppLayout, never inside it. Two
 * ways to get that wrong, both shipped on 2026-08-13:
 *  1. Padding the content INSIDE AppLayout — only the content narrows, the
 *     rounded card keeps its width and the drawer floats on top of it.
 *  2. Padding AppLayout's own outer div — that REPLACES its `sm:p-[18px]`
 *     right padding rather than adding to it, so the card ends up 18px too wide
 *     and touches the panel. The space is 441 (wrapper) + 18 (AppLayout) =
 *     459px; only the wrapper structure produces that.
 *
 * 441px = 423 (panel) + 18 (gutter). sm+ only; mobile overlays over a scrim.
 */
export function SwitchboardShell({ children }: { children: React.ReactNode }) {
  const { open } = useSwitchboard()
  return (
    <div
      className={`hm-sbanim transition-[padding] duration-500 ease-in-out ${
        open ? 'sm:pr-[calc(var(--sbw,50vw)+18px)]' : ''
      }`}
    >
      {children}
    </div>
  )
}

function LiveDot() {
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
    </span>
  )
}

const ROW =
  'group/row flex w-full items-center gap-3 border-b border-[var(--paper-rule-soft)] px-5 py-4 text-left transition-colors hover:bg-[var(--paper-quiet)]'
const GLYPH = 'h-4 w-4 shrink-0 text-[var(--paper-faint)] transition-colors group-hover/row:text-[var(--paper-strong)]'
const LABEL =
  'min-w-0 flex-1 truncate text-[15px] leading-tight text-[var(--paper-text)] transition-colors group-hover/row:text-[var(--paper-strong)]'

/** Every row's end mark (2026-11-19): a right arrow that turns to the up-right arrow while its row is hovered. */
function Arrow() {
  return <ArrowRight className={`${GLYPH} transition-[rotate,color] duration-300 ease-out group-hover/row:-rotate-45`} />
}

/* Each listing's mark: its own logo, else its source's, else the NYSgpt block. */
const BRAND_LOGO: Record<string, string> = {
  hf: '/logos/sources/huggingface.svg',
  aa: '/logos/sources/artificial-analysis.png',
  kaggle: '/logos/sources/kaggle.png',
  llmstats: '/logos/sources/llm-stats.png',
  openrouter: '/logos/sources/openrouter.svg',
}
const LISTINGS: Box[] = (() => {
  const seen = new Set<string>()
  // sorted on the title from its first letter or digit (a leading space or bracket does not count), letters before digits
  const k = (t: string) => { const s = t.replace(/^[^\p{L}\p{N}]+/u, ''); return (/^\p{L}/u.test(s) ? '0' : '1') + s }
  return BOXES.filter(b => !seen.has(boxKey(b)) && !!seen.add(boxKey(b)))
    .map(b => ({ b, k: k(b.title) }))
    .sort((x, y) => x.k.localeCompare(y.k, 'en', { sensitivity: 'base', numeric: true }))
    .map(x => x.b)
})()
/* The list by where each listing comes from and what it is (Brendan, 2026-11-19): NYSgpt first, then the sources A to Z;
   under each, its sets in the masthead's order (NYSgpt: Databases, Models, Platforms, Tables, Blocks); A to Z within a set. */
const SOURCE_NAME: Record<string, string> = { nysgpt: 'NYSgpt', aa: 'Artificial Analysis', github: 'GitHub', hf: 'Hugging Face', kaggle: 'Kaggle', llmstats: 'LLM Stats', openrouter: 'OpenRouter' }
const OWN_SET: Partial<Record<BoxKind, string>> = { data: 'Databases', models: 'Models', platforms: 'Platforms', tables: 'Tables', tools: 'Tools' }
const LISTING_GROUPS: { source: string; set: string; items: Box[] }[] = (() => {
  const by = new Map<string, { k: string; source: string; set: string; at: number; items: Box[] }>()
  BOXES.forEach((b, at) => {
    const k = brandOf(b.kind) ?? 'nysgpt'
    const source = SOURCE_NAME[k] ?? k
    // a source with one set is named for what it holds (Kaggle: Datasets), one with several for the set (GitHub: Skills)
    const set = isSource(b.kind) ? (SOURCES[b.kind].word === source ? SOURCES[b.kind].unit : SOURCES[b.kind].word) : OWN_SET[b.kind] ?? 'Blocks'
    const id = `${k}/${set}`
    if (!by.has(id)) by.set(id, { k, source, set, at, items: [] })
  })
  for (const b of LISTINGS) {
    const k = brandOf(b.kind) ?? 'nysgpt'
    const source = SOURCE_NAME[k] ?? k
    const set = isSource(b.kind) ? (SOURCES[b.kind].word === source ? SOURCES[b.kind].unit : SOURCES[b.kind].word) : OWN_SET[b.kind] ?? 'Blocks'
    by.get(`${k}/${set}`)!.items.push(b)
  }
  return [...by.values()].sort((x, y) => (x.k === y.k ? x.at - y.at : x.k === 'nysgpt' ? -1 : y.k === 'nysgpt' ? 1 : x.source.localeCompare(y.source)))
})()
function ListingMark({ b }: { b: Box }) {
  const brand = brandOf(b.kind)
  if (brand === 'github' && !b.logo) return <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--paper-text)] [&_svg]:h-4 [&_svg]:w-4"><TypeIcon icon="github" /></span>
  // eslint-disable-next-line @next/next/no-img-element -- a 16px logo from public/
  return <img src={b.logo ?? (brand ? BRAND_LOGO[brand] : '/logos/platforms/nysgpt.svg')} alt="" className="h-4 w-4 shrink-0 rounded-[3px] object-contain" />
}
function ListingRow({ b, onClick }: { b: Box; onClick: () => void }) {
  return (
    <button onClick={onClick} className={ROW} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 53px' }}>
      <ListingMark b={b} />
      <span className={LABEL} style={SERIF}>{b.title}</span>
      <Arrow />
    </button>
  )
}

/** A plain row: the whole thing drills down. */
function Row({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={ROW}>
      <span className={LABEL} style={SERIF}>{children}</span>
      <Arrow />
    </button>
  )
}

function SwitchboardPanel() {
  const { open, width, setWidth, view, setView, cards, digest, close, openMenu, openProduct, openChannel, openBox, openData } = useSwitchboard()
  const [mounted, setMounted] = useState(false)
  const { linkProps } = useProductStatus()
  /** The panel search: it filters the rows of the view on show, and clears when the view changes. */
  const [q, setQ] = useState('')
  /* where the menu is: the sources, then one source's sets, then one set's listings */
  const [at, setAt] = useState<{ source?: string; set?: string }>({})
  const viewKey = JSON.stringify(view.kind === 'data' ? { k: 'data', db: view.db, t: view.table } : view.kind === 'box' ? view : { k: view.kind })
  useEffect(() => setQ(''), [viewKey])

  useEffect(() => setMounted(true), [])

  /** One level up: a table to its database, a database to the list, anything else to the menu. */
  const back = useCallback(() => {
    if (view.kind === 'product' && view.sub) setView({ kind: 'product', index: view.index })
    else if (view.kind === 'data' && view.table != null) setView({ kind: 'data', db: view.db })
    else if (view.kind === 'data' && view.db) setView({ kind: 'data' })
    else if (view.kind === 'block') setView({ kind: 'blocks' })
    else openMenu()
  }, [view, setView, openMenu])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return // something above (the command palette) already took this Escape
      if (view.kind === 'menu' || view.kind === 'aws-register' || view.kind === 'aws-console') close()
      else back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, view, close, back])

  if (!mounted) return null

  const product = view.kind === 'product' ? cards[view.index] : null
  // The Dev Tools entry holds the dev tools' menu on the dev server; a production build keeps its placeholder.
  const devTools = Boolean(product && product.title === DEV_TOOLS && DevToolsEntry)
  const devSub = devTools && view.kind === 'product' ? view.sub : undefined
  const channel = view.kind === 'channel' ? CHANNELS[view.id] : null
  // One level down the live dot becomes a back arrow and the title becomes the
  // destination — that pair IS the navigation model, so no view stack is needed.
  const deep = Boolean(product || channel)
  // A product's header is its DOMAIN, not its name — the hero figure + the
  // "Visit <name>" footer already carry the name, and the domain is the one
  // fact the old layout buried in a footnote line (design 2026-08-24).
  // A box with no site of its own (an API, a tool) is headed by its name.
  // An AWS buyer's views are headed by the product they bought, and have no way
  // back to the menu: a Marketplace buyer did not come from the switchboard.
  const awsTitle = view.kind === 'aws-register' ? view.plan.product : view.kind === 'aws-console' ? view.sub.product : null
  const box = view.kind === 'box' ? BOXES.find(b => boxKey(b) === view.key) ?? null : null
  const newTitle = view.kind === 'block' ? (getHome().shelf.find(s => s.key === view.key)?.title ?? 'Block') : view.kind === 'result' ? view.title : view.kind === 'blocks' ? 'Blocks' : box ? box.title : view.kind === 'data' ? (view.db ?? 'Data') : null
  const title = (devSub && DEV_TOOLS_TITLE ? DEV_TOOLS_TITLE[devSub] : null) ?? awsTitle ?? newTitle ?? (product ? (product.domain ?? (product.href ? product.href.replace(/^https?:\/\//, '') : product.title)) : channel?.name ?? 'Switchboard')
  const deeper = deep || view.kind === 'block' || view.kind === 'result' || view.kind === 'blocks' || view.kind === 'box' || view.kind === 'data'
  const half = width === '50vw'

  return createPortal(
    <>
      {/* Scrim — mobile only; on desktop the panel floats beside the page. */}
      {/* ⚠ `nysgpt-app` on BOTH portaled roots: the paper tokens are scoped to
          `.nysgpt-app` in globals.css, and this portal renders into
          document.body — OUTSIDE the AppLayout div that carries the class.
          Without it every var(--paper-*) here silently fails: the bg fell back
          to the body's colder black and the rules to currentColor, which is
          why the panel's black never matched the main container's. */}
      <div
        onClick={close}
        aria-hidden
        className={`nysgpt-app fixed inset-0 z-[60] bg-black/20 transition-opacity sm:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* ⚠ These classes are the drawer's contract — same z-index, same insets,
          same widths, same closed transform, same easing as 44B's panels. Every
          bug in this panel so far came from writing an "equivalent" instead of
          the same thing. */}
      <aside
        aria-hidden={!open}
        className={`nysgpt-app hm-sbanim fixed z-[60] inset-y-0 right-0 w-full sm:inset-y-[18px] sm:right-[18px] sm:left-auto sm:w-[var(--sbw,50vw)] transition-[translate,width] duration-500 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full sm:translate-x-[calc(100%+18px)] pointer-events-none'
        }`}
      >
        <div className="relative flex h-full flex-col overflow-hidden border-l border-[var(--paper-rule)] bg-[var(--paper)] shadow-[0_4px_32px_rgba(0,0,0,0.18)] sm:rounded-2xl sm:border">

          {/* Header — the dot becomes a back arrow one level down, and the title
              becomes the product name. That IS the navigation affordance. */}
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--paper-rule)] px-5 py-4">
            {deeper ? (
              <AnimateOnHover>
              <button
                onClick={back}
                aria-label="Back"
                className="shrink-0 rounded-lg p-1.5 text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              </AnimateOnHover>
            ) : (
              <span className="shrink-0 pl-1"><LiveDot /></span>
            )}
            <span className="min-w-0 flex-1 truncate text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 17 }}>
              {title}
            </span>
            {/* Half the window or a third; the split handle sets any width between. */}
            <button
              onClick={() => setWidth(half ? '33.3333vw' : '50vw')}
              aria-label={half ? 'Make the panel a third of the window' : 'Make the panel half the window'}
              className="hidden shrink-0 rounded-lg p-1.5 text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)] sm:flex"
            >
              {half ? <Columns3 className="h-4 w-4" /> : <Columns2 className="h-4 w-4" />}
            </button>
            <AnimateOnHover>
            <button
              onClick={close}
              aria-label="Close the panel"
              className="shrink-0 rounded-lg p-1.5 text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)]"
            >
              <X className="h-4 w-4" />
            </button>
            </AnimateOnHover>
          </div>

          {/* Dev Comments and Settings fill the body above the footer and scroll inside themselves. */}
          {devSub && DevToolsSubView ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <DevToolsSubView sub={devSub} />
            </div>
          ) : (
          <div className="no-scrollbar flex-1 overflow-y-auto">
            {/* min-h-full + flex-col so the Visit footer's mt-auto can pin it
                to the panel's bottom edge when the content runs short. */}
            <div className="flex min-h-full flex-col">
            {view.kind === 'result' ? (
              <ResultView r={view} />
            ) : view.kind === 'block' ? (
              <BlockView blockKey={view.key} />
            ) : view.kind === 'blocks' ? (
              <BlocksView q={q} />
            ) : view.kind === 'box' ? (
              box ? <BoxView boxKey={view.key} /> : null
            ) : view.kind === 'data' ? (
              <DataView view={view} q={q} onGo={setView} />
            ) : view.kind === 'aws-register' ? (
              <AwsRegister plan={view.plan} signedIn={view.signedIn} />
            ) : view.kind === 'aws-console' ? (
              <AwsConsole sub={view.sub} />
            ) : channel ? (
              /* ── CHANNEL VIEW ────────────────────────────────────────── */
              <>
                <div className="border-b border-[var(--paper-rule)] px-5 py-6">
                  <h2 className="text-[26px] leading-none text-[var(--paper-text)]" style={SERIF}>{channel.name}</h2>
                  <p className="mt-3 text-[13px] leading-[1.6] text-[var(--paper-muted)]" style={SANS}>{channel.blurb}</p>
                </div>

                {/* Discord gets the digest LIVE. The channel holds snapshots of
                    what was true when the job ran; this answers for right now,
                    off the same tables. */}
                {view.kind === 'channel' && view.id === 'discord' && (
                  digest.ok ? (
                    <>
                      <div className="border-b border-[var(--paper-rule)] px-5 py-6">
                        <p className="leading-none tabular-nums text-[var(--paper-strong)]" style={{ ...MONO, fontSize: 'clamp(2.2rem,5vw,3rem)' }}>
                          <CountUp {...countProps(digest.documents24h)} duration={900} />
                        </p>
                        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>
                          new documents · last 24 hours
                        </p>
                        <p className="mt-4 text-[12px] leading-[1.7] text-[var(--paper-muted)]" style={SANS}>
                          {fmt(digest.totals.documents)} documents · {fmt(digest.totals.patents)} patents ·{' '}
                          {fmt(digest.totals.models)} models · {fmt(digest.totals.benchmarks)} benchmarks
                        </p>
                      </div>

                      {digest.topics.filter(t => t.count > 0).map(t => (
                        <div key={t.topic} className="border-b border-[var(--paper-rule)] px-5 py-5">
                          {/* The written-out name leads; the code stays because
                              arXiv names are not unique (cs.LG and stat.ML are
                              both "Machine Learning" and both turn up in the
                              same nightly six). Looser tracking than the other
                              mono labels — a 46-character name at 0.24em wraps
                              to three lines in a 423px panel. */}
                          <p className="text-[10px] uppercase leading-[1.5] tracking-[0.12em] text-[var(--paper-faint)]" style={MONO}>
                            {t.label} — {fmt(t.count)} new
                          </p>
                          <ul className="mt-3 space-y-2">
                            {t.recent.map(d => (
                              <li key={d.slug}>
                                {/* ⚠ `.link-wipe` explicitly, not by inheritance: this panel
                                    PORTALS to document.body, outside <main>, so no prose-link
                                    rule can reach it. Any text link rendered inside this panel
                                    has to carry the class itself. */}
                                <Link
                                  href={`${SITE}/library/${encodeURIComponent(d.slug)}`}
                                  className="block text-[13px] leading-[1.45] text-[var(--paper-text)] transition-colors hover:text-[var(--paper-strong)]"
                                  style={SANS}
                                >
                                  <span className="link-wipe">{d.title || d.slug}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={MONO}>
                            five most recent
                          </p>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="px-5 py-6 text-[13px] text-[var(--paper-muted)]" style={SANS}>
                      Tonight&rsquo;s numbers aren&rsquo;t available right now. The channel has the last posted digest.
                    </p>
                  )
                )}
              </>
            ) : product && devTools && DevToolsEntry && view.kind === 'product' ? (
              /* ── DEV TOOLS (the dev server's) ───────────────────────── */
              <DevToolsEntry q={q} onSub={sub => setView({ kind: 'product', index: view.index, sub })} />
            ) : product ? (
              /* ── PRODUCT VIEW ────────────────────────────────────────── */
              <>
                {/* Hero — the headline figure leads in the product's accent,
                    with the description directly beneath it. The product's
                    NAME lives in the Visit footer; its DOMAIN is the header. */}
                {/* An API's page is its endpoint list alone. */}
                {!product.catalog && (
                <div className="border-b border-[var(--paper-rule)] px-5 py-6">
                  <p
                    className="leading-none tabular-nums"
                    style={{ ...MONO, fontSize: 'clamp(2.2rem,5vw,3rem)', color: product.accent }}
                  >
                    <CountUp {...countProps(product.value)} duration={900} />
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--paper-faint)]" style={SANS}>
                    {product.unit}
                  </p>
                  <p className="mt-4 text-[13px] leading-[1.6] text-[var(--paper-muted)]" style={SANS}>
                    {product.body}
                  </p>
                </div>
                )}

                {/* Sub-stats — a ruled 2-col grid, the masthead ledger's idiom
                    at panel scale. Only cards carrying measured breakdowns
                    render it (today: Artificial Intelligence). Sorted here,
                    large → small in reading order (ruling 2026-08-24), so the
                    data file can keep its entries grouped however it likes.
                    Each cell is a LINK to the surface holding that layer, with
                    the home cards' hover treatment: accent tint, the figure
                    taking the accent, and an ↗ in the corner. */}
                {product.catalog ? (
                  <SwitchboardApiList key={product.catalog} dataset={product.catalog} />
                ) : product.stats && product.stats.length > 0 && (
                  <div
                    className="grid grid-cols-2"
                    style={{
                      '--stat-accent': product.accent,
                      /* 5%, exactly the home cards' --accent-tint mix. */
                      '--stat-tint': `color-mix(in oklab, ${product.accent} 5%, var(--paper))`,
                    } as React.CSSProperties}
                  >
                    {[...product.stats].sort((a, b) => b.value - a.value).map((s, i, arr) => (
                      /* The home cards' hover, verbatim: accent tint on the
                         cell, value AND label take the accent, the ↗ carries
                         the p-2 rounded-full chrome with the muted bg on its
                         own hover, and the figure re-counts on each hover
                         (CountUp trigger="view-hover" — attaches to this
                         <Link> itself). */
                      <Link
                        key={s.unit}
                        {...(s.href ? linkProps(s.href) : { href: '#', onClick: (e: React.MouseEvent) => e.preventDefault() })}
                        className={`group/stat relative block border-b border-[var(--paper-rule)] px-5 py-6 transition-colors hover:bg-[var(--stat-tint)] ${i % 2 === 0 ? 'border-r' : ''} ${
                          i === arr.length - 1 && arr.length % 2 === 1 ? 'col-span-2 !border-r-0' : ''
                        }`}
                      >
                        <span
                          className="absolute right-3 top-3 flex items-center justify-center rounded-full p-2 opacity-0 transition-[opacity,background-color] duration-200 hover:bg-[var(--paper-rule-soft)] group-hover/stat:opacity-100"
                        >
                          <ArrowUpRight className="h-4 w-4 text-[var(--stat-accent)]" />
                        </span>
                        <p
                          className="leading-none tabular-nums text-[var(--paper-text)] transition-colors group-hover/stat:text-[var(--stat-accent)]"
                          style={{ ...MONO, fontSize: 'clamp(1.7rem,3.6vw,2.2rem)' }}
                        >
                          <CountUp {...countProps(s.value)} duration={900} trigger="view-hover" />
                        </p>
                        <p
                          className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--paper-faint)] transition-colors group-hover/stat:text-[var(--stat-accent)]"
                          style={SANS}
                        >
                          {s.unit}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* ── MENU VIEW ───────────────────────────────────────────── */
              <>
                {/* 2026-11-19: the menu drills down. The sources (NYSgpt, then A to Z); a source opens its sets; a set opens
                    its listings, A to Z. A search lists every matching listing at once. */}
                {(() => {
                  const open = (b: Box) => (b.kind === 'data' ? openData(b.title) : b.kind === 'tables' ? openData(b.group) : openBox(boxKey(b)))
                  const backRow = (label: string, to: { source?: string; set?: string }) => (
                    <button onClick={() => setAt(to)} className={`${ROW} sticky top-0 z-[1] bg-[var(--paper)]`}>
                      <ArrowLeft className={GLYPH} />
                      <span className={LABEL} style={SERIF}>{label}</span>
                    </button>
                  )
                  if (q) return LISTINGS.filter(b => match(q, b.title)).map(b => <ListingRow key={boxKey(b)} b={b} onClick={() => open(b)} />)
                  const sets = LISTING_GROUPS.filter(g => g.source === at.source)
                  const set = sets.find(g => g.set === at.set)
                  if (set) return (
                    <>
                      {backRow(`${set.source}: ${set.set}`, { source: set.source })}
                      {set.items.map(b => <ListingRow key={boxKey(b)} b={b} onClick={() => open(b)} />)}
                    </>
                  )
                  if (sets.length) return (
                    <>
                      {backRow(sets[0].source, {})}
                      {sets.map(g => (
                        <button key={g.set} onClick={() => setAt({ source: g.source, set: g.set })} className={ROW}>
                          <ListingMark b={g.items[0]} />
                          <span className={LABEL} style={SERIF}>{g.set}</span>
                          <span className="hm-count">{g.items.length.toLocaleString('en-US')}</span>
                          <Arrow />
                        </button>
                      ))}
                    </>
                  )
                  const sources = [...new Set(LISTING_GROUPS.map(g => g.source))]
                  // Slack, Discord, Blocks and Dev Tools lead the menu (back on Brendan's word, 2026-11-19); Dev Tools on the dev server alone
                  const dev = DevToolsEntry ? cards.findIndex(c => c.title === DEV_TOOLS) : -1
                  const lead = (label: string, icon: React.ReactNode, go: () => void) => (
                    <button key={label} onClick={go} className={ROW}>
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--paper-text)] [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
                      <span className={LABEL} style={SERIF}>{label}</span>
                      <Arrow />
                    </button>
                  )
                  /* eslint-disable @next/next/no-img-element -- 16px brand marks from public/ */
                  const leads = [
                    lead('Slack', <img src="/logos/250px-Slack_icon_2019.svg.png" alt="" className="h-4 w-4 object-contain" />, () => openChannel('slack')),
                    lead('Discord', <img src="/discord-icon.svg" alt="" className="h-4 w-4 object-contain" />, () => openChannel('discord')),
                    lead('Blocks', <Blocks />, () => setView({ kind: 'blocks' })),
                    ...(dev >= 0 ? [lead('Dev Tools', <Wrench />, () => openProduct(dev))] : []),
                  ]
                  /* eslint-enable @next/next/no-img-element */
                  return [...leads, ...sources.map(name => {
                    const mine = LISTING_GROUPS.filter(g => g.source === name)
                    return (
                      <button key={name} onClick={() => setAt({ source: name })} className={ROW}>
                        <ListingMark b={mine[0].items[0]} />
                        <span className={LABEL} style={SERIF}>{name}</span>
                        <span className="hm-count">{mine.reduce((n, g) => n + g.items.length, 0).toLocaleString('en-US')}</span>
                        <Arrow />
                      </button>
                    )
                  })]
                })()}
              </>
            )}

            {/* STICKY, not a sibling. A `shrink-0` footer outside the scroll
                region stops the content ABOVE it; sticky keeps it pinned to the
                bottom while the cards run underneath, which is the ask. The
                translucent background plus blur is what makes "underneath"
                legible — an opaque bar would be indistinguishable from a
                sibling. `mt-auto` (against the min-h-full flex wrapper) pins it
                to the panel's bottom edge even when the content runs short —
                the Visit link lives at the bottom, always (ruling 2026-08-24). */}
            {deep && (channel || product!.href) && (
              <div className="sticky bottom-0 z-10 mt-auto border-t border-[var(--paper-rule)] bg-[var(--paper)]/85 backdrop-blur-md">
                {/* ⚠ Branch on WHICH view this is — never `channel?.x ?? product!.x`.
                    `??` only short-circuits on a non-nullish left side, and
                    `sameTab` is undefined for Slack and Discord, so that spelling
                    dereferences a null `product` and throws the whole panel away.
                    The `!` is precisely what hides it from the type checker. */}
                <Link
                  {...(channel ? { href: channel.href } : linkProps(product!.href))}
                  {...((channel ? channel.sameTab : product!.sameTab) ? {} : { target: '_blank', rel: 'noreferrer noopener' })}
                  className="group/visit flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--paper-quiet)]"
                >
                  <span
                    className="min-w-0 flex-1 text-[15px] text-[var(--paper-text)] transition-colors group-hover/visit:text-[var(--paper-strong)]"
                    style={SERIF}
                  >
                    {channel ? `Open ${channel.name}` : `Visit ${product!.title}`}
                  </span>
                  <span className="flex shrink-0 items-center justify-center rounded-full p-2 transition-colors hover:bg-[var(--paper-rule-soft)]">
                    <ArrowUpRight
                      className="h-4 w-4"
                      style={{ color: product ? product.accent : 'var(--paper-strong)' }}
                    />
                  </span>
                </Link>
              </div>
            )}
            </div>
          </div>
          )}

          {/* The panel search, at the panel's foot under a top rule, where the Contact and Data Library footer stood (Brendan, 2026-11-19). */}
          {view.kind !== 'aws-register' && view.kind !== 'aws-console' && !(view.kind === 'data' && view.table != null) && !devSub && (
            <div className="hm-sbs">
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search..." aria-label="Search the panel" />
            </div>
          )}
        </div>
      </aside>
      <SplitHandle open={open} width={width} setWidth={setWidth} />
    </>,
    document.body,
  )
}

/** compact() → CountUp's three props, so callers don't repeat the spread. */
function countProps(value: number) {
  const f = compact(value)
  return { value: f.count, decimals: f.decimals, suffix: f.suffix }
}

const WIDTH_KEY = 'sb-width-2'

/** The panel search's test: every word of the search is in the text. */
function match(q: string, text: string) {
  const t = text.toLowerCase()
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => t.includes(w))
}

/** The panel's menu row and its search test, for the Dev Tools entry's menu (components/dev/devtools-entry.tsx). */
export const PANEL_ROW = { Row, ROW, LABEL, GLYPH, SERIF, match }

/** The box's element on the plate, so the catalog can grow out of it. */
function boxEl(title: string) {
  return document.querySelector<HTMLElement>(`[data-nav="plate"][aria-label="${CSS.escape(title)}: open in the catalog"]`)
}

/**
 * The split between the page and the panel (2026-11-19, from the option 3
 * sketch, after nsrgpt's components/shell.tsx): drag it to set the panel's
 * width, the arrow keys step it, a double-click makes it the half. It sits at
 * the panel's left edge and slides with it; off the right edge when shut.
 */
function SplitHandle({ open, width, setWidth }: { open: boolean; width: string; setWidth: (w: string) => void }) {
  const [drag, setDrag] = useState(false)
  const MIN = 320
  const GAP = 18
  const clamp = (w: number) => Math.max(MIN, Math.min(w, innerWidth - GAP * 3 - MIN))
  return (
    <button
      type="button"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the panels"
      className={`nysgpt-app hm-split ${open ? '' : 'hm-shut'} ${drag ? 'hm-drag' : ''}`}
      onPointerDown={e => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        setDrag(true)
        document.body.classList.add('hm-sbdrag')
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
      }}
      onPointerMove={e => {
        if (drag) document.documentElement.style.setProperty('--sbw', `${clamp(innerWidth - 27 - e.clientX)}px`)
      }}
      onPointerUp={() => {
        if (!drag) return
        setDrag(false)
        document.body.classList.remove('hm-sbdrag')
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        setWidth(document.documentElement.style.getPropertyValue('--sbw') || width)
      }}
      onDoubleClick={() => setWidth('50vw')}
      onKeyDown={e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        e.preventDefault()
        const cur = document.querySelector<HTMLElement>('aside.hm-sbanim')?.getBoundingClientRect().width ?? MIN
        setWidth(`${clamp(cur + (e.key === 'ArrowLeft' ? 24 : -24))}px`)
      }}
    >
      <span />
    </button>
  )
}

/**
 * The Blocks view (2026-11-19, ported from pax2 components/discussion-panel.tsx
 * BlocksShelf by way of the option 3 sketch): the boxes added with the
 * three-dot menu, as square tiles. The columns come from the panel's width (at
 * least 120px a tile, 3 to 6 across); empty dashed slots fill the rest of the
 * panel's height. A tile stays in the slot it is dropped in, gaps included
 * (2026-11-19); dropped on another tile, the two change places. A tile wears
 * its box's colour and logo. An empty slot turns blue with a plus under the
 * mouse, and a click asks for the command palette. A tile opens its box; its
 * × takes it off the shelf.
 */
function BlocksView({ q }: { q: string }) {
  const st = useHome()
  const all = shelfItems(st)
  const slots = shelfSlots(st)
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const { close, setView } = useSwitchboard()

  useEffect(() => {
    const el = ref.current?.closest('.overflow-y-auto') as HTMLElement | null
    if (!el) return
    const fit = () => setSize({ w: el.clientWidth, h: el.clientHeight - 42 })
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const GAPX = 10
  const w = Math.max(0, size.w - 40)
  const cols = Math.min(6, Math.max(3, Math.floor((w + GAPX) / (120 + GAPX))))
  const side = (w - GAPX * (cols - 1)) / cols
  // Enough rows to fill the panel and to hold the lowest tile, and one spare row to arrange into.
  const last = Math.max(-1, ...slots.values())
  const rows = Math.max(Math.ceil((last + 1) / cols) + 1, side > 0 ? Math.ceil((size.h - 40 + GAPX) / (side + GAPX)) : 0)
  const bySlot = new Map([...slots.entries()].map(([k, v]) => [v, k]))
  const byKey = new Map(all.map(x => [x.key, x]))
  // A search shows its matches side by side; without one, every tile sits in its own slot.
  const cells: (ShelfItem | number)[] = q
    ? all.filter(x => match(q, x.title))
    : Array.from({ length: rows * cols }, (_, i) => (bySlot.has(i) ? byKey.get(bySlot.get(i)!)! : i))

  const openTile = (s: ShelfItem) => {
    // Brief 52: a block that carries a payload opens it here; a plain Block (a Tables box added before payloads, too) goes to its box as before.
    if (hasPayload(s)) return setView({ kind: 'block', key: s.key })
    // a Block saved under a set that no longer exists (brief 59 renamed the four sources' sets) has no box to go to
    if (!BOXES.some(b => boxKey(b) === s.key)) return
    home.showSet(s.set)
    if (innerWidth < 640) close()
    window.setTimeout(() => {
      const el = boxEl(s.title)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      el.click()
    }, 60)
  }
  const drop = (slot: number) => (e: React.DragEvent) => {
    if (!dragKey) return
    e.preventDefault()
    e.stopPropagation()
    home.placeShelf(dragKey, slot)
    setDragKey(null)
    setOver(null)
  }

  return (
    <div ref={ref} className="hm-shelf" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {cells.map(c => {
        if (typeof c === 'number')
          return (
            <button
              type="button"
              key={`e${c}`}
              className={`hm-sempty ${over === c ? 'hm-over' : ''}`}
              aria-label="Add a block here"
              title="Add a block"
              // The command palette (brief 47) listens for this and puts what the reader picks in this slot.
              onClick={() => window.dispatchEvent(new CustomEvent('nysgpt:cmdk', { detail: { slot: c, source: 'blocks' } }))}
              onDragOver={e => {
                if (!dragKey) return
                e.preventDefault()
                if (over !== c) setOver(c)
              }}
              onDragLeave={() => setOver(o => (o === c ? null : o))}
              onDrop={drop(c)}
            >
              <Icon name="plus" />
            </button>
          )
        const s = c
        const box = BOXES.find(b => boxKey(b) === s.key)
        const slot = slots.get(s.key) ?? 0
        return (
          <div
            key={s.key}
            className={`hm-stile ${dragKey === s.key ? 'hm-drag' : ''}`}
            draggable
            role="button"
            tabIndex={0}
            aria-label={`Open ${s.title}`}
            onClick={() => openTile(s)}
            onKeyDown={e => {
              if (e.key === 'Enter') openTile(s)
            }}
            onDragStart={e => {
              setDragKey(s.key)
              e.dataTransfer.effectAllowed = 'copyMove'
              try {
                e.dataTransfer.setData('text/plain', s.key)
                // Brief 49: the same tile dropped on /chat attaches there (lib/shelf-drag.ts, components/chat/chat.tsx).
                setShelfDrag(e.dataTransfer, { kind: 'box', key: s.key, title: s.title, set: s.set, group: s.group })
              } catch {}
            }}
            onDragOver={e => {
              if (dragKey) e.preventDefault()
            }}
            onDrop={drop(slot)}
            onDragEnd={() => {
              setDragKey(null)
              setOver(null)
            }}
            style={{ '--type': TYPE_COLOR[s.set] } as React.CSSProperties}
          >
            <span className="hm-sic">
              {box?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- a 16px logo from public/
                <img src={box.logo} alt="" />
              ) : (
                <TypeIcon icon={box?.icon ?? (s.set === 'api' ? 'plug' : 'db')} />
              )}
            </span>
            <span className="hm-sl">{s.title}</span>
            <span className="hm-sm">{KIND_NOUN[s.set] ?? s.group}</span>
            <button
              type="button"
              className="hm-sx"
              aria-label={`Take ${s.title} off the shelf`}
              onClick={e => {
                e.stopPropagation()
                home.removeShelf(s.key)
              }}
            >
              <Icon name="x" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/** A model, platform or tool in the panel: its name and text, its figure or label, its facts, and a way into the catalog. */
function BoxView({ boxKey: key }: { boxKey: string }) {
  const b = BOXES.find(x => boxKey(x) === key)
  if (!b) return null
  const ent = b.kind === 'data' ? undefined : SET_INFO[b.kind].find(t => t.table === b.title && t.database === b.group)
  return (
    <>
      <div className="border-b border-[var(--paper-rule)] px-5 py-6">
        <h2 className="text-[22px] leading-[1.15] text-[var(--paper-text)] [overflow-wrap:anywhere]" style={SERIF}>{b.title}</h2>
        <p className="mt-3 text-[13px] leading-[1.6] text-[var(--paper-muted)]" style={SANS}>{b.body}</p>
      </div>
      {b.foot && (
        <div className="border-b border-[var(--paper-rule)] px-5 py-6">
          <p className="m-0 leading-none tabular-nums" style={{ ...MONO, fontSize: 'clamp(2.2rem,5vw,3rem)', color: TYPE_COLOR[b.kind] }}>{b.foot}</p>
        </div>
      )}
      {ent && ent.fields.length > 0 && (
        <FieldsTable fields={ent.fields.map(f => ({ name: f.name, type: '', desc: f.desc, sample: '' }))} style={{ margin: '16px 20px 0', width: 'calc(100% - 40px)' }} />
      )}
      <p className="p-5">
        <button
          type="button"
          className="hm-boxopen"
          onClick={() => home.openOverlay({ set: b.kind, product: b.group, from: boxEl(b.title)?.getBoundingClientRect() ?? null })}
        >
          Open in the catalog
        </button>
      </p>
    </>
  )
}

/** The data in the panel: the databases, a database's tables, then one table's fields (the table button shows its sample rows). */
function DataView({ view, q, onGo }: { view: { db?: string; table?: number; rows?: boolean }; q: string; onGo: (v: View) => void }) {
  const [cat, setCat] = useState<{ dbs: string[]; tables: Table[] } | null | 'loading'>('loading')
  useEffect(() => {
    let live = true
    loadCatalog().then(c => {
      if (live) setCat(c)
    })
    return () => {
      live = false
    }
  }, [])
  if (cat === 'loading') return <p className="hm-cnote" style={{ padding: 20 }}>Loading the catalog…</p>
  if (!cat) return <p className="hm-cnote" style={{ padding: 20 }}>The catalog did not load.</p>

  const by = new Map<string, Table[]>()
  for (const t of cat.tables) by.set(t.database, [...(by.get(t.database) ?? []), t])

  if (view.db && view.table != null) {
    const t = (by.get(view.db) ?? [])[view.table]
    if (!t) return <p className="hm-cnote" style={{ padding: 20 }}>No tables in this database.</p>
    return <TableDetail key={`${view.db}/${view.table}`} t={t} rows={!!view.rows} panel onRows={() => onGo({ kind: 'data', db: view.db, table: view.table, rows: !view.rows })} />
  }
  const row = (label: string, count: string, go: () => void, key: string) => (
    <AnimateOnHover key={key}>
    <button onClick={go} className={ROW}>
      <span className={LABEL} style={SERIF}>{label}</span>
      <span className="hm-count">{count}</span>
      <Arrow />
    </button>
    </AnimateOnHover>
  )
  if (view.db) {
    const l = by.get(view.db) ?? []
    return (
      <>
        <div className="border-b border-[var(--paper-rule)] px-5 py-6">
          <h2 className="text-[26px] leading-none text-[var(--paper-text)]" style={SERIF}>{view.db}</h2>
          <p className="mt-3 text-[13px] leading-[1.6] text-[var(--paper-muted)]" style={SANS}>{l.length} tables</p>
        </div>
        {l.map((t, i) => match(q, t.table) && row(t.table, t.rows != null ? compactNum(t.rows) : '', () => onGo({ kind: 'data', db: view.db, table: i }), `${i}`))}
      </>
    )
  }
  return (
    <>
      <div className="border-b border-[var(--paper-rule)] px-5 py-6">
        <h2 className="text-[26px] leading-none text-[var(--paper-text)]" style={SERIF}>Data</h2>
        <p className="mt-3 text-[13px] leading-[1.6] text-[var(--paper-muted)]" style={SANS}>
          {by.size} databases · {cat.tables.length.toLocaleString('en-US')} tables
        </p>
      </div>
      {[...by.entries()].map(([db, l]) => match(q, db) && row(db, String(l.length), () => onGo({ kind: 'data', db }), db))}
    </>
  )
}

/** Rows for the panel's result view (brief 51). */
export type PanelResult = { title: string; subtitle?: string; columns: string[]; rows: unknown[][]; json?: string; note?: string }

/** The result view: the title and note, the rows in the panel's row table, and the JSON with a Copy button. */
function ResultView({ r }: { r: PanelResult }) {
  const [copied, setCopied] = useState(false)
  const cell = (v: unknown) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))
  return (
    <div className="hm-panel">
      <div className="border-b border-[var(--paper-rule)] px-5 py-6">
        <h2 className="text-[22px] leading-[1.15] text-[var(--paper-text)] [overflow-wrap:anywhere]" style={SERIF}>{r.title}</h2>
        {r.subtitle && <p className="hm-om">{r.subtitle}</p>}
        {r.note && <p className="mt-3 text-[13px] leading-[1.6] text-[var(--paper-muted)]" style={SANS}>{r.note}</p>}
      </div>
      {r.columns.length > 0 && (
        <div className="overflow-x-auto">
          <table className="hm-rows">
            <thead>
              <tr>{r.columns.map(c => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {r.rows.map((row, i) => (
                <tr key={i}>{row.map((v, j) => <td key={j} title={cell(v)}>{cell(v)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {r.json && (
        <div className="px-5 pb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="hm-om m-0">JSON</span>
            <button
              type="button"
              className="hm-boxopen"
              onClick={() => {
                void navigator.clipboard?.writeText(r.json!)
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="max-h-[50vh] overflow-auto rounded-lg border border-[var(--paper-rule-soft)] p-3 text-[11px] leading-[1.5] text-[var(--paper-text)]" style={MONO}>{r.json}</pre>
        </div>
      )}
    </div>
  )
}
