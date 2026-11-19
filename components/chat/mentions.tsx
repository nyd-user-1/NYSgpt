'use client'

// Mentions in Chat (docs/briefs/chat-mentions.md; Brendan's GO, 2026-11-03): typing @ reaches for what
// the platform knows — partner organizations, the three agents, the team. The pick binds one entity to
// the conversation (a chip on the composer; a MENTION line in the request's context) and the text keeps
// the plain @handle. Client-safe throughout: roles, partners and the registry carry no server imports.

import { AGENTS } from '@/lib/agents/registry'
import { orgBox } from '@/lib/partners/mailboxes'
import { MEMBERS, PARTNERS } from '@/lib/roles'

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

const kebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Every entity @ can reach, built once: partners first (the brief's audience), then agents, then people. */
export const MENTIONS: Mention[] = [
  ...PARTNERS.filter((p) => p.id !== 'pax').map((p) => ({
    kind: 'partner' as const,
    name: p.name,
    slug: p.id,
    box: orgBox(p.id)?.box,
    note: 'Partner organization',
  })),
  ...AGENTS.map((a) => ({ kind: 'agent' as const, name: a.name, slug: a.slug, note: a.speciality })),
  ...MEMBERS.filter((m) => m.email).map((m) => ({
    kind: 'person' as const,
    name: m.name,
    slug: kebab(m.partner ? `${m.name} ${m.partner}` : m.name),
    note: m.role === 'partner' ? `Partner account${m.partner ? ` — ${PARTNERS.find((p) => p.id === m.partner)?.name ?? m.partner}` : ''}` : m.role,
  })),
]

/** The entities matching an @query: dashes and spaces fall away, so @uniteamerica finds unite-america. */
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
