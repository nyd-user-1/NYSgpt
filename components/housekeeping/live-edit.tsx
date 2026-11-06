'use client'

// Live edit (Brendan, 2026-11-04): point at any text on the page and rewrite it in place —
// the edit documents itself (component + file via /api/dev-locate, CSS path, before/after)
// to Slack/Discord through /api/notes/team, a localStorage ledger, and the clipboard.
//
// Arming the mode FREEZES the page (Brendan, same day: "automatically turn off animations"):
// a style sheet pauses every CSS animation and kills transitions, document.getAnimations()
// pauses what's already running, and pointer events stop reaching the app — so hover-driven
// motion (the masthead's re-counting figures, reveal effects) holds still while you aim.
// What the mouse can't reach, the keyboard can: arrows climb the DOM from the hovered node
// (↑ parent, ↓ first child, ←/→ siblings), Enter edits the selected node, Esc lets go. The
// hover chip names the component in the Inspector's layer color, with its file once located.

import { useEffect, useState } from 'react'
import { cssPath } from '@/components/housekeeping/overlay/locator'
import { sourceLabel, toneOf } from '@/components/housekeeping/overlay/source'

const CHANGED = 'live-edit:changed'
let armed = false

export function useLiveEdit(): [boolean, () => void] {
  const [on, setOn] = useState(armed)
  useEffect(() => {
    const sync = () => setOn(armed)
    window.addEventListener(CHANGED, sync)
    return () => window.removeEventListener(CHANGED, sync)
  }, [])
  return [on, () => { armed = !armed; window.dispatchEvent(new Event(CHANGED)) }]
}

const LEDGER = 'nysgpt:live-edits'

const OURS = (el: Element | null) => !!el && !!(el as HTMLElement).closest?.('[data-devinspector],[data-sonar-exempt]')

/** Carries its own text, directly. */
const hasText = (el: Element) => Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())

/** An element worth EDITING (keyboard traversal may pass through anything). */
function editable(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement) || OURS(el)) return false
  if (el.closest('[contenteditable]')) return false
  if (/^(html|body|script|style|input|textarea|select|canvas|svg|iframe)$/i.test(el.localName)) return false
  return hasText(el)
}

async function report(el: HTMLElement, before: string, after: string) {
  const { name, located } = sourceLabel(el)
  const { file } = await located.catch(() => ({ file: null as string | null }))
  const lines = [
    `LIVE EDIT${name ? ` — <${name}>` : ''}${file ? ` — ${file}` : ''}`,
    `at ${cssPath(el)}`,
    `before: ${before}`,
    `after:  ${after}`,
  ].join('\n')
  try {
    const kept = JSON.parse(localStorage.getItem(LEDGER) ?? '[]') as unknown[]
    kept.push({ when: new Date().toISOString(), url: location.pathname, name, file, path: cssPath(el), before, after })
    localStorage.setItem(LEDGER, JSON.stringify(kept))
  } catch {}
  try { await navigator.clipboard.writeText(lines) } catch {}
  try {
    await fetch('/api/notes/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lines, url: location.href }),
    })
  } catch {}
}

/** Mounted once in the layout; inert until the Dev tools' Live edit switch arms it. */
export function LiveEditMode() {
  const [on] = useLiveEdit()
  useEffect(() => {
    if (!on) return

    // ── The freeze: CSS animations pause, transitions stop, running WAAPI animations hold. ──
    const freeze = document.createElement('style')
    freeze.textContent = [
      '*:not([data-devinspector]):not([data-devinspector] *) { animation-play-state: paused !important; transition: none !important; scroll-behavior: auto !important }',
      '*:not([data-devinspector]):not([data-devinspector] *) { cursor: crosshair !important }',
    ].join('\n')
    document.head.appendChild(freeze)
    // The Dev tools rows are left running: the click that arms the mode has just started the
    // switch's own transition, and pausing it would freeze the switch in its off look.
    const held = (document.getAnimations?.() ?? []).filter(
      (a) => a.playState === 'running' && !OURS((a.effect as KeyframeEffect | null)?.target ?? null),
    )
    held.forEach((a) => { try { a.pause() } catch {} })

    const chip = document.createElement('div')
    chip.setAttribute('data-devinspector', '')
    chip.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;display:none;padding:1px 6px;border-radius:4px;background:#fff;border:1px solid #94a3b8;color:#475569;font:10px/1.6 ui-monospace,Menlo,monospace;box-shadow:0 1px 4px rgba(0,0,0,.15)'
    document.body.appendChild(chip)

    let target: HTMLElement | null = null
    let prevOutline = ''
    let pinned = false // arrows took over; hover no longer steals the target
    let editing = false

    const clear = () => {
      if (target) target.style.outline = prevOutline
      target = null
      pinned = false
      chip.style.display = 'none'
    }

    const setTarget = (el: HTMLElement) => {
      if (target) target.style.outline = prevOutline
      target = el
      prevOutline = el.style.outline
      el.style.outline = '1.5px dashed #2563eb'
      const r = el.getBoundingClientRect()
      const { name, located } = sourceLabel(el)
      chip.textContent = name ?? el.localName
      chip.style.borderColor = '#94a3b8'
      chip.style.color = '#475569'
      chip.style.left = `${Math.max(4, r.left)}px`
      chip.style.top = `${Math.max(4, r.top - 22)}px`
      chip.style.display = 'block'
      void located.then(({ file, layer }) => {
        if (target !== el) return
        const tone = toneOf(layer)
        chip.style.color = tone
        chip.style.borderColor = tone
        el.style.outline = `1.5px dashed ${tone}`
        if (file) chip.textContent = `${name ?? el.localName} — ${file}`
      })
    }

    const begin = (el: HTMLElement) => {
      if (!editable(el)) return
      editing = true
      if (target) { target.style.outline = prevOutline }
      chip.style.display = 'none'
      const before = (el.textContent ?? '').trim()
      el.setAttribute('contenteditable', 'plaintext-only')
      el.focus()
      const done = (commit: boolean) => {
        editing = false
        el.removeAttribute('contenteditable')
        el.removeEventListener('blur', onBlur)
        el.removeEventListener('keydown', onEditKey)
        const after = (el.textContent ?? '').trim()
        if (!commit) { el.textContent = before; return }
        if (after !== before) void report(el, before, after)
      }
      const onBlur = () => done(true)
      const onEditKey = (k: KeyboardEvent) => {
        k.stopPropagation()
        if (k.key === 'Enter' && !k.shiftKey) { k.preventDefault(); el.blur() }
        if (k.key === 'Escape') { k.preventDefault(); done(false) }
      }
      el.addEventListener('blur', onBlur)
      el.addEventListener('keydown', onEditKey)
    }

    const over = (e: MouseEvent) => {
      if (OURS(e.target as Element)) return
      e.stopPropagation() // hover never reaches the app: no re-counting figures, no hover states
      if (editing || pinned) return
      const t = (e.target as Element)?.closest('h1,h2,h3,h4,p,span,li,td,th,figcaption,blockquote,label,dt,dd,strong,em,a,button') ?? (e.target as Element)
      if (!editable(t) || t === target) return
      setTarget(t)
    }

    const click = (e: MouseEvent) => {
      if (OURS(e.target as Element) || editing) return
      e.preventDefault() // the page is inert while armed: no navigation, no pane, no dialogs
      e.stopPropagation()
      pinned = false
      const t = (e.target as Element)?.closest('h1,h2,h3,h4,p,span,li,td,th,figcaption,blockquote,label,dt,dd,strong,em,a,button') ?? (e.target as Element)
      if (!editable(t)) return
      setTarget(t)
      begin(t)
    }

    // ── The climb: arrows walk the DOM from the current target; Enter edits; Esc lets go. ──
    const onKey = (e: KeyboardEvent) => {
      if (editing || !target) return
      let next: Element | null = null
      if (e.key === 'ArrowUp') next = target.parentElement
      else if (e.key === 'ArrowDown') next = target.firstElementChild
      else if (e.key === 'ArrowLeft') next = target.previousElementSibling
      else if (e.key === 'ArrowRight') next = target.nextElementSibling
      else if (e.key === 'Enter') { e.preventDefault(); begin(target); return }
      else if (e.key === 'Escape') { clear(); return }
      else return
      if (next instanceof HTMLElement && !OURS(next) && !/^(script|style)$/i.test(next.localName)) {
        e.preventDefault()
        pinned = true
        setTarget(next)
      }
    }

    document.addEventListener('mouseover', over, true)
    document.addEventListener('click', click, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      clear()
      chip.remove()
      freeze.remove()
      held.forEach((a) => { try { a.play() } catch {} })
      document.removeEventListener('mouseover', over, true)
      document.removeEventListener('click', click, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [on])
  return null
}
