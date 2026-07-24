// Seeded discussion-board content for the 44B Forum (design prototype).
// Not yet persisted — wire to a `forum_threads` / `forum_posts` table (+ auth)
// to go live. Lives only in the browser session until then.

export type ForumReply = { id: number; author: string; initials: string; body: string; ago: string }

export type ForumThread = {
  id: number
  title: string
  author: string
  initials: string
  tag: string
  body: string
  ago: string
  replyCount: number
  lastActivity: string
  pinned?: boolean
  replies: ForumReply[]
}

export const FORUM_TAGS = ['All', 'Compliance', 'Incidents', 'Labs', 'Policy', 'Library'] as const

export const FORUM_THREADS: ForumThread[] = [
  {
    id: 1, pinned: true, tag: 'Compliance',
    title: 'Is a fine-tune a separate “frontier model” under Art. 44-B § 1420?',
    author: 'compliance_counsel', initials: 'CC', ago: '3h', replyCount: 3, lastActivity: '18m',
    body: 'If a large developer files a § 1421 transparency report for a base model, does a downstream fine-tune deployed in New York need its own disclosure, or is it covered by the parent filing? The definitions are tighter than people assume.',
    replies: [
      { id: 11, author: 'reg_watcher', initials: 'RW', body: '§ 1420 defines “frontier model” by training-compute threshold (the 10²⁶-operation test), not lineage — a fine-tune that crosses it reads as separately covered to me.', ago: '2h' },
      { id: 12, author: 'ml_lawyer', initials: 'ML', body: 'Agreed, but if the fine-tune doesn’t materially change the model, updating the existing § 1421(2) transparency report may suffice rather than a fresh filing.', ago: '1h' },
      { id: 13, author: 'OpenPolicyNY', initials: 'OP', body: 'AG guidance is supposed to clarify exactly this before the January 2027 effective date. Until then, file defensively.', ago: '18m' },
    ],
  },
  {
    id: 2, tag: 'Incidents',
    title: 'What counts as a “safety incident” under § 1422?',
    author: 'safety_eng', initials: 'SE', ago: '5h', replyCount: 3, lastActivity: '25m',
    body: 'The 72-hour clock is clear — 24 hours where there’s imminent risk — but the trigger isn’t. Does a jailbreak that produces harmful content but causes no real-world harm count? Where’s the line between a near-miss and a disclosable event?',
    replies: [
      { id: 21, author: 'incident_db', initials: 'ID', body: 'The AI Incident Database treats near-misses as reportable. The statute likely intends material-harm or imminent-risk events only.', ago: '3h' },
      { id: 22, author: 'compliance_counsel', initials: 'CC', body: 'Document everything regardless — the 72-hour window starts at discovery, and you don’t want to be litigating “material” after the fact.', ago: '40m' },
      { id: 23, author: 'You', initials: 'YOU', body: 'A capability-eliciting jailbreak with a credible misuse path should be reported even absent realized harm.', ago: '25m' },
    ],
  },
  {
    id: 3, tag: 'Labs',
    title: 'Which frontier labs are actually registered vs. just claiming readiness?',
    author: 'transparency_now', initials: 'TN', ago: '1d', replyCount: 2, lastActivity: '6h',
    body: 'The registry shows a handful of accepted filings, but several majors have only published a framework without filing. How should the public read “unregistered” for a lab that operates in NY?',
    replies: [
      { id: 31, author: 'reg_watcher', initials: 'RW', body: 'Publishing a Responsible Scaling / Preparedness framework is not the same as registering. The registry is the system of record.', ago: '20h' },
      { id: 32, author: 'transparency_now', initials: 'TN', body: 'Exactly — and that distinction is the whole point of having a public registry.', ago: '6h' },
    ],
  },
  {
    id: 4, tag: 'Policy',
    title: 'How does 44-B interact with the EU AI Act’s GPAI obligations?',
    author: 'global_gov', initials: 'GG', ago: '2d', replyCount: 1, lastActivity: '1d',
    body: 'For a lab serving both markets, are the disclosure regimes compatible enough to file once and map across, or are these genuinely separate compliance tracks?',
    replies: [
      { id: 41, author: 'ml_lawyer', initials: 'ML', body: 'Overlapping but not identical. The GPAI Code of Practice covers systemic-risk docs that map closely to the § 1421(2) transparency report — but the filing mechanics differ.', ago: '1d' },
    ],
  },
  {
    id: 5, tag: 'Library',
    title: 'Best primary sources for understanding capability evaluations?',
    author: 'researcher_k', initials: 'RK', ago: '2d', replyCount: 0, lastActivity: '2d',
    body: 'Building a reading list on dangerous-capability evals for a disclosure annex. The library has the frameworks — what are the must-read methodology papers behind them?',
    replies: [],
  },
  {
    id: 6, tag: 'Incidents',
    title: 'Voice-cloning fraud attribution is basically impossible — now what?',
    author: 'You', initials: 'YOU', ago: '4h', replyCount: 1, lastActivity: '1h',
    body: 'NY-AI-2024-101 is marked Disputed because no provider could be attributed. If open models make attribution unwinnable, does incident reporting even function for that class of harm?',
    replies: [
      { id: 61, author: 'safety_eng', initials: 'SE', body: 'It shifts the burden to deployers and downstream controls — watermarking and provenance standards, not source attribution.', ago: '1h' },
    ],
  },
  {
    id: 7, tag: 'Compliance',
    title: 'Who signs the § 1421 attestation — counsel or the technical lead?',
    author: 'first_filer', initials: 'FF', ago: '1d', replyCount: 0, lastActivity: '1d',
    body: 'The portal asks for a “responsible signatory.” In practice, is this the compliance officer, the CTO, or a named executive? Curious how others are handling sign-off.',
    replies: [],
  },
]
