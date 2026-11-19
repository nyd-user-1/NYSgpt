'use client'

// Ported from solar (src/app/(app)/new-chat/NewChatClient.tsx): the same column (773px), the same
// empty state centered on the screen with the input box in the middle and Explore beneath it, the
// same drop of the input to the bottom once the first message is sent, the same streaming, stop
// and Space-to-stop. PAX2' skin is layered through the variables solar's markup already reads
// (--txt, --muted, --muted2, --border, --surface, --inp-bg) and the plum accent where solar's was.
// Voice input keeps solar's mic, waveform, accept and 60-second limit; the words come from the
// browser's own speech recognition (free, no key) instead of solar's /api/transcribe.
// Address mode is solar's too (pin, Places suggestions, the address chip in the input); where solar
// fetched a rooftop's solar numbers, the address here resolves to its Massachusetts House district
// and how its last race went (/api/district), and that rides along with the question.

import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowDown, ArrowUp, AtSign, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Loader2, MapPin, Mic, Paperclip, PlaySquare, Search, Sparkles, Square, User, Video, X } from 'lucide-react'

import { ChatFields } from '@/components/chat/chat-fields'
import { MarkdownContent } from '@/components/chat/markdown'
import type { Analysis } from '@/components/chat/record-flow'
import { ScriptCard } from '@/components/chat/script-card'
import { blockKey, withVersions } from '@/lib/studio'
import { useDraft } from '@/components/record/draft'
import { answersText, parseChoiceBlock, parseCiteBlock, parseFieldBlock, stripChoiceBlock, stripFieldBlock, stripOpenBlock } from '@/lib/chat-fields'
import { useShellPanel } from '@/components/shell'
import { PlusMenu, type ScriptChip, type VideoChip } from '@/components/chat/plus-menu'
import dynamic from 'next/dynamic'
import { BorderLight } from '@/components/border-light'
import type { ChatSkill } from '@/lib/chat-skills'
import { cn } from '@/lib/utils'
import { isShelfDrag, readShelfDrag } from '@/lib/shelf-drag'
import { useShelf } from '@/lib/home-blocks'
import { BLOCK_REF, ChatBlock } from '@/components/chat/chat-block'
import { ModelPicker, useChatModel } from '@/components/chat/model-picker'
import { useVideoModel } from '@/components/chat/video-model-picker'
import { ScopePicker, useScope } from '@/components/chat/scope-picker'
import type { FootageFocus, FootageShow } from '@/lib/footage'
import { ResponseFooter } from '@/components/chat/response-footer'
import { saveChat } from '@/app/chat-actions'
import { answerChip, chipOffers } from '@/app/question-actions'
import { ChipRow, MeasuredFooter, measuredContent, splitMeasured } from '@/components/chat/measured'
import { useUsage } from '@/components/usage-beacon'
import type { ChipOffer, Surface } from '@/lib/question-resolver'
import { RestOrb, ThinkingOrb } from '@/components/agents/orbs'
import { filterMentions, MentionList, mentionContext, type Mention } from '@/components/chat/mentions'
import { BLOCK_EXAMPLES } from '@/components/chat/block-examples'
import { ONBOARD_OPENER } from '@/lib/chat-onboard'

type Message = { id: string; role: 'user' | 'assistant'; content: string; model?: string }

/** A reply split at its [[block:…]] references: prose to render as markdown, and the blocks between. */
function pieces(content: string): ({ text: string } | { path: string; anchor: string })[] {
  const out: ({ text: string } | { path: string; anchor: string })[] = []
  let at = 0
  for (const m of content.matchAll(BLOCK_REF)) {
    if (m.index! > at) out.push({ text: content.slice(at, m.index) })
    out.push({ path: m[1], anchor: m[2] })
    at = m.index! + m[0].length
  }
  if (at < content.length) out.push({ text: content.slice(at) })
  return out
}
// A filled video template in a reply: a ```pax-video block holding { templateId, props } as JSON, and
// "parent" when it revises a saved version (the model writes them; so does src/video/gallery.ts). Each
// draws as a VideoBlock where it stands in the prose; a block still streaming in shows nothing until it closes.
const VIDEO_BLOCK = /```pax-video\s*\n([\s\S]*?)```/g
type VideoSpec = { templateId: string; props: unknown; parent?: string; title?: string }
function videoSplit(text: string): ({ text: string } | { video: VideoSpec | null; raw: string })[] {
  const out: ({ text: string } | { video: VideoSpec | null; raw: string })[] = []
  let at = 0
  for (const m of text.matchAll(VIDEO_BLOCK)) {
    if (m.index! > at) out.push({ text: text.slice(at, m.index) })
    let video: VideoSpec | null = null
    try {
      const v = JSON.parse(m[1]) as { templateId?: unknown; props?: unknown; parent?: unknown; title?: unknown }
      if (typeof v.templateId === 'string')
        video = { templateId: v.templateId, props: v.props, parent: typeof v.parent === 'string' ? v.parent : undefined, title: typeof v.title === 'string' ? v.title : undefined }
    } catch {}
    out.push({ video, raw: m[1] })
    at = m.index! + m[0].length
  }
  const rest = text.slice(at).replace(/```pax-video[\s\S]*$/, '')
  if (rest) out.push({ text: rest })
  return out
}
type Suggestion = { place_id: string; description: string }
type SelectedAddress = { description: string; lat: number; lng: number }
type PlaceRace = { election: string; candidates: { name: string; party: string; votes: number; won: boolean }[]; contested: boolean }
export type PlaceInsight = { district: string | null; state?: string; chamber?: string; members?: { name: string; party: string }[]; race?: PlaceRace | null; previous?: PlaceRace | null; note?: string; question3?: { yes: number; no: number; undecided: number; pollster: string } }

// The browser's speech recognition (Chrome, Edge, Safari): not in TypeScript's DOM types.
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; abort: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null }
const speechRecognition = () => (typeof window === 'undefined' ? undefined : ((window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition))

// The empty state's PAX draws itself with GSAP; its code loads only when that state shows, since the
// chat also sits in every page's side panel.
const FootageBlock = dynamic(() => import('@/components/chat/footage-block').then((m) => m.FootageBlock), { ssr: false })
const BrollBlock = dynamic(() => import('@/components/chat/footage-block').then((m) => m.BrollBlock), { ssr: false })
// A message the + menu placed carries what it shows in `model`: library-shots (Generate video), library-graphics
// (Graphics), library-broll (one generic b-roll shot, its id in a pax-broll block); plain library shows both cards.
const footageShow = (model?: string): FootageShow | undefined => (model === 'library-shots' ? 'shots' : model === 'library-graphics' ? 'graphics' : undefined)
const brollOf = (m: { model?: string; content: string }) => (m.model === 'library-broll' ? m.content.replace(/```(pax-broll)?/g, '').trim() : null)
const TextType = dynamic(() => import('@/components/text-type'), { loading: () => <span className="block h-[65px]" /> })
// Remotion's Player and the templates load the first time a reply carries a video.
const VideoBlock = dynamic(() => import('@/components/chat/video-block').then((m) => m.VideoBlock), { ssr: false, loading: () => <div className="aspect-video w-full animate-pulse rounded-xl bg-pax2-surface/70" /> })
// The record flow (camera, upload, the template chooser with Remotion's Player and zod) loads when Record is pressed.
const RecordFlow = dynamic(() => import('@/components/chat/record-flow').then((m) => m.RecordFlow), { ssr: false })
/** The composer's microphone button. Off (Brendan, 2026-11-19): he asked for it to be removed. The voice code is kept. */
const VOICE_INPUT: boolean = false

// NYSgpt's lines (Brendan, 2026-11-19), in the source's pattern: one per masthead set, then the source's last line.
const READY = ['Ready to find a database?', 'Ready to find a table?', 'Ready to find a model?', 'Ready to find a platform?', 'Ready to find an answer?', 'Ready. Set. Go.']

const RECORD_OPENER = "I'm ready to make my first video — where do we start?"

/** The displayed stream runs this far behind the wire, so the skeleton has its beat before the words land. */
const STREAM_LAG = 500

/** Two shimmering lines below the streaming text: the shape of what's coming, half a second early. */
function StreamSkeleton() {
  return (
    <span className="mt-3 block space-y-2">
      <span className="block h-4 w-11/12 animate-pulse rounded bg-pax2-surface/70" />
      <span className="block h-4 w-3/5 animate-pulse rounded bg-pax2-surface/70" />
    </span>
  )
}

// Record mode (the camera button): the conversation becomes an onboarding that ends in a recording,
// made on this page. Questions go out as real controls (a pax-fields block the transcript renders as
// inputs, from-sam's pattern); the final script gets a Record button that opens the camera in place.
const RECORD_GUIDE = `RECORD MODE — the user pressed the camera. From here the conversation is an onboarding that culminates in a recording, made right here on this page. Run it one short question at a time: who they are in a few words, their town, then why open primaries matter to them personally.
Ask each question as real controls: one short line of prose, then a \`\`\`pax-fields\`\`\` code block holding a JSON array of one or two fields, e.g. [{"key":"town","label":"Your town","kind":"text","placeholder":"Worcester"}]. Kinds: "text", "textarea", and "choice" with "options": ["…"]. The user may fill the controls or type in the chat box — both are the answer. Never mention the block or the controls in prose.
Then draft a script in their own words — hook under 12 words, first person, one concrete number, 50 to 60 words (about 25 seconds spoken), ending with what the viewer should do. Write it from the EVIDENCE section of the system prompt: build the hook on the Upworthy findings, make the choices the Swayable and channel findings support, and keep it a persuasion piece apart from what the Wesleyan coding says everyone else ran. The concrete number comes from FACTS only, stated as written there; never use a number from anywhere else. Refine it with them until it sounds like them. Put every draft alone in a \`\`\`pax-script code block (that tag, nothing else inside); the page shows it as a script card with a Record button, so never tell them to copy it anywhere. Right after every draft's code block, add a \`\`\`pax-cite\`\`\` block: a JSON array with one entry per line that leans on evidence, each {"quote": "<a few exact words from that line>", "note": "<one sentence: why the line is written this way>", "ids": ["<evidence ids from the EVIDENCE section>"]}. Cite only ids that are listed. Never mention the block in prose. When they are happy, invite them to press Record on the card — the camera opens here and the teleprompter scrolls their words at their own pace, nothing to memorize.
Terms of the craft (hook, concrete number, explicit ask) are underlined and defined on hover wherever they appear, so use them naturally; a one-line definition in prose is welcome here and there, never more than one per reply.
When they send the take, it is kept in Clips as their own clip: it plays in their library on /clips, only they see it there, and an admin can make it an arm of a message test. Say so once, lightly, when the moment fits.
After the script is delivered the Record button stays on its card. If they ask something else instead of recording, answer it, then add one supportive line pointing back to recording — one follow-up, never pushy. If they name a barrier (nerves, time, lighting), address or soothe that barrier and encourage them past it; a named barrier invites one more follow-up, and only one. If they still decline, close warmly: one encouragement, then offer a calendar invite to record another day, or to connect them with a communications specialist who will walk them through it. If they change the subject entirely, say in one line that their script is saved right here in the chat, then help with the new task. Keep every turn to one question or one revision.`

/** Seeds already asked, so reopening the panel does not ask its chip again. */
const ASKED = new Set<number>()

/** The script: the last ```pax-script block in a reply. Replies written before the tag existed put the
 *  script in an untagged block with its ```pax-cite block right after it; that pairing marks it too.
 *  Every other code block is code, and renders as the code card. */
function scriptText(content: string): string | null {
  let out: string | null = null
  for (const m of content.matchAll(/```([\w-]*)[^\S\n]*\n?([\s\S]*?)```/g)) {
    const legacy = m[1] === '' && /^\s*```pax-cite/.test(content.slice(m.index! + m[0].length))
    if (m[1] !== 'pax-script' && !legacy) continue
    const body = m[2].trim()
    if (body) out = body
  }
  return out
}

/** Split a reply around the block holding `script`, which the script card renders in the block's place. */
function splitAtScript(text: string, script: string): { before: string; after: string } | null {
  let last: { start: number; end: number } | null = null
  for (const m of text.matchAll(/```([\w-]*)[^\S\n]*\n?([\s\S]*?)```/g)) {
    if (m[2].trim() === script) last = { start: m.index!, end: m.index! + m[0].length }
  }
  return last ? { before: text.slice(0, last.start).trimEnd(), after: text.slice(last.end).trimStart() } : null
}

/** Mid-stream, a ```pax-script block that has opened but not yet closed: the prose before it and the
 *  script so far, so the card fills in as the words arrive. */
function openScript(text: string): { before: string; partial: string } | null {
  const at = text.lastIndexOf('```pax-script')
  if (at < 0 || text.indexOf('```', at + 3) >= 0) return null
  return { before: text.slice(0, at).trimEnd(), partial: text.slice(at + '```pax-script'.length).replace(/^[^\S\n]*\n?/, '') }
}

const SKIN = {
  '--txt': 'var(--t-ink, #0f172a)',
  '--muted': 'var(--t-ink-3, #64748b)',
  '--muted2': 'var(--t-ink-4, #94a3b8)',
  '--border': 'var(--t-rule, #e2e8f0)',
  '--surface': 'var(--t-surface, #ffffff)',
  '--inp-bg': 'var(--t-surface, #ffffff)',
} as React.CSSProperties

const ask = (v: VideoChip) => `What explains the score on ${v.label}?`

/** `context` supplies extra system context per message (the graph canvas's dock passes what is on
 *  the canvas); `attachment` renders above the input box (the dock's attached-entity banner).
 *  /app/home dresses the same chat as its front page: `heading` stands in for the wordmark,
 *  `below` hangs under the input in the empty state, `explore: false` yields that spot, and
 *  `shelf` renders past the fold — the empty state fills the viewport and the shelf scrolls up.
 *  `chatId` keeps the conversation (/chat only): it saves to the reader's chats once the first message
 *  goes out and after every reply, the URL becomes /chat?c=<id>, and the sidebar's list refreshes;
 *  `initialMessages` reopens a saved one.
 *  `chipVideo` preloads a video for the question bank's chips (the video page's side panel); on /chat a
 *  short attached from the plus menu brings them. `surface` names where the chips show, for the log.
 *  `record` opens in record mode with the opener in the box (/chat?record=1, from /recording). */
export function Chat({ scripts = [], videos = [], shorts = [], compact = false, context, attachment, heading, below, explore = true, shelf, chatId, initialMessages, chipVideo, surface = 'chat', record = false, seedChip = null, seedNonce, onboard }: { scripts?: ScriptChip[]; videos?: VideoChip[]; shorts?: VideoChip[]; compact?: boolean; context?: () => string; attachment?: React.ReactNode; heading?: React.ReactNode; below?: React.ReactNode; explore?: boolean; shelf?: React.ReactNode; chatId?: string; initialMessages?: Message[]; chipVideo?: string; surface?: Surface; record?: boolean; seedChip?: ChipOffer | null; seedNonce?: number; /** The onboarding guide (lib/chat-onboard.ts), when the PAX mark opened this chat: rides systemContext, and the opener sends itself. */ onboard?: string }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? [])
  const [input, setInput] = useState(record && !initialMessages?.length ? RECORD_OPENER : '')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<VideoChip | null>(null)
  // The question bank's chips: drawn for the video in context, each draw logged as chip-shown with its
  // position and propensity, each tap as chip-tap (learning/chat-suggested-prompts.json). A tapped chip
  // leaves the row and the next draw excludes it.
  const [chipTarget, setChipTarget] = useState<string | null>(chipVideo ?? null)
  // The panel's video can change under a mounted chat (the next video page asking): its chips follow.
  useEffect(() => {
    if (chipVideo && chipVideo !== chipTarget) { setChipTarget(chipVideo); setTapped([]) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chipVideo])
  const [chips, setChips] = useState<ChipOffer[]>([])
  const [tapped, setTapped] = useState<string[]>([])
  const logUsage = useUsage()
  useEffect(() => {
    if (!chipTarget) { setChips([]); return }
    let live = true
    chipOffers(chipTarget, surface, tapped)
      .then((cs) => {
        if (!live) return
        setChips(cs)
        for (const c of cs) logUsage('chip-shown', c.id, { position: c.position, propensity: c.propensity, surface, videoId: chipTarget })
      })
      .catch(() => {})
    return () => { live = false }
  }, [chipTarget, surface, tapped, logUsage])
  const [isFocused, setIsFocused] = useState(false)
  // How far the input has grown past its one line, so the empty page can hold the box's foot in place.
  const [grow, setGrow] = useState(0)
  // A skill from the + menu: a chip in the composer, its instructions in every message after it.
  const [skill, setSkill] = useState<ChatSkill | null>(null)
  const { openPane } = useShellPanel()
  // Mentions (docs/briefs/chat-mentions.md): @ opens the popover; the pick binds one entity as a chip and
  // a MENTION line in the request's context. The orb's follow-ups and the brief's delivery live below too.
  const [mention, setMention] = useState<Mention | null>(null)
  const [mentionIdx, setMentionIdx] = useState(0)
  const [mentionHidden, setMentionHidden] = useState(false)
  const [followUps, setFollowUps] = useState<Record<string, string[] | 'loading'>>({})
  const [followUpsFor, setFollowUpsFor] = useState<string | null>(null)
  const [briefSend, setBriefSend] = useState<{ org: Mention; subject: string; body: string; id: string } | null>(null)
  const [briefSendError, setBriefSendError] = useState<string | null>(null)
  const [briefSent, setBriefSent] = useState<string | null>(null)
  // Search mode, after hq's send-box search: the box searches this conversation, every hit lit in the
  // transcript (the CSS Highlight API), the current one red; Enter and ⇧Enter step, Escape leaves.
  const [searchMode, setSearchMode] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchMine, setSearchMine] = useState(false)
  const [searchAt, setSearchAt] = useState(0)
  const [searchHits, setSearchHits] = useState(0)
  const messagesRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const hitsRef = useRef<Range[]>([])
  // Bumped when the transcript's DOM changes under a search (an answer re-renders its words), so the
  // hits are found again on live nodes.
  const [domTick, setDomTick] = useState(0)
  const [hitTick, setHitTick] = useState(0)
  useEffect(() => {
    const root = messagesRef.current
    if (!searchMode || !root) return
    let t: number | undefined
    const o = new MutationObserver(() => {
      window.clearTimeout(t)
      t = window.setTimeout(() => setDomTick((n) => n + 1), 200)
    })
    o.observe(root, { subtree: true, childList: true, characterData: true })
    return () => {
      window.clearTimeout(t)
      o.disconnect()
    }
  }, [searchMode])
  const [model, setModel] = useChatModel()
  const [videoModel] = useVideoModel()
  // NYSgpt (brief 49): what the chat searches, in the composer's second picker (scope-picker.tsx), sent with each question.
  const [scope, setScope] = useScope()
  // A script the plus menu put in the chat (or picked a graphic for), and what its footage block should light.
  const [footageFocus, setFootageFocus] = useState<{ script: string; focus: FootageFocus } | null>(null)
  const [recordMode, setRecordMode] = useState(record)
  // The close of record mode: the recording happens in the transcript itself — Record on the
  // script card opens the flow's cards right under the conversation, the script in the session draft.
  const [flowScript, setFlowScript] = useState<string | null>(null)
  // The camera button's dot: the video finished processing while they were elsewhere in the chat.
  const [videoReady, setVideoReady] = useState(false)
  // The scored video's analysis rides every later turn, so the walkthrough can continue naturally.
  const analysisRef = useRef<string | null>(null)
  // The reader is scrolled up in the conversation; the round arrow brings them back to the end.
  const [away, setAway] = useState(false)
  const { update: updateDraft } = useDraft()

  // Saved between turns, never mid-stream; a reopened chat is not re-saved until it changes.
  const savedRef = useRef(initialMessages?.length ? JSON.stringify(initialMessages) : '')
  useEffect(() => {
    if (!chatId || streaming || messages.length === 0) return
    const sig = JSON.stringify(messages)
    if (sig === savedRef.current) return
    savedRef.current = sig
    saveChat(chatId, messages)
      .then((meta) => {
        if (!meta) return
        const u = new URL(window.location.href)
        if (u.pathname === '/chat' && u.searchParams.get('c') !== chatId) {
          u.searchParams.set('c', chatId)
          u.searchParams.delete('record')
          window.history.replaceState(window.history.state, '', u)
        }
        window.dispatchEvent(new Event('pax2:chats'))
      })
      .catch(() => {})
  }, [chatId, streaming, messages])

  // A Blocks-shelf tile dropped on the chat attaches as context, after livingston's drag-to-chat: a short
  // carries its own facts; a block is read from its page at drop time (/api/block-context), so the chat
  // gets what the block shows now. The ribbon over the input names it; the X lets it go.
  const [attached, setAttached] = useState<{ kind: 'block' | 'video'; title: string; place: string; context: string | null; error?: string; key?: string; scope?: { db: string | null; table: string | null } } | null>(null)
  const blocksShelf = useShelf()
  const [dragOver, setDragOver] = useState(false)
  // The drop's page is still being read into context; the ribbon shimmers and Send holds until it lands.
  const reading = !!attached && attached.context == null && !attached.error
  // A PDF attached with the paperclip: sent with every question in this conversation until let go.
  const [pdf, setPdf] = useState<{ name: string; data: string; size: number } | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const pdfInput = useRef<HTMLInputElement>(null)
  const pickPdf = (f: File | undefined) => {
    setPdfError(null)
    if (!f) return
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) return setPdfError('Only PDFs attach here.')
    if (f.size > 3_500_000) return setPdfError('That PDF is over 3.5 MB.')
    const r = new FileReader()
    r.onload = () => setPdf({ name: f.name, data: String(r.result).split(',')[1] ?? '', size: f.size })
    r.onerror = () => setPdfError('That PDF could not be read.')
    r.readAsDataURL(f)
  }
  // A video picked from Explore or the + menu is attached the way a dropped one is: its video page is read
  // into the chat's context, so the answer works from what PAX2 holds on it, not the scored takes alone.
  const attachVideo = async (v: VideoChip) => {
    const [title, channel] = v.label.split(' · ')
    const path = v.youtube ? `/v/yt-${v.id}` : `/v/${v.id}`
    const head = `ACTIVE CONTEXT — the user picked the ${v.youtube ? 'short' : 'take'} "${title}"${channel ? ` by ${channel}` : ''}. Its video page, ${path}, shows right now, block by block (each block's [[block:…]] reference beside its title):`
    setAttached({ kind: 'video', title, place: channel ?? path, context: null })
    try {
      const r = await fetch('/api/block-context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) })
      const j = (await r.json()) as { text?: string; error?: string }
      setAttached((a) => (a && a.title === title ? { ...a, context: j.text ? `${head}\n${j.text}` : null, error: j.error ?? (j.text ? undefined : 'nothing on its page') } : a))
    } catch (x) {
      setAttached((a) => (a && a.title === title ? { ...a, error: (x as Error).message } : a))
    }
  }

  const attach = async (e: React.DragEvent) => {
    const d = readShelfDrag(e.dataTransfer)
    setDragOver(false)
    if (!d) return
    e.preventDefault()
    // NYSgpt (brief 49): a box from NYSgpt's Blocks panel. A database or a table narrows the table search to it.
    if (d.kind === 'box') {
      const scope = d.set === 'data' ? { db: d.title, table: null } : d.set === 'tables' ? { db: d.group, table: d.title } : undefined
      if (!input.trim()) setInput(`What does the ${d.title} block tell us?`)
      setTimeout(() => textareaRef.current?.focus(), 0)
      setAttached({ kind: 'block', title: d.title, place: d.group, key: d.key, scope, context: `ACTIVE CONTEXT — the user attached the "${d.title}" block from NYSgpt's Blocks (${d.set === 'data' ? 'a database' : d.set === 'tables' ? `a table in ${d.group}` : d.group}).${scope ? ' The table search is limited to it.' : ''}` })
      return
    }
    const seed = d.kind === 'block' ? `What does the ${d.title} block tell us?` : `What explains how "${d.title}" performed?`
    if (!input.trim()) setInput(seed)
    setTimeout(() => textareaRef.current?.focus(), 0)
    // A short is read from its video page, every block on it; a block from its own page, that block alone.
    const path = d.kind === 'video' ? `/v/yt-${d.id}` : d.path
    const head = d.kind === 'video'
      ? `ACTIVE CONTEXT — the user attached the short "${d.title}" by ${d.channel} (${d.duration}, ${d.ratio}× its channel's median views). Its video page, ${path}, shows right now, block by block (each block's [[block:…]] reference beside its title):`
      : `ACTIVE CONTEXT — the user attached the "${d.title}" block from the page ${d.path}. What it shows right now:`
    setAttached({ kind: d.kind, title: d.title, place: d.kind === 'video' ? d.channel : d.path, context: null, key: d.kind === 'block' ? `${d.path}#${d.anchor}` : undefined })
    try {
      const r = await fetch('/api/block-context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d.kind === 'video' ? { path } : { path, anchor: d.anchor }) })
      const j = (await r.json()) as { text?: string; error?: string }
      setAttached((a) => (a && a.title === d.title ? { ...a, context: j.text ? `${head}\n${j.text}` : null, error: j.error } : a))
      // Nothing to read means nothing to ask about: the starter question goes back out.
      if (!j.text) setInput((v) => (v === seed ? '' : v))
    } catch (x) {
      setAttached((a) => (a && a.title === d.title ? { ...a, error: (x as Error).message } : a))
    }
  }

  // Address
  const [addressMode, setAddressMode] = useState(false)
  const [addressInput, setAddressInput] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null)
  const [placeInsight, setPlaceInsight] = useState<PlaceInsight | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const exploreScrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Arriving in record mode, the caret waits at the end of the opener.
  useEffect(() => {
    const t = textareaRef.current
    if (record && t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length) }
  }, [record])
  const abortControllerRef = useRef<AbortController | null>(null)

  // ── Voice recording ──
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  const [toast, setToast] = useState<string | null>(null)
  const recognitionRef = useRef<Recognition | null>(null)
  const heardRef = useRef('')
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopAndTranscribeRef = useRef<() => void>(() => {})

  // ── Waveform visualization ──
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const waveDataRef = useRef<number[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Follow the stream only while the reader is already at the end; scrolled up to read, the page
  // holds still and the round arrow is the way back down.
  const stickRef = useRef(true)
  useEffect(() => { if (stickRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Geolocation for address bias
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}
      )
    }
  }, [])

  // Focus textarea when entering address mode
  useEffect(() => {
    if (addressMode) setTimeout(() => textareaRef.current?.focus(), 50)
  }, [addressMode])

  // Auto-dismiss voice toasts
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [toast])

  // Stop mic/recognition on unmount (discard partial recordings)
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current)
      recognitionRef.current?.abort()
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      audioCtxRef.current?.close().catch(() => {})
    }
  }, [])

  // The input grows with its text, a script the + menu puts in included, to five lines (147px at 17px
  // relaxed), then holds and scrolls. Pinned to the foot it grows upward on its own; on the empty page
  // the box's foot is held where it is and the heading rises with it.
  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const h = Math.min(el.scrollHeight, 147)
    el.style.height = `${h}px`
    setGrow(Math.max(0, h - 40))
  }
  useEffect(() => autoResize(), [input])

  // Search mode's hits: every match of the query in the transcript (the user's own turns alone when
  // filtered), registered as highlights; the current one scrolled into view.
  useEffect(() => {
    const api = (globalThis as unknown as { CSS?: { highlights?: Map<string, unknown> }; Highlight?: new (...r: Range[]) => unknown })
    const reg = api.CSS?.highlights
    const clear = () => {
      reg?.delete('pax-chat-hit')
      reg?.delete('pax-chat-hit-active')
    }
    const needle = searchQ.trim().toLowerCase()
    const root = messagesRef.current
    if (!searchMode || !needle || !root || !reg || !api.Highlight) {
      hitsRef.current = []
      setSearchHits(0)
      clear()
      return clear
    }
    const t = window.setTimeout(() => {
      const ranges: Range[] = []
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const turn = n.parentElement?.closest('[data-turn]')
        if (!turn || (searchMine && turn.getAttribute('data-turn') !== 'user')) continue
        const text = (n.textContent ?? '').toLowerCase()
        for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + needle.length)) {
          const r = document.createRange()
          r.setStart(n, i)
          r.setEnd(n, i + needle.length)
          ranges.push(r)
        }
      }
      hitsRef.current = ranges
      setSearchHits(ranges.length)
      setSearchAt((i) => (i < ranges.length ? i : 0))
      if (ranges.length) {
        reg.set('pax-chat-hit', new api.Highlight!(...ranges))
        setHitTick((n) => n + 1)
      } else clear()
    }, 150)
    return () => {
      window.clearTimeout(t)
      clear()
    }
  }, [searchMode, searchQ, searchMine, messages, domTick])
  useEffect(() => {
    const api = (globalThis as unknown as { CSS?: { highlights?: Map<string, unknown> }; Highlight?: new (...r: Range[]) => unknown })
    const r = hitsRef.current[searchAt]
    const root = messagesRef.current
    if (!r || !root || !api.CSS?.highlights || !api.Highlight) return
    api.CSS.highlights.set('pax-chat-hit-active', new api.Highlight(r))
    const box = r.getBoundingClientRect()
    const view = root.getBoundingClientRect()
    if (box.top < view.top + 24 || box.bottom > view.bottom - 24) root.scrollTop += box.top - view.top - view.height / 3
  }, [searchAt, searchHits, hitTick])
  const stepHit = (by: number) => setSearchAt((i) => (searchHits ? (i + by + searchHits) % searchHits : 0))
  const leaveSearch = () => {
    setSearchMode(false)
    setSearchQ('')
    setSearchMine(false)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleInputChange = (value: string) => {
    setInput(value)
    autoResize()
  }

  /** Send `text`; `base` is the conversation before it (Retry passes the turns before the retried one). */
  const submit = async (text: string, base: Message[] = messages) => {
    const trimmed = text.trim()
    // An attachment still being read would go out empty: wait for it.
    if (!trimmed || loading || streaming || reading) return
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    const allMessages = [...base, userMsg]
    stickRef.current = true
    setMessages(allMessages)
    setInput('')
    setSelectedVideo(null)
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.focus() }
    setLoading(true)
    try {
      const controller = new AbortController()
      abortControllerRef.current = controller
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The model reads its own video blocks back with the versions they were saved as (lib/studio.ts withVersions).
        body: JSON.stringify({ messages: allMessages.map(m => ({ role: m.role, content: m.role === 'assistant' ? withVersions(m.content, (json) => blockKey(chatId, m.id, json)) : m.content })), ...(pdf ? { document: { name: pdf.name, data: pdf.data } } : {}), ...(selectedAddress ? { address: selectedAddress.description, place: placeInsight } : {}), ...((context || attached?.context || recordMode || analysisRef.current || skill || mention || onboard) ? { systemContext: [context?.(), attached?.context, recordMode ? RECORD_GUIDE : null, onboard ?? null, analysisRef.current, skill?.instructions, mention ? mentionContext(mention) : null].filter(Boolean).join('\n\n') } : {}), ...(recordMode ? { record: true } : {}), ...(attached?.scope ? { scope: attached.scope } : scope.db ? { scope } : {}), model }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const gate = res.status === 402 ? ((await res.json().catch(() => null)) as { error?: string } | null) : null
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: gate?.error ?? 'Something went wrong. Please try again.' }])
        setLoading(false); return
      }
      const assistantId = crypto.randomUUID()
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', model }])
      setLoading(false); setStreaming(true)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        // Half a second behind real time (Brendan, 2026-11-03): each chunk lands on the same delay, in
        // order, so the skeleton below the text shows for a beat before the words replace it.
        setTimeout(() => setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m)), STREAM_LAG)
      }
    } catch {
      if (!abortControllerRef.current?.signal.aborted) setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Connection error. Please check your network and try again.' }])
    } finally { setLoading(false); setTimeout(() => setStreaming(false), STREAM_LAG) }
  }

  const fetchSuggestions = useCallback((value: string, loc?: { lat: number; lng: number } | null) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length < 3) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        let url = `/api/places?input=${encodeURIComponent(value)}`
        if (loc) url += `&lat=${loc.lat}&lng=${loc.lng}`
        const res = await fetch(url)
        const data = await res.json()
        setSuggestions(Array.isArray(data) ? data : [])
      } catch { setSuggestions([]) }
    }, 300)
  }, [])

  const submitWithAddress = async (text: string, addr: SelectedAddress, insight: PlaceInsight | null) => {
    if (!text.trim() || loading || streaming) return
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const body: Record<string, unknown> = { messages: [{ role: 'user', content: text }], address: addr.description }
      if (insight) body.place = insight
      if (context) body.systemContext = context()
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok || !res.body) { setLoading(false); return }
      const assistantId = crypto.randomUUID()
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])
      setLoading(false); setStreaming(true)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setTimeout(() => setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m)), STREAM_LAG)
      }
    } catch { /* silent */ } finally { setLoading(false); setTimeout(() => setStreaming(false), STREAM_LAG) }
  }

  const selectAddress = async (sg: Suggestion) => {
    setAddressMode(false)
    setAddressInput('')
    setSuggestions([])
    setPlaceInsight(null)
    try {
      const geoRes = await fetch(`/api/places/geocode?place_id=${sg.place_id}`)
      const geo = await geoRes.json()
      if (!geo.lat || !geo.lng) throw new Error('Geocode failed')
      const addr: SelectedAddress = { description: sg.description, lat: geo.lat, lng: geo.lng }
      setSelectedAddress(addr)
      // Look up the district before submitting so the answer gets the address's real race
      const dRes = await fetch(`/api/district?lat=${geo.lat}&lng=${geo.lng}`)
      const d = await dRes.json()
      const insight: PlaceInsight | null = dRes.ok && !d.error ? (d as PlaceInsight) : null
      setPlaceInsight(insight)
      submitWithAddress(`Who represents this address, and did they face an opponent last election? ${sg.description}`, addr, insight)
    } catch {
      setToast('Could not look up that address')
    }
  }

  const clearAddress = () => { setSelectedAddress(null); setPlaceInsight(null) }

  const exitAddressMode = () => { setAddressMode(false); setAddressInput(''); setSuggestions([]) }

  const stopStream = () => {
    abortControllerRef.current?.abort()
    setStreaming(false)
    setLoading(false)
  }

  // Spacebar stops streaming when not focused in an input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!streaming) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') { e.preventDefault(); stopStream() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming])

  // Enter accepts dictation (same as tapping ✓) when recording is active
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (recordingState !== 'recording') return
      if (e.key === 'Enter') { e.preventDefault(); stopAndTranscribeRef.current() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [recordingState])

  const stopWaveform = () => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null; analyserRef.current = null
    waveDataRef.current = []
  }

  const startWaveformFromStream = (stream: MediaStream) => {
    try {
      const ctx = new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      audioCtxRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      ctx.createMediaStreamSource(stream).connect(analyser)
      const draw = () => {
        animFrameRef.current = requestAnimationFrame(draw)
        const canvas = canvasRef.current
        if (!canvas) return
        const c = canvas.getContext('2d')
        if (!c) return
        const a = analyserRef.current
        if (!a) return
        const buf = new Uint8Array(a.frequencyBinCount)
        a.getByteTimeDomainData(buf)
        let sum = 0
        for (const v of buf) sum += (v - 128) ** 2
        const rms = Math.min(1, Math.sqrt(sum / buf.length) / 48)
        waveDataRef.current = [...waveDataRef.current.slice(-150), rms]
        const W = canvas.clientWidth, H = canvas.clientHeight
        if (canvas.width !== W * 2 || canvas.height !== H * 2) { canvas.width = W * 2; canvas.height = H * 2; c.scale(2, 2) }
        c.clearRect(0, 0, W, H)
        const barW = 2, gap = 2, total = barW + gap
        const bars = waveDataRef.current.slice(-Math.floor(W / total))
        bars.forEach((v, i) => {
          const h = Math.max(2, v * H * 0.85)
          c.fillStyle = 'rgba(120,120,120,0.85)'
          c.fillRect(i * total, H / 2 - h / 2, barW, h)
        })
      }
      draw()
    } catch { /* ignore */ }
  }

  const releaseMic = () => {
    if (recordingTimerRef.current) { clearTimeout(recordingTimerRef.current); recordingTimerRef.current = null }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    stopWaveform()
  }

  const cancelRecording = () => {
    const r = recognitionRef.current
    recognitionRef.current = null
    if (r) { r.onend = null; r.abort() }
    heardRef.current = ''
    releaseMic()
    setRecordingState('idle')
  }

  const stopAndTranscribe = () => {
    const r = recognitionRef.current
    if (!r) return
    releaseMic()
    setRecordingState('transcribing')
    // The last words arrive in a final result just before the recognizer ends.
    r.onend = () => {
      recognitionRef.current = null
      const text = heardRef.current.trim()
      heardRef.current = ''
      setRecordingState('idle')
      if (!text) { setToast("Couldn't hear anything — try again?"); return }
      if (addressMode) {
        // Route into the address search field so Places autocomplete can pick it up
        setAddressInput(text)
        fetchSuggestions(text, userLocation)
      } else {
        submit(text)
      }
    }
    r.stop()
  }

  // Keep a stable ref so the 60s auto-stop timer always calls the latest version
  stopAndTranscribeRef.current = stopAndTranscribe

  const toggleMic = async () => {
    if (recordingState === 'recording') { cancelRecording(); return }
    if (recordingState === 'transcribing') return

    const SR = speechRecognition()
    if (!SR) {
      setToast('Voice input is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      startWaveformFromStream(stream)

      const r = new SR()
      r.lang = 'en-US'
      r.continuous = true
      r.interimResults = false
      heardRef.current = ''
      r.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) heardRef.current += `${e.results[i][0].transcript} `
      }
      r.onerror = (e) => {
        if (e.error === 'not-allowed') setToast('Mic permission denied. Enable it in your browser settings to use voice input.')
        else if (e.error === 'audio-capture') setToast('No microphone detected.')
        else if (e.error !== 'aborted' && e.error !== 'no-speech') setToast('Could not access microphone.')
      }
      // Chrome ends recognition after a pause even in continuous mode; keep listening until ✓ or cancel.
      r.onend = () => {
        if (recognitionRef.current !== r) return
        try { r.start() } catch { cancelRecording() }
      }
      recognitionRef.current = r
      r.start()
      setRecordingState('recording')

      // Auto-stop at 60 seconds
      recordingTimerRef.current = setTimeout(() => {
        setToast('Recording limit reached (60s) — transcribing now…')
        stopAndTranscribeRef.current()
      }, 60_000)
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name
      if (name === 'NotAllowedError') {
        setToast('Mic permission denied. Enable it in your browser settings to use voice input.')
      } else if (name === 'NotFoundError') {
        setToast('No microphone detected.')
      } else {
        setToast('Could not access microphone.')
      }
    }
  }

  /** A chip's answer comes from the stored measurements, not the model: the question goes in as the
   *  reader's turn, the measured answer as the reply. */
  const tapChip = async (c: ChipOffer) => {
    const videoId = chipTarget ?? chipVideo
    if (!videoId || loading || streaming) return
    logUsage('chip-tap', c.id, { position: c.position, surface, videoId })
    stickRef.current = true
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: c.ask }])
    setChips((cs) => cs.filter((x) => x.id !== c.id))
    setLoading(true)
    const a = await answerChip(c.id, videoId).catch(() => null)
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: a ? measuredContent(a, videoId) : 'No measured answer for this video.', model: 'measured' }])
    setLoading(false)
    setTapped((t) => [...t, c.id])
  }

  // A chip the page asked from its own row arrives with the panel: asked once per ask.
  useEffect(() => {
    if (!seedChip || !seedNonce || ASKED.has(seedNonce)) return
    ASKED.add(seedNonce)
    tapChip(seedChip)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedNonce])

  const isEmpty = messages.length === 0

  // The script card rides the newest reply that carries a script.
  // Only record mode copies the latest script into the recording draft; every script still renders as the card.
  // The orb, the 44B way (components/agents/orbs.tsx): while inference runs, ThinkingOrb cycles its moves on the
  // waiting row; from the first word on, RestOrb stands below the newest answer, pushed down as the output grows,
  // moving while it streams and coming to rest there when it settles.
  const orbAt = loading ? null : [...messages].reverse().find((m) => m.role === 'assistant')?.id

  // The @ token under the caret (typing rides the end of the box), and the popover's rows for it.
  const mentionMatch = !addressMode && !searchMode ? input.match(/(?:^|\s)@([a-z0-9-]*)$/i) : null
  const mentionToken = mentionMatch?.[1] ?? null
  const mentionItems = mentionToken !== null && !mentionHidden ? filterMentions(mentionToken) : []
  useEffect(() => { setMentionIdx(0); setMentionHidden(false) }, [mentionToken])
  const pickMention = (m: Mention) => {
    setInput((v) => v.replace(/@([a-z0-9-]*)$/i, `@${m.slug} `))
    setMention(m)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  // The orb's follow-ups: fetched on the first click alone, kept per message, three chips from the orb.
  const orbAsk = async (id: string) => {
    if (streaming || loading) return
    if (followUpsFor === id) { setFollowUpsFor(null); return }
    if (Array.isArray(followUps[id])) { setFollowUpsFor(id); return }
    setFollowUps((prev) => ({ ...prev, [id]: 'loading' }))
    try {
      const extras = [mention ? mentionContext(mention) : null, skill?.instructions].filter(Boolean).join('\n\n')
      const res = await fetch('/api/chat/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages.slice(-8).map((m) => ({ role: m.role, content: m.content.slice(0, 2400) })), ...(extras ? { context: extras } : {}) }),
      })
      const data = (await res.json()) as { suggestions?: string[] }
      if (res.ok && Array.isArray(data.suggestions) && data.suggestions.length) {
        setFollowUps((prev) => ({ ...prev, [id]: data.suggestions! }))
        setFollowUpsFor(id)
      } else {
        setFollowUps((prev) => { const { [id]: gone, ...rest } = prev; void gone; return rest })
      }
    } catch {
      setFollowUps((prev) => { const { [id]: gone, ...rest } = prev; void gone; return rest })
    }
  }

  // The onboarding sends its own opener once, so Pax speaks first when the PAX mark opened this chat.
  const onboardSent = useRef(false)
  useEffect(() => {
    if (!onboard || onboardSent.current || messages.length > 0 || loading || streaming) return
    onboardSent.current = true
    submit(ONBOARD_OPENER)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboard])

  // The footer's block menu: each pick appends its canned example locally; the camera flips record mode.
  const showBlock = (id: string) => {
    if (id === 'recording') {
      setRecordMode(true)
      setVideoReady(false)
      if (!input.trim() && messages.length === 0) setInput(RECORD_OPENER)
      textareaRef.current?.focus()
      return
    }
    const ex = BLOCK_EXAMPLES.find((b) => b.id === id)
    if (ex) setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: ex.content, model: 'library-blocks' }])
  }

  // The brief's delivery: approve in the popover, land in the organization's platform inbox.
  const approveBrief = async () => {
    if (!briefSend) return
    setBriefSendError(null)
    try {
      const res = await fetch('/api/chat/brief-send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org: briefSend.org.slug, subject: briefSend.subject, markdown: briefSend.body }) })
      const data = (await res.json()) as { delivered?: string; error?: string }
      if (!res.ok || !data.delivered) { setBriefSendError(data.error ?? 'The delivery failed.'); return }
      setBriefSent(briefSend.id)
      setBriefSend(null)
    } catch {
      setBriefSendError('The delivery failed.')
    }
  }
  const scriptMsg = recordMode ? [...messages].reverse().find((m) => m.role === 'assistant' && scriptText(m.content)) : undefined
  const latestScript = scriptMsg && !streaming ? scriptText(scriptMsg.content) : null

  // Every settled draft is saved as it lands — the script survives a pivot, a detour, a reload of
  // the record pages — so "your script is saved" is simply true.
  useEffect(() => {
    if (latestScript) updateDraft({ mode: 'own', scriptId: undefined, title: undefined, text: latestScript, again: undefined })
  }, [latestScript, updateDraft])

  const startRecording = (script: string) => {
    updateDraft({ mode: 'own', scriptId: undefined, title: undefined, text: script, again: undefined })
    setFlowScript(script)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  }

  const walkAnalysis = (a: Analysis) => {
    setVideoReady(false)
    analysisRef.current = `VIDEO ANALYSIS — the user recorded their video${a.title ? ` "${a.title}"` : ''} (${a.seconds} seconds) on this page and asked to be walked through the free analysis. PAX2's scoring, verbatim:\nSummary: ${a.summary}${a.forecast ? `\n${a.forecast}` : ''}\nFindings:\n${a.findings.map((f) => `- ${f}`).join('\n')}\nWalk them through it in plain words, one part at a time, numbers only from the lines above — supportive, concrete, never inflated.`
    submit('Walk me through my video analysis.')
  }

  /* ---- Chat input ---- */
  const inputBox = (
    <div className="relative">
      {/* Address suggestions (address mode) */}
      {addressMode && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden z-20 max-h-[320px] overflow-y-auto no-scrollbar">
          {suggestions.map(sg => (
            <button key={sg.place_id} onClick={() => { selectAddress(sg); exitAddressMode() }}
              className="flex w-full items-start gap-3 px-4 py-3 text-sm text-[var(--txt)] hover:bg-[var(--inp-bg)] transition-colors text-left border-b border-[var(--border)] last:border-0">
              <MapPin className="h-4 w-4 text-pax2-light-blue shrink-0 mt-0.5" />
              <span>{sg.description}</span>
            </button>
          ))}
        </div>
      )}
      {chipTarget && <ChipRow chips={chips} onTap={tapChip} disabled={loading || streaming} />}
      {attachment}
      {(pdf || pdfError) && (
        <div className="-mb-2 flex min-w-0 items-center gap-1.5 rounded-t-2xl border border-b-0 border-[var(--border)] bg-slate-100 px-4 pb-4 pt-2 text-[11px] text-slate-600">
          <Paperclip className="h-3 w-3 shrink-0" />
          <span className="shrink-0 uppercase tracking-wide">pdf</span>
          {pdf ? (
            <>
              <span className="truncate font-medium text-slate-900">{pdf.name}</span>
              <span className="shrink-0 text-slate-400">· {(pdf.size / 1_000_000).toFixed(1)} MB, read with every question</span>
            </>
          ) : (
            <span className="truncate text-pax2-red">{pdfError}</span>
          )}
          <button type="button" onClick={() => { setPdf(null); setPdfError(null) }} className="ml-auto shrink-0 rounded hover:text-slate-900" aria-label="Let the PDF go">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {attached && (
        <div className={`-mb-2 flex min-w-0 items-center gap-1.5 rounded-t-2xl border border-b-0 border-[var(--border)] px-4 pb-4 pt-2 text-[11px] text-slate-600 ${reading ? 'animate-pulse bg-pax2-lavender/60' : 'bg-slate-100'}`}>
          {reading ? <Loader2 className="h-3 w-3 shrink-0 animate-spin text-pax2-blue" /> : <Paperclip className="h-3 w-3 shrink-0" />}
          <span className="shrink-0 uppercase tracking-wide">{attached.kind === 'block' ? 'block' : 'short'}</span>
          <span className="truncate font-medium text-slate-900">{attached.title}</span>
          {reading ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 font-medium text-pax2-blue">reading its page…</span>
              <span aria-hidden className="h-2.5 w-20 shrink-0 rounded-full bg-pax2-blue/20" />
            </span>
          ) : (
            <span className="shrink-0 text-slate-400">{attached.error ? `· couldn't read it: ${attached.error}` : `· ${attached.place}`}</span>
          )}
          {attached.error && attached.key && (
            <button type="button" onClick={() => { blocksShelf.remove(attached.key!); setAttached(null) }} className="shrink-0 rounded px-1.5 font-medium text-pax2-blue hover:underline">
              Take it off the shelf
            </button>
          )}
          <button type="button" onClick={() => setAttached(null)} className="ml-auto shrink-0 rounded hover:text-slate-900" aria-label="Let the attachment go">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div
        onKeyDown={(e) => {
          if (searchMode && e.key === 'Escape') {
            e.preventDefault()
            leaveSearch()
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setIsFocused(false)}
        className={`relative flex flex-col rounded-2xl border ${searchMode ? 'border-pax2-red/60' : addressMode || recordMode || isEmpty ? 'border-pax2-light-blue' : recordingState !== 'idle' ? 'border-blue-500' : 'border-[var(--border)]'} bg-[var(--inp-bg)] px-4 pt-3 pb-3 transition-all gap-1 shadow-e1 ${isFocused || isEmpty ? 'shadow-[0_8px_24px_rgba(0,0,0,0.08)]' : ''}`}>
        {/* Record mode's light, and before a chat starts the same light, whether or not the cursor is in the box
            (NYSgpt, Brendan, 2026-11-19: the focused look by default; pax-trinity shows it while focused). */}
        {!searchMode && (recordMode || isEmpty) && <BorderLight />}

        {mentionItems.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 z-20 mb-2">
            <MentionList items={mentionItems} active={mentionIdx} onPick={pickMention} />
          </div>
        )}

        {skill && !searchMode && (
          <div className="flex items-center gap-2 pb-2.5 mb-1 border-b border-[var(--border)]">
            <Sparkles className="h-3.5 w-3.5 text-pax2-light-blue shrink-0" />
            <span className="text-xs text-pax2-light-blue truncate flex-1 font-medium">{skill.name}</span>
            <button type="button" onClick={() => setSkill(null)} aria-label={`Drop the ${skill.name} skill`} className="text-[var(--muted)] hover:text-pax2-light-blue transition-colors shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {mention && !searchMode && (
          <div className="flex items-center gap-2 pb-2.5 mb-1 border-b border-[var(--border)]">
            <AtSign className="h-3.5 w-3.5 text-pax2-light-blue shrink-0" />
            <span className="text-xs text-pax2-light-blue truncate flex-1 font-medium">{mention.name}</span>
            <button type="button" onClick={() => setMention(null)} aria-label={`Drop the ${mention.name} mention`} className="text-[var(--muted)] hover:text-pax2-light-blue transition-colors shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {selectedAddress && (
          <div className="flex items-center gap-2 pb-2.5 mb-1 border-b border-[var(--border)]">
            <MapPin className="h-3.5 w-3.5 text-pax2-light-blue shrink-0" />
            <span className="text-xs text-pax2-light-blue truncate flex-1 font-medium">{selectedAddress.description}</span>
            <button onClick={clearAddress} className="text-[var(--muted)] hover:text-pax2-light-blue transition-colors shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {selectedVideo ? (
          <div
            className="w-full py-1 text-[17px] leading-relaxed cursor-text"
            onClick={() => {
              setInput(ask(selectedVideo))
              setSelectedVideo(null)
              setTimeout(() => textareaRef.current?.focus(), 0)
            }}
          >
            <span className="text-[var(--txt)]">What explains the score on </span>
            <span className="text-pax2-light-blue font-semibold">{selectedVideo.label}</span>
            <span className="text-[var(--txt)]">?</span>
          </div>
        ) : searchMode ? (
          <div className="flex items-start">
            <input
              ref={searchRef}
              autoFocus
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { e.preventDefault(); leaveSearch() }
                else if (e.key === 'Enter') { e.preventDefault(); stepHit(e.shiftKey ? -1 : 1) }
              }}
              placeholder="Search this chat…"
              aria-label="Search this chat"
              className="flex-1 bg-transparent py-1 text-[17px] text-[var(--txt)] placeholder:text-[var(--muted2)] outline-none leading-relaxed"
              style={{ minHeight: '40px' }}
            />
          </div>
        ) : recordingState === 'recording' ? (
          <div className="flex items-center min-h-[40px] py-1">
            <canvas ref={canvasRef} className="flex-1" style={{ height: '32px' }} />
          </div>
        ) : (
          <div className="flex items-start">
            <textarea ref={textareaRef} rows={1}
              value={addressMode ? addressInput : input}
              onChange={e => {
                if (addressMode) {
                  setAddressInput(e.target.value)
                  fetchSuggestions(e.target.value, userLocation)
                } else {
                  handleInputChange(e.target.value)
                }
              }}
              onKeyDown={e => {
                if (addressMode) {
                  if (e.key === 'Escape') { e.preventDefault(); exitAddressMode() }
                  if (e.key === 'Enter' && suggestions.length > 0) { e.preventDefault(); selectAddress(suggestions[0]); exitAddressMode() }
                } else if (mentionItems.length > 0) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx((i) => (i + 1) % mentionItems.length) }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx((i) => (i - 1 + mentionItems.length) % mentionItems.length) }
                  else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(mentionItems[mentionIdx]) }
                  else if (e.key === 'Escape') { e.preventDefault(); setMentionHidden(true) }
                } else {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input) }
                }
              }}
              placeholder={addressMode ? 'Enter an address…' : recordMode ? 'Record mode — tell me a little about you…' : selectedAddress ? 'Ask about this address…' : 'Ask about the records.'}
              className="flex-1 resize-none bg-transparent py-1 text-[17px] text-[var(--txt)] placeholder:text-[var(--muted2)] outline-none leading-relaxed"
              style={{ minHeight: '40px' }} />
          </div>
        )}

        <div className="flex items-center pt-1">
          <PlusMenu videos={videos} shorts={shorts} dropUp={!isEmpty || compact} onSelect={(text) => { setInput(text); textareaRef.current?.focus() }} onShort={(v) => { if (!chipVideo && v.youtube) { setChipTarget(v.id); setTapped([]) } attachVideo(v) }}
            onAttach={() => pdfInput.current?.click()}
            onSkill={(k) => { setSkill(k); if (k.prompt) setInput(k.prompt); textareaRef.current?.focus() }}
            hasScript={messages.some((m) => m.role === 'assistant' && !!scriptText(m.content))}
            onFootage={(text, focus) => { setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: '```pax-script\n' + text.trim() + '\n```', model: focus === 'shots' ? 'library-shots' : 'library-graphics' }]); setFootageFocus({ script: text.trim(), focus }) }}
            onBroll={(id) => setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: '```pax-broll\n' + id + '\n```', model: 'library-broll' }])}
            onTemplates={() => {
              void import('@/video/gallery').then(({ galleryMessage }) => setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: galleryMessage(), model: 'library-video' }]))
            }}
            onGraphic={(kind) => {
              const last = [...messages].reverse().find((m) => m.role === 'assistant' && !!scriptText(m.content))
              const text = last ? scriptText(last.content) : null
              if (!last || !text) return
              // The script's message shows only its shots: the graphic arrives as the script's Graphics card.
              if (last.model === 'library-shots') setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: '```pax-script\n' + text + '\n```', model: 'library-graphics' }])
              setFootageFocus({ script: text, focus: kind })
            }} />
          {/* Attach lives in the + menu now (Brendan, 2026-10-24); only the hidden input stays. */}
          <input ref={pdfInput} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { pickPdf(e.target.files?.[0]); e.target.value = '' }} />

          <button
            onClick={() => {
              const next = !recordMode
              setRecordMode(next)
              setVideoReady(false)
              if (next && !input.trim() && messages.length === 0) setInput(RECORD_OPENER)
              textareaRef.current?.focus()
            }}
            className={`relative ml-2 shrink-0 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              recordMode ? 'bg-pax2-blue text-white' : 'text-[var(--muted)] hover:bg-[rgba(0,0,0,0.07)] hover:text-[var(--txt)]'
            }`}
            title={recordMode ? 'Leave record mode' : 'Record mode — build toward a recording'}>
            <Video className="h-4 w-4" />
            {videoReady && <span aria-hidden className="absolute right-0 top-0 size-2.5 rounded-full bg-red-500 ring-2 ring-[var(--inp-bg)]" />}
          </button>
          <button
            type="button"
            onClick={() => (searchMode ? leaveSearch() : setSearchMode(true))}
            aria-pressed={searchMode}
            className={`ml-2 shrink-0 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              searchMode ? 'bg-pax2-red text-white' : 'text-[var(--muted)] hover:bg-[rgba(0,0,0,0.07)] hover:text-[var(--txt)]'
            }`}
            title={searchMode ? 'Leave search (Esc)' : 'Search this chat'}>
            <Search className="h-4 w-4" />
          </button>
          {VOICE_INPUT && (
            <button
              onClick={toggleMic}
              disabled={recordingState === 'transcribing'}
              className={`ml-2 shrink-0 flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                recordingState === 'recording' ? 'text-red-500 bg-red-50 animate-pulse'
                : recordingState === 'transcribing' ? 'text-blue-500 bg-blue-50'
                : 'text-[var(--muted)] hover:bg-[rgba(0,0,0,0.07)] hover:text-[var(--txt)]'
              }`}
              title={recordingState === 'recording' ? 'Cancel recording' : recordingState === 'transcribing' ? 'Transcribing…' : 'Voice input'}
            >
              {recordingState === 'transcribing' ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          )}
          {recordingState === 'recording' && (
            <button
              onClick={stopAndTranscribe}
              className="ml-2 shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors"
              title="Done — transcribe"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1" />
          {searchMode ? (
            <span className="flex items-center gap-1 text-[13px] text-[var(--muted)]">
              <button
                type="button"
                onClick={() => setSearchMine((v) => !v)}
                aria-pressed={searchMine}
                title="Only my messages"
                className={`mr-1 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${searchMine ? 'bg-pax2-red-soft text-pax2-red' : 'hover:bg-[rgba(0,0,0,0.07)] hover:text-[var(--txt)]'}`}
              >
                <User className="h-4 w-4" />
              </button>
              {searchQ.trim() && <span className="tabular-nums">{searchHits ? `${searchAt + 1} of ${searchHits}` : 'No matches'}</span>}
              <button type="button" onClick={() => stepHit(-1)} disabled={!searchHits} aria-label="Previous match" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[rgba(0,0,0,0.07)] disabled:opacity-30">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => stepHit(1)} disabled={!searchHits} aria-label="Next match" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[rgba(0,0,0,0.07)] disabled:opacity-30">
                <ChevronDown className="h-4 w-4" />
              </button>
            </span>
          ) : (
          <>
          <ScopePicker value={scope} onChange={setScope} />
          <ModelPicker value={model} onChange={setModel} />
          {streaming ? (
            <button type="button"
              onClick={stopStream}
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              title="Stop (Space)">
              <Square className="h-4 w-4 fill-white" />
            </button>
          ) : (
            <button type="button"
              onClick={() => submit(selectedVideo ? ask(selectedVideo) : input)}
              disabled={(!input.trim() && !selectedVideo) || loading || reading}
              title={reading ? 'Reading the attachment…' : undefined}
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl bg-pax2-blue text-white disabled:opacity-25 hover:opacity-80 transition-opacity">
              {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          )}
          </>
          )}
        </div>
      </div>

      {toast && (
        <p className="text-center text-[11px] text-[var(--muted)] mt-2 animate-in fade-in">{toast}</p>
      )}
    </div>
  )

  return (
    // The rail's dress (Brendan, 2026-10-29, after America Thinks): the mist ground, the box and my
    // own turns white and raised on it.
    <div
      className="relative flex h-full flex-1 flex-col overflow-hidden bg-pax2-surface"
      style={SKIN}
      onDragOver={(e) => {
        if (!isShelfDrag(e.dataTransfer)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        setDragOver(true)
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setDragOver(false)}
      onDrop={attach}
    >
      {/* The whole chat is the drop surface while a shelf tile is held over it, as in Claude's chat. */}
      {dragOver && (
        <div aria-hidden className="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-pax2-light-blue bg-pax2-lavender/50 backdrop-blur-[1px]">
          <span className="flex items-center gap-2 rounded-full bg-pax2-surface px-4 py-2 text-sm font-medium text-pax2-blue shadow-e2">
            <Paperclip className="h-4 w-4" /> Drop to add to the chat
          </span>
        </div>
      )}
      {/* Search mode's marks: every hit tinted, the current one red. */}
      <style>{'::highlight(pax-chat-hit){background-color:#fee2e2;color:inherit}::highlight(pax-chat-hit-active){background-color:#dc2626;color:#fff}'}</style>
      {briefSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6" onClick={() => setBriefSend(null)}>
          <div className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--inp-bg)] p-5 shadow-e1" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-medium text-[var(--txt)]">To {briefSend.org.name}&apos;s inbox</div>
            <input
              value={briefSend.subject}
              onChange={(e) => setBriefSend({ ...briefSend, subject: e.target.value })}
              aria-label="Subject"
              className="mt-3 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[15px] text-[var(--txt)] outline-none focus:border-pax2-light-blue"
            />
            <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] px-3 py-2 text-[13.5px] leading-relaxed text-[var(--txt)]">{briefSend.body}</div>
            {briefSendError && <div className="mt-2 text-[13px] text-pax2-red">{briefSendError}</div>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setBriefSend(null)} className="rounded-full px-4 py-1.5 text-[13.5px] text-[var(--muted)] transition-colors hover:text-[var(--txt)]">Cancel</button>
              <button type="button" onClick={approveBrief} className="rounded-full bg-pax2-light-blue px-4 py-1.5 text-[13.5px] font-medium text-white shadow-e1 transition-opacity hover:opacity-90">Approve and send</button>
            </div>
          </div>
        </div>
      )}
      <div
        ref={messagesRef}
        className="@container/chat flex-1 overflow-y-auto"
        onScroll={(e) => {
          const el = e.currentTarget
          const gap = el.scrollHeight - el.scrollTop - el.clientHeight
          setAway(gap > 400)
          stickRef.current = gap < 120
        }}
      >
        {isEmpty && !compact ? (
          // With `below` (the home), the layout is the reference's: the chat column rides at a fixed
          // offset from the top — set so the input's bottom edge lands where the reference's does,
          // our box being ~56px taller — the tiles and promos press to the bottom of the first
          // viewport, and the gap between them takes whatever height is left; the shelf waits past
          // the fold. Without `below`, the column centers as always.
          <>
          <div className={cn("flex flex-col items-center px-4", below ? "min-h-full pb-10 pt-16" : "min-h-full justify-center py-8")}>
            <div className="flex w-full max-w-[773px] flex-col gap-6">
              {!compact && (
                <div className="transition-transform duration-150" style={{ transform: `translateY(-${grow}px)` }}>
                  {heading ?? (
                    <div className="flex h-[65px] flex-col items-center justify-center">
                      <TextType as="span" text={READY} loop={false} typingSpeed={70} className="font-display text-2xl font-normal text-black md:text-3xl" />
                    </div>
                  )}
                </div>
              )}
              {/* The box grows upward: its added height is taken back above it, so its foot stays put. */}
              <div className="transition-[margin] duration-150" style={{ marginTop: -grow }}>
                {inputBox}
              </div>
              {explore && videos.length > 0 && (
                <div className="max-w-[636px] mx-auto w-full">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-base font-semibold text-[var(--txt)]">Explore</p>
                    <div className="flex gap-2">
                      <button type="button"
                        onClick={() => exploreScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                        className="h-8 w-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--inp-bg)] transition-colors">
                        <ChevronLeft className="h-4 w-4 text-[var(--txt)]" />
                      </button>
                      <button type="button"
                        onClick={() => exploreScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                        className="h-8 w-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--inp-bg)] transition-colors">
                        <ChevronRight className="h-4 w-4 text-[var(--txt)]" />
                      </button>
                    </div>
                  </div>
                  <div ref={exploreScrollRef} className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory">
                    {videos.slice(0, 15).map(v => (
                      <button key={v.id} type="button"
                        onClick={() => { setSelectedVideo(v); setInput(''); attachVideo(v) }}
                        className="group relative shrink-0 w-[150px] h-[100px] rounded-2xl overflow-hidden snap-start shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                        <div
                          className="absolute inset-0 bg-[var(--inp-bg)]"
                          style={v.poster ? { backgroundImage: `url(${v.poster})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                        >
                          {!v.poster && <div className="absolute inset-0 flex items-center justify-center"><PlaySquare className="h-8 w-8 text-pax2-light-blue opacity-40" /></div>}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-2 left-3">
                          <p className="text-xs font-semibold text-white leading-snug">{v.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {below && (
              <>
                <div className="min-h-12 flex-1" />
                {below}
              </>
            )}
          </div>
            {shelf}
          </>
        ) : (
          <div className="flex flex-col gap-4 px-4 py-6 max-w-[773px] mx-auto w-full">
            {messages.map(msg => {
              const isLast = msg.id === messages[messages.length - 1]?.id
              const msgStreaming = streaming && isLast
              // The pax-fields block is scaffolding: stripped from the prose (even mid-stream,
              // so it never shows as raw JSON) and rendered as real controls below.
              const shown = msg.role === 'assistant' ? stripOpenBlock(stripChoiceBlock(stripFieldBlock(msg.content))) : msg.content
              const fields = msg.role === 'assistant' && !msgStreaming ? parseFieldBlock(msg.content) : null
              const choices = msg.role === 'assistant' && !msgStreaming ? parseChoiceBlock(msg.content) : null
              // Every reply that carries a script shows it as the script card (the footer with Citations and
              // Record), in every chat and every draft; the plain code block is never used for a script.
              const script = msg.role === 'assistant' ? scriptText(msg.content) : null
              const opening = msg.role === 'assistant' && msgStreaming && !script ? openScript(shown) : null
              const cites = script && !msgStreaming ? parseCiteBlock(msg.content) : null
              const measured = msg.role === 'assistant' ? splitMeasured(shown) : null
              const seg = script ? splitAtScript(shown, script) : null
              const prose = (content: string) =>
                pieces(content).map((p, i) =>
                  'text' in p ? (
                    videoSplit(p.text).map((v, k) =>
                      'text' in v ? (
                        <MarkdownContent key={`${i}-${k}`} content={v.text} isStreaming={msgStreaming} />
                      ) : v.video ? (
                        <div key={`${i}-${k}`} className="my-3">
                          <VideoBlock
                            {...v.video}
                            chatId={chatId}
                            // A finished reply's block is saved as a version; the + menu's gallery of samples is not.
                            saveKey={msg.role === 'assistant' && !msgStreaming && !msg.model?.startsWith('library-') ? blockKey(chatId, msg.id, v.raw) : null}
                          />
                        </div>
                      ) : null,
                    )
                  ) : (
                    <ChatBlock key={`${p.path}#${p.anchor}-${i}`} path={p.path} anchor={p.anchor} />
                  ),
                )
              return (
              <div key={msg.id} data-turn={msg.role} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' ? (
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm px-4 py-3 text-[17px] leading-relaxed bg-[var(--inp-bg)] text-[var(--txt)] shadow-e1">
                    {msg.content}
                  </div>
                ) : (
                  <div className="group/reply relative flex-1 min-w-0 text-[17px] pt-0.5">
                    {msg.content ? (
                      <>
                        {brollOf(msg) ? (
                          <BrollBlock id={brollOf(msg)!} videoModel={videoModel} />
                        ) : script && seg ? (
                          <>
                            {prose(seg.before)}
                            <ScriptCard text={script} cites={cites} streaming={msgStreaming} onRecord={() => startRecording(script)} />
                            {!msgStreaming && <FootageBlock script={script} videoModel={videoModel} show={footageShow(msg.model)} focus={footageFocus?.script === script ? footageFocus.focus : null} />}
                            {prose(seg.after)}
                          </>
                        ) : opening ? (
                          <>
                            {prose(opening.before)}
                            <ScriptCard text={opening.partial.trim()} streaming onRecord={() => {}} />
                          </>
                        ) : measured?.basis ? (
                          <>
                            {measured.prose && prose(measured.prose)}
                            <MeasuredFooter basis={measured.basis} />
                          </>
                        ) : (
                          prose(shown)
                        )}
                        {fields && (
                          <ChatFields
                            fields={fields}
                            live={isLast && !streaming && !loading}
                            onSubmit={(values) => submit(answersText(fields, values))}
                          />
                        )}
                        {choices && (
                          <span className="mt-3 flex flex-wrap gap-2">
                            {choices.map((c) => (
                              <button
                                key={c}
                                type="button"
                                disabled={!(isLast && !streaming && !loading)}
                                onClick={() => submit(c)}
                                className="rounded-full border border-[var(--border)] bg-[var(--inp-bg)] px-3.5 py-1.5 text-[13.5px] text-[var(--txt)] shadow-e1 transition-colors enabled:hover:border-pax2-light-blue disabled:opacity-60"
                              >
                                {c}
                              </button>
                            ))}
                          </span>
                        )}
                        {!msgStreaming && !measured?.basis && !msg.model?.startsWith('library') && (
                          <ResponseFooter
                            text={shown}
                            model={msg.model}
                            latest={isLast}
                            onShowBlock={showBlock}
                            onOpenStudio={() => openPane('/studio')}
                            onRetry={() => {
                              const at = messages.findIndex((x) => x.id === msg.id)
                              const ask = messages[at - 1]
                              if (ask?.role === 'user') submit(ask.content, messages.slice(0, at - 1))
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <ThinkingOrb />
                    )}
                    {msgStreaming && Boolean(msg.content) && <StreamSkeleton />}
                    {msg.id === orbAt && Boolean(msg.content) && <RestOrb thinking={msgStreaming} busy={followUps[msg.id] === 'loading'} onClick={() => orbAsk(msg.id)} />}
                    {msg.id === orbAt && !msgStreaming && followUpsFor === msg.id && Array.isArray(followUps[msg.id]) && (
                      <span className="mt-3 flex flex-wrap gap-2">
                        {(followUps[msg.id] as string[]).map((q, qi) => (
                          <button
                            key={q}
                            type="button"
                            style={{ animationDelay: `${qi * 80}ms` }}
                            onClick={() => { setFollowUpsFor(null); submit(q) }}
                            className="orb-chip rounded-full border border-[var(--border)] bg-[var(--inp-bg)] px-3.5 py-1.5 text-left text-[13.5px] text-[var(--txt)] shadow-e1 transition-colors hover:border-pax2-light-blue"
                          >
                            {q}
                          </button>
                        ))}
                      </span>
                    )}
                    {msg.id === orbAt && !msgStreaming && mention?.kind === 'partner' && skill?.id === 'brief-a-partner' && (
                      <span className="mt-3 block">
                        {briefSent === msg.id ? (
                          <span className="text-[13.5px] text-[var(--muted)]">Delivered to {mention.name}&apos;s inbox.</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const first = msg.content.trim().split('\n').find((l) => l.trim())
                              setBriefSendError(null)
                              setBriefSend({ org: mention, subject: (first ?? 'Partner brief').replace(/^#+\s*|\*\*/g, '').slice(0, 140), body: msg.content.trim(), id: msg.id })
                            }}
                            className="rounded-full border border-[var(--border)] bg-[var(--inp-bg)] px-3.5 py-1.5 text-[13.5px] font-medium text-pax2-light-blue shadow-e1 transition-colors hover:border-pax2-light-blue"
                          >
                            Send to {mention.name}&apos;s inbox
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
              )
            })}
            {loading && (
              <div className="pt-1.5">
                <ThinkingOrb />
              </div>
            )}
            {flowScript && <RecordFlow key={flowScript} script={flowScript} videoModel={videoModel} onDone={() => setVideoReady(true)} onAnalysis={walkAnalysis} />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Scrolled up into the conversation, the round arrow brings the reader back to the end. */}
      {away && !isEmpty && (
        <button
          type="button"
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          aria-label="Back to the latest"
          className="absolute bottom-36 left-1/2 z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-pax2-surface text-[var(--muted)] shadow-lg transition-colors hover:text-[var(--txt)]"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      {/* In the side panel the input stays pinned to the bottom from the start. */}
      {(!isEmpty || compact) && (
        <div className="shrink-0 px-4 pb-4 pt-2">
          <div className="mx-auto max-w-[773px]">{inputBox}</div>
        </div>
      )}
    </div>
  )
}
