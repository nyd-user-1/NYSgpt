'use client'

// from-sam's ChatFormFields (livingston), ported: the live question's controls are housed in the
// same card the blocks wear in chat (title, collapse chevron, bordered header — nova Card), and
// once the conversation moves on it folds to livingston's own line — "Answered · 2 fields" with
// the rotating chevron and the 0fr→1fr accordion — reopening prefilled with what was sent;
// Save changes sends only what changed. Nothing is required; the chat box always works instead.

import { useState } from 'react'
import { ArrowUp, ChevronDown, ChevronRight } from 'lucide-react'

import { type ChatField } from '@/lib/chat-fields'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/nova/card'

const INPUT =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--txt)] outline-none transition-colors placeholder:text-[var(--muted2)] focus:border-pax2-light-blue'

const plural = (c: number) => `${c} field${c === 1 ? '' : 's'}`

export function ChatFields({ fields, live, onSubmit }: { fields: ChatField[]; live: boolean; onSubmit: (values: Record<string, string>) => void }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [lastSent, setLastSent] = useState<Record<string, string> | null>(null)
  const [open, setOpen] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }))

  const isLive = live && !lastSent
  const filled = fields.some((f) => (values[f.key] ?? '').trim())
  const changed = Object.fromEntries(
    fields.filter((f) => (values[f.key] ?? '').trim() !== ((lastSent?.[f.key] ?? '').trim())).map((f) => [f.key, (values[f.key] ?? '').trim()]),
  )
  const dirty = Object.keys(changed).length > 0

  const send = () => {
    if (!filled) return
    setLastSent(values)
    onSubmit(values)
  }
  const save = () => {
    if (!dirty) return
    setLastSent(values)
    setExpanded(false)
    onSubmit(changed)
  }

  // Enter sends (or saves the edit); Shift+Enter keeps its new line, in the textarea too.
  const enterKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isLive) send()
      else save()
    }
  }

  // Tab in an empty field takes its placeholder as the answer (without the "e.g." in front); with
  // something typed, Tab moves on as usual.
  const keys = (f: ChatField, v: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && !e.shiftKey && !v && f.placeholder) {
      e.preventDefault()
      set(f.key, f.placeholder.replace(/^\s*e\.g\.,?\s*/i, ''))
      return
    }
    enterKey(e)
  }

  const control = (f: ChatField) => {
    const v = values[f.key] ?? ''
    if (f.kind === 'textarea')
      return <textarea rows={2} className={`${INPUT} resize-none`} value={v} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} onKeyDown={keys(f, v)} />
    if (f.kind === 'choice')
      return (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={f.label}>
          {(f.options ?? []).map((o) => {
            const on = v === o
            return (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set(f.key, on ? '' : o)}
                className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                  on ? 'border-pax2-blue bg-pax2-blue text-white' : 'border-[var(--border)] text-[var(--txt)] hover:bg-muted'
                }`}
              >
                {o}
              </button>
            )
          })}
        </div>
      )
    return <input type="text" className={INPUT} value={v} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} onKeyDown={keys(f, v)} />
  }

  const controls = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {fields.map((f) => {
        const wide = f.kind === 'textarea' || (f.options?.length ?? 0) > 3 || fields.length === 1
        return (
          <div key={f.key} className={wide ? 'sm:col-span-2' : undefined}>
            <label className="mb-1 block text-[12px] font-medium text-[var(--txt)]">{f.label}</label>
            {control(f)}
          </div>
        )
      })}
    </div>
  )

  if (isLive)
    return (
      <Card size="sm" className="my-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
        <CardHeader className={open ? 'border-b [.border-b]:pb-2' : undefined}>
          <CardTitle>Your answer</CardTitle>
          <CardAction>
            <button
              type="button"
              aria-label={open ? 'Collapse Your answer' : 'Expand Your answer'}
              onClick={() => setOpen(!open)}
              className="inline-flex size-8 items-center justify-center rounded-md text-slate-800 hover:bg-muted hover:text-foreground"
            >
              <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          </CardAction>
        </CardHeader>
        {open && (
          <CardContent>
            {controls}
            <div className="mt-3 flex items-center gap-2.5">
              <button
                type="button"
                aria-label="Send"
                onClick={send}
                disabled={!filled}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-pax2-blue text-white transition-opacity hover:opacity-80 disabled:opacity-25"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <p className="text-[12px] text-[var(--muted)]">or just answer in the chat box — whatever is easier.</p>
            </div>
          </CardContent>
        )}
      </Card>
    )

  const n = lastSent ? Object.values(lastSent).filter((v) => v.trim()).length : fields.length
  const row = expanded ? 'Editing' : lastSent ? `Answered · ${plural(n)}` : `Not answered · ${plural(fields.length)}`

  return (
    <div className="my-3">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => {
          if (expanded) return setExpanded(false)
          setValues(lastSent ?? {})
          setExpanded(true)
        }}
        className="inline-flex items-center gap-1 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--txt)]"
      >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${expanded ? 'rotate-90' : ''}`} />
        <span>{row}</span>
      </button>

      {/* livingston's accordion: a grid row that goes 0fr → 1fr, which animates height without
          measuring it. Closed, it is also inert so nothing inside can take focus. */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div className="min-h-0 overflow-hidden">
          <Card size="sm" className="mt-2">
            <CardHeader className="border-b [.border-b]:pb-2">
              <CardTitle>Your answer</CardTitle>
            </CardHeader>
            <CardContent>
              {controls}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={!dirty}
                  onClick={save}
                  className="inline-flex items-center rounded-lg bg-pax2-blue px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-40"
                >
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--txt)] transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
