'use client'

// Mentions in Chat, from trinity (docs/briefs/chat-mentions.md there): typing @ reaches for what
// the platform knows. The pick binds one entity to the conversation (a chip on the composer; a
// MENTION line in the request's context) and the text keeps the plain @handle. Trinity fills the
// list from its partners, agents and team; NYSgpt's list below is empty until it has entities of
// its own to offer — with no rows, the @ popover simply never opens.

export type Mention = {
  kind: 'partner' | 'agent' | 'person'
  name: string
  /** The @handle the text keeps, and the slug the context line names. */
  slug: string
  /** The platform inbox, where the entity has one (org:<id>). */
  box?: string
  /** One line under the name in the popover. */
  note: string
}

/** Every entity @ can reach — placeholders until NYSgpt points them at something real. */
export const MENTIONS: Mention[] = [
  { kind: 'partner', name: 'Example Organization', slug: 'example', note: 'Partner organization' },
  { kind: 'agent', name: 'Sample Agent', slug: 'sample', note: 'Placeholder agent' },
]

/** The entities matching an @query: dashes and spaces fall away, so @exampleorg finds example-org. */
export function filterMentions(query: string): Mention[] {
  const q = query.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!q) return MENTIONS.slice(0, 8)
  return MENTIONS.filter((m) => m.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(q) || m.slug.replace(/[^a-z0-9]/g, '').includes(q)).slice(0, 8)
}

/** The MENTION line the request's context carries when an entity is bound. */
export function mentionContext(m: Mention): string {
  return `MENTION — the user bound this ${m.kind} to the conversation: ${m.name} (slug ${m.slug}${m.box ? `; its platform inbox is ${m.box}` : ''}). A skill that acts on a ${m.kind} acts on this one; read its record through your tools rather than assuming it.`
}

/** The popover's rows; the parent owns the open state, the active index and the keys. */
export function MentionList({ items, active, onPick }: { items: Mention[]; active: number; onPick: (m: Mention) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--inp-bg)] shadow-e1">
      {items.map((m, i) => (
        <button
          key={`${m.kind}-${m.slug}`}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onPick(m) }}
          className={`flex w-full items-baseline gap-2 px-3 py-2 text-left text-[14px] ${i === active ? 'bg-pax2-surface/70' : ''}`}
        >
          <span className="font-medium text-[var(--txt)]">{m.name}</span>
          <span className="truncate text-xs text-[var(--muted)]">@{m.slug} · {m.note}</span>
        </button>
      ))}
    </div>
  )
}
