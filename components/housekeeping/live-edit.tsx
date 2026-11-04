'use client'

// Live edit (Brendan, 2026-11-04): point at any text on the page and rewrite it in place —
// the h1, a box title, a line of body copy — exactly as he would in devtools, but the edit
// documents itself: the element's component and file (the dock's /api/dev-locate), its CSS
// path, the page, and the before/after land as a comment relayed to the lead (Slack/Discord
// via /api/notes/team, wired 2026-11-04), a localStorage ledger, and the clipboard. No more
// screenshots of rewritten inspect panes; the file path rides with the words.

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

/** An element worth editing: carries its own text, isn't chrome of the tools themselves. */
function editable(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false
  if (el.closest('[data-devinspector],[data-sonar-exempt],[contenteditable]')) return false
  if (/^(html|body|script|style|input|textarea|select|button|a|canvas|svg|iframe)$/i.test(el.localName) && !/^(a|button)$/i.test(el.localName)) return false
  return Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
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
    let hover: HTMLElement | null = null
    let prevOutline = ''
    // The mode wears X-ray's own classification: the hover chip names the component and takes
    // its layer's color (design system purple, shared green, page orange, unknown red) the
    // moment /api/dev-locate answers — one color system across Point and Click, X-ray, Live edit.
    const chip = document.createElement('div')
    chip.setAttribute('data-devinspector', '')
    chip.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;display:none;padding:1px 6px;border-radius:4px;background:#fff;border:1px solid #94a3b8;color:#475569;font:10px/1.6 ui-monospace,Menlo,monospace;box-shadow:0 1px 4px rgba(0,0,0,.15)'
    document.body.appendChild(chip)
    const clear = () => { if (hover) { hover.style.outline = prevOutline } hover = null; chip.style.display = 'none' }
    const over = (e: MouseEvent) => {
      const t = (e.target as Element)?.closest('h1,h2,h3,h4,p,span,li,td,th,figcaption,blockquote,label,dt,dd,strong,em') ?? (e.target as Element)
      if (!editable(t) || t === hover) return
      clear()
      hover = t
      prevOutline = t.style.outline
      t.style.outline = '1.5px dashed #2563eb'
      const r = t.getBoundingClientRect()
      const { name, located } = sourceLabel(t)
      chip.textContent = name ?? t.localName
      chip.style.borderColor = '#94a3b8'
      chip.style.color = '#475569'
      chip.style.left = `${Math.max(4, r.left)}px`
      chip.style.top = `${Math.max(4, r.top - 22)}px`
      chip.style.display = 'block'
      void located.then(({ file, layer }) => {
        if (hover !== t) return
        const tone = toneOf(layer)
        chip.style.color = tone
        chip.style.borderColor = tone
        t.style.outline = `1.5px dashed ${tone}`
        if (file) chip.textContent = `${name ?? t.localName} — ${file}`
      })
    }
    const click = (e: MouseEvent) => {
      if (!hover || !hover.contains(e.target as Node)) return
      e.preventDefault(); e.stopPropagation()
      const el = hover
      clear()
      const before = (el.textContent ?? '').trim()
      el.setAttribute('contenteditable', 'plaintext-only')
      el.focus()
      const done = (commit: boolean) => {
        el.removeAttribute('contenteditable')
        el.removeEventListener('blur', onBlur)
        el.removeEventListener('keydown', onKey)
        const after = (el.textContent ?? '').trim()
        if (!commit || after === before) { if (!commit) el.textContent = before; return }
        void report(el, before, after)
      }
      const onBlur = () => done(true)
      const onKey = (k: KeyboardEvent) => {
        if (k.key === 'Enter' && !k.shiftKey) { k.preventDefault(); el.blur() }
        if (k.key === 'Escape') { k.preventDefault(); done(false) }
      }
      el.addEventListener('blur', onBlur)
      el.addEventListener('keydown', onKey)
    }
    document.addEventListener('mouseover', over, true)
    document.addEventListener('click', click, true)
    return () => {
      clear()
      chip.remove()
      document.removeEventListener('mouseover', over, true)
      document.removeEventListener('click', click, true)
    }
  }, [on])
  return null
}
