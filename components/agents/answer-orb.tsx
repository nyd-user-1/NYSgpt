'use client'

import { useState } from 'react'
import { RestOrb, ThinkingOrb } from '@/components/agents/orbs'
// NYSgpt (brief 62): nsrgpt's lib/chat-stream type, here, since NYSgpt's chat has no such module
type ChatTurn = { role: 'user' | 'assistant'; content: string }

// The orb's place in a chat, pax-trinity's (src/components/chat/chat.tsx, the 44B way), as one component for /chat, the
// graph's dock, the step output's chat and /search's record chat (brief 50). While inference runs and no word has landed,
// ThinkingOrb cycles on the waiting row; from the first word on, RestOrb stands below the newest answer, pushed down as
// the output grows, moving while it streams. Settled, a click asks /api/chat/follow-ups for three next prompts, kept for
// this answer and shown as chips beneath; a chip sends its prompt.
export function AnswerOrb({ content, streaming, messages, onAsk }: { content: string; streaming: boolean; messages?: ChatTurn[]; onAsk?: (q: string) => void }) {
  const [followUps, setFollowUps] = useState<string[] | 'loading' | null>(null)
  const [open, setOpen] = useState(false)
  if (!content) return streaming ? <ThinkingOrb className="mb-4" /> : null
  const canAsk = !!onAsk && !!messages?.length
  const ask = async () => {
    if (streaming || !canAsk) return
    if (open) return setOpen(false)
    if (Array.isArray(followUps)) return setOpen(true)
    setFollowUps('loading')
    try {
      const res = await fetch('/api/chat/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages!.slice(-8).map((m) => ({ role: m.role, content: m.content.slice(0, 2400) })) }),
      })
      const data = (await res.json()) as { suggestions?: string[] }
      if (res.ok && Array.isArray(data.suggestions) && data.suggestions.length) {
        setFollowUps(data.suggestions)
        setOpen(true)
      } else setFollowUps(null)
    } catch {
      setFollowUps(null)
    }
  }
  return (
    <>
      <RestOrb thinking={streaming} busy={followUps === 'loading'} onClick={canAsk ? ask : undefined} />
      {open && !streaming && Array.isArray(followUps) && (
        <span className="mt-3 flex flex-wrap gap-2">
          {followUps.map((q, qi) => (
            <button
              key={q}
              type="button"
              style={{ animationDelay: `${qi * 80}ms` }}
              onClick={() => { setOpen(false); onAsk?.(q) }}
              className="orb-chip rounded-full border border-[var(--paper-rule)] bg-[var(--paper)] px-3.5 py-1.5 text-left text-[13.5px] text-[var(--paper-text)] shadow-e1 transition-colors hover:border-pax2-light-blue"
            >
              {q}
            </button>
          ))}
        </span>
      )}
    </>
  )
}
