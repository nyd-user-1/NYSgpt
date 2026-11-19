'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { BOXES, OWN_KINDS, TYPE_COLOR, type Box } from '@/lib/home-boxes'
import { boxKey, home, sortBoxes, useHome } from '@/lib/home-store'
import { useSwitchboard } from '@/components/SwitchboardPanel'
import { Icon, TypeIcon } from './HomeIcons'
import { AnimateOnHover } from '@/components/animate-on-hover'

// The Inspector's overlay loads when a reader turns it on, not with the page.
const InspectorMode = dynamic(() => import('./InspectorMode').then(m => m.InspectorMode), { ssr: false })

/**
 * The contents plate (2026-11-19, brief 43, from the option 3 sketch).
 *
 * One rounded frame holds one set's boxes (data, models, platforms or tools)
 * or, in the all view, every box: two rows, scrolling sideways, five columns
 * to the frame on desktop (four, three, two, one as the page narrows). Pinned
 * boxes come first, then A to Z.
 *
 *  - a box opens the catalog overlay on its database (a data box) or its
 *    group (a model, platform or tool);
 *  - its footer carries the type icon and a button that opens the box in the
 *    right panel;
 *  - its three-dot menu pins it to the top, makes it a favorite, adds it to
 *    Blocks, opens it in the catalog or copies its name;
 *  - the arrow keys move a selection through the masthead and the boxes
 *    (ported from nsrgpt plate-keys.tsx: rows by position, the nearest box
 *    going up or down, a box on another page brings that page into view);
 *    Enter opens, Escape clears the selection and then returns to the all view.
 *
 * Before this the plate was HomeContents: the platforms, tools and APIs on one
 * rail, a Dev Tools frame and a models frame, each box opening a dialog.
 */

const PAGE = 5

export function HomePlate() {
  const { set, pins, favs, shelf, overlay } = useHome()
  const { open: panelOpen, openBox, openData, openBlocks } = useSwitchboard()
  // Two rows, always (Brendan, 2026-11-19). A box is keyed by its set and name; two boxes with one key leave stray
  // boxes behind when the set changes, which once pushed the plate to a third row, so a repeat is dropped here too.
  const boxes = useMemo(() => {
    const seen = new Set<string>()
    return sortBoxes(
      BOXES.filter(b => (set ? b.kind === set : OWN_KINDS.includes(b.kind)) && !seen.has(boxKey(b)) && !!seen.add(boxKey(b))),
      pins,
    )
  }, [set, pins])
  const columns = Math.ceil(boxes.length / 2)
  const pin = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = useState<{ box: Box; at: DOMRect } | null>(null)
  /* the menu opened by hover closes a moment after the mouse leaves the button and the menu */
  const leave = useRef<number | undefined>(undefined)

  const [inspecting, setInspecting] = useState(false)

  // A new set starts at its first page.
  useEffect(() => {
    pin.current?.scrollTo({ left: 0, behavior: 'smooth' })
  }, [set])

  const openCatalog = (b: Box, el: HTMLElement) =>
    // a table box opens the catalog on its database, at that table
    b.kind === 'tables'
      ? home.openOverlay({ set: 'data', product: b.group, table: b.title, from: el.getBoundingClientRect() })
      : home.openOverlay({ set: b.kind, product: b.kind === 'data' ? b.title : b.group, from: el.getBoundingClientRect() })
  const openPanel = (b: Box) => (b.kind === 'data' ? openData(b.title) : b.kind === 'tables' ? openData(b.group) : openBox(boxKey(b)))

  /* ── the arrow keys ── */
  const panelRef = useRef(panelOpen)
  const overlayRef = useRef(overlay.open)
  const setRef = useRef(set)
  useEffect(() => {
    panelRef.current = panelOpen
    overlayRef.current = overlay.open
    setRef.current = set
  }, [panelOpen, overlay.open, set])
  useEffect(() => {
    let cur: HTMLElement | null = null
    const ON = 'data-nav-on'
    const all = () => [...document.querySelectorAll<HTMLElement>('[data-nav]')].filter(e => e.getClientRects().length)
    const top = (el: Element) => Math.round(el.getBoundingClientRect().top)
    const left = (el: Element) => el.getBoundingClientRect().left
    const mid = (el: Element) => {
      const r = el.getBoundingClientRect()
      return r.left + r.width / 2
    }
    const typing = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
    }
    /** A box's page of five within its row, so a move to another page brings that whole page into view. */
    const pageOf = (el: HTMLElement | null) => {
      if (!el || el.dataset.nav !== 'plate' || !el.parentElement) return null
      const y = top(el)
      const row = [...el.parentElement.children].filter(c => top(c) === y).sort((p, q) => left(p) - left(q))
      const i = row.indexOf(el)
      return { start: row[Math.floor(i / PAGE) * PAGE] as HTMLElement, n: Math.floor(i / PAGE) }
    }
    const sel = (el: HTMLElement | null) => {
      const prev = cur
      cur?.removeAttribute(ON)
      // brief 50: a box left by the keyboard stops its icons' motion; the one reached plays it, as under the mouse
      cur?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: null }))
      cur?.removeAttribute('data-corner')
      cur = el
      if (!el) return
      el.setAttribute(ON, '')
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null }))
      // A box in the first or last column of its page sits in a corner of the frame: mark it so its ring takes the frame curve.
      if (el.dataset.nav === 'plate' && el.parentElement) {
        const kids = [...el.parentElement.children]
        const y = top(el)
        const row = kids.filter(c => top(c) === y).sort((p, q) => left(p) - left(q))
        const tops = [...new Set(kids.map(top))].sort((p, q) => p - q)
        const frame = el.closest<HTMLElement>('.hm-pframe')
        const cols = frame ? Math.max(1, Math.round(frame.clientWidth / el.getBoundingClientRect().width)) : PAGE
        const i = row.indexOf(el)
        const v = y === tops[0] ? 't' : y === tops[tops.length - 1] ? 'b' : ''
        const h = i % cols === 0 ? 'l' : i % cols === cols - 1 ? 'r' : ''
        const corner = [v && h ? v + h : '', tops.length === 1 && h ? 'b' + h : ''].filter(Boolean).join(' ')
        if (corner) el.setAttribute('data-corner', corner)
      }
      const a = pageOf(el)
      const p = pageOf(prev)
      if (a?.start && (!p || p.n !== a.n || prev?.parentElement !== el.parentElement))
        a.start.scrollIntoView({ block: 'nearest', inline: 'start', behavior: 'smooth' })
      else el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    }
    const rows = () => {
      const by = new Map<number, HTMLElement[]>()
      for (const el of all()) by.set(top(el), [...(by.get(top(el)) ?? []), el])
      return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r.sort((a, b) => left(a) - left(b)))
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e) || overlayRef.current) return
      if (document.querySelector('.hm-kmenu')) return
      const k = e.key
      if (/^Arrow(Right|Left|Up|Down)$/.test(k)) {
        e.preventDefault()
        if (!cur || !cur.isConnected) return sel(all()[0] ?? null)
        const g = rows()
        const r = g.findIndex(x => x.includes(cur!))
        if (r < 0) return sel(all()[0] ?? null)
        const c = g[r].indexOf(cur)
        if (k === 'ArrowRight' || k === 'ArrowLeft') {
          const n = g[r][c + (k === 'ArrowRight' ? 1 : -1)]
          if (n) sel(n)
          return
        }
        const nr = g[r + (k === 'ArrowDown' ? 1 : -1)]
        if (!nr) return
        const m = mid(cur)
        sel(nr.reduce((a, b) => (Math.abs(mid(b) - m) < Math.abs(mid(a) - m) ? b : a)))
        return
      }
      if (k === 'Enter' && cur) {
        e.preventDefault()
        // Enter enters a set (it never toggles back out); on a box it opens the box.
        if (cur.dataset.set) home.showSet(cur.dataset.set as Box['kind'])
        else cur.click()
      }
      if (k === 'Escape' && !panelRef.current) {
        if (cur) sel(null)
        else if (setRef.current !== null) home.showSet(null)
      }
    }
    /* a click outside the boxes and the masthead releases the selection; a click on one moves it there */
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      const b = t.closest<HTMLElement>('[data-nav]')
      if (b && b !== cur) {
        cur?.removeAttribute(ON)
        cur?.removeAttribute('data-corner')
        cur = b
        b.setAttribute(ON, '')
      } else if (!b && !t.closest('.hm-kmenu,.hm-ovp,aside,button,a,input,textarea')) {
        // a click on empty ground lets go of everything: the keyboard selection and the set on show
        if (cur) sel(null)
        if (setRef.current !== null) home.showSet(null)
      }
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick, true)
    }
  }, [])

  /* Long-press ⌘C (Ctrl+C elsewhere) toggles the Inspector, as before (GovBlock's binding, 600 ms). */
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

  return (
    <>
      <div className="hm-plate">
        <div className="hm-pframe" data-inspect="ContentsPlate">
          <div className="hm-pin" ref={pin}>
            <div
              className="hm-grid"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, width: `calc(${columns} * var(--col))` }}
            >
              {boxes.map(b => {
                const key = boxKey(b)
                return (
                  // the box is the hover trigger for its icons' govblock animations (brief 50)
                  <AnimateOnHover key={key}>
                  <div
                    role="button"
                    tabIndex={-1}
                    data-nav="plate"
                    data-kind={b.kind}
                    className={`hm-card ${pins.includes(key) ? 'hm-pinned' : ''}`}
                    style={{ '--type': TYPE_COLOR[b.kind] } as React.CSSProperties}
                    aria-label={`${b.title}: open in the catalog`}
                    onClick={e => {
                      if ((e.target as HTMLElement).closest('button')) return
                      openCatalog(b, e.currentTarget)
                    }}
                  >
                    <AnimateOnHover>
                    <button
                      type="button"
                      className="hm-kbtn"
                      aria-label={`${b.title} options`}
                      aria-haspopup="menu"
                      aria-expanded={menu?.box === b}
                      onClick={e => {
                        e.stopPropagation()
                        const at = e.currentTarget.getBoundingClientRect()
                        setMenu(m => (m?.box === b ? null : { box: b, at }))
                      }}
                      onMouseEnter={e => {
                        window.clearTimeout(leave.current)
                        const at = e.currentTarget.getBoundingClientRect()
                        setMenu(m => (m?.box === b ? m : { box: b, at }))
                      }}
                      onMouseLeave={() => {
                        window.clearTimeout(leave.current)
                        leave.current = window.setTimeout(() => setMenu(null), 220)
                      }}
                    >
                      <Icon name="kebab" />
                    </button>
                    </AnimateOnHover>
                    <span className="hm-pinm" aria-hidden>
                      📍
                    </span>
                    <div className="hm-body">
                      <div className="hm-top">
                        <h3>{b.title}</h3>
                      </div>
                      <p>{b.body}</p>
                    </div>
                    <div className="hm-foot">
                      {/* the type icon at rest; under the mouse or the keyboard it gives way to the favourite star */}
                      <span className="hm-ti">
                        {b.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element -- a 16px logo from public/
                          <img src={b.logo} alt="" />
                        ) : (
                          <TypeIcon icon={b.icon} />
                        )}
                        <button
                          type="button"
                          className={`hm-fav ${favs.includes(key) ? 'hm-on' : ''}`}
                          aria-pressed={favs.includes(key)}
                          aria-label={`${favs.includes(key) ? 'Remove' : 'Add'} ${b.title} ${favs.includes(key) ? 'from' : 'to'} favorites`}
                          title={favs.includes(key) ? 'Remove from favorites' : 'Favorite'}
                          onClick={e => {
                            e.stopPropagation()
                            home.toggleFav(key)
                          }}
                        >
                          <Icon name="star" />
                        </button>
                      </span>
                      {/* Blocks (Brendan, 2026-11-19): adds the box to Blocks when it is not there yet, and opens the Blocks panel */}
                      <button
                        type="button"
                        className={`hm-pnl ${shelf.some(x => x.key === key) ? 'hm-on' : ''}`}
                        aria-label={`Add ${b.title} to Blocks and open Blocks`}
                        title="Add to Blocks"
                        onClick={e => {
                          e.stopPropagation()
                          window.clearTimeout(leave.current)
                          setMenu(null)
                          if (!shelf.some(x => x.key === key)) home.toggleShelf(b)
                          openBlocks()
                        }}
                      >
                        <Icon name="grid" />
                      </button>
                    </div>
                  </div>
                  </AnimateOnHover>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {menu && (
        <BoxMenu
          box={menu.box}
          at={menu.at}
          pinned={pins.includes(boxKey(menu.box))}
          first={pins[0] === boxKey(menu.box)}
          fav={favs.includes(boxKey(menu.box))}
          onShelf={shelf.some(s => s.key === boxKey(menu.box))}
          onClose={() => setMenu(null)}
          onPanel={() => openPanel(menu.box)}
          onStay={() => window.clearTimeout(leave.current)}
          onLeave={() => {
            window.clearTimeout(leave.current)
            leave.current = window.setTimeout(() => setMenu(null), 220)
          }}
          onOpen={() => {
            const el = document.querySelector<HTMLElement>(`[data-nav="plate"][aria-label="${CSS.escape(menu.box.title)}: open in the catalog"]`)
            if (el) openCatalog(menu.box, el)
          }}
        />
      )}
      {inspecting && <InspectorMode onExit={() => setInspecting(false)} />}
    </>
  )
}

/** The three-dot menu (ported from pax2 components/dash/card-tools.tsx by way of the sketch). */
function BoxMenu({
  box, at, pinned, first, fav, onShelf, onClose, onOpen, onPanel, onStay, onLeave,
}: {
  /** Open the box in the right side panel. */
  onPanel: () => void
  /** The mouse is on the menu, or has left it: a menu opened by hover closes a moment after the mouse leaves. */
  onStay: () => void
  onLeave: () => void
  box: Box
  at: DOMRect
  pinned: boolean
  first: boolean
  fav: boolean
  onShelf: boolean
  onClose: () => void
  onOpen: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: at.bottom + 4, right: 0 })

  useEffect(() => {
    const h = ref.current?.getBoundingClientRect().height ?? 0
    const below = at.bottom + 4
    setPos({ top: below + h > innerHeight - 8 && at.top - h - 4 > 8 ? at.top - h - 4 : below, right: innerWidth - at.right })
  }, [at])

  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!ref.current?.contains(t) && !t.closest('.hm-kbtn')) onClose()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const scroll = () => onClose()
    document.addEventListener('mousedown', down, true)
    window.addEventListener('keydown', key)
    window.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', scroll)
    return () => {
      document.removeEventListener('mousedown', down, true)
      window.removeEventListener('keydown', key)
      window.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', scroll)
    }
  }, [onClose])

  const key = boxKey(box)
  const act = (f: () => void) => () => {
    onClose()
    f()
  }

  return createPortal(
    <div ref={ref} className="nysgpt-app hm-kmenu" role="menu" style={{ top: pos.top, right: pos.right }} onMouseEnter={onStay} onMouseLeave={onLeave}>
      <div className="hm-kfoot">
        <b>{box.title}</b>
        <span>{box.group}</span>
      </div>
      <div className="hm-ksep" />
      <AnimateOnHover>
      <button type="button" role="menuitem" className="hm-krow" disabled={first} onClick={act(() => home.pin(key))}>
        <Icon name="pin" />
        <span>Pin to top</span>
      </button>
      </AnimateOnHover>
      {pinned && (
        <AnimateOnHover>
        <button type="button" role="menuitem" className="hm-krow" onClick={act(() => home.unpin(key))}>
          <Icon name="pin" />
          <span>Unpin</span>
        </button>
        </AnimateOnHover>
      )}
      <AnimateOnHover>
      <button type="button" role="menuitem" className="hm-krow" onClick={act(() => home.toggleFav(key))}>
        <Icon name="star" fill={fav ? '#fbbf24' : undefined} />
        <span>{fav ? 'Unfavorite' : 'Favorite'}</span>
      </button>
      </AnimateOnHover>
      <AnimateOnHover>
      <button type="button" role="menuitem" className="hm-krow" onClick={act(() => home.toggleShelf(box))}>
        <Icon name="grid" />
        <span>{onShelf ? 'Remove from Blocks' : 'Add to Blocks'}</span>
        {onShelf && (
          <span className="hm-kchk">
            <Icon name="check" />
          </span>
        )}
      </button>
      </AnimateOnHover>
      <div className="hm-ksep" />
      <AnimateOnHover>
      <button type="button" role="menuitem" className="hm-krow" onClick={act(onOpen)}>
        <Icon name="open" />
        <span>Open in catalog</span>
      </button>
      </AnimateOnHover>
      <AnimateOnHover>
      <button type="button" role="menuitem" className="hm-krow" onClick={act(onPanel)}>
        <Icon name="panel" />
        <span>Open in panel</span>
      </button>
      </AnimateOnHover>
      <AnimateOnHover>
      <button type="button" role="menuitem" className="hm-krow" onClick={act(() => navigator.clipboard?.writeText(box.title))}>
        <Icon name="copy" />
        <span>Copy name</span>
      </button>
      </AnimateOnHover>
    </div>,
    document.body,
  )
}
