'use client'

// The + menu, trinity's shell (solar's SolarPlusMenu lineage) carrying NYSgpt's rows (2026-11-04):
// Skills (ways of answering the chat carries once picked), Onboarding (questions that teach the
// platform), API samples (real api.nysgpt.com responses to walk through), Models (the catalog's
// 24 cards), Boxes (the homepage topics), and Attach (the chat's PDF upload). Trinity's video
// rows — Scripts, Videos, Shorts, Voices, Generate video, Graphics, Templates — wait on a video
// pipeline and stayed home. Icons wear the sidebar's clothes: 18px, 1.75 stroke, lavender fill on
// row hover. The category list opens upward, no taller than the room above the +; the drill-down
// drawer adds a search field.

import { useState, useRef, useEffect } from 'react'
import { Plus, ChevronRight, ArrowLeft, X, Compass, Paperclip, Sparkles, Braces, Cpu, LayoutGrid } from 'lucide-react'

import { API_SAMPLES } from '@/lib/api-samples'
import { CHAT_SKILLS, type ChatSkill } from '@/lib/chat-skills'
import { compact } from '@/lib/compact'
import type { FootageFocus, GraphicKind } from '@/lib/footage'
import { HF_MODELS, SWITCHBOARD } from '@/lib/home-data'

/*  Each one teaches a page of the platform or the loop that joins them (Brendan's list, 2026-11-04). */
const ONBOARDING_QUESTIONS = [
  "What's inside the 12.1 billion records?",
  'What does the Legislative API cover?',
  'How do I get an API key?',
  "What's the difference between the NSR and RXIV encoders?",
  'When do I use a Reranker instead of an Encoder?',
  'What are the Alpha Class models? What do they do? Describe use cases.',
  'Which box on the home page should I start with?',
  'What can I ask about elections and precincts?',
  'Something looks wrong — how do I check a number?',
]

/* The API samples drawer: lib/api-samples' captured responses, one row per dataset. */
const SAMPLE_ROWS: { id: string; title: string; framing: string }[] = [
  { id: 'gov', title: 'Gov', framing: 'One bill — sponsors, roll calls, status' },
  { id: 'energy', title: 'Energy', framing: 'One plant — generators and net generation' },
  { id: 'tariffs', title: 'Tariffs', framing: 'One CROSS ruling with its HTS lines' },
  { id: 'health', title: 'Health', framing: 'One NPI — networks and negotiated rates' },
]

type DrillStep = 'categories' | 'skills' | 'prompts' | 'pick-sample' | 'pick-model' | 'pick-box'

export type ScriptChip = { id: string; title: string; short: string }
/** `youtube`: a YouTube video, whose score is its Outlier Score (views over its channel's median). */
export type VideoChip = { id: string; label: string; poster?: string; score: number | null; youtube?: boolean }

interface Props {
  videos: VideoChip[]
  shorts?: VideoChip[]
  onSelect: (text: string) => void
  /** A video picked from the menu (unused here until NYSgpt has shorts of its own). */
  onShort?: (v: VideoChip) => void
  /** Ignored: the menu always opens upward. */
  dropUp?: boolean
  onFootage?: (script: string, focus: FootageFocus) => void
  onBroll?: (id: string) => void
  onGraphic?: (kind: GraphicKind) => void
  hasScript?: boolean
  /** Attach: the chat's file upload, housed in the menu rather than beside it. */
  onAttach?: () => void
  onTemplates?: () => void
  /** A skill picked from the top of the menu: the chat carries it as a chip and in every message after. */
  onSkill?: (skill: ChatSkill) => void
}

/* Sidebar dress for every menu icon: 18px, 1.75 stroke, lavender fill on row hover. */
const ICON = 'icon-pop size-[18px] shrink-0 transition-colors text-slate-500 group-hover:fill-pax2-lavender group-hover:text-pax2-blue'

const params = (v: number) => {
  const f = compact(v)
  return `${f.count.toFixed(f.decimals)}${f.suffix}`
}

export function PlusMenu({ onSelect, onAttach, onSkill }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [step, setStep] = useState<DrillStep>('categories')
  const [search, setSearch] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  // The menu always opens upward, no taller than the room above the + inside whatever clips it
  // (the page's card), its rows scrolling past that.
  const [room, setRoom] = useState<number | null>(null)
  useEffect(() => {
    if (!menuOpen || !menuRef.current) return
    let top = 0
    for (let p = menuRef.current.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p)
      if (/(hidden|auto|scroll|clip)/.test(o.overflowY + o.overflow)) top = Math.max(top, p.getBoundingClientRect().top)
    }
    setRoom(Math.max(160, menuRef.current.getBoundingClientRect().top - top - 16))
  }, [menuOpen, step])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu()
    }
    if (menuOpen) document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const closeMenu = () => { setMenuOpen(false); setStep('categories'); setSearch('') }
  const goBack = () => { setStep('categories'); setSearch('') }
  const handleCategoryClick = (cat: Exclude<DrillStep, 'categories'>) => { setSearch(''); setStep(cat) }

  const q = search.toLowerCase()
  const filteredPrompts = ONBOARDING_QUESTIONS.filter(p => !search || p.toLowerCase().includes(q))
  const filteredSkills = CHAT_SKILLS.filter(k => !search || k.name.toLowerCase().includes(q) || k.about.toLowerCase().includes(q))
  const filteredSamples = SAMPLE_ROWS.filter(s => !search || s.title.toLowerCase().includes(q) || s.framing.toLowerCase().includes(q))
  const filteredModels = HF_MODELS.filter(m => !search || m.title.toLowerCase().includes(q) || m.body.toLowerCase().includes(q))
  const filteredBoxes = SWITCHBOARD.filter(b => !search || b.title.toLowerCase().includes(q) || b.body.toLowerCase().includes(q))

  const CATEGORIES: { key: Exclude<DrillStep, 'categories'>; label: string; icon: React.ReactNode }[] = [
    ...(onSkill ? [{ key: 'skills' as const, label: 'Skills', icon: <Sparkles className={ICON} strokeWidth={1.75} /> }] : []),
    { key: 'prompts', label: 'Onboarding', icon: <Compass className={ICON} strokeWidth={1.75} /> },
    { key: 'pick-sample', label: 'API samples', icon: <Braces className={ICON} strokeWidth={1.75} /> },
    { key: 'pick-model', label: 'Models', icon: <Cpu className={ICON} strokeWidth={1.75} /> },
    { key: 'pick-box', label: 'Boxes', icon: <LayoutGrid className={ICON} strokeWidth={1.75} /> },
  ]

  const stepLabel: Record<Exclude<DrillStep, 'categories'>, string> = {
    skills: 'skills',
    prompts: 'questions',
    'pick-sample': 'API samples',
    'pick-model': 'models',
    'pick-box': 'boxes',
  }

  const row = (i: number) => `group flex w-full items-center gap-3 px-4 py-3 hover:bg-[var(--inp-bg)] transition-colors ${i > 0 ? 'border-t border-[var(--border)]' : ''}`

  const isDrawer = step !== 'categories'
  const panelSide = 'bottom-full mb-2'

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => { if (menuOpen) { closeMenu() } else { setMenuOpen(true); setStep('categories'); setSearch('') } }}
        className={`order-1 sm:order-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          menuOpen ? 'bg-[rgba(0,0,0,0.07)] text-[var(--txt)]' : 'text-[var(--muted)] hover:bg-[rgba(0,0,0,0.07)] hover:text-[var(--txt)]'
        }`}
      >
        {menuOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>

      {/* Category screen */}
      {menuOpen && !isDrawer && (
        <div className={`absolute left-0 ${panelSide} w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden z-20`}>
          <div className="no-scrollbar overflow-y-auto py-1" style={room ? { maxHeight: room } : undefined}>
            {CATEGORIES.map((cat, i) => (
              <button key={cat.key} onClick={() => handleCategoryClick(cat.key)} className={row(i) + ' text-sm font-medium'}>
                {cat.icon}
                <span className="text-[var(--txt)]">{cat.label}</span>
                <ChevronRight className="h-4 w-4 ml-auto text-[var(--muted)]" />
              </button>
            ))}
            {/* A leaf, not a drill-down: picking it opens the file dialog. */}
            {onAttach && (
              <button onClick={() => { onAttach(); closeMenu() }} className={row(CATEGORIES.length) + ' text-sm font-medium'}>
                <Paperclip className={ICON} strokeWidth={1.75} />
                <span className="text-[var(--txt)]">Attach</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Drill-down drawer */}
      {menuOpen && isDrawer && (
        <div className={`absolute left-0 ${panelSide} w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden z-20`}>
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)]">
            <button onClick={goBack} className="text-[var(--muted)] hover:text-[var(--txt)] shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${stepLabel[step as Exclude<DrillStep, 'categories'>]}…`} autoFocus
              className="flex-1 bg-transparent text-base text-[var(--txt)] outline-none placeholder:text-[var(--muted2)]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[var(--muted)] hover:text-[var(--txt)] shrink-0">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto no-scrollbar" style={room ? { maxHeight: Math.min(320, room - 52) } : undefined}>

            {/* Skills — a way of answering, carried by the chat from here on */}
            {step === 'skills' && (
              <>
                {filteredSkills.map((k, i) => (
                  <button key={k.id} onClick={() => { onSkill?.(k); closeMenu() }} className={row(i) + ' items-start'}>
                    <Sparkles className={ICON} strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-semibold text-[var(--txt)]">{k.name}</span>
                      <span className="block text-xs text-[var(--muted)]">{k.about}</span>
                    </span>
                  </button>
                ))}
                {filteredSkills.length === 0 && <p className="px-4 py-3 text-xs text-[var(--muted)]">No matches</p>}
              </>
            )}

            {/* Onboarding — questions that teach the platform */}
            {step === 'prompts' && (
              <>
                {filteredPrompts.map((p, i) => (
                  <button key={p} onClick={() => { onSelect(p); closeMenu() }} className={row(i) + ' items-start'}>
                    <span className="text-sm text-[var(--txt)] text-left">{p}</span>
                  </button>
                ))}
                {filteredPrompts.length === 0 && <p className="px-4 py-3 text-xs text-[var(--muted)]">No matches</p>}
              </>
            )}

            {/* API samples — a captured api.nysgpt.com response, walked through in the chat */}
            {step === 'pick-sample' && (
              <>
                {filteredSamples.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => { onSelect(`Walk me through this ${s.title} API response — what it returns, how I'd change the request to ask my own question, and what a call costs:\n\n\`\`\`json\n${API_SAMPLES[s.id]}\n\`\`\``); closeMenu() }}
                    className={row(i) + ' items-start'}
                  >
                    <Braces className={ICON} strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-semibold text-[var(--txt)]">{s.title}</span>
                      <span className="block text-xs text-[var(--muted)]">{s.framing}</span>
                    </span>
                  </button>
                ))}
                {filteredSamples.length === 0 && <p className="px-4 py-3 text-xs text-[var(--muted)]">No matches</p>}
              </>
            )}

            {/* Models — the catalog's cards; picking one asks what it's for */}
            {step === 'pick-model' && (
              <>
                {filteredModels.map((m, i) => (
                  <button
                    key={m.title}
                    onClick={() => { onSelect(`What does ${m.title} do, and when would I reach for it over its neighbors?`); closeMenu() }}
                    className={row(i) + ' items-start'}
                  >
                    <Cpu className={ICON} strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-semibold text-[var(--txt)]">{m.title}</span>
                      <span className="block truncate text-xs text-[var(--muted)]">{m.body}</span>
                    </span>
                    <span className="shrink-0 text-xs text-[var(--muted)] tabular">{params(m.value)}</span>
                  </button>
                ))}
                {filteredModels.length === 0 && <p className="px-4 py-3 text-xs text-[var(--muted)]">No matches</p>}
              </>
            )}

            {/* Boxes — the homepage topics; picking one asks what's inside */}
            {step === 'pick-box' && (
              <>
                {filteredBoxes.map((b, i) => (
                  <button
                    key={b.title}
                    onClick={() => { onSelect(`What's inside the ${b.title} box?`); closeMenu() }}
                    className={row(i) + ' items-start'}
                  >
                    <LayoutGrid className={ICON} strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-semibold text-[var(--txt)]">{b.title}</span>
                      <span className="block truncate text-xs text-[var(--muted)]">{b.body}</span>
                    </span>
                    {b.tag && <span className="shrink-0 text-xs text-[var(--muted)]">{b.tag}</span>}
                  </button>
                ))}
                {filteredBoxes.length === 0 && <p className="px-4 py-3 text-xs text-[var(--muted)]">No matches</p>}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
