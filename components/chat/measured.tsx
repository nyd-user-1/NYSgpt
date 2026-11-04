'use client'

import Link from 'next/link'

import type { Answer, ChipOffer } from '@/lib/question-resolver'

// The question bank in the chat: the chip row over the input, and a chip's measured answer. The answer
// rides in the message content with its basis in a ```pax-basis``` block, so a saved chat reopens with
// the basis intact; the prose renders as markdown, the block as the quiet footer below it.

type Basis = { basis: string; audit?: string; citation?: string; unlock?: string; videoId: string }

const BLOCK = /```pax-basis\s*([\s\S]*?)```/

export function measuredContent(a: Answer, videoId: string): string {
  const b: Basis = { basis: a.basis, videoId, ...(a.audit ? { audit: a.audit } : {}), ...(a.citation ? { citation: a.citation } : {}), ...(a.unlock ? { unlock: a.unlock } : {}) }
  return `${a.text}\n\n\`\`\`pax-basis\n${JSON.stringify(b)}\n\`\`\``
}

export function splitMeasured(content: string): { prose: string; basis: Basis | null } {
  const m = BLOCK.exec(content)
  if (!m) return { prose: content, basis: null }
  let basis: Basis | null = null
  try {
    basis = JSON.parse(m[1].trim()) as Basis
  } catch {}
  return { prose: content.replace(BLOCK, '').trimEnd(), basis }
}

/** The measurement behind the answer, in small type; the unlocking action where the video lacks it. */
export function MeasuredFooter({ basis }: { basis: Basis }) {
  const flask = basis.unlock?.startsWith('Run the flask')
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {basis.unlock && (
        <div className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600">
          {flask ? (
            <Link href={`/lab/${basis.videoId}`} className="text-pax2-blue underline decoration-pax2-light-blue underline-offset-4">
              {basis.unlock}
            </Link>
          ) : (
            basis.unlock
          )}
        </div>
      )}
      {basis.citation && <p className="border-l-2 border-pax2-light-blue/60 pl-2.5 text-xs leading-snug text-slate-600">{basis.citation}</p>}
      <p className="text-xs leading-snug text-slate-400">
        {basis.basis}
        {basis.audit ? `; ${basis.audit}` : ''}
      </p>
    </div>
  )
}

export function ChipRow({ chips, onTap, disabled }: { chips: ChipOffer[]; onTap: (c: ChipOffer) => void; disabled?: boolean }) {
  if (!chips.length) return null
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          disabled={disabled}
          onClick={() => onTap(c)}
          className="rounded-full border border-[var(--border)] bg-pax2-surface px-3 py-1.5 text-left text-[13px] leading-snug text-[var(--txt)] transition-colors hover:border-pax2-light-blue hover:text-pax2-blue disabled:opacity-40"
        >
          {c.ask}
        </button>
      ))}
    </div>
  )
}
