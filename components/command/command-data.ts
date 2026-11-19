import { ChevronsLeftRight, Columns2, Cpu, Database, FileText, Github, Layers, LayoutTemplate, LibraryBig, Palette, Plug, MessageSquarePlus, MessagesSquare, PanelLeft, Radar, ScanSearch, SquareDashedMousePointer, Table2, type LucideIcon } from "lucide-react"
import * as React from "react"

import { Icon, TypeIcon } from "@/app/HomeIcons"
import { BOXES, KIND_NOUN, SOURCES, TYPE_COLOR, type Box, type BoxKind, type SourceKind } from "@/lib/home-boxes"
import { LEDGER } from "@/lib/home-data"
import { compact } from "@/lib/compact"
import { getHome, home } from "@/lib/home-store"
import { loadCatalog, loadSample } from "@/lib/home-catalog"
import type { PanelResult } from "@/components/SwitchboardPanel"

// The ⌘K palette's catalog, from pax-trinity's command-data.ts (2026-11-19, brief 47), with NYSgpt's
// things in it: the home page's boxes (every set, about 1,300), the masthead's sets and the Data Library
// as its pages, and the one command of the source's that means something here. The shapes are the
// source's (a kind for each row: its section, the word at the row's right, its tile, the footer's
// action); a box also carries its own icon or logo and the box itself, so choosing it can open it or put
// it in Blocks. The source's own stand-in lists (questions, clips, reports, tests, surveys and the rest)
// have no NYSgpt meaning and are left out until Brendan says what replaces them.

export type Kind = "page" | "command" | BoxKind

export type CommandItem = {
  id: string
  kind: Kind
  title: string
  subtitle?: string
  href?: string
  keywords?: string
  /** What choosing it does, where that is not a page to open. */
  run?: () => void
  /** A box row: the box, and its own icon (its logo, else its type icon). */
  box?: Box
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
  logo?: string
  /** The tile's own colour and icon colour, where they are not the kind's (a page wears its set's). */
  tint?: string
  fg?: string
  /** A mark drawn by TypeIcon that is a logo (GitHub, Hugging Face and the sources): it sits on a white tile. */
  mark?: Box["icon"]
  /** A Run command (brief 51): runs with the palette's context; a returned sentence says why it could not. */
  act?: (ctx: RunCtx) => void | string | Promise<void | string>
}

/** What a Run command can reach (brief 51): the router, the right panel, the second panel. */
export type RunCtx = {
  push: (href: string) => void
  openBlocks: () => void
  openPane: (href: string) => void
  openResult: (r: PanelResult) => void
}

/** A command on the picked box row, listed in the row's actions (brief 51). */
export type BoxAction = { label: string; keys: string[]; act: (ctx: RunCtx) => void | string | Promise<void | string> }

type KindInfo = { section: string; label: string; icon: LucideIcon | React.ComponentType<{ className?: string; strokeWidth?: number }>; tint: string; action: string }

/** A box's type icon in the tile's place: TypeIcon draws at its own size, so the wrapper sets it. */
const glyph = (icon: Box["icon"]) => {
  function Glyph({ className }: { className?: string }) {
    return React.createElement("span", { className: `${className ?? ""} flex [&>svg]:size-full [&>img]:size-full [&>img]:object-contain` }, React.createElement(TypeIcon, { icon }))
  }
  return Glyph
}

/** The All page's icon: the home page's grid (Blocks) icon. */
function GridGlyph({ className }: { className?: string }) {
  return React.createElement("span", { className: `${className ?? ""} flex [&>svg]:size-full` }, React.createElement(Icon, { name: "grid" }))
}

/** TypeIcon's marks that are logos, not line icons: they keep their own colours on a white tile. */
const MARKS = new Set<Box["icon"]>(["github", "hf", "aa", "kaggle", "llmstats"])

/** A set's icon: the one most of its boxes wear (so a page row shows what its boxes show). */
const iconOf = (k: BoxKind): Box["icon"] => {
  const n = new Map<Box["icon"], number>()
  for (const b of BOXES) if (b.kind === k) n.set(b.icon, (n.get(b.icon) ?? 0) + 1)
  return [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "db"
}

/** A page row's tile for a set: its colour from TYPE_COLOR and its icon or mark from the boxes. */
const setTile = (k: BoxKind) => {
  const icon = iconOf(k)
  return MARKS.has(icon) ? { mark: icon, tint: TYPE_COLOR[k] } : { icon: glyph(icon), tint: TYPE_COLOR[k] }
}

const singular = (unit: string) => (unit.endsWith("ies") ? `${unit.slice(0, -3)}y` : unit.replace(/s$/, ""))
const SECTION_OF = (k: SourceKind) => (k.startsWith("gh-") ? "GitHub" : k.startsWith("hf-") ? "Hugging Face" : SOURCES[k].word)

const OWN: Record<"data" | "models" | "platforms" | "tables" | "tools", { section: string; label: string; icon: LucideIcon }> = {
  data: { section: "Data", label: "Database", icon: Database },
  models: { section: "Models", label: "Model", icon: Cpu },
  platforms: { section: "Platforms", label: "Platform", icon: Layers },
  tables: { section: "Tables", label: "Table", icon: Table2 },
  tools: { section: "Tools", label: "Tool", icon: ChevronsLeftRight },
}

/** Each kind: its section, the word at the row's right, its tile, and the footer's primary action. */
export const KINDS: Record<Kind, KindInfo> = {
  page: { section: "Pages", label: "Page", icon: PanelLeft, tint: "#1e3a8a", action: "Open Page" },
  command: { section: "Commands", label: "Command", icon: PanelLeft, tint: "#2563eb", action: "Run Command" },
  ...(Object.fromEntries(
    (Object.keys(TYPE_COLOR) as BoxKind[]).map((k) => {
      const own = (OWN as Record<string, (typeof OWN)["data"] | undefined>)[k]
      // A kind that is neither one of the four sets nor a source (the block kinds, brief 52) lists under Blocks.
      const src = (SOURCES as Record<string, { word: string; unit: string } | undefined>)[k]
      const section = own ? own.section : src ? SECTION_OF(k as SourceKind) : "Blocks"
      const label = own ? own.label : src ? singular(src.unit) : KIND_NOUN[k]
      const blockIcon = ({ design: Palette, 'site-page': LayoutTemplate, brief: FileText, api: Plug } as Record<string, LucideIcon | undefined>)[k]
      return [k, { section, label, icon: own?.icon ?? blockIcon ?? Database, tint: TYPE_COLOR[k], action: `Open ${label}` }]
    }),
  ) as Record<BoxKind, KindInfo>),
}

/** The sections in the order the palette lists them. */
export const SECTIONS = ["Pages", "Commands", "Data", "Models", "Platforms", "Tables", "Tools", "Artificial Analysis", "Kaggle", "LLM Stats", "GitHub", "Hugging Face", "Blocks"]

const r = (kind: Kind, title: string, subtitle?: string, href?: string, keywords?: string, run?: () => void): CommandItem => ({ id: `${kind}:${title}`, kind, title, subtitle, href, keywords, run })

/** The box's element on the plate (HomePlate labels each box this way). */
const boxEl = (title: string) => document.querySelector<HTMLElement>(`[data-nav="plate"][aria-label="${CSS.escape(title)}: open in the catalog"]`)

/** Show a set on the home page, going home first from another page. */
let go: (href: string) => void = (href) => window.location.assign(href)
export const setNavigate = (f: (href: string) => void) => {
  go = f
}
const showSet = (s: BoxKind | null) => {
  home.showSet(s)
  if (window.location.pathname !== "/") go("/")
}

/** Open a box the way a Blocks tile does: show its set, bring the box into view, open it. */
export const openBox = (b: Box) => {
  showSet(b.kind)
  let tries = 0
  const tick = () => {
    const el = boxEl(b.title)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" })
      el.click()
    } else if (tries++ < 40) window.setTimeout(tick, 100)
  }
  window.setTimeout(tick, 60)
}

const ledger = (word: string) => {
  const l = LEDGER.find((x) => x.word === word)
  if (!l) return undefined
  const f = compact(l.value)
  return `${f.count.toLocaleString("en-US", { maximumFractionDigits: f.decimals })}${f.suffix} ${l.unit.toLowerCase()}`
}

/* ── Run commands (brief 51) ─────────────────────────────────────────────────────────────────────────── */

const DEV = process.env.NODE_ENV === "development"
const REPO_ISSUE = "https://github.com/nyd-user-1/NYSgpt/issues/new"
const API = "https://data.nysgpt.com"
/** The key the Data Library pages keep in this browser (public/data/app.js); never a key the site holds. */
const KEY = "nysgpt-data-key"

const cmd = (title: string, subtitle: string, icon: LucideIcon, act: NonNullable<CommandItem["act"]>, keywords?: string): CommandItem => ({ id: `command:${title}`, kind: "command", title, subtitle, icon, act, keywords })
const issue = (title: string, body: string) => `${REPO_ISSUE}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
const openTab = (href: string) => void window.open(href, "_blank", "noopener")

/** The open dev comments as an issue body (development only; the comments API answers admins). */
async function commentsIssue(): Promise<void | string> {
  const res = await fetch("/api/housekeeping?feed=1").catch(() => null)
  if (!res || !res.ok) return "I could not read the dev comments: the comments API answers signed-in admins only."
  const { messages } = (await res.json().catch(() => ({}))) as { messages?: { text?: string; page?: string; route?: string; authorName?: string; createdAt?: string; resolved?: boolean; kind?: string }[] }
  const open = (messages ?? []).filter((m) => m.text && !m.resolved && (m.kind ?? "comment") === "comment")
  if (!open.length) return "There are no open dev comments to post."
  const body = open.slice(0, 40).map((m) => `- ${m.text!.replace(/\s+/g, " ").slice(0, 300)}${m.route || m.page ? ` (${m.route ?? m.page})` : ""}${m.authorName ? ` — ${m.authorName}` : ""}`).join("\n")
  openTab(issue(`Dev comments, ${new Date().toISOString().slice(0, 10)}`, `Open dev comments on nysgpt.com:\n\n${body}`))
}

/** The dev tools' own starts (components/housekeeping/tool.tsx, components/dev/inspector.tsx), loaded only when run. */
const devCommands: CommandItem[] = DEV
  ? [
      cmd("Run Sonar", "Dev tools · point at any element; on or off", Radar, async () => void (await import("@/components/housekeeping/tool")).togglePointer(), "pointer"),
      cmd("Run Inspector", "Dev tools · the inspector dock", ScanSearch, () => void window.dispatchEvent(new CustomEvent("inspector:set", { detail: { on: true } })), "inspect"),
      cmd("Click to Comment", "Dev tools · click an element, write, Enter sends", SquareDashedMousePointer, async () => void (await import("@/components/housekeeping/tool")).togglePointer(), "comment pointer"),
      cmd("Open Comments", "Dev tools · Dev Comments in the right panel", MessagesSquare, async () => void (await import("@/components/housekeeping/tool")).openHousekeeping(), "dev comments"),
      cmd("Post Comments to GitHub", "Dev tools · the open dev comments as a new issue", Github, commentsIssue, "issue"),
    ]
  : []

const PAGE_COMMANDS: CommandItem[] = [
  ...devCommands,
  cmd("Try Chat", "Ask about the records", MessageSquarePlus, (ctx) => ctx.push("/chat"), "ask"),
  cmd("Open Chat Beside", "The chat in the second panel, beside this page", Columns2, (ctx) => ctx.openPane("/chat"), "split pane"),
]

/* ── what a box resolves to: its table in the library index, its sample, its data page ── */

type Topic = { topic: string; tables: { stored: string; plain: string }[] }
let topicsP: Promise<Topic[] | null> | null = null
let topics: Topic[] | null = null
const loadTopics = () =>
  (topicsP ??= fetch("/library-topics.json")
    .then((r) => (r.ok ? (r.json() as Promise<Topic[]>) : null))
    .then((t) => (topics = t))
    .catch(() => null))
type Dataset = { page: string; largest_table?: string }
let datasetsP: Promise<Dataset[] | null> | null = null
const loadDatasets = () =>
  (datasetsP ??= fetch("/data/datasets.json")
    .then((r) => (r.ok ? (r.json() as Promise<{ datasets: Dataset[] }>) : null))
    .then((j) => j?.datasets ?? null)
    .catch(() => null))
/** Fetch the indexes the box commands read, so the actions list only what can work. */
export const preloadForCommands = () => void loadTopics()

const isTable = (b: Box) => b.kind === "tables" || b.kind === "data"
/** A Tables box's own table, or a Data box's first table, in the library index the query API can reach. */
function tableOf(b: Box, list: Topic[] | null): { topic: string; stored: string; plain: string } | null {
  if (!list) return null
  if (b.kind === "tables") {
    for (const t of list) {
      if (t.topic !== b.group) continue
      const x = t.tables.find((y) => y.plain === b.title)
      if (x) return { topic: t.topic, ...x }
    }
    for (const t of list) {
      const x = t.tables.find((y) => y.plain === b.title)
      if (x) return { topic: t.topic, ...x }
    }
    return null
  }
  if (b.kind === "data") {
    const t = list.find((y) => y.topic === b.title)
    return t && t.tables[0] ? { topic: t.topic, ...t.tables[0] } : null
  }
  return null
}
/** The box's table in the site's catalog copy, whose samples ship with the site. */
async function catalogTableOf(b: Box) {
  const c = await loadCatalog()
  if (!c) return null
  return b.kind === "tables" ? (c.tables.find((t) => t.database === b.group && t.table === b.title) ?? null) : (c.tables.find((t) => t.database === b.title) ?? null)
}

/** The commands for a picked box: only those that can work for it. */
export function boxActions(b: Box): BoxAction[] {
  const out: BoxAction[] = []
  const reach = topics ? tableOf(b, topics) : isTable(b) ? ({} as { topic: string; stored: string; plain: string }) : null
  out.push({
    label: "Post to GitHub",
    keys: ["⌘", "G"],
    act: () =>
      openTab(issue(`${b.title} (${KINDS[b.kind].section})`, [`**${b.title}**`, `Set: ${KINDS[b.kind].section}${b.group ? ` · ${b.group}` : ""}`, b.foot ? `Figure: ${b.foot}` : "", "", b.body].filter((x) => x !== "").join("\n"))),
  })
  if (isTable(b) && reach)
    out.push({
      label: "Call API",
      keys: ["⌘", "R"],
      act: async (ctx) => {
        const t = tableOf(b, await loadTopics())
        if (!t) return "This table is not open to the API."
        const key = localStorage.getItem(KEY) ?? ""
        if (!key) return "Calling the API needs your Data Library key: add it on the Data Library page (/data#pricing)."
        const sql = `SELECT * FROM ${t.stored} LIMIT 5`
        const res = await fetch(`${API}/query`, { method: "POST", headers: { "content-type": "application/json", "x-api-key": key }, body: JSON.stringify({ sql }) }).catch(() => null)
        if (!res) return "The API did not answer."
        const j = (await res.json().catch(() => ({}))) as { columns?: string[]; rows?: unknown[][]; error?: string; bytes_scanned?: number }
        if (!res.ok || j.error) return `The API refused the query: ${j.error ?? `HTTP ${res.status}`}.`
        ctx.openResult({ title: t.plain, subtitle: `${t.stored} · ${(j.rows ?? []).length} rows`, note: sql, columns: j.columns ?? [], rows: j.rows ?? [], json: JSON.stringify({ columns: j.columns, rows: j.rows }, null, 2) })
      },
    })
  if (isTable(b))
    out.push({
      label: "Get Sample API Results",
      keys: ["⌘", "E"],
      act: async (ctx) => {
        const t = await catalogTableOf(b)
        if (!t) return "This box has no table in the catalog."
        const smp = await loadSample(t)
        if (!smp) return "No sample rows are shipped for this table."
        const rows = smp.r.slice(0, 5)
        ctx.openResult({ title: t.table, subtitle: `Sample · ${t.database} · ${rows.length} rows`, note: "The sample rows shipped with the site, in the shape the API returns.", columns: smp.c, rows, json: JSON.stringify({ columns: smp.c, rows }, null, 2) })
      },
    })
  out.push({
    label: "Try Chat",
    keys: ["⌘", "T"],
    act: async (ctx) => {
      // The chat's scope picker reads its choice from this browser (components/chat/scope-picker.tsx).
      const t = isTable(b) ? tableOf(b, await loadTopics()) : null
      try {
        localStorage.setItem("nysgpt-chat-scope", JSON.stringify(t ? { db: t.topic, table: b.kind === "tables" ? t.plain : null } : { db: null, table: null }))
      } catch {}
      ctx.push("/chat")
    },
  })
  out.push({
    label: "Add to Blocks",
    keys: ["⌘", "B"],
    act: (ctx) => {
      if (!getHome().shelf.some((x) => x.key === `${b.kind}:${b.title}`)) home.toggleShelf(b)
      ctx.openBlocks()
    },
  })
  if (isTable(b))
    out.push({
      label: "Open Beside",
      keys: ["⌘", "O"],
      act: async (ctx) => {
        const t = tableOf(b, await loadTopics())
        const ds = await loadDatasets()
        const db = t?.stored.split(".")[0]
        const hit = db && ds ? ds.find((d) => d.largest_table?.split(".")[0] === db) : null
        ctx.openPane(hit ? new URL(hit.page).pathname : "/data")
      },
    })
  return out
}

export const ITEMS: CommandItem[] = [
  // Pages: the masthead's sets, the source pages, and the Data Library.
  { ...r("page", "All", "All boxes", "/", "home nysgpt", () => showSet(null)), icon: GridGlyph, tint: "var(--paper-text)", fg: "var(--paper)" },
  { ...r("page", "Data", ledger("Data"), "/", "records databases", () => showSet("data")), ...setTile("data") },
  { ...r("page", "Models", ledger("Models"), "/", "parameters", () => showSet("models")), ...setTile("models") },
  { ...r("page", "Platforms", ledger("Platforms"), "/", "requests", () => showSet("platforms")), ...setTile("platforms") },
  { ...r("page", "Tables", ledger("Tables"), "/", "catalog", () => showSet("tables")), ...setTile("tables") },
  { ...r("page", "Artificial Analysis", "Models", "/", "aa", () => showSet("aa")), ...setTile("aa") },
  { ...r("page", "Kaggle", "Datasets", "/", undefined, () => showSet("kaggle")), ...setTile("kaggle") },
  { ...r("page", "LLM Stats", "Benchmarks", "/", undefined, () => showSet("llmstats")), ...setTile("llmstats") },
  { ...r("page", "GitHub", "Skills, Design, API, MCP", "/", "repositories", () => showSet("gh-skills")), ...setTile("gh-skills") },
  { ...r("page", "Hugging Face", "Models, Datasets, Spaces, Papers", "/", "hf", () => showSet("hf-models")), ...setTile("hf-models") },
  { ...r("page", "Data Library", "52.8B public records in SQL and MCP", "/data", "subjects library"), icon: LibraryBig, tint: TYPE_COLOR.data },

  // Commands
  r("command", "Toggle Sidebar", "Shell", undefined, "log", () => document.querySelector<HTMLButtonElement>('button[aria-label="Toggle sidebar"]:not([class*="fixed"])')?.click()),
  ...PAGE_COMMANDS,

  // The boxes, every set.
  ...BOXES.map((b) => ({
    ...r(b.kind, b.title, b.group || undefined, undefined, b.body, () => openBox(b)),
    box: b,
    ...(b.logo ? { logo: b.logo } : MARKS.has(b.icon) ? { mark: b.icon } : { icon: glyph(b.icon) }),
  })),
]

/** What the palette suggests before anything is typed: the reader's favourite and pinned boxes. */
export const suggested = (): string[] => {
  const { favs, pins } = getHome()
  return [...new Set([...favs, ...pins])].slice(0, 5)
}

/** The surfaces the Ask view offers to point at (@): the masthead's sets and the three single sources. */
export const ASK_AT: { label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; tint: string }[] = [
  { label: "Data", icon: Database, tint: TYPE_COLOR.data },
  { label: "Models", icon: Cpu, tint: TYPE_COLOR.models },
  { label: "Platforms", icon: Layers, tint: TYPE_COLOR.platforms },
  { label: "Tables", icon: Table2, tint: TYPE_COLOR.tables },
  { label: "Artificial Analysis", icon: glyph("aa"), tint: TYPE_COLOR.aa },
  { label: "Kaggle", icon: glyph("kaggle"), tint: TYPE_COLOR.kaggle },
  { label: "LLM Stats", icon: glyph("llmstats"), tint: TYPE_COLOR.llmstats },
  { label: "Data Library", icon: LibraryBig, tint: "#1e3a8a" },
]
