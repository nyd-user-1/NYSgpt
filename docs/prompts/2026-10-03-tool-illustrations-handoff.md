# Handoff — nysgpt.com: an illustration inside every card dialog (2026-10-03)

Read this whole file before touching anything. Then read the memory index at
`~/.claude/projects/-Users-brendanstanton-Code-govblock/memory/MEMORY.md` and the
memories it points to that are named below.

## Where things stand

- **Repo:** `~/Code/nysgpt` (GitHub `nyd-user-1/NYSgpt`, branch `main`). It deploys to
  nysgpt.com through Amplify app `d3etwd4srq8khx`. **Nothing from this work is
  committed or pushed. Do not push or start a build without Brendan's explicit go**
  (memory: no-rebuilds-unless-authorized).
- **Dev server:** running on http://localhost:3000, started with
  `BRENDAN_OK_LOCAL_BUILD=1 bash -c 'nohup npm run dev -- --port 3000 > /tmp/nysgpt-dev.log 2>&1 &'`.
  Brendan reviews in his own browser. **Do not run headless browsers against it or
  against production** (memories: no-headless-when-dev-server-up,
  facts-not-advice-on-his-claims).
- **Money:** about $145 of AWS credit left and no cash. **No AWS spend of any kind
  without his express go** (memory: aws-credits-nearly-gone). Everything below is
  front-end work and costs nothing.

### What was built this session (uncommitted)

| File | What |
|---|---|
| `lib/home-data.ts` | `TOOLS` (10), `IN_HOUSE` (2) and `PRODUCT_EXTRAS` (sources line + `pas` per product). Added `sources?` and `pas?` to `HomeCardData`. An empty `href` means no public page. |
| `app/HomeCard.tsx` | Renders a non-link cell when `href` is empty; `~` prefix for approximate units (`unit` starting with `~`); bottom line shows `sources` at rest (figure only on hover); block click calls `onOpen` (opens the dialog); ↗ still navigates; product panel icon still opens the switchboard. |
| `app/HomeContents.tsx` | Next/Prev turn between three plates: products → tools → in-house. Headings: "Custom AI by Vertical & Topic", "Custom AI Tooling", "Custom AI Tooling". Refresh still deals recent papers. Renders `<CardDialog>`. |
| `app/CardDialog.tsx` | The card dialog. Frame copied from GovBlock's jurisdictions-board state dialog. Title in black serif, the card's blurb in muted text, then Problem / Agitate / Solution as three plain paragraphs (no labels, by ruling), footer with the figure and an "Open ↗" link. |
| `components/animate-ui/components/base/dialog.tsx`, `components/animate-ui/primitives/base/dialog.tsx`, `hooks/use-controlled-state.tsx`, `lib/get-strict-context.tsx` | Copied verbatim from `~/Code/govblock/packages/ui/src`, only the `@govblock/ui/...` import paths rewritten to `@/...`. |
| `package.json`, `pnpm-lock.yaml` | Added `@base-ui/react@^1.7.0`. |

Type-check the changed files with a bounded `ts.createProgram` script (memory:
bounded-typecheck), not a whole-project `tsc`.

## Built 2026-10-03 (uncommitted): the ten tool illustrations

`app/CardDialog.tsx` is now `min(1100px, 100vw − 2rem)` wide and up to 88vh tall
for a tool card: illustration on the left, the three paragraphs on the right
(stacked below 1024px). Products and in-house cards keep the 640px dialog. The
illustrations live in `app/illustrations/` and load with the first tool dialog
(`next/dynamic`), keyed by card title in `index.tsx`. Shared pieces (`Pane`,
`Seg`, `Chip`, the `Compare` before/after slider) are in `parts.tsx`.

| Tool | What it shows (after three review passes) | Data |
|---|---|---|
| Encoder | Three preset queries; keyword results beside encoder results, a picture per row | Sample fruit listings |
| Reranker | One list of fruit that re-orders across a "Page 2" line; Brendan's Google line | Sample |
| Classifier | ONE table; a Classify button dissolves the tags on, then the filter chips; "Clear tags" undoes it | Sample fruit |
| Compiler | Slider over a printed page vs the same page with sections and citations marked; XML / JSON / Markdown tabs | Real: 15 U.S.C. § 261 (`govblock/scripts/typeset/fixtures`); JSON and Markdown hand-derived |
| Loaders | "Add a source" box with four ways in (Website, PDF drop, File, API) and a Load button; each load dissolves a row into one table | Sample fruit prices |
| Lake | A question box (Google / Claude shape) with three preset questions; the question types itself, the files are read top to bottom, the answer dissolves in; SQL behind one button | Sample fruit sales |
| Pipeline | Run / Pause / Run again, and each step is a button that re-runs from there; nothing plays on its own | Sample fruit orders |
| Clips | The scrollable statute with a play button; play morphs it into a 9:16 scroll-snap clip; down-arrow circle for the next screen, document icon top-left to go back | Real: § 261 with notes, generated into `statute.ts` by a script |
| Consensus | Vote card (Agree / Disagree / Pass) on the open-primaries statements; ten dots per group in the simulator's blue and red; then a result slide and a report slide (agreed statements with a recommendation each). Below: "A poll" (blue/red bar) beside "Consensus"; at the end the poll gives way to a two-circle common-ground picture | Statements real; votes simulated and labelled (the conversation has none) |
| Agentic Inbox | GovBlock's inbox recreated from `registry/blocks/sidebar-09`: folder rail, Gmail-shaped list and toolbar, reading pane with Drive mark, tool calls, attachment card. Refresh spins, the Clerk's reply lands unread with a toast | Real: the three featured threads in `govblock/apps/web/lib/agents/featured.ts`; no personal addresses |

Third pass also added: a lucide icon on every pane header (`icon` on `Pane`);
the ten PRODUCT dialogs in the same big layout with a statement each
(`PRODUCT_EXTRAS`) and a screenshot slot (`app/ProductShot.tsx`) that reads
`public/products/<slug>.png` (artificial-intelligence, childcare, ehr, energy,
insurance, policy, science, solar, sports, tariffs) and shows a placeholder
until the file exists. Brendan is supplying the screenshots; do not capture
them headlessly. HQ and Inspector (third plate) are still the small dialog.
His rules for these illustrations are in memory: illustration-rules.

Fourth pass (same day, on Brendan's screenshots), which supersedes the table
above where they differ:

- **Every dialog is the big layout** and its illustration fills the left side top
  to bottom (no dead space; rows stretch). `CardDialog` takes `onStep` (footer
  arrows step through the plate's cards; "Open ↗" is gone) and `onInspect`.
- **Two-part headlines.** A tool's `statement` is a pair in `lib/home-data.ts`;
  each illustration calls `useStage(onStage, after)` (in `parts.tsx`) and the
  dialog animates from the first line to the second when the reader presses the
  illustration's button. Products and HQ keep one sentence.
- **Icons:** none on pane headers; one before each dialog title, from
  `app/card-icons.ts` (kept out of home-data because that crosses server to client).
- **Encoder:** one list at a time, Keyword / Semantic chips under the search,
  eight results each for "red fruit". **Reranker:** chips under the search, nine
  one-line results for "tropical fruit"; the four right ones are off the page and
  slide up on Rerank. **Classifier** dims rather than removes when filtering.
  **Loaders** fills an eight-line table two rows per source. **Lake**'s files grid
  fills the space and gives room to the answer. **Clips** fills the stage.
- **Third plate:** HQ and Inspector are two large boxes (`large` on `HomeCard`,
  two columns) filling the ten-card grid. HQ's dialog shows a screenshot slot
  (`public/products/hq.png`).
- **Inspector:** its dialog compares what a screenshot costs with what the
  Inspector's brief costs over N turns (2,691 tokens per 1920×1080 image, from
  Anthropic's vision docs), and its button turns on `app/InspectorMode.tsx` over
  the homepage: crosshair, blue rules, box, chip, "Copy for AI". Elements are
  named by `data-inspect="Name"` marks; `node scripts/inspect-map.mjs` writes
  their file:line to `lib/inspect-map.json`. **Re-run it after editing any file
  that carries a mark**, or the lines shown drift.
- **Browser frame** (`ProductShot`): traffic-light dots, black address.
- **Agentic Inbox copy** rewritten: hand over the task and leave, not a faster reply.

Second pass, same day, on Brendan's notes: every tool has a `statement` in
`lib/home-data.ts` (the ordinary way against the tool, modelled on his Encoder
line), drawn in serif above the blurb; the Encoder's dialog is titled "Custom
Encoder" (`dialogTitle`); the dialog has its own close button in the header
(inset, grey on hover). The nine statements other than the Encoder's are drafts
for him to edit.

Checked with the bounded type-check (clean) and a dev-server compile. Not seen
in a browser by the builder: Brendan reviews. ESLint was not run (the hook
blocked it).

## The original brief: an illustration inside each card's dialog

Brendan, verbatim intent: "design a visual example/illustration of each tool. Some
will be better as a before/after, some will be perfect with just a slider showing
the product output."

1. **Make the dialog much bigger** to hold the illustration: roughly
   `min(1100px, calc(100vw - 2rem))` wide and up to ~88vh tall, the illustration on
   top (or left on wide screens) and the three paragraphs beside or below it.
2. **One illustration per tool card** (second plate), built in React and CSS with
   static sample data. No live data, no API calls, no database.
   - **Encoder:** a search by meaning beside a keyword search over the same small
     corpus: the query "heart attack" finds "myocardial infarction" only with the
     encoder. Optionally a 2-D scatter of documents grouped by meaning.
   - **Reranker:** a search results page with poor results on top beside the same
     results reranked, the right answer first. Brendan's line: "When's the last time
     you looked at page 2 of Google?"
   - **Classifier:** an untagged list (database rows, or an email inbox) beside the
     same list tagged by category, with a filter that works only on the tagged side.
     Answer "what problem are we actually solving" in the illustration itself:
     finding, routing and counting.
   - **Compiler:** a before/after slider. A raw page of a document (a bill section
     with an amendment, or a contract clause) on one side; the structured result on
     the other, with tabs for XML, JSON and Markdown and the sections and citations
     highlighted.
   - **Loaders:** many source formats (agency site, PDF, CSV, API) flowing into one
     consistent record.
   - **Lake:** files on one side; a SQL box and a results table on the other.
   - **Pipeline:** "bad data going in, good data coming out": messy, duplicated,
     mis-typed rows becoming clean, deduplicated rows, with the steps (discover,
     fetch, check, publish) shown between them.
   - **Clips:** a dense document beside a short video frame with captions.
   - **Consensus** and **Agentic Inbox:** Brendan: "you can literally show the
     existing working examples." Consensus lives at `policy.nysgpt.com/consensus`
     (GovBlock app, `~/Code/govblock/apps/web/app/consensus`). The Agentic Inbox is
     the Clerk (`govblock-clerk@agentmail.to`, Cloudflare Worker `workers/clerk-mail`
     in the govblock repo). Use screenshots or a static recreation of a real
     exchange. **Do not send mail to the Clerk or load pages that wake a database.**
3. **Products (first plate) and in-house (third plate):** not specified yet. Do the
   tools first, then ask Brendan.

## Rules that apply here (all from memory, all recurring corrections)

- A named or pointed-at component is used verbatim; never hand-roll a substitute.
- Screenshots from Brendan are the spec: build what they show, change nothing else.
- No metaphors in copy; plain literal names. App voice is third person, never "we"
  or "I", never naming Claude.
- Descriptions sell the use case, never how the thing was made.
- Don't add labels or captions that restate what the layout already shows.
- Do only what was asked; finish it, then offer extras.
- Short reports: answer first, under ten lines, one open question at a time.
- Never mention LegiScan in replies or on the UI.

## Open items Brendan has not answered

- **Consensus figure:** its card has no number. It runs on the Polis open dataset
  (github.com/compdemocracy/openData); a vote count from there would fill it.
- **Inspector demo:** a production-safe version for the third plate was proposed
  (data-attribute labels on the homepage, crosshair overlay, "Copy for AI" brief),
  built from GovBlock's `components/dev/inspector.tsx`. Brendan has not said go.
- **Compiler landing page:** pitch drafted in chat ("Your documents, readable by
  any machine."; drop zone first; side-by-side result; formats strip; fields with
  their standards; convert → encoder → own model; privacy; one call to action). Not
  built.
