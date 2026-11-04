'use client'

// The script as a block: the title and the round Record button in the header, the body a transcript —
// monospace, left-aligned, double-spaced, the text block centered at reading width — and the footer's
// Citations (or the blocks' Glossary link when nothing is cited) opposite the measured length. Citations
// opens the right panel with why each line is written that way; hovering a citation there lights its line.

import * as React from 'react'
import { Video } from 'lucide-react'

import { ScriptCitations } from '@/components/chat/script-citations'
import { secondsAt, words } from '@/components/record/draft'
import { useShellPanel } from '@/components/shell'
import type { ScriptCite } from '@/lib/chat-fields'
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/nova/card'
import { Skeleton } from '@/components/ui/nova/skeleton'
import { cn } from '@/lib/utils'

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** `streaming`: the reply is still arriving. The card fills in as the words land (a skeleton until the
 *  first ones do), and Record and Citations wait for the finished script. */
/** A script that came without its own citations shows these (Brendan, 2026-10-23, for the demo): the
 *  citations of a cited Question 3 script, every id from the evidence list (src/lib/script-evidence.ts).
 *  Scripts drafted since carry their own. */
const STAND_IN: ScriptCite[] = [
  { quote: '', note: "Exact figure from the campaign's verified fact set; placed in the hook to apply the channel finding that a number in the title lifts outlier performance.", ids: ['fact:ma-house-2022-one-name', 'channels:number'] },
  { quote: '', note: "First-person plain-folks framing, which moved vote choice +0.8 points in Swayable's 574-ad test.", ids: ['swayable:technique_plain_folks:votechoice'] },
  { quote: '', note: 'Plain-folks credential reinforces the personal stake established in the hook.', ids: ['swayable:technique_plain_folks:votechoice'] },
  { quote: '', note: "Offers a concrete analogy the viewer likely hasn't heard in this context, which moved favorability +0.6 points in Swayable's 432-ad test.", ids: ['swayable:fact_new_yes:favorability'] },
  { quote: '', note: "Explicit ask to vote for, which moved vote choice +0.6 points in Swayable's 574-ad test.", ids: ['swayable:explicit_vote_for:votechoice'] },
]

export function ScriptCard({ text, cites, onRecord, streaming = false }: { text: string; cites?: ScriptCite[] | null; onRecord: () => void; streaming?: boolean }) {
  const { openAside, asideKey } = useShellPanel()
  const key = React.useId()
  const [hot, setHot] = React.useState<number | null>(null)
  const shown = asideKey === key
  const list = React.useMemo(() => (cites?.length ? cites : STAND_IN), [cites])

  // Sentences with the whitespace between them kept, so the line breaks survive; each cite marks the
  // sentence its quoted words come from.
  const parts = text.split(/(?<=[.!?…])(\s+)/)
  const marks = new Map<number, number[]>()
  list.forEach((c, k) => {
    const q = norm(c.quote)
    if (!q) return
    const at = parts.findIndex((p, i) => i % 2 === 0 && norm(p).includes(q))
    if (at >= 0) marks.set(at, [...(marks.get(at) ?? []), k + 1])
  })

  const open = React.useCallback(
    (lit: number | null) =>
      openAside({
        key,
        title: 'Citations',
        body: <ScriptCitations text={text} cites={list} hot={lit} onHot={setHot} />,
      }),
    [openAside, key, text, list],
  )
  // While the panel shows these citations, hovering either side lights the same number on both.
  React.useEffect(() => {
    if (shown) open(hot)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hot])
  // A card that leaves the page takes its citations with it.
  const leave = React.useRef(() => {})
  leave.current = () => {
    if (shown) openAside(null)
  }
  React.useEffect(() => () => leave.current(), [])

  return (
    <Card className="my-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <CardHeader className="border-b [.border-b]:pb-2">
        <CardTitle>Script</CardTitle>
        <CardAction>
          <button
            type="button"
            onClick={onRecord}
            disabled={streaming}
            aria-label="Record"
            title="Record"
            className="flex size-[30px] items-center justify-center rounded-full bg-pax2-blue text-white shadow-md transition-opacity hover:opacity-85 disabled:pointer-events-none disabled:opacity-40"
          >
            <Video className="size-[15px]" />
          </button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {streaming && !text ? (
          <div className="mx-auto flex max-w-[36rem] flex-col gap-4 py-6">
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-9/12" />
            <Skeleton className="h-4 w-7/12" />
          </div>
        ) : (
        <div className="mx-auto max-w-[36rem] whitespace-pre-wrap py-4 font-mono text-[17px] leading-[2.1] text-[var(--txt)]">
          {parts.map((p, i) => (
            <React.Fragment key={i}>
              <span className={cn('rounded transition-colors', marks.get(i)?.includes(hot ?? -1) && 'bg-pax2-lavender/60')}>{p}</span>
            </React.Fragment>
          ))}
        </div>
        )}
      </CardContent>
      <CardFooter className="justify-between gap-3 bg-transparent py-3 text-xs text-slate-800">
        {streaming ? (
          <Skeleton className="h-3 w-16" />
        ) : (
          <button type="button" onClick={() => (shown ? openAside(null) : open(hot))} aria-expanded={shown} className="font-medium text-slate-800 underline underline-offset-2 hover:text-pax2-light-blue">
            Citations
          </button>
        )}
        {text && (
          <span className="tabular">
            {words(text)} words · about {secondsAt(text)} seconds
          </span>
        )}
      </CardFooter>
    </Card>
  )
}
