import { ChevronsLeftRight, Cpu, Database, Layers, LibraryBig, PanelLeft, Table2, type LucideIcon } from "lucide-react"
import * as React from "react"

import { TypeIcon } from "@/app/HomeIcons"
import { BOXES, SOURCES, TYPE_COLOR, type Box, type BoxKind, type SourceKind } from "@/lib/home-boxes"
import { LEDGER } from "@/lib/home-data"
import { compact } from "@/lib/compact"
import { getHome, home } from "@/lib/home-store"

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
}

type KindInfo = { section: string; label: string; icon: LucideIcon | React.ComponentType<{ className?: string; strokeWidth?: number }>; tint: string; action: string }

/** A box's type icon in the tile's place: TypeIcon draws at its own size, so the wrapper sets it. */
const glyph = (icon: Box["icon"]) => {
  function Glyph({ className }: { className?: string }) {
    return React.createElement("span", { className: `${className ?? ""} flex [&>svg]:size-full` }, React.createElement(TypeIcon, { icon }))
  }
  return Glyph
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
      const section = own ? own.section : SECTION_OF(k as SourceKind)
      const label = own ? own.label : singular(SOURCES[k as SourceKind].unit)
      return [k, { section, label, icon: own?.icon ?? Database, tint: TYPE_COLOR[k], action: `Open ${label}` }]
    }),
  ) as Record<BoxKind, KindInfo>),
}

/** The sections in the order the palette lists them. */
export const SECTIONS = ["Pages", "Commands", "Data", "Models", "Platforms", "Tables", "Tools", "Artificial Analysis", "Kaggle", "LLM Stats", "GitHub", "Hugging Face"]

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

export const ITEMS: CommandItem[] = [
  // Pages: the masthead's sets, the source pages, and the Data Library.
  r("page", "All", "All boxes", "/", "home nysgpt", () => showSet(null)),
  r("page", "Data", ledger("Data"), "/", "records databases", () => showSet("data")),
  r("page", "Models", ledger("Models"), "/", "parameters", () => showSet("models")),
  r("page", "Platforms", ledger("Platforms"), "/", "requests", () => showSet("platforms")),
  r("page", "Tables", ledger("Tables"), "/", "catalog", () => showSet("tables")),
  r("page", "Artificial Analysis", "Models", "/", "aa", () => showSet("aa")),
  r("page", "Kaggle", "Datasets", "/", undefined, () => showSet("kaggle")),
  r("page", "LLM Stats", "Benchmarks", "/", undefined, () => showSet("llmstats")),
  r("page", "GitHub", "Skills, Design, API, MCP", "/", "repositories", () => showSet("gh-skills")),
  r("page", "Hugging Face", "Models, Datasets, Spaces, Papers", "/", "hf", () => showSet("hf-models")),
  r("page", "Data Library", "52.8B public records in SQL and MCP", "/data", "subjects library"),

  // Commands
  r("command", "Toggle Sidebar", "Shell", undefined, "log", () => document.querySelector<HTMLButtonElement>('button[aria-label="Toggle sidebar"]:not([class*="fixed"])')?.click()),

  // The boxes, every set.
  ...BOXES.map((b) => ({
    ...r(b.kind, b.title, b.group || undefined, undefined, b.body, () => openBox(b)),
    box: b,
    icon: glyph(b.icon),
    logo: b.logo,
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
