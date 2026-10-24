'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { X, ChevronRight, ArrowLeft, ArrowRight, Columns2, Columns3, Sparkles, ArrowUpRight } from 'lucide-react'
import { CountUp } from '@/components/CountUp'
import { compact } from '@/lib/compact'
import { useProductStatus } from '@/components/ProductStatus'
import type { HomeCardData } from '@/lib/home-data'
import { SwitchboardApiList } from './SwitchboardApiList'
import { AwsConsole, AwsRegister, type AwsPlan, type AwsSubscription } from './MarketplaceViews'
import type { Digest } from '@/lib/digest'

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

const INTRO =
  'AI built to spec. Deploy agentic teams or a full Agentic OS, on-prem or in the cloud. ' +
  'Add a custom AI platform with RAG, or subscribe via MCP or API. Purpose-trained agents ' +
  'and fine-tuned models on request.'

/** An AWS Marketplace buyer's view: registration after subscribing, or their console. */
export type AwsView =
  | { kind: 'aws-register'; plan: AwsPlan; signedIn: string | null }
  | { kind: 'aws-console'; sub: AwsSubscription }

/** `channel` is the Slack / Discord / Ask drill-down; `product` is one card. */
type View =
  | { kind: 'menu' }
  | { kind: 'product'; index: number }
  | { kind: 'channel'; id: ChannelId }
  | AwsView

export type ChannelId = 'slack' | 'discord' | 'ask'

type Ctx = {
  open: boolean
  /** Wide mode. Lives here, not in the panel, because SwitchboardShell sizes the
   *  page's padding from it — the push has to match the panel's actual width. */
  expanded: boolean
  setExpanded: (fn: (v: boolean) => boolean) => void
  view: View
  cards: HomeCardData[]
  digest: Digest
  toggle: () => void
  close: () => void
  openMenu: () => void
  openProduct: (index: number) => void
  openChannel: (id: ChannelId) => void
  openAws: (view: AwsView) => void
}

const PanelCtx = createContext<Ctx | null>(null)

export function useSwitchboard() {
  const ctx = useContext(PanelCtx)
  if (!ctx) throw new Error('useSwitchboard must be used inside <SwitchboardProvider>')
  return ctx
}

export function SwitchboardProvider({ cards, digest, children }: { cards: HomeCardData[]; digest: Digest; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState<View>({ kind: 'menu' })

  const close = useCallback(() => setOpen(false), [])
  const openMenu = useCallback(() => { setView({ kind: 'menu' }); setOpen(true) }, [])
  const openProduct = useCallback((index: number) => { setView({ kind: 'product', index }); setOpen(true) }, [])
  const openChannel = useCallback((id: ChannelId) => { setView({ kind: 'channel', id }); setOpen(true) }, [])
  const openAws = useCallback((v: AwsView) => { setView(v); setOpen(true) }, [])
  // Toggle always returns to the menu, so the trigger is a switch rather than a
  // way to resume wherever you happened to leave off.
  const toggle = useCallback(() => setOpen(v => { if (!v) setView({ kind: 'menu' }); return !v }), [])

  return (
    <PanelCtx.Provider value={{ open, expanded, setExpanded, view, cards, digest, toggle, close, openMenu, openProduct, openChannel, openAws }}>
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
  const { open, expanded } = useSwitchboard()
  return (
    <div
      className={`transition-[padding] duration-300 ease-in-out ${
        open ? (expanded ? 'sm:pr-[calc(50vw+18px)]' : 'sm:pr-[441px]') : ''
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

/** A plain row: the whole thing drills down. Used by the ten products. */
function Row({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={ROW}>
      <span className={LABEL} style={SERIF}>{children}</span>
      <ChevronRight className={GLYPH} />
    </button>
  )
}

/**
 * A channel row — Slack, Discord, Ask NYSgpt — which has TWO destinations:
 * drill INTO the panel, or leave for the service.
 *
 * So it cannot be one `<Link>`. The row and its `Open` chip are a button that
 * pushes the next view; the ↗ is a separate anchor that leaves. Nesting an
 * anchor inside a link would be invalid HTML and would make the whole row
 * ambiguous to a keyboard user, which is the actual reason for the split rather
 * than the styling.
 *
 * The ↗ carries the circular hover chrome the home cards use, so "this is a
 * target" reads the same in both places.
 */
function ChannelRow({
  children, icon, onOpen, href, sameTab,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  onOpen: () => void
  href: string
  sameTab?: boolean
}) {
  return (
    /* Same ROW as every other row — same px-5 py-4, so the height matches the
       products exactly. The two children add NO vertical padding of their own:
       the arrow's tap target comes from p-2 cancelled by -my-2, which grows the
       hit area without growing the row. Splitting the row must not resize it. */
    <div className={ROW}>
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="shrink-0 text-[var(--paper-faint)]">{icon}</span>
        <span className={LABEL} style={SERIF}>{children}</span>
        <span
          className="shrink-0 rounded-full border border-[var(--paper-rule)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--paper-faint)] transition-colors group-hover/row:border-[var(--paper-strong)] group-hover/row:text-[var(--paper-strong)]"
          style={MONO}
        >
          Open
        </span>
      </button>
      <Link
        href={href}
        {...(sameTab ? {} : { target: '_blank', rel: 'noreferrer noopener' })}
        aria-label="Open externally"
        onClick={e => e.stopPropagation()}
        className="-my-2 flex shrink-0 items-center justify-center rounded-full p-2 transition-colors hover:bg-[var(--paper-rule-soft)]"
      >
        <span className="relative h-4 w-4">
          <ArrowRight className={`${GLYPH} absolute inset-0 opacity-100 group-hover/row:opacity-0`} />
          <ArrowUpRight className={`${GLYPH} absolute inset-0 opacity-0 group-hover/row:opacity-100`} />
        </span>
      </Link>
    </div>
  )
}

function SwitchboardPanel() {
  const { open, expanded, setExpanded, view, cards, digest, close, openMenu, openProduct, openChannel } = useSwitchboard()
  const [mounted, setMounted] = useState(false)
  const { linkProps } = useProductStatus()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (view.kind === 'product' || view.kind === 'channel') openMenu()
      else close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, view, close, openMenu])

  if (!mounted) return null

  const product = view.kind === 'product' ? cards[view.index] : null
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
  const title = awsTitle ?? (product ? (product.domain ?? (product.href ? product.href.replace(/^https?:\/\//, '') : product.title)) : channel?.name ?? 'Switchboard')

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
        className={`nysgpt-app fixed z-[60] inset-y-0 right-0 w-full sm:inset-y-[18px] sm:right-[18px] sm:left-auto transition-transform duration-300 ease-in-out ${
          expanded ? 'sm:w-[50vw]' : 'sm:w-[423px]'
        } ${open ? 'translate-x-0' : 'translate-x-full sm:translate-x-[calc(100%+18px)] pointer-events-none'}`}
      >
        <div className="flex h-full flex-col overflow-hidden border-l border-[var(--paper-rule)] bg-[var(--paper)] shadow-[0_4px_32px_rgba(0,0,0,0.18)] sm:rounded-2xl sm:border">

          {/* Header — the dot becomes a back arrow one level down, and the title
              becomes the product name. That IS the navigation affordance. */}
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--paper-rule)] px-5 py-4">
            {deep ? (
              <button
                onClick={openMenu}
                aria-label="Back to the switchboard"
                className="shrink-0 rounded-lg p-1.5 text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <span className="shrink-0 pl-1"><LiveDot /></span>
            )}
            <span className="min-w-0 flex-1 truncate text-[var(--paper-text)]" style={{ ...SERIF, fontSize: 17 }}>
              {title}
            </span>
            <button
              onClick={() => setExpanded(v => !v)}
              aria-label={expanded ? 'Narrow the panel' : 'Widen the panel'}
              className="hidden shrink-0 rounded-lg p-1.5 text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)] sm:flex"
            >
              {expanded ? <Columns3 className="h-4 w-4" /> : <Columns2 className="h-4 w-4" />}
            </button>
            <button
              onClick={close}
              aria-label="Close the panel"
              className="shrink-0 rounded-lg p-1.5 text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto">
            {/* min-h-full + flex-col so the Visit footer's mt-auto can pin it
                to the panel's bottom edge when the content runs short. */}
            <div className="flex min-h-full flex-col">
            {view.kind === 'aws-register' ? (
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
                <div className="border-b border-[var(--paper-rule)] px-5 py-6">
                  <h2 className="text-[26px] leading-none text-[var(--paper-text)]" style={SERIF}>NYSgpt</h2>
                  <p className="mt-3 text-[13px] leading-[1.6] text-[var(--paper-muted)]" style={SANS}>{INTRO}</p>
                </div>

                {/* lucide ships no Slack or Discord mark, so both are brand
                    assets from /public — the same files 44B's panel uses, which
                    keeps the two panels identical. */}
                <ChannelRow
                  icon={<img src="/logos/250px-Slack_icon_2019.svg.png" alt="" className="h-4 w-4 shrink-0 object-contain" />}
                  onOpen={() => openChannel('slack')}
                  href={CHANNELS.slack.href}
                >
                  Slack
                </ChannelRow>
                <ChannelRow
                  icon={<img src="/discord-icon.svg" alt="" className="h-4 w-4 shrink-0 object-contain" />}
                  onOpen={() => openChannel('discord')}
                  href={CHANNELS.discord.href}
                >
                  Discord
                </ChannelRow>
                <ChannelRow
                  icon={<Sparkles className="h-4 w-4" />}
                  onOpen={() => openChannel('ask')}
                  href={CHANNELS.ask.href}
                  sameTab
                >
                  Ask NYSgpt
                </ChannelRow>

                <p className="px-5 pb-2 pt-5 text-[10px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={MONO}>
                  Products
                </p>

                {cards.map((c, i) => (
                  <Row key={c.href + c.title} onClick={() => openProduct(i)}>{c.title}</Row>
                ))}
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
        </div>
      </aside>
    </>,
    document.body,
  )
}

/** compact() → CountUp's three props, so callers don't repeat the spread. */
function countProps(value: number) {
  const f = compact(value)
  return { value: f.count, decimals: f.decimals, suffix: f.suffix }
}
