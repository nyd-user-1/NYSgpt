'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'
import { THEME_EVENT } from '@/lib/theme'
import { loadLevels } from '@/lib/viz-data'
import { find, label, parseNuclide, toModel, type Model } from './model'
import type { Palette } from './scene'

// The /viz/levels page's client half: the snapshot (public/viz-data/levels.json) and the three.js scene load
// in parallel, the scene in the browser only (WebGL, no SSR). The selected nuclide's levels list sits in a
// panel over the scene's right edge, under the frame's close button — energy, Jπ, half-life, as NNDC's adopted-levels listing gives them —
// and a row under the pointer marks that level on the stack. ²⁰⁸Pb is selected on arrival.

const Scene = dynamic(() => import('./scene').then((m) => m.Scene), { ssr: false })

const SERIF = { fontFamily: 'var(--font-display), Georgia, serif' } as const
const SANS = { fontFamily: 'var(--font-sans, "DM Sans"), sans-serif' } as const
const MONO = { fontFamily: 'var(--font-mono), ui-monospace, monospace' } as const

let ctx: CanvasRenderingContext2D | null = null
/** Any CSS colour laid over `under`, as #rrggbb: three.js reads hex and rgb(), not oklch() or color-mix(),
 *  and a theme may set either. */
function solid(color: string, under: string): string {
  ctx ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true })
  if (!ctx) return under
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = under
  ctx.fillRect(0, 0, 1, 1)
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function readPalette(el: HTMLElement): Palette {
  const css = getComputedStyle(el)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  const bg = solid(v('--paper', '#ffffff'), '#ffffff')
  return {
    bg,
    ink: solid(v('--paper-text', '#16181d'), bg),
    accent: solid(v('--paper-strong', '#033882'), bg),
    dark: document.documentElement.classList.contains('dark'),
  }
}

export function LevelsView() {
  const wrap = React.useRef<HTMLDivElement>(null)
  const [model, setModel] = React.useState<Model | null>(null)
  const [failed, setFailed] = React.useState(false)
  const [palette, setPalette] = React.useState<Palette | null>(null)
  const [focus, setFocus] = React.useState(-1)
  const [hover, setHover] = React.useState(-1)
  const [row, setRow] = React.useState(-1)

  React.useEffect(() => {
    let live = true
    loadLevels().then(
      (d) => {
        if (!live) return
        const m = toModel(d)
        setModel(m)
        setFocus(find(m, 82, 126))
      },
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [])

  // The theme: read on arrival and on every theme event (a picked theme, or the light/dark class flipping).
  React.useEffect(() => {
    const read = () => {
      if (wrap.current) setPalette(readPalette(wrap.current))
    }
    read()
    window.addEventListener(THEME_EVENT, read)
    return () => window.removeEventListener(THEME_EVENT, read)
  }, [])

  const select = React.useCallback((i: number) => {
    setFocus(i)
    setRow(-1)
  }, [])

  return (
    <div ref={wrap} className="relative min-h-0 flex-1 overflow-hidden rounded-xl">
      {model && palette ? (
        <Scene model={model} palette={palette} focus={focus} hover={hover} row={row} onSelect={select} onHover={setHover} />
      ) : (
        <p className="absolute inset-0 grid place-items-center text-[13px] text-[var(--paper-muted)]" style={SANS}>
          {failed ? 'The data did not load.' : 'Loading the data…'}
        </p>
      )}
      {model && <GoTo model={model} onGo={select} />}
      {model && focus >= 0 && <LevelPanel model={model} i={focus} row={row} onRow={setRow} onClose={() => select(-1)} />}
    </div>
  )
}

/** Type a nuclide (208Pb, Pb208, pb-208) and press Enter to select it. */
function GoTo({ model, onGo }: { model: Model; onGo: (i: number) => void }) {
  const [text, setText] = React.useState('')
  const [miss, setMiss] = React.useState(false)
  return (
    <form
      className="absolute left-3 top-3 z-20"
      onSubmit={(e) => {
        e.preventDefault()
        const i = parseNuclide(model, text)
        setMiss(i < 0)
        if (i >= 0) onGo(i)
      }}
    >
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setMiss(false)
        }}
        placeholder="Nuclide, e.g. 208Pb"
        aria-label="Go to a nuclide"
        spellCheck={false}
        className={`w-[170px] rounded-md border bg-[var(--paper)] px-2.5 py-1.5 text-[12px] text-[var(--paper-text)] outline-none placeholder:text-[var(--paper-faint)] ${miss ? 'border-red-500' : 'border-[var(--paper-rule-soft)] focus:border-[var(--paper-faint)]'}`}
        style={MONO}
      />
    </form>
  )
}

function LevelPanel({ model, i, row, onRow, onClose }: { model: Model; i: number; row: number; onRow: (k: number) => void; onClose: () => void }) {
  const x = model.nuclides[i]
  const rows: [number | string, number | string, number | string][] = []
  for (let k = 0; k < x.L.length; k += 3) rows.push([x.L[k], x.L[k + 1], x.L[k + 2]])
  const head = 'pb-1.5 pt-1 text-[10px] font-normal tracking-[0.08em] text-[var(--paper-faint)]'
  return (
    <aside className="absolute bottom-3 right-3 top-[60px] z-20 flex w-[290px] max-w-[48%] flex-col overflow-hidden rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper)] text-[var(--paper-text)]">
      <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
        <div className="min-w-0">
          <h2 className="m-0 text-[28px] leading-[1.05]" style={SERIF}>
            {label(model, i)}
          </h2>
          <p className="mt-1 text-[11px] tabular-nums text-[var(--paper-muted)]" style={MONO}>
            Z {x.z} · N {x.n}
            {rows.length < x.nl ? ` · ${rows.length} of ${x.nl} levels` : ''}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close the level list"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--paper-faint)] transition-colors hover:bg-[var(--paper-quiet)] hover:text-[var(--paper-text)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3" onMouseLeave={() => onRow(-1)}>
        <table className="w-full border-collapse text-[12px]" style={SANS}>
          <thead className="sticky top-0 bg-[var(--paper)]">
            <tr className="border-b border-[var(--paper-rule)]">
              <th className={`${head} text-left`} style={MONO}>Energy (keV)</th>
              <th className={`${head} text-left`} style={MONO}>Jπ</th>
              <th className={`${head} text-right`} style={MONO}>T½</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([e, j, t], k) => (
              <tr
                key={k}
                onMouseEnter={() => onRow(k)}
                className={`border-b border-[var(--paper-rule-soft)] ${k === row ? 'bg-[var(--paper-quiet)] text-[var(--paper-strong)]' : ''}`}
              >
                <td className="py-1 pr-3 tabular-nums" style={MONO}>{e}</td>
                <td className="py-1 pr-3">{j}</td>
                <td className="py-1 text-right tabular-nums text-[var(--paper-muted)]" style={MONO}>{t}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  )
}
